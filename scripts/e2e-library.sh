#!/bin/bash
# Pre-push / CI gate for library + entity e2e resilience tests.
# Admin credentials are required because the suite verifies the admin edit flow.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

# Load .env.local / .env like the Playwright fixtures do
if [ -f .env.local ]; then set -a; . ./.env.local; set +a; fi
if [ -f .env ]; then set -a; . ./.env; set +a; fi

# playwright.config reuses whatever already answers on the target URL
# (reuseExistingServer), so a localhost target can silently bind this gate to
# an unrelated dev server on :3000 — every route then 404s and the run dies in
# fixture setup. Pin local runs to a dedicated port. Remote targets (CI preview
# deployments) are left untouched.
case "${NEXT_PUBLIC_SITE_URL:-}" in
  "" | *localhost* | *127.0.0.1*)
    E2E_PORT="${E2E_PORT:-3100}"
    export NEXT_PUBLIC_SITE_URL="http://localhost:${E2E_PORT}"
    export PORT="${E2E_PORT}"
    echo "🔒 Local e2e pinned to port ${E2E_PORT} (override with E2E_PORT)."
    ;;
esac

# Cap the dev server's heap. Next's dev server will grow until the OS starts
# swapping, and on a memory-constrained host the OOM killer then takes the dev
# server out mid-run. That surfaces as `ERR_CONNECTION_REFUSED on /login` or a
# locator that never appears -- a red run that says nothing about the product.
# Capping the heap makes it collect instead.
#
# The default is 2048 rather than something larger on purpose. A cap is only
# useful if it bites: a high ceiling lets V8 keep growing (and the host keep
# swapping) right up until something is killed, which is the failure this cap
# exists to prevent. 2048 leaves headroom for Turbopack's compile graph while
# still collecting before the process becomes the OOM killer's target.
if [ -z "${NODE_OPTIONS:-}" ]; then
  export NODE_OPTIONS="--max-old-space-size=${E2E_NODE_HEAP_MB:-2048}"
  echo "🧠 Dev server heap capped at ${E2E_NODE_HEAP_MB:-2048} MB."
fi

# Keep the browser binaries OUT of ~/Library/Caches.
#
# macOS periodically reaps ~/Library/Caches (com.apple.cache_delete), and it
# reaped the Playwright browser mid-gate twice here: every test in the run died
# with "browserType.launch: Executable doesn't exist", which looks exactly like
# a broken test environment and tells you nothing about the product.
# ~/.cache is not reaped, survives `node_modules` being rebuilt, and is the
# XDG-standard location, so it is the durable home for the browsers.
export PLAYWRIGHT_BROWSERS_PATH="${PLAYWRIGHT_BROWSERS_PATH:-${XDG_CACHE_HOME:-$HOME/.cache}/ms-playwright}"
if [ ! -d "$PLAYWRIGHT_BROWSERS_PATH" ] || [ -z "$(ls -A "$PLAYWRIGHT_BROWSERS_PATH" 2>/dev/null)" ]; then
  echo "⬇️ Installing Playwright browsers into $PLAYWRIGHT_BROWSERS_PATH (one-time)..."
  bunx playwright install chromium >/dev/null 2>&1 || true
fi

if [ -z "${PLAYWRIGHT_ADMIN_EMAIL:-}" ] || [ -z "${PLAYWRIGHT_ADMIN_PASSWORD:-}" ]; then
  echo "🚫 e2e gate requires PLAYWRIGHT_ADMIN_EMAIL and PLAYWRIGHT_ADMIN_PASSWORD"
  exit 1
fi

# Optional: limit to chromium for speed on pre-push
PROJECT="${E2E_PROJECT:-chromium}"

echo "🧪 Running library resilience e2e (project=$PROJECT)..."

# Playwright owns the dev server for this run and tears it down on exit. If it
# is killed mid-write, next dev leaves a truncated .next/dev/types/*.d.ts behind,
# and next-env.d.ts imports those files directly — so the very next
# `bun run typecheck` fails on syntax errors that have nothing to do with the
# source tree. Drop the generated dev types so the gate leaves a clean tree.
cleanup_dev_types() {
  # The dev server is still flushing `.next/dev` as it dies, so a bare
  # `rm -rf` can fail with "Directory not empty" and, worse, leave a truncated
  # types file behind. Retry briefly, then force it. `rm -rf` on a path that
  # keeps being repopulated needs persistence, not luck.
  local dir="$REPO_ROOT/.next/dev"
  [ -d "$dir" ] || return 0
  local i
  for i in 1 2 3 4 5 6 7 8 9 10; do
    if rm -rf "$dir" 2>/dev/null && [ ! -d "$dir" ]; then
      return 0
    fi
    sleep 0.5
  done
  # Last resort: empty it bottom-up, which cannot lose a race the way a
  # single rm of a mutating directory can.
  find "$dir" -depth -delete 2>/dev/null || true
}
trap cleanup_dev_types EXIT

# library-resilience guards the /library/books crash class.
# play-button guards the "press play on the cover and nothing happens" class,
# which the API contract tests could not see: the endpoint returned a valid
# session while the button itself was inert.
# playback-progress is the stronger sibling: it proves audio bytes arrive and
# the playhead actually advances, which is the only assertion that catches a
# session that mounts a player and then plays nothing.
# cover-fallback guards the no-cover path: a book whose cover_path is the
# terminal "missing" sentinel must render the placeholder without requesting a
# cover that can only 404 (and be blocked by the browser as a JSON body).
# player-track guards the GPU track layer's fallback: the DOM role="slider" must
# stay the single accessible control and must keep receiving pointer and keyboard
# seeks, so the WebGPU layer can never take the scrubber down with it.
SPECS=(
  tests/e2e/library-resilience.spec.ts
  tests/e2e/play-button.spec.ts
  tests/e2e/playback-progress.spec.ts
  tests/e2e/cover-fallback.spec.ts
  tests/e2e/player-track.spec.ts
)

run_e2e() {
  bunx playwright test "${SPECS[@]}" --project="$PROJECT" --reporter=line
}

# Host memory, printed only when the run looks like an infrastructure failure.
# Delegates to the shared preflight so the numbers quoted in a CI log, in a bug
# report, and on a developer's terminal are produced by exactly one script --
# three copies of this arithmetic is how they drift apart and start lying.
report_host_pressure() {
  ./scripts/host-pressure.sh --report
}

# Blocks until nothing is listening on the e2e port, so a retry never races a
# server that has not finished dying.
wait_for_port_free() {
  local port="${1:-3100}" i
  for i in $(seq 1 20); do
    if ! lsof -ti ":$port" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.5
  done
  echo "   ⚠️  port $port is still held after 10s; the retry may fail to bind."
}

# A dead dev server makes every remaining test fail at `page.goto('/login')`
# with ERR_CONNECTION_REFUSED, which reads exactly like a product-wide outage
# but is the host OOM-killing `next dev`. Measured on a memory-starved machine
# this happened in 2 of 3 runs *without* any recent change, and in 1 of 3 with
# it, so it is infrastructure and not a regression.
#
# When a run dies that way, retry once on a fresh dev server. Only if the
# retry also dies do we report it as infrastructure, with the host's memory
# state attached, so nobody debugs the product for a machine problem.
LOG=$(mktemp -t audiobookphile-e2e)
# Chain onto the dev-types cleanup installed above; a second EXIT trap would
# replace it and leave a truncated .next/dev behind, which is exactly the
# failure that trap exists to prevent.
trap 'rm -f "$LOG"; cleanup_dev_types' EXIT

attempt=1
max_attempts=2
while :; do
  if run_e2e 2>&1 | tee "$LOG"; then
    exit 0
  fi

  refused=$(grep -c "ERR_CONNECTION_REFUSED" "$LOG" || true)
  failed=$(grep -cE "^[[:space:]]+[0-9]+\) \[" "$LOG" || true)

  if [ "$refused" -gt 0 ] && [ "$refused" -eq "$failed" ] && [ "$attempt" -lt "$max_attempts" ]; then
    echo ""
    echo "⚠️  All $failed failures are ERR_CONNECTION_REFUSED: the dev server died mid-run."
    echo "   Retrying once on a fresh dev server (attempt $((attempt + 1))/$max_attempts)..."
    report_host_pressure
    # Wait for the dead server to actually release the port. Do NOT pkill
    # "next dev" here: that pattern also matches a developer's own dev server
    # on :3000, and a gate must never take out unrelated local work.
    wait_for_port_free "$E2E_PORT"
    attempt=$((attempt + 1))
    continue
  fi

  if [ "$refused" -gt 0 ]; then
    echo ""
    echo "🚫 INFRASTRUCTURE FAILURE (not a product regression): the dev server died and"
    echo "   $refused of the failures are ERR_CONNECTION_REFUSED on the login route."
    report_host_pressure
    echo "   Free memory or swap on this host and re-run. See scripts/e2e-library.sh."
  fi
  exit 1
done

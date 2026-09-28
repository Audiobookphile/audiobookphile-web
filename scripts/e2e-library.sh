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
  rm -rf "$REPO_ROOT/.next/dev"
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
bunx playwright test \
  tests/e2e/library-resilience.spec.ts \
  tests/e2e/play-button.spec.ts \
  tests/e2e/playback-progress.spec.ts \
  tests/e2e/cover-fallback.spec.ts \
  tests/e2e/player-track.spec.ts \
  --project="$PROJECT" --reporter=line

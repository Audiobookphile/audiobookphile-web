#!/bin/bash
# Host-pressure preflight for self-hosted CI runners.
#
# Linux pool workers delegate to a cgroup-aware check below. The macOS
# fallback remains useful for local diagnostics. On a shared machine, concurrent
# heavy jobs can start swapping,
# the OOM killer takes the biggest process, and the job dies in a way that reads
# like a product failure: `ERR_CONNECTION_REFUSED on /login`, a Swift compiler
# that vanishes, a Playwright locator that never appears. Every one of those was
# already mistaken for a real bug in this repo -- see the retry-on-connection-
# refused path in scripts/e2e-library.sh, which exists because of exactly this.
#
# So the host is treated as a dependency and checked BEFORE the expensive work
# starts. Starvation is reported as starvation -- naming the actual memory hog --
# instead of surfacing two minutes later as a mystery.
#
# Usage:
#   ./scripts/host-pressure.sh            # gate: fail fast if the host is starved
#   ./scripts/host-pressure.sh --report   # diagnostics only, always exits 0
#
# Thresholds (override per-host if the box changes):
#   CI_MIN_RESIDENT_MIB   default 2048  Linux resident worker headroom, MiB
#   CI_MIN_FREE_MEM_PCT   default 10    memory_pressure "free percentage"
#   CI_MIN_FREE_SWAP_PCT  default 5     swap free / swap total
#   CI_MAX_LOAD_PER_CORE  default 4     1-minute load average / logical CPUs
set -uo pipefail

# Linux pool workers have independent cgroups; retain the macOS fallback for
# local developer diagnostics instead of applying host percentages to a worker.
if [ "$(uname -s)" = Linux ]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  exec "$SCRIPT_DIR/linux-host-pressure.sh" "$@"
fi

MODE="check"
[ "${1:-}" = "--report" ] && MODE="report"

MIN_FREE_MEM_PCT="${CI_MIN_FREE_MEM_PCT:-10}"
MIN_FREE_SWAP_PCT="${CI_MIN_FREE_SWAP_PCT:-5}"
MAX_LOAD_PER_CORE="${CI_MAX_LOAD_PER_CORE:-4}"
# Load is reported but does NOT fail the gate unless this is set.
#
# The failure this script exists to prevent is the OOM killer taking `next dev`,
# a Swift compiler or a simulator out mid-job. That is a MEMORY event. Load
# average counts runnable and uninterruptible tasks, which on a workstation that
# legitimately runs several agents at once is high as a matter of course --
# measured at 4.1/core here with 46% of memory free and every build running at
# full speed. Gating on it would have refused to start work on a perfectly
# healthy box, and a gate that cries wolf gets disabled, which costs the real
# signal. Set CI_GATE_ON_LOAD=1 to opt back in where load genuinely is the thing
# you are trying to catch.
GATE_ON_LOAD="${CI_GATE_ON_LOAD:-0}"

CORES="$(sysctl -n hw.logicalcpu 2>/dev/null || getconf _NPROCESSORS_ONLN 2>/dev/null || echo 1)"

mem_free_pct() {
  # memory_pressure is the same signal the OS uses to decide when to start
  # reclaiming aggressively, and it already accounts for the file cache. It is
  # the honest number; free page counts are not.
  local v
  v="$( { memory_pressure 2>/dev/null || true; } \
        | sed -n 's/^System-wide memory free percentage: \([0-9]*\)%.*/\1/p' | head -1 )"
  if [ -n "$v" ]; then printf '%s' "$v"; return 0; fi
  # Linux fallback so the gate is not useless if the fleet ever moves.
  if [ -r /proc/meminfo ]; then
    awk '/^MemAvailable:/ {printf "%d", $2 * 100 / $2 }' /dev/null 2>/dev/null
    awk '/^MemTotal:/ {t=$2} /^MemAvailable:/ {printf "%d", ($2 * 100) / t}' /proc/meminfo 2>/dev/null
    return 0
  fi
  echo ""
}

swap_free_pct() {
  local free total
  if out="$(sysctl -n vm.swapusage 2>/dev/null)"; then
    free="$(printf '%s' "$out" | sed -n 's/.*free = \([0-9.]*\)[MG].*/\1/p')"
    total="$(printf '%s' "$out" | sed -n 's/.*total = \([0-9.]*\)[MG].*/\1/p')"
    if [ -n "$free" ] && [ -n "$total" ] && awk "BEGIN{exit !($total > 0)}"; then
      awk "BEGIN{printf \"%d\", ($free * 100) / $total}"
      return 0
    fi
  fi
  if [ -r /proc/meminfo ]; then
    awk '/^SwapTotal:/ {t=$2} /^SwapFree:/ {if (t > 0) printf "%d", ($2 * 100) / t; else print 100}' /proc/meminfo
    return 0
  fi
  echo ""
}

# macOS reports load as "{ 11.42 5.88 3.57 }" -- a brace is the first field, so
# a naive `awk '{print $1}'` yields "{" and the per-core maths silently becomes
# 0. That bug would make a thrashing host look idle, which is worse than having
# no gate at all.
load1() { tr -d '{}' <<<"$(sysctl -n vm.loadavg 2>/dev/null || cat /proc/loadavg)" | awk '{print $1}'; }
load_per_core() { awk -v l="$(load1)" -v c="$CORES" 'BEGIN{printf "%.1f", l / c}'; }

# The point of the gate is that the log NAMES the process eating the box. A
# bare "host is busy" sends the next person hunting through Activity Monitor.
# `basename` is not enough -- a Kotlin compile daemon's comm is just "java" --
# so the tail of the command line is kept, which is where the project path and
# the daemon class actually live.
top_hogs() {
  ps -A -o rss=,command= 2>/dev/null | sort -rn | head -3 | while read -r rss cmd; do
    [ -n "$cmd" ] || continue
    local_tail="$(printf '%s' "$cmd" | awk '{ for (i = NF - 5; i < NF; i++) if (i > 0) printf "%s ", $i }' | cut -c1-96)"
    printf '      %6s MB  %s\n' "$((rss / 1024))" "${local_tail:-$(basename "$cmd")}"
  done
}

MEM_PCT="$(mem_free_pct)"
SWAP_PCT="$(swap_free_pct)"
LPC="$(load_per_core)"
TOTAL_GB="$(sysctl -n hw.memsize 2>/dev/null | awk '{printf "%.0f", $1 / 1073741824}')"
[ -n "$TOTAL_GB" ] || TOTAL_GB="?"

echo "🖥️  Host pressure: ${MEM_PCT:-?}% memory free, ${SWAP_PCT:-?}% swap free, load ${LPC}/core (${CORES} cores, ${TOTAL_GB}GB)"
echo "    thresholds: memory>=${MIN_FREE_MEM_PCT}% swap>=${MIN_FREE_SWAP_PCT}% load<=${MAX_LOAD_PER_CORE}/core"

VIOLATIONS=()
NOTES=()
[ -n "$MEM_PCT" ] && [ "$MEM_PCT" -lt "$MIN_FREE_MEM_PCT" ] && \
  VIOLATIONS+=("only ${MEM_PCT}% of memory is free (< ${MIN_FREE_MEM_PCT}%)")
[ -n "$SWAP_PCT" ] && [ "$SWAP_PCT" -lt "$MIN_FREE_SWAP_PCT" ] && \
  VIOLATIONS+=("only ${SWAP_PCT}% of swap is free (< ${MIN_FREE_SWAP_PCT}%) -- the host is already thrashing")
if [ "$GATE_ON_LOAD" = "1" ]; then
  awk -v l="$LPC" -v m="$MAX_LOAD_PER_CORE" 'BEGIN{exit !(l > m)}' && \
    VIOLATIONS+=("load average is ${LPC} per core (> ${MAX_LOAD_PER_CORE})")
else
  awk -v l="$LPC" -v m="$MAX_LOAD_PER_CORE" 'BEGIN{exit !(l > m)}' && \
    NOTES+=("load average is ${LPC} per core (> ${MAX_LOAD_PER_CORE})")
fi

if [ "${#VIOLATIONS[@]}" -eq 0 ]; then
  echo "    ✅ host has headroom for a build"
  # Load is reported but not gated on by default: see the note below. A busy
  # host slows a build down; it does not kill it.
  [ "${#NOTES[@]}" -gt 0 ] && echo "    ℹ️  ${NOTES[*]} (informational)"
  exit 0
fi

if [ "$MODE" = "report" ]; then
  echo "    ⚠️  under pressure: ${VIOLATIONS[*]}"
  [ "${#NOTES[@]}" -gt 0 ] && echo "    ℹ️  ${NOTES[*]}"
  top_hogs
  exit 0
fi

cat >&2 <<EOF

❌ HOST STARVED -- refusing to start a build that will be blamed on the product.
   ${VIOLATIONS[*]}

   Largest resident processes right now:
$(top_hogs)

   This is infrastructure, not a regression. Preserve running jobs and
   applications. Wait for capacity, inspect the workload-specific logs, or
   route the job to a slot with sufficient resident RAM. Do not kill unrelated
   compiler daemons, simulators, or services from CI.

EOF
exit 1

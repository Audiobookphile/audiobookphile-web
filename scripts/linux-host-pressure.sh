#!/usr/bin/env bash
# Linux pressure checks use current host headroom AND the worker cgroup.
# The snapshot function accepts paths for isolated fixtures; the CLI always
# reads the real kernel paths and never accepts a replacement path from env.
linux_capacity_snapshot() {
  awk -v cg="$2" '
    function minimum(a,b) { return a < b ? a : b }
    function remaining(cap,used) { return cap > used ? cap-used : 0 }
    function read_counter(name, unlimited, value,status,extra,trailing) {
      status=(getline value < (cg "/" name)); trailing=(getline extra < (cg "/" name)); close(cg "/" name)
      if (status != 1 || trailing != 0 || (value != "max" && value !~ /^[0-9]+$/)) { bad=1; return 0 }
      if (value == "max") { if (!unlimited) bad=1; return -1 }
      return value+0
    }
    /^(MemTotal|MemAvailable|SwapTotal|SwapFree):/ {
      if (++seen[$1] != 1 || $2 !~ /^[0-9]+$/ || $3 != "kB" || NF != 3) bad=1
      v[$1]=$2+0
    }
    END {
      ht=v["MemTotal:"]; ha=v["MemAvailable:"]; st=v["SwapTotal:"]; sf=v["SwapFree:"]
      if (seen["MemTotal:"] != 1 || seen["MemAvailable:"] != 1 || seen["SwapTotal:"] != 1 || seen["SwapFree:"] != 1 || ht <= 0 || ha > ht || sf > st) bad=1
      cap=read_counter("memory.max",1); used=read_counter("memory.current",0)
      swap=read_counter("memory.swap.max",1); su=read_counter("memory.swap.current",0)
      if (cap == 0) bad=1
      if (bad) exit 1
      rt=cap < 0 ? ht : minimum(ht,cap/1024)
      ra=cap < 0 ? ha : minimum(ha,remaining(cap,used)/1024)
      wt=swap < 0 ? st : minimum(st,swap/1024)
      wa=swap < 0 ? sf : minimum(sf,remaining(swap,su)/1024)
      printf "%.0f %.0f %.0f %.0f %.0f %.0f %.0f %.0f\n",ht,ha,st,sf,int(rt),int(ra),int(wt),int(wa)
    }
  ' "$1"
}

linux_pressure_main() {
  local mode="check" snapshot ht ha st sf rt ra wt wa min_mib min_mem min_swap mem_pct swap_pct
  if (( $# > 1 )); then echo "Too many host-pressure arguments" >&2; return 1; fi
  case "${1:-}" in "") ;; --report) mode="report";; *) echo "Unknown host-pressure mode" >&2; return 1;; esac
  if ! snapshot="$(linux_capacity_snapshot /proc/meminfo /sys/fs/cgroup)"; then
    echo "Linux capacity is unknown or inconsistent; cannot establish build headroom" >&2
    [ "$mode" = report ] && return 0
    return 1
  fi
  read -r ht ha st sf rt ra wt wa <<< "$snapshot"
  min_mib="${CI_MIN_RESIDENT_MIB:-2048}"
  min_mem="${CI_MIN_FREE_MEM_PCT:-10}"
  min_swap="${CI_MIN_FREE_SWAP_PCT:-5}"
  if ! [[ "$min_mib" =~ ^[0-9]{1,6}$ && "$min_mem" =~ ^[0-9]{1,3}$ && "$min_swap" =~ ^[0-9]{1,3}$ ]]; then
    echo "Invalid Linux capacity threshold" >&2
    [ "$mode" = report ] && return 0
    return 1
  fi
  min_mib=$((10#$min_mib)); min_mem=$((10#$min_mem)); min_swap=$((10#$min_swap))
  if (( min_mib < 1 || min_mem > 100 || min_swap > 100 )); then
    echo "Invalid Linux capacity threshold" >&2
    [ "$mode" = report ] && return 0
    return 1
  fi
  mem_pct=$((ha * 100 / ht))
  swap_pct=100
  (( st == 0 )) || swap_pct=$((sf * 100 / st))
  printf 'Linux capacity: resident_available_mib=%s resident_ceiling_mib=%s swap_available_mib=%s swap_ceiling_mib=%s host_memory_free_pct=%s host_swap_free_pct=%s\n'     "$((ra / 1024))" "$((rt / 1024))" "$((wa / 1024))" "$((wt / 1024))" "$mem_pct" "$swap_pct"
  local failed=0
  if (( ra / 1024 < min_mib )); then
    echo "Insufficient resident build headroom: need ${min_mib} MiB; swap does not satisfy resident RAM" >&2
    failed=1
  fi
  if (( mem_pct < min_mem || swap_pct < min_swap )); then
    echo "Host memory or swap pressure exceeds the configured thresholds" >&2
    failed=1
  fi
  local gate="${CI_GATE_ON_LOAD:-0}" max_load="${CI_MAX_LOAD_PER_CORE:-4}" cores load lpc
  if ! [[ "$gate" =~ ^[01]$ && "$max_load" =~ ^[0-9]+([.][0-9]+)?$ ]]; then
    echo "Invalid Linux load threshold" >&2
    failed=1
  else
    cores="$(getconf _NPROCESSORS_ONLN 2>/dev/null || echo 0)"
    load="$(awk '{print $1}' /proc/loadavg 2>/dev/null)"
    if [[ "$cores" =~ ^[1-9][0-9]*$ && "$load" =~ ^[0-9]+([.][0-9]+)?$ ]]; then
      lpc="$(awk -v l="$load" -v c="$cores" 'BEGIN {printf "%.2f",l/c}')"
      printf 'Linux load_per_core=%s gate_on_load=%s\n' "$lpc" "$gate"
      if [ "$gate" = 1 ] && awk -v l="$lpc" -v m="$max_load" 'BEGIN {exit !(l > m)}'; then
        echo "Linux load exceeds the configured threshold" >&2; failed=1
      fi
    elif [ "$gate" = 1 ]; then
      echo "Cannot establish Linux load headroom" >&2; failed=1
    fi
  fi
  if (( failed )); then
    # Process names provide diagnosis without printing token-bearing argv.
    ps -eo rss=,comm= 2>/dev/null | sort -rn | head -5 || true
    echo "Wait for capacity or use an appropriate RAM class; preserve running jobs and applications" >&2
    [ "$mode" = report ] && return 0
    return 1
  fi
  echo "Linux worker has resident build headroom"
}

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
  set -uo pipefail
  linux_pressure_main "$@"
fi

#!/usr/bin/env bash
# Ralph Loop cost guard. Very rough — uses log size as a proxy for tokens.
# Claude Opus 4 pricing (approximation, update as needed):
#   input  $15 / 1M tokens
#   output $75 / 1M tokens
# Log bytes / 4 ≈ tokens (rough for English + code).
# Kit reference: docs/runbooks/kit-hardening-v1.md §Ralph
set -euo pipefail

mode="${1:-check}"
max_dollars="${2:-15}"
log_dir="${3:-.powerstack4/ralph-logs}"

case "$mode" in
  preflight)
    if ! command -v claude >/dev/null 2>&1; then
      echo "FATAL: 'claude' CLI not found in PATH. Ralph requires Claude Code CLI." >&2
      exit 1
    fi
    if [ -z "${ANTHROPIC_API_KEY:-}" ] && [ ! -f "$HOME/.claude/config.json" ]; then
      echo "WARN: No ANTHROPIC_API_KEY set and no ~/.claude/config.json. Auth may fail." >&2
    fi
    echo "cost-guard preflight OK (budget \$$max_dollars)"
    exit 0
    ;;
  check)
    [ -d "$log_dir" ] || { exit 0; }
    total_bytes=$(find "$log_dir" -type f -name 'iter-*.log' -exec wc -c {} + 2>/dev/null \
                    | tail -1 | awk '{print $1}')
    total_bytes="${total_bytes:-0}"
    # Mixed input+output approximation: $45 / 1M tokens avg → bytes/4 tokens
    # → total_bytes * 45 / (4 * 1_000_000)
    cents=$(( total_bytes * 45 / 40000 ))
    dollars=$(( cents / 100 ))
    echo "cost-guard: ~\$$dollars spent across logs in $log_dir (budget \$$max_dollars)"
    if [ "$dollars" -ge "$max_dollars" ]; then
      exit 1
    fi
    exit 0
    ;;
  *)
    echo "Usage: cost-guard.sh {preflight|check} <max_dollars> [log_dir]" >&2
    exit 2
    ;;
esac

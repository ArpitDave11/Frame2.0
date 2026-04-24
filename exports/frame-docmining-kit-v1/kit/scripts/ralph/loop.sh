#!/usr/bin/env bash
# Ralph Loop harness for FRAME DocMining Kit.
# Scoped to MECHANICAL Phase A tasks only (A-1 through A-9). Do NOT run on
# Phase B — UX decisions cannot be made by the loop without human input.
# Kit reference: docs/runbooks/kit-hardening-v1.md §Ralph
set -euo pipefail

cd "$(dirname "$0")/../.."

PROMPT_FILE=scripts/ralph/PROMPT.md
PROGRESS_FILE=scripts/ralph/progress.txt
LOG_DIR=.powerstack4/ralph-logs
MAX_ITERS=${RALPH_MAX_ITERS:-20}
MAX_DOLLARS=${RALPH_MAX_DOLLARS:-15}

mkdir -p "$LOG_DIR"
touch "$PROGRESS_FILE"

# Safety guardrails — fail loud if any are missing.
[ -f "$PROMPT_FILE" ] || { echo "FATAL: $PROMPT_FILE missing"; exit 1; }
[ -f docs/plans/2026-04-23-docmining-integration-ultraplan.md ] \
  || { echo "FATAL: ultra-plan missing"; exit 1; }
[ -f .claude/STANDING_PROTOCOL.md ] || { echo "FATAL: standing protocol missing"; exit 1; }

# Branch guard — refuse to run on main.
branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$branch" = "main" ]; then
  echo "FATAL: Ralph will not run on main. Create a phase-a branch first:"
  echo "  git checkout -b phase-a-docmining"
  exit 1
fi

echo "=== Ralph Loop: FRAME DocMining Phase A ==="
echo "Branch:       $branch"
echo "Max iters:    $MAX_ITERS"
echo "Max dollars:  \$$MAX_DOLLARS (estimated)"
echo "Completion:   <promise>COMPLETE</promise> in progress.txt"
echo

# Cost guard pre-flight.
bash scripts/ralph/cost-guard.sh preflight "$MAX_DOLLARS" || exit 1

i=0
while [ "$i" -lt "$MAX_ITERS" ]; do
  i=$((i+1))
  ts=$(date +%Y%m%dT%H%M%S)
  log="$LOG_DIR/iter-$(printf '%03d' "$i")-$ts.log"

  echo
  echo "--- Iteration $i / $MAX_ITERS  ($ts) ---"

  # Check completion marker BEFORE spending on another iteration.
  if grep -q '<promise>COMPLETE</promise>' "$PROGRESS_FILE"; then
    echo "COMPLETE marker found. Ralph exiting cleanly."
    exit 0
  fi

  # Fresh context per iteration. The prompt references static spec files
  # and a progress.txt the previous iteration wrote.
  cat "$PROMPT_FILE" | claude -p "$(cat)" 2>&1 | tee "$log"

  # Cost guard post-iteration (rough — based on log size heuristic).
  if ! bash scripts/ralph/cost-guard.sh check "$MAX_DOLLARS" "$LOG_DIR"; then
    echo "COST GUARD: stopping. Inspect $LOG_DIR and rerun with higher RALPH_MAX_DOLLARS if warranted."
    exit 2
  fi

  # Sanity check — did the iteration write anything?
  if ! git diff --quiet HEAD -- 2>/dev/null && ! grep -q "$ts" "$PROGRESS_FILE" 2>/dev/null; then
    echo "WARN: iteration $i produced diffs but did not update progress.txt."
  fi
done

echo
echo "Ralph reached MAX_ITERS=$MAX_ITERS without COMPLETE marker."
echo "Review $LOG_DIR and $PROGRESS_FILE, then rerun or escalate."
exit 3

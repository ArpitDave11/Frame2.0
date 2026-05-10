#!/usr/bin/env bash
# H6 — Require taskmaster task tracking for DocIntel-scoped commits.
#
# If the commit touches src/components/docIntel/ or src/services/docIntel/
# or src/stores/docIntelStore.ts, verify that .taskmaster/tasks/ has at
# least one task file with status "in-progress" or "done".
#
# This prevents ad-hoc implementation without task tracking.
# Bypass (humans only): SKIP_TASKMASTER=1 git commit ...

set -euo pipefail

if [ "${SKIP_TASKMASTER:-}" = "1" ]; then
    exit 0
fi

# Check if any staged files are DocIntel-scoped
DOCINTEL_FILES=$(git diff --cached --name-only | grep -E "(docIntel|docIntelStore)" || true)

if [ -z "$DOCINTEL_FILES" ]; then
    exit 0  # No DocIntel files — skip check
fi

# Check if taskmaster has any tasks
TASK_DIR=".taskmaster/tasks"
if [ ! -d "$TASK_DIR" ]; then
    echo ""
    echo "BLOCKED by kit-hardening-v1 (H6 require-taskmaster-tracking.sh)"
    echo ""
    echo "DocIntel-scoped files are being committed but no taskmaster tasks exist."
    echo ""
    echo "Required action:"
    echo "  1. Write a PRD to .taskmaster/docs/<plan>-prd.txt"
    echo "  2. Run mcp__task-master__parse_prd to create tasks"
    echo "  3. Use set_task_status to track progress"
    echo "  4. Then commit"
    echo ""
    echo "Bypass (humans only): SKIP_TASKMASTER=1 git commit ..."
    echo ""
    exit 1
fi

# Has at least one task file — pass
exit 0

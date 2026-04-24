#!/usr/bin/env bash
# H3 — Protect test files from being deleted or stubbed to make suites pass.
# Blocks Edit/Write/MultiEdit targeting test files unless explicitly authorized.
# Kit reference: docs/runbooks/kit-hardening-v1.md
set -euo pipefail

input=$(cat)
file_path=$(printf '%s' "$input" | python3 -c '
import json, sys
try:
    data = json.load(sys.stdin)
    print(data.get("tool_input", {}).get("file_path", ""))
except Exception:
    print("")
' 2>/dev/null || printf '')

[ -z "$file_path" ] && exit 0

proj="${CLAUDE_PROJECT_DIR:-$PWD}"
rel="${file_path#$proj/}"

# Bypass for humans.
if [ "${KIT_ALLOW_TEST_EDIT:-0}" = "1" ] && [ -t 0 ]; then
  exit 0
fi

# Test file patterns.
is_test=0
case "$rel" in
  *.test.ts|*.test.tsx|*.test.js|*.test.jsx) is_test=1 ;;
  *.spec.ts|*.spec.tsx|*.spec.js|*.spec.jsx) is_test=1 ;;
  **/tests/**|**/__tests__/**|**/test/**)    is_test=1 ;;
  services/docmining/tests/**)               is_test=1 ;;
  e2e/**)                                    is_test=1 ;;
esac

[ "$is_test" = "0" ] && exit 0

# Allow CREATING new test files (file does not yet exist).
# Block only EDITS to existing tests (which could stub/delete assertions).
if [ ! -f "$file_path" ]; then
  exit 0
fi

cat >&2 <<EOF
BLOCKED by kit-hardening-v1 (H3 pre-edit-protect-tests.sh)

  File: $rel

You attempted to edit an EXISTING test file. Editing tests to make them
pass is the #1 phantom-progress pattern. If the test is genuinely wrong:

  1. Ask the human to confirm the test is wrong, not the implementation.
  2. Human sets KIT_ALLOW_TEST_EDIT=1 and re-runs.

If you only need to ADD tests, create a NEW file — that is allowed.
If the implementation is wrong, fix the implementation, not the test.
EOF
exit 2

#!/usr/bin/env bash
# H5 — Require .powerstack4/task_plan.md to be updated in the same commit
# when any DocMining-scoped source file is modified.
# Bypass (human only, from TTY): SKIP_JOURNAL=1 git commit ...
# Kit reference: docs/runbooks/kit-hardening-v1.md
set -euo pipefail

# Skip for humans with explicit env var + TTY.
if [ "${SKIP_JOURNAL:-0}" = "1" ] && [ -t 0 ]; then
  exit 0
fi

staged=$(git diff --cached --name-only)

# Is this commit DocMining-scoped?
scope_touched=0
if printf '%s\n' "$staged" | grep -qE '^(services/docmining/|src/services/docminingClient|src/components/docmining/|vite\.config\.ts$)'; then
  scope_touched=1
fi

# uiStore.ts is in scope only when ModalId is actually being extended with docUpload.
if printf '%s\n' "$staged" | grep -q '^src/stores/uiStore\.ts$'; then
  if git diff --cached src/stores/uiStore.ts | grep -q 'docUpload'; then
    scope_touched=1
  fi
fi

[ "$scope_touched" = "0" ] && exit 0

# Journal must be in the same commit.
if printf '%s\n' "$staged" | grep -qE '^\.powerstack4/task_plan\.md$'; then
  exit 0
fi

cat >&2 <<'EOF'
BLOCKED by kit-hardening-v1 (H5 require-journal-update.sh)

DocMining-scoped files are being committed without a .powerstack4/task_plan.md
update in the same commit.

Required action:
  1. Append a one-paragraph entry to .powerstack4/task_plan.md describing:
     - Which atomic task (A-N / B-N) this commit satisfies
     - Files touched and lines changed
     - Verification output (test/lint/typecheck result)
  2. git add .powerstack4/task_plan.md
  3. Re-run git commit

Bypass (humans only, from interactive TTY):
  SKIP_JOURNAL=1 git commit ...

Rationale: per-task journaling is the cheapest defense against phantom
progress. See docs/runbooks/kit-hardening-v1.md §2.
EOF
exit 1

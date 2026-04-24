#!/usr/bin/env bash
# H2 — PreToolUse Bash-command deny for write-redirects against protected paths.
# Catches sed -i, cat >, tee, echo >, >> that the H1 edit hook cannot see.
# Kit reference: docs/runbooks/kit-hardening-v1.md
set -euo pipefail

input=$(cat)
command=$(printf '%s' "$input" | python3 -c '
import json, sys
try:
    data = json.load(sys.stdin)
    print(data.get("tool_input", {}).get("command", ""))
except Exception:
    print("")
' 2>/dev/null || printf '')

[ -z "$command" ] && exit 0

# Bypass for humans from TTY.
if [ "${KIT_SKIP_PATH_PROTECT:-0}" = "1" ] && [ -t 0 ]; then
  exit 0
fi

# Paths to protect. Match when a write-redirect TARGETS one of these.
# Using regex to require the path appears right after a redirect/write op,
# not merely anywhere in the command (which caused false positives on
# test harnesses that echo JSON containing protected path names).
PROTECTED_PATH_REGEX='(src/components/welcome/|src/pipeline/orchestrator|src/pipeline/stages/|(^|[[:space:]])\.env($|[[:space:]])|\.powerstack4/\.phase|\.powerstack4/\.action-count|\.taskmaster/tasks/|package-lock\.json)'

# Write-op followed (possibly with whitespace) by a protected target.
# Covers: >foo >>foo tee foo tee -a foo sed -i foo perl -i foo cat >foo mv X foo cp X foo dd of=foo
TARGETED_WRITE_REGEX="(>>?[[:space:]]*[^|&;[:space:]]*${PROTECTED_PATH_REGEX}|tee[[:space:]]+(-a[[:space:]]+)?[^|&;[:space:]]*${PROTECTED_PATH_REGEX}|(sed|perl)[[:space:]]+-i[[:space:]]+[^|&;]*${PROTECTED_PATH_REGEX}|(mv|cp)[[:space:]]+[^|&;]+${PROTECTED_PATH_REGEX}|dd[[:space:]]+[^|&;]*of=[^|&;[:space:]]*${PROTECTED_PATH_REGEX}|rm[[:space:]]+-[rfv]+[[:space:]]+[^|&;]*${PROTECTED_PATH_REGEX})"

if printf '%s' "$command" | grep -qE "$TARGETED_WRITE_REGEX"; then
  cat >&2 <<EOF
BLOCKED by kit-hardening-v1 (H2 pre-bash-protect-paths.sh)

  Command contains a write-redirect targeting a protected path:
    $(printf '%s' "$command" | head -c 200)

If you need to touch this via shell, the human can set
KIT_SKIP_PATH_PROTECT=1 in their shell (TTY required).
EOF
  exit 2
fi

# Also block --no-verify on git commit (bypass culture defence).
if printf '%s' "$command" | grep -qE 'git +commit.*--no-verify'; then
  cat >&2 <<EOF
BLOCKED by kit-hardening-v1 (H2): 'git commit --no-verify' disables pre-commit hooks.

If a pre-commit hook is failing, fix the underlying issue, don't skip the hook.
Only the human may skip, by running git commit --no-verify themselves from a TTY.
EOF
  exit 2
fi

exit 0

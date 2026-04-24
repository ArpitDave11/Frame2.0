#!/usr/bin/env bash
# H1 git-level backstop — catch scope violations that slipped past the
# Claude Code PreToolUse hook (e.g., human commits, other tools).
# Kit reference: docs/runbooks/kit-hardening-v1.md
set -euo pipefail

# Bypass for humans.
if [ "${KIT_SKIP_PATH_PROTECT:-0}" = "1" ] && [ -t 0 ]; then
  exit 0
fi

staged=$(git diff --cached --name-only)

# Only enforce on DocMining branches / in-flight work.
branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
docmining_active=0
case "$branch" in
  *docmining*|*phase-a*|*phase-b*) docmining_active=1 ;;
esac
# Also active if DocMining files are part of this commit.
if printf '%s\n' "$staged" | grep -qE '^(services/docmining/|src/services/docminingClient|src/components/docmining/)'; then
  docmining_active=1
fi

[ "$docmining_active" = "0" ] && exit 0

# Violation: WelcomeScreen touched during DocMining work.
if printf '%s\n' "$staged" | grep -qE '^src/components/welcome/'; then
  cat >&2 <<'EOF'
BLOCKED by kit-hardening-v1 (H1-git block-scope-violation.sh)

Locked decision #5: DocMining upload trigger goes in WorkspaceHeader ONLY.
WelcomeScreen must NOT be modified during DocMining work.

If you believe this is intentional and correct, human override:
  KIT_SKIP_PATH_PROTECT=1 git commit ...
EOF
  exit 1
fi

exit 0

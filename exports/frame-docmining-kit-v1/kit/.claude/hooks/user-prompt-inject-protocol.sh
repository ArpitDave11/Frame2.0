#!/usr/bin/env bash
# H6 — Inject the Standing Protocol into every user turn's context.
# Survives compaction, re-asserts scope guards per turn.
# Keep the payload small (~40 lines) to minimize per-turn token cost.
# Kit reference: docs/runbooks/kit-hardening-v1.md

set -euo pipefail

proto="${CLAUDE_PROJECT_DIR:-$PWD}/.claude/STANDING_PROTOCOL.md"

# Only inject when actively working on DocMining. Detect via:
#   (a) current branch name contains "docmining" / "phase-a" / "phase-b", OR
#   (b) any DocMining file is in git status.
branch=$(git -C "${CLAUDE_PROJECT_DIR:-$PWD}" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
status=$(git -C "${CLAUDE_PROJECT_DIR:-$PWD}" status --porcelain 2>/dev/null || echo "")

relevant=0
case "$branch" in
  *docmining*|*phase-a*|*phase-b*|main) relevant=1 ;;
esac
if printf '%s' "$status" | grep -qE '(services/docmining|docminingClient|components/docmining)'; then
  relevant=1
fi

[ "$relevant" = "0" ] && exit 0
[ ! -f "$proto" ] && exit 0

# stdout becomes additionalContext for this turn.
cat "$proto"
exit 0

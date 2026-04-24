#!/usr/bin/env bash
# verify-docmining-stack.sh
# Sanity check: confirm every tool, skill, MCP, and plugin required by the
# DocMining execution runbook is present and reachable. Run BEFORE starting
# Phase A. Exits 0 if ready, non-zero with a summary otherwise.

set -u
PASS=0
FAIL=0
WARN=0

green() { printf "\033[32m%s\033[0m" "$1"; }
red()   { printf "\033[31m%s\033[0m" "$1"; }
yellow(){ printf "\033[33m%s\033[0m" "$1"; }

check() {
  local label="$1"; shift
  if "$@" >/dev/null 2>&1; then
    echo "[$(green PASS)] $label"
    PASS=$((PASS+1))
  else
    echo "[$(red FAIL)] $label"
    FAIL=$((FAIL+1))
  fi
}

check_warn() {
  local label="$1"; shift
  if "$@" >/dev/null 2>&1; then
    echo "[$(green PASS)] $label"
    PASS=$((PASS+1))
  else
    echo "[$(yellow WARN)] $label (optional)"
    WARN=$((WARN+1))
  fi
}

echo "=== DocMining Stack Verification ==="
echo

echo "-- Runtimes --"
check "Python >= 3.11 available" bash -c '
  for p in python3.13 python3.12 python3.11 python3; do
    command -v "$p" >/dev/null 2>&1 || continue
    "$p" -c "import sys; sys.exit(0 if sys.version_info >= (3,11) else 1)" && exit 0
  done
  exit 1
'
check "Node >= 20"     bash -c 'node -v | grep -Eq "^v(2[0-9]|[3-9][0-9])"'
check "Git"            git --version
check "uv (Python pkg manager)" bash -c 'command -v uv || command -v pipx'

echo
echo "-- Repo state --"
check "FRAME2.0 repo present"            test -d /Users/arpit/Desktop/FRAME2.0/.git
check "CLAUDE.md present (auto-context)" test -f /Users/arpit/Desktop/FRAME2.0/CLAUDE.md
check "Ultra-plan present"               test -f /Users/arpit/Desktop/FRAME2.0/docs/plans/2026-04-23-docmining-integration-ultraplan.md
check "Design doc present"               test -f /Users/arpit/Desktop/FRAME2.0/docs/plans/2026-04-23-docmining-integration-design.md
check "DocMining PRD present"            test -f /Users/arpit/Desktop/FRAME2.0/.taskmaster/docs/docmining-prd.txt
check "Execution runbook present"        test -f /Users/arpit/Desktop/FRAME2.0/docs/runbooks/docmining-execution-runbook.md
check "Deep-review runbook present"      test -f /Users/arpit/Desktop/FRAME2.0/docs/runbooks/deep-review-a10.md
check "Reference weights directory"      test -d /Users/arpit/Desktop/FRAME2.0/project_working_for_reference/services/document_processing_service/plugins/docling-models

echo
echo "-- Claude tooling --"
check "superpowers plugin"          test -d "$HOME/.claude/plugins/cache/claude-plugins-official/superpowers"
check "powerstack4 skill"           test -d "$HOME/.claude/skills/powerstack4"
check "wrap-up skill"               test -d "$HOME/.claude/skills/wrap-up"
check "Taskmaster config"           test -f /Users/arpit/Desktop/FRAME2.0/.taskmaster/config.json
check "powerstack4 state dir"       test -d /Users/arpit/Desktop/FRAME2.0/.powerstack4

echo
echo "-- Optional (additive) --"
check_warn "episodic-memory plugin" test -d "$HOME/.claude/plugins/cache/superpowers-marketplace/episodic-memory"
check_warn "Docling installed in local venv" bash -c 'docling --version'
check_warn "docling-tools CLI"      bash -c 'command -v docling-tools'

echo
echo "-- Summary --"
printf "  Passed: %s   Failed: %s   Warnings: %s\n" "$(green $PASS)" "$(red $FAIL)" "$(yellow $WARN)"

if [ "$FAIL" -gt 0 ]; then
  echo
  echo "Blocking failures found. Fix these before running Phase A."
  echo "Most likely fixes:"
  echo "  - Missing plan files: git pull or re-commit plan docs"
  echo "  - Missing CLAUDE.md: we just created it, run 'git status' to confirm"
  echo "  - Missing Python 3.11: brew install python@3.12 (macOS) or pyenv/asdf"
  echo "  - Missing uv: brew install uv (recommended) or pipx install uv"
  exit 1
fi

echo
echo "$(green 'Stack ready.') Next: /plugin install episodic-memory@superpowers-marketplace (optional), then begin task A-0."
exit 0

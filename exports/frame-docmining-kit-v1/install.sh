#!/usr/bin/env bash
# Installer for frame-docmining-kit-v1.
# Run from the TARGET repo root:
#   /path/to/frame-docmining-kit-v1/install.sh
set -euo pipefail

# Resolve kit source dir (parent of this script).
KIT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KIT="$KIT_ROOT/kit"
TARGET="$PWD"

say()  { printf '\033[1;36m[kit]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[kit]\033[0m %s\n' "$*" >&2; }
die()  { printf '\033[1;31m[kit]\033[0m %s\n' "$*" >&2; exit 1; }

# --- Preflight ---------------------------------------------------------------

[ -d "$KIT" ] || die "kit/ not found at $KIT — are you running this from the right place?"
[ -d "$TARGET/.git" ] || die "$TARGET is not a git repo. Run this from the root of your project."

for cmd in python3 git; do
  command -v "$cmd" >/dev/null || die "$cmd is required but not installed."
done

HAVE_PRE_COMMIT=1
command -v pre-commit >/dev/null || { HAVE_PRE_COMMIT=0; warn "pre-commit not found — will skip git-hook activation. Install with: brew install pre-commit"; }

# --- Confirm overwrites ------------------------------------------------------

CONFLICTS=()
for path in \
  ".claude/settings.json" \
  ".claude/STANDING_PROTOCOL.md" \
  ".pre-commit-config.yaml" \
; do
  [ -e "$TARGET/$path" ] && CONFLICTS+=("$path")
done

for f in "$KIT"/.claude/hooks/*; do
  dest=".claude/hooks/$(basename "$f")"
  [ -e "$TARGET/$dest" ] && CONFLICTS+=("$dest")
done

if [ ${#CONFLICTS[@]} -gt 0 ]; then
  warn "The following files already exist and will be OVERWRITTEN:"
  for p in "${CONFLICTS[@]}"; do warn "  $p"; done
  printf "Continue? [y/N] "
  read -r reply
  [ "$reply" = "y" ] || [ "$reply" = "Y" ] || die "Aborted."
fi

# --- Copy --------------------------------------------------------------------

say "Copying Claude Code hooks + settings..."
mkdir -p "$TARGET/.claude/hooks"
cp "$KIT"/.claude/settings.json        "$TARGET/.claude/"
cp "$KIT"/.claude/STANDING_PROTOCOL.md "$TARGET/.claude/"
cp "$KIT"/.claude/hooks/*              "$TARGET/.claude/hooks/"

say "Copying git pre-commit config + helper scripts..."
cp "$KIT"/.pre-commit-config.yaml "$TARGET/"
mkdir -p "$TARGET/scripts/hooks" "$TARGET/scripts/ralph" "$TARGET/docs/runbooks"
cp "$KIT"/scripts/hooks/*.sh       "$TARGET/scripts/hooks/"
cp "$KIT"/scripts/ralph/*          "$TARGET/scripts/ralph/"
cp "$KIT"/docs/runbooks/kit-hardening-v1.md "$TARGET/docs/runbooks/"

say "Marking scripts executable..."
chmod +x "$TARGET"/.claude/hooks/*.sh "$TARGET"/.claude/hooks/*.py
chmod +x "$TARGET"/scripts/hooks/*.sh "$TARGET"/scripts/ralph/*.sh

# --- .gitignore --------------------------------------------------------------

GIT_IGN="$TARGET/.gitignore"
touch "$GIT_IGN"
add_ignore() {
  local line="$1"
  grep -qxF "$line" "$GIT_IGN" || printf '%s\n' "$line" >> "$GIT_IGN"
}
say "Adding kit entries to .gitignore..."
add_ignore ""
add_ignore "# kit-hardening-v1"
add_ignore ".claude/settings.local.json"
add_ignore ".powerstack4/ralph-logs/"

# --- Activate pre-commit -----------------------------------------------------

if [ "$HAVE_PRE_COMMIT" = "1" ]; then
  say "Activating git pre-commit hooks..."
  ( cd "$TARGET" && pre-commit install )
else
  warn "Skipped 'pre-commit install'. After installing pre-commit, run:"
  warn "    cd $TARGET && pre-commit install"
fi

# --- Smoke test --------------------------------------------------------------

say "Running smoke tests..."
if ( cd "$TARGET" && bash scripts/hooks/test-hooks.sh ); then
  say "Smoke tests passed."
else
  warn "Smoke tests failed. This is expected if you've customized the protected-path regex."
  warn "Review scripts/hooks/test-hooks.sh — it hardcodes FRAME2.0-specific paths."
fi

# --- Done --------------------------------------------------------------------

cat <<EOF

$(tput bold 2>/dev/null)Kit installed.$(tput sgr0 2>/dev/null)

Next steps:
  1. Review CUSTOMIZATION.md and edit hooks for your project's paths/stack.
  2. Restart your Claude Code CLI (hooks are read at startup).
  3. Read docs/runbooks/kit-hardening-v1.md for the operator manual.
  4. Make a scoped edit and confirm a hook fires (e.g. try to edit a protected path).

Bypass env vars (human-only, TTY required):
  KIT_SKIP_PATH_PROTECT=1    # H1/H2
  KIT_ALLOW_TEST_EDIT=1      # H3
  KIT_SKIP_STOP_TYPECHECK=1  # H4
  SKIP_JOURNAL=1             # H5

EOF

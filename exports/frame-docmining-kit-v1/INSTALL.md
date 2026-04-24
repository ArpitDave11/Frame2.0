# Installing the FRAME DocMining Kit

## Prerequisites

| Tool | Version | Why |
|---|---|---|
| Claude Code CLI | latest | Hooks are a Claude Code feature |
| Python 3.8+ | any modern | H4 (`stop-typecheck.py`) + H2 payload parsing |
| Node.js + npm | 18+ | H4 invokes local `tsc` binary |
| Git | 2.x | Pre-commit hooks |
| `pre-commit` framework | 3.x | Install via `brew install pre-commit` or `pip install pre-commit` |
| `jq` (optional) | any | Nicer debug output; not required |

Verify:
```bash
claude --version
python3 --version
git --version
pre-commit --version
```

## One-shot install (recommended)

```bash
cd /path/to/your/repo
/path/to/frame-docmining-kit-v1/install.sh
```

The installer:
1. Refuses to run outside a git repo.
2. Warns before overwriting any existing `.claude/settings.json`, `.claude/hooks/*`, or `.pre-commit-config.yaml`.
3. Copies kit files into place.
4. Makes scripts executable.
5. Runs `pre-commit install` to activate git hooks.
6. Runs `kit/scripts/hooks/test-hooks.sh` as a smoke test (17 tests must pass).
7. Prints next steps.

## Manual install

If you prefer to see every step:

```bash
# 1. Copy Claude Code hooks and settings.
cp -r kit/.claude/. .claude/

# 2. Copy git pre-commit config + helper scripts.
cp kit/.pre-commit-config.yaml .
mkdir -p scripts/hooks scripts/ralph docs/runbooks
cp kit/scripts/hooks/*.sh scripts/hooks/
cp kit/scripts/ralph/* scripts/ralph/
cp kit/docs/runbooks/kit-hardening-v1.md docs/runbooks/

# 3. Make everything executable.
chmod +x .claude/hooks/*.sh .claude/hooks/*.py
chmod +x scripts/hooks/*.sh scripts/ralph/*.sh

# 4. Install pre-commit.
pre-commit install    # writes .git/hooks/pre-commit

# 5. Add ignore entries.
cat >> .gitignore <<'EOF'

# kit-hardening-v1
.claude/settings.local.json
.powerstack4/ralph-logs/
EOF

# 6. Smoke-test.
bash scripts/hooks/test-hooks.sh
#   Expect: "Summary: 17 passed, 0 failed"
```

## Verify

From the target repo root:

```bash
# Claude Code hook end-to-end:
echo '{"tool_input":{"file_path":"'"$PWD"'/src/components/welcome/foo.tsx"}}' \
  | CLAUDE_PROJECT_DIR="$PWD" bash .claude/hooks/pre-edit-protect-paths.sh
echo "exit: $?"   # expect 2 if your repo has a welcome/ dir defined as protected

# Git hook end-to-end:
pre-commit run --all-files
```

## Uninstall

```bash
rm -rf .claude/hooks .claude/settings.json .claude/STANDING_PROTOCOL.md
rm .pre-commit-config.yaml
rm -rf scripts/ralph
rm scripts/hooks/block-scope-violation.sh scripts/hooks/require-journal-update.sh scripts/hooks/test-hooks.sh
rm docs/runbooks/kit-hardening-v1.md
pre-commit uninstall
```

Nothing the kit writes lives outside those directories.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Hooks don't fire in Claude Code | Restart the `claude` CLI; it reads `settings.json` at startup |
| H4 blocks Stop on unrelated branches | Check branch guard in `stop-typecheck.py` matches your naming convention |
| `pre-commit` hooks don't run | Re-run `pre-commit install`; verify `.git/hooks/pre-commit` exists |
| `test-hooks.sh` fails | Check regex in `pre-edit-protect-paths.sh` for your repo's protected paths |
| "jq: command not found" | `brew install jq` (optional, nothing hard-depends on it) |
| H6 injection not visible | It's injected invisibly into the context; you see its effect in Claude's behavior, not output |

## Coexistence with existing skills/hooks

- Multiple hooks can register for the same event; Claude Code runs them all.
- Kit hooks only `exit 2` (block) on their specific violation; otherwise `exit 0`.
- If you already have user-level hooks (e.g. from `powerstack4`), both will fire. Kit hooks never write to other skills' state directories.

See `kit/docs/runbooks/kit-hardening-v1.md` § "Coexistence" for details.

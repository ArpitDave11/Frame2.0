# Kit Hardening v1 — Changelog and Operator Guide

**Status:** committed as `kit-hardening-v1`
**Purpose:** convert ~40% advisory controls in the FRAME DocMining Kit into
mechanically-enforced ones, per the April 2026 enforcement research doc.

## What shipped

### Claude Code hooks (project-level, `.claude/settings.json`)

| ID | Event | Hook | What it enforces |
|---|---|---|---|
| H1 | PreToolUse (Edit/Write/MultiEdit/NotebookEdit) | `.claude/hooks/pre-edit-protect-paths.sh` | Blocks writes to WelcomeScreen, pipeline internals, .env, Taskmaster tasks, package-lock |
| H2 | PreToolUse (Bash) | `.claude/hooks/pre-bash-protect-paths.sh` | Blocks shell write-redirects (sed -i, tee, >, >>) against same paths; blocks `git commit --no-verify` |
| H3 | PreToolUse (Edit/Write/MultiEdit/NotebookEdit) | `.claude/hooks/pre-edit-protect-tests.sh` | Blocks edits to EXISTING test files (creating new tests is allowed) |
| H4 | Stop | `.claude/hooks/stop-typecheck.py` | Forces TypeScript typecheck to pass before session termination. Scoped to DocMining-touched files only. |
| H6 | UserPromptSubmit | `.claude/hooks/user-prompt-inject-protocol.sh` | Injects `.claude/STANDING_PROTOCOL.md` into every turn's context |

### Git pre-commit hooks (`.pre-commit-config.yaml`)

| ID | Hook | What it enforces |
|---|---|---|
| H5 | `scripts/hooks/require-journal-update.sh` | Commits touching DocMining-scoped files must include a `.powerstack4/task_plan.md` update |
| — | `scripts/hooks/block-scope-violation.sh` | Backstop for H1 at commit level (catches non-Claude-Code commits too) |
| — | pre-commit/pre-commit-hooks stock | merge conflicts, large files, private keys, trailing whitespace |

### Ralph Loop harness (`scripts/ralph/`)

| File | Role |
|---|---|
| `loop.sh` | Main harness — fresh `claude -p` per iteration, 20-iter / $15 default caps |
| `PROMPT.md` | Per-iteration instructions (fresh context reads this every time) |
| `cost-guard.sh` | Preflight + per-iteration spend estimate |
| `progress.txt` | Iteration-to-iteration state (the only persistence between runs) |
| `README.md` | When to use, when NOT to use, how to invoke |

## Installation

```bash
# 1. Install pre-commit (one-time per machine).
brew install pre-commit

# 2. Activate the repo's pre-commit hooks.
cd /Users/arpit/Desktop/FRAME2.0
pre-commit install

# 3. Make all kit scripts executable.
chmod +x .claude/hooks/*.sh .claude/hooks/*.py
chmod +x scripts/hooks/*.sh scripts/ralph/*.sh

# 4. Verify.
./scripts/verify-docmining-stack.sh
```

## Coexistence with powerstack4

Powerstack4's user-level hooks (`~/.claude/skills/powerstack4/scripts/`) and
kit-hardening-v1's project-level hooks both fire on each event. Both return
exit 0 in the normal case. Kit hooks may return exit 2 to block — that is
by design and does not interfere with powerstack4's counter logic.

Specifically:
- **PreToolUse**: powerstack4 prints task-plan context → kit hooks evaluate
  scope. Order is undefined but irrelevant (both are read-only on the
  tool call itself).
- **PostToolUse**: only powerstack4 is registered; kit does not add any.
- **Stop**: powerstack4 prints a final-offload reminder (exit 0). Kit's H4
  runs typecheck; exit 2 only on failure.

No state-file conflicts: kit hooks never write to `.powerstack4/*`.

## Bypass table (human-only escapes)

Every gate has an explicit, audited bypass. All bypasses require a TTY
(agents do not have one, so they cannot trigger them):

| Gate | Bypass env var | Scope |
|---|---|---|
| H1 path protect (Claude) | `KIT_SKIP_PATH_PROTECT=1` | PreToolUse hook only |
| H1 git backstop          | `KIT_SKIP_PATH_PROTECT=1 git commit ...` | Single commit |
| H2 Bash deny             | `KIT_SKIP_PATH_PROTECT=1` | Bash command + commit |
| H3 test protect          | `KIT_ALLOW_TEST_EDIT=1`  | Single Edit call |
| H4 Stop typecheck        | `KIT_SKIP_STOP_TYPECHECK=1` | Single stop |
| H5 journal required      | `SKIP_JOURNAL=1 git commit ...` | Single commit |

Every use of a bypass should be noted in the commit message — e.g.
`(bypass: KIT_ALLOW_TEST_EDIT — test was asserting wrong thing, confirmed with human)`.

## Testing the hooks (manual smoke)

```bash
# H1: should exit 2 with stderr message.
echo '{"tool_input":{"file_path":"/Users/arpit/Desktop/FRAME2.0/src/components/welcome/foo.tsx"}}' \
  | CLAUDE_PROJECT_DIR=/Users/arpit/Desktop/FRAME2.0 bash .claude/hooks/pre-edit-protect-paths.sh
echo "exit: $?"  # expect 2

# H1: should exit 0 for an in-scope file.
echo '{"tool_input":{"file_path":"/Users/arpit/Desktop/FRAME2.0/src/components/docmining/DocUploadModal.tsx"}}' \
  | CLAUDE_PROJECT_DIR=/Users/arpit/Desktop/FRAME2.0 bash .claude/hooks/pre-edit-protect-paths.sh
echo "exit: $?"  # expect 0

# H2: should exit 2 on a bash command that writes to .env.
echo '{"tool_input":{"command":"echo FOO=bar >> .env"}}' \
  | bash .claude/hooks/pre-bash-protect-paths.sh
echo "exit: $?"  # expect 2

# H5: stage a DocMining file without journal, should block.
# (Run in a scratch branch so it doesn't actually commit.)
```

## Ralph Loop quickstart

See `scripts/ralph/README.md`. Short version:

```bash
git checkout -b phase-a-docmining
./scripts/ralph/loop.sh
```

Default caps: 20 iterations, $15 spend. Scoped to Phase A only (Ralph refuses
judgment-heavy Phase B work).

## What's NOT in this hardening pass

Per research-doc Phase 2/3, these are deferred:
- Managed-settings deployment (single-user dev, not team)
- F-ID traceability via shtracer (overkill for 20 MVP requirements)
- SessionStart compact re-injection (powerstack4 handles session resume)
- Task-state-machine frontmatter (Taskmaster covers this)
- Verifier subagent via Stop(agent) type (deep-review-a10.md covers this at checkpoints)
- Observability stack (premature — we're in dev, not running agents headless)

Revisit if the kit is adapted for team use or for a multi-month project.

## Residual gaps (cannot be mechanically closed)

Per the research doc §9:
- Semantic correctness of tests (hooks protect tests; humans verify intent)
- UX/aesthetic judgment
- Creative bypasses of hooks (review `.claude/settings.json` in PRs)
- Context summarization losses (partially mitigated by H6 UserPromptSubmit injection)

These fall to human review at A-10 / B-10 checkpoints.

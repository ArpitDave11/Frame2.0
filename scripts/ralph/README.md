# Ralph Loop — FRAME DocMining Phase A

## What it is

A bash harness that runs `claude -p` in a loop, each iteration with a FRESH
context window. The agent reads the spec + progress, picks the next atomic
task, implements it, commits, and exits. The loop repeats until a
`<promise>COMPLETE</promise>` marker appears.

Source of pattern: Geoffrey Huntley's Ralph Wiggum Loop
(https://ghuntley.com/ralph/), formalized as a Claude Code plugin by
Anthropic in December 2025.

## When to use this

**Use for:** Phase A (A-0 → A-10). Mechanical, spec-driven work with clear
verification. Scaffolding FastAPI services, wiring configs, writing unit
tests against documented interfaces.

**Do NOT use for:**
- Phase B (has UX decisions — modal layout, button placement nuances).
- Any work where the ultra-plan leaves decisions open.
- Greenfield design.

## How to run

```bash
# 1. Checkout a phase branch (Ralph refuses to run on main).
git checkout -b phase-a-docmining

# 2. Install pre-commit hooks (one-time, if not already done).
pre-commit install

# 3. Verify kit-hardening-v1 hooks are active.
./scripts/verify-docmining-stack.sh

# 4. Run Ralph. Default caps: 20 iterations, $15 spend.
./scripts/ralph/loop.sh

# Optional overrides:
RALPH_MAX_ITERS=30 RALPH_MAX_DOLLARS=25 ./scripts/ralph/loop.sh
```

Logs land in `.powerstack4/ralph-logs/iter-<NNN>-<ts>.log`.
Progress tracked in `scripts/ralph/progress.txt`.

## Exit codes

| Code | Meaning |
|---|---|
| 0    | COMPLETE marker emitted — Phase A done |
| 1    | Fatal preflight / setup error |
| 2    | Cost guard triggered — inspect logs, optionally rerun with higher cap |
| 3    | MAX_ITERS reached without completion — escalate to human |

## Safety features

- **Branch guard** — refuses to run on `main`.
- **Cost guard** — stops when estimated spend reaches `$RALPH_MAX_DOLLARS`.
- **Iteration cap** — stops at `$RALPH_MAX_ITERS` regardless.
- **Hook-enforced scope** — PreToolUse hooks prevent edits to WelcomeScreen,
  pipeline internals, test files, .env.
- **No-verify ban** — H2 hook blocks `git commit --no-verify`.
- **BLOCKED detection** — 2+ consecutive BLOCKED markers halt the loop.

## What Ralph CANNOT catch

- Tests that exist but assert nothing (protect-tests hook helps).
- Semantically wrong implementations that happen to pass the written tests.
- Prompt injections in files the agent reads (never point Ralph at untrusted
  input).

## Aborting

Ctrl-C. The harness is a plain bash loop — no daemons, no background
processes. Uncommitted work from the current iteration is lost; prior
iterations' commits are safe in git.

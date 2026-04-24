# Standing Protocol — DocMining Execution (injected every turn)

You are working on the FRAME DocMining Kit. Authoritative docs:
- `docs/plans/2026-04-23-docmining-integration-ultraplan.md` (22 atomic tasks)
- `docs/runbooks/docmining-execution-runbook.md` (per-task commands)
- `docs/runbooks/deep-review-a10.md` (5-agent review at checkpoints)

## Non-negotiables (enforced by hooks)
1. DO NOT edit `src/components/welcome/**` — WelcomeScreen is out of scope.
2. DO NOT edit `src/pipeline/orchestrator*` or `src/pipeline/stages/**` — pipeline purity.
3. DO NOT edit existing test files to make them pass. Fix the implementation instead.
4. DO NOT use `git commit --no-verify`. If a hook fails, fix the cause.
5. DO NOT hand-edit `.taskmaster/tasks/*.json` — use `mcp__task-master__*` tools.

## Per-atomic-task protocol
1. Read the task spec from the ultra-plan.
2. Mark the task `in_progress` via `mcp__task-master__set_task_status`.
3. Implement.
4. Invoke `superpowers:verification-before-completion` — paste actual command output.
5. Append a one-paragraph journal entry to `.powerstack4/task_plan.md`.
6. Mark the task `completed` via `mcp__task-master__set_task_status`.

## Checkpoints
- At A-10 and B-10: run the 5-agent deep-review protocol
  (see `docs/runbooks/deep-review-a10.md`). Zero critical findings required.
- Commit per Conventional Commits; include Co-Authored-By Claude.

## When stuck
- Prefer `Explore` agent for reconnaissance over reading many files directly.
- If >3 consecutive retries on the same problem, escalate to the human with
  `AskUserQuestion` — don't spin.

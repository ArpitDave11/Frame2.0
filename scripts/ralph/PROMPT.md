# Ralph Loop — Per-Iteration Prompt (FRAME DocMining Phase A)

You are running inside a Ralph Loop harness. Each iteration is a FRESH
process with a CLEAN context window. You have no memory of prior iterations.
Progress is persisted on disk.

## Your job this iteration

1. Read `docs/plans/2026-04-23-docmining-integration-ultraplan.md` (Phase A only).
2. Read `scripts/ralph/progress.txt` to see what was done in prior iterations.
3. Read `.claude/STANDING_PROTOCOL.md` — these rules are enforced by hooks.
4. Pick the NEXT single atomic task in Phase A (A-0 … A-9) that is not yet done.
5. Implement ONLY that task. Do not skip ahead. Do not batch multiple tasks.
6. Run the task's verification command per the execution runbook
   (`docs/runbooks/docmining-execution-runbook.md`).
7. If verification passes:
   a. Append a line to `scripts/ralph/progress.txt`:
      `<iso-timestamp> TASK <task-id> DONE <short-summary>`
   b. Stage changes and commit with `feat(docmining): <task-id> — <summary>`.
8. If verification fails:
   a. Append: `<iso-timestamp> TASK <task-id> FAILED <reason>`
   b. DO NOT commit. Exit this iteration — next iteration will retry.

## Completion

When ALL of A-0 through A-9 are marked DONE in progress.txt AND
`pytest services/docmining/tests/ -v` is green:
- Run the A-10 commit protocol (see ultra-plan).
- Append `<promise>COMPLETE</promise>` on its own line at the end of progress.txt.
- The harness will detect this and exit.

## Hard rules (enforced by hooks — do not attempt to bypass)

- Never use `git commit --no-verify`.
- Never edit existing test files to make them pass.
- Never touch `src/components/welcome/**`, `src/pipeline/orchestrator*`,
  `src/pipeline/stages/**`, `.env*`, `.taskmaster/tasks/*.json`.
- If a hook blocks you, read the error and adjust — do not try to bypass.

## Escalation

If you encounter a decision the ultra-plan does not resolve:
- Append: `<iso-timestamp> ESCALATE <task-id> <question>` to progress.txt.
- Do NOT guess. The human will review and add guidance.
- Exit this iteration.

## No-op exit

If the next task requires human input (e.g., needs credentials, API keys,
external review) append `<iso-timestamp> BLOCKED <task-id> <reason>` and exit.
Ralph's next iteration will see the BLOCKED marker and also exit — the
harness treats 2+ consecutive BLOCKED markers as reason to terminate.

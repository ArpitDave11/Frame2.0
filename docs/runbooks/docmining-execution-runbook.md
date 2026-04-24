# DocMining Execution Runbook

Per-task command reference for executing the 22 atomic tasks in
`docs/plans/2026-04-23-docmining-integration-ultraplan.md`.

## Standing Protocol (every task)

1. **Start**: Read the task spec in the ultra-plan. Invoke `executing-plans`
   skill if not already active in this session.
2. **Before work**: Declare intent out loud ("Starting A-3: prefetch Docling
   models via CLI"). Mark task `in_progress` in Taskmaster.
3. **Do the work**: Implement.
4. **Verify**: Invoke `superpowers:verification-before-completion`. Paste the
   actual command output. No claim is valid without evidence.
5. **Checkpoint**: Append a one-paragraph entry to
   `.powerstack4/task_plan.md` describing files touched + lines changed +
   test outcome. Mark task `completed` in Taskmaster.
6. **If context feels heavy**: Delegate reconnaissance to the `Explore` agent
   instead of reading files directly.

## Phase A — Backend (services/docmining/)

| Task | Command / Action | Verify With |
|---|---|---|
| A-0.1 | `python3 --version` (need ≥3.11) | stdout shows 3.11+ |
| A-0.2 | `Explore` agent: list reference weight dirs | 4 model dirs present |
| A-1 | Scaffold `services/docmining/` tree | `tree services/docmining` |
| A-2 | Write `pyproject.toml` with docling==2.90.0 exact pin | `grep docling pyproject.toml` |
| A-3 | `uv pip install -e . && docling-tools models download layout tableformer code_formula picture_classifier rapidocr -o ~/.cache/docling/models` | `ls ~/.cache/docling/models` shows 5 dirs |
| A-4 | Write `config.py` with `workers: int = Field(1, ge=1, le=1)` | `python -c 'from app.config import Settings; print(Settings())'` |
| A-5 | Write `docling_service.py` with `enable_remote_services=False` guardrail | unit test `test_converter_builds` |
| A-6 | Write `documents.py` POST /api/docmining/convert | unit test with fake UploadFile |
| A-7 | Write `main.py` with lifespan converter preload | `uvicorn app.main:app` boots cleanly |
| A-8.1 | Smoke test: curl with sample.pdf online | 200 OK, markdown in response |
| A-8.2 | Smoke test: 3 reference PDFs (simple/tables/multicol) | all 200 OK |
| A-8.3 | **Offline egress verification**: `sudo ifconfig en0 down && curl ...` (macOS) OR `unshare -n` (Linux) OR `/etc/hosts` block `huggingface.co 127.0.0.1` | byte-identical output to A-8.1 |
| A-9 | `pytest services/docmining/tests/ -v` | all green |
| A-10 | Commit Phase A + run `deep-review-a10.md` protocol | 0 critical findings |

## Phase B — SPA Wiring

| Task | Command / Action | Verify With |
|---|---|---|
| B-1 | Add `/api/docmining` rule to `vite.config.ts` proxy | dev server restarts, `curl localhost:3002/api/docmining/health` |
| B-2 | Create `src/services/docminingClient.ts` | vitest: mock fetch, assert FormData |
| B-3 | Extend `ModalId` in `src/stores/uiStore.ts:16` with `'docUpload'` | tsc passes |
| B-4 | Create `src/components/docmining/DocUploadModal.tsx` | RTL test: file input + submit |
| B-5 | Register `DocUploadModal` in `ModalHost` | renders when `uiStore.activeModal === 'docUpload'` |
| B-6 | Add Upload button to `WorkspaceHeader.tsx` | NOT touching WelcomeScreen |
| B-7 | E2E: `e2e/docmining-upload.spec.ts` (Playwright) | test passes |
| B-8 | Full regression: `npm run test:run` | 0 new failures vs baseline |
| B-9 | Update `memory/project_docmining_complete.md` + add index entry to `memory/MEMORY.md` | both files updated |
| B-10 | Commit Phase B + run `deep-review-a10.md` protocol | 0 critical findings |

## Context Loss Protocol

If the context window nears collapse mid-task:
1. **Immediately write** to `.powerstack4/context-snapshot.md` (powerstack4
   hook does this auto every 5 productive tool calls, but manually invoke
   if needed).
2. **Append to** `.powerstack4/task_plan.md`: current task ID, last
   completed step, next step, any open decisions.
3. **Commit WIP** if safe to do so: `git add -A && git commit -m "wip: <task-id> checkpoint"`.
4. **Then `/clear`** — the next session reads these files and resumes.

## Skills Used (installed, verified working)

- `superpowers:executing-plans` — per-task entry skill
- `superpowers:verification-before-completion` — per-task exit gate
- `superpowers:test-driven-development` — A-9, B-7
- `superpowers:systematic-debugging` — when things break
- `powerstack4` — continuous state offload (hooks auto-run)
- `wrap-up` — A-10 and B-10 commit + memory update
- `code-reviewer` agent — single-pass review (fallback if deep-review skipped)
- `Explore` agent — reconnaissance across files
- Taskmaster MCP — task state (`set_task_status`, `next_task`)

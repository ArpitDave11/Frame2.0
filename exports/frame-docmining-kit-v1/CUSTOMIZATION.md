# Customizing the Kit for a Different Project

The kit ships with FRAME2.0-specific values baked in. To reuse it in a
different repo, edit the following.

## 1. Protected paths (H1 / H2)

**`.claude/hooks/pre-edit-protect-paths.sh`** — update the `PROTECTED_PATHS` list:

```bash
PROTECTED_PATHS=(
  "src/components/welcome/"       # <- remove, replace with your repo's
  "src/pipeline/orchestrator"     #    equivalents
  "src/pipeline/stages/"
  ".env"
  ".taskmaster/tasks/"
  "package-lock.json"
)
```

**`.claude/hooks/pre-bash-protect-paths.sh`** — update the `PROTECTED_PATH_REGEX`:

```bash
PROTECTED_PATH_REGEX='(src/components/welcome/|src/pipeline/orchestrator|...)'
```

Keep these two files in sync — they cover the same paths from different angles
(Edit/Write vs shell redirects).

**`scripts/hooks/block-scope-violation.sh`** — the commit-level backstop also
duplicates the path list. Update it to match.

## 2. In-scope paths (H4 typecheck trigger)

**`.claude/hooks/stop-typecheck.py`** — the `docmining_touched` needle list
decides which file changes trigger a typecheck gate:

```python
docmining_touched = any(
    needle in changed
    for needle in (
        "services/docmining/",        # <- replace with your project's
        "src/components/docmining/",  #    in-scope directories
        ...
    )
)
```

## 3. Branch guard (H4)

**`.claude/hooks/stop-typecheck.py`** — branch names that activate the gate:

```python
if not (
    branch.startswith("docmining")
    or branch.startswith("phase-a")
    or branch.startswith("phase-b")
):
    return 0
```

Change these to match your branching convention (e.g. `feature/docs-api`).

## 4. Typecheck command (H4)

The kit assumes a TypeScript project with `tsc` in `node_modules/.bin/`. For
other languages, replace the subprocess call in `stop-typecheck.py`:

| Stack | Command |
|---|---|
| TypeScript (current) | `./node_modules/.bin/tsc -b --noEmit` |
| Python + mypy | `mypy <scoped paths>` |
| Go | `go vet ./...` |
| Rust | `cargo check` |

If your repo has no typecheck at all, delete H4 from `.claude/settings.json`.

## 5. Journal path (H5)

**`scripts/hooks/require-journal-update.sh`** — edit the journal path:

```bash
JOURNAL=".powerstack4/task_plan.md"   # <- change to your journal
```

If you don't keep a journal, delete the H5 entry from `.pre-commit-config.yaml`.

## 6. Ralph Loop scope (optional)

If you use the Ralph Loop harness, edit:

- **`scripts/ralph/PROMPT.md`** — replace Phase A context with your own task list
- **`scripts/ralph/loop.sh`** — adjust `MAX_ITERS` and `MAX_SPEND_USD` caps
- **`scripts/ralph/README.md`** — update "when to use / when NOT to use" guidance

If you're not using Ralph, just delete `scripts/ralph/`.

## 7. Standing protocol (H6)

**`.claude/STANDING_PROTOCOL.md`** — this is text the H6 hook injects on every
user turn. Edit it to reflect your project's invariants (which paths are
off-limits, which test files are frozen, which branches are for what).

Keep it under ~1500 chars — it fires on every turn and eats context.

## 8. CLAUDE.md (not shipped, recommended)

Add a `CLAUDE.md` at the repo root. Claude Code auto-loads it on every
session. The FRAME2.0 original covers:
- Stack and versions
- Entry points
- Scope boundaries (what's in-scope vs out-of-scope for current work)
- Active initiatives / current phase

This file is not shipped in the kit because it must be written from scratch
per project. But it's an important companion to H6.

## Checklist before first commit

- [ ] Protected paths match your repo's structure (`H1`, `H2`, backstop)
- [ ] In-scope paths match your current work (`H4`)
- [ ] Branch guard matches your naming convention (`H4`)
- [ ] Typecheck command matches your stack (`H4`)
- [ ] Journal path matches your workflow (`H5`)
- [ ] `STANDING_PROTOCOL.md` reflects your project invariants (`H6`)
- [ ] Smoke tests pass: `bash scripts/hooks/test-hooks.sh`
- [ ] `pre-commit run --all-files` passes (or fails for understood reasons)

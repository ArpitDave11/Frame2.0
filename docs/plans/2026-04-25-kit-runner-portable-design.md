# `kit-runner` — Portable Self-Discovering Skill (Design)

**Date:** 2026-04-25
**Status:** Approved (brainstorm), pending implementation plan via `superpowers:writing-plans`
**Companion docs:**
- `docs/plans/2026-04-23-docmining-integration-design.md` (Phases A/B done)
- `docs/plans/2026-04-25-phase-c-local-infra-plan.md` (current execution target)
- `docs/runbooks/kit-hardening-v1.md` (existing hooks + Ralph harness)
- `docs/superpowers/specs/2026-03-14-powerstack4-design.md` (existing skill design)

## 1. Problem

Today the FRAME DocMining workflow is split across four artifacts: the
`powerstack4` skill at `~/.claude/skills/powerstack4/`, the Ralph harness at
`scripts/ralph/`, the standing protocol at `.claude/STANDING_PROTOCOL.md`,
and Taskmaster at `.taskmaster/`. There is no single entry point that takes
"a plan file" and runs it end-to-end. Each session re-derives the wiring,
sometimes skipping the `mcp__task-master__set_task_status` calls and
`.powerstack4/task_plan.md` journal entries the standing protocol mandates.

Separately, the patterns that orchestration provides — append-only history,
durable session memory, hook-enforced safety — are not FRAME-specific. They
are *workflow* patterns that should work on any codebase the user touches.

## 2. Goal

A single user-invocable skill, **`kit-runner`**, installed once at
`~/.claude/skills/kit-runner/`, that:

1. Works "cold" on any repo (FRAME, an OSS clone, an empty scratch dir).
2. Performs read-only discovery first via `agent: Explore` → emits a JSON
   manifest of language, package manager, test/build commands, monorepo
   layout, CI system, commit convention, history-file conventions, and
   detected kit features (powerstack4, Ralph, Taskmaster, standing
   protocol, `.powerstack4/`).
3. Branches on the manifest:
   - **Kit features detected** → drives the standing-protocol loop
     (PRD → `parse_prd` → atomic-task loop → `verification-before-completion`
     → journal → commit). Mode `--mode=interactive` (default) or
     `--mode=ralph` (delegates to `scripts/ralph/loop.sh`).
   - **No kit detected** → asks once: "No kit detected. Which setup?"
     Three options: **bare** / **light** / **full** (§5). Caches choice in
     the discovery JSON. Subsequent runs do not re-prompt.
4. Carries every template internally so a one-shot `/kit-runner --init full`
   on a fresh repo scaffolds the whole workflow without external downloads.

## 3. Non-goals (deferred)

- Vector search across history (claude-mem / memsearch). Defer to Phase 3.
- `/rollup` weekly compression of devlog. Defer until devlog passes ~50 entries.
- Karpathy LLM-wiki, multi-agent observability dashboard, `/council`
  cross-model, `/reflect` monthly user-CLAUDE.md updates.
- Auto-creating `.kit-runner.yml` in user repos. Honored only if the user
  already wrote one.
- Auto-generating bloated `AGENTS.md`. ETH Zurich finding (≈ −3% task success
  on LLM-generated context files) — only minimum non-discoverable facts.
- Vendor-lock by depending on `jq`, `ripgrep`, `tree-sitter`. POSIX bash +
  Python stdlib only.

## 4. Architecture — single portable skill, three modes

```
~/.claude/skills/kit-runner/
├── SKILL.md                              # tiny, agent: Explore, allowed-tools restricted
├── scripts/
│   ├── discover.sh                       # POSIX bash, emits JSON to stdout
│   ├── detect_tests.sh
│   ├── detect_ci.sh
│   ├── detect_kit.sh                     # powerstack4? ralph? taskmaster? standing protocol?
│   ├── conv_commits.sh                   # git log -20 → conventional %match
│   ├── cache_get.sh                      # read cache if HEAD unchanged
│   ├── cache_put.sh                      # write JSON to cache path
│   ├── init_bare.sh                      # mode 1 — no-op stub
│   ├── init_light.sh                     # mode 2 — AGENTS.md + adr/ + devlog/
│   ├── init_full.sh                      # mode 3 — light + .powerstack4 + ralph + hooks + rules
│   └── devlog_append_minimal.sh          # SessionEnd safety-net writer
├── references/
│   ├── stack-fingerprints.md             # marker→command tables
│   ├── monorepo-signals.md
│   ├── memory-locations.md               # AGENTS.md → CHANGELOG.md → docs/devlog/ probe order
│   └── kit-features.md                   # how to recognize FRAME-style kit and adapt
└── templates/
    ├── AGENTS.md.tpl                     # cross-tool seed
    ├── CLAUDE.md.tpl                     # 1-line pointer to AGENTS.md (Windows-safe)
    ├── devlog-template.md                # YAML frontmatter + sections
    ├── adr-template.md
    ├── standing-protocol.tpl             # generalized standing protocol
    ├── ralph-loop.sh.tpl                 # ralph harness scaffold
    ├── ralph-prompt.md.tpl
    ├── powerstack4-init.tpl              # .powerstack4/{task_plan,findings,progress,reasoning,context-snapshot}.md seeds
    ├── hook-session-start.sh             # inject last 3 devlog titles + git status (≤500 tokens)
    ├── hook-stop-fragment.sh             # async append turn fragment to JSONL
    ├── hook-session-end-minimal.sh       # safety-net writer (NO claude -p)
    ├── hook-pre-bash-protect-paths.sh    # extend to block edits to past-date devlog files
    ├── slash-devlog.md                   # /devlog command (PRIMARY in-session mechanism)
    ├── slash-adr.md                      # /adr command (7tonshark pattern)
    └── rule-frontend.md, rule-backend-docmining.md, rule-pipeline.md
```

### 4.1 SKILL.md frontmatter (≤1,536-char description cap)

```yaml
---
name: kit-runner
description: Run a project-aware kit on any repo. Use when user asks to run/build/test/ship/fix/plan against an unfamiliar project. Performs read-only discovery first (language, package manager, test runner, CI, monorepo layout, history file, and kit conventions like powerstack4/ralph/taskmaster), caches the manifest keyed on git HEAD, then either drives the standing-protocol atomic-task loop (when a kit is detected) or falls back to Explore-Plan-Code. On first run in a new repo, asks once which scaffolding mode (bare/light/full) and caches the choice.
agent: Explore
allowed-tools: Read, Glob, Grep, Bash(~/.claude/skills/kit-runner/scripts/*)
---
```

`agent: Explore` routes the discovery phase through Claude Code's read-only
Haiku-powered subagent — saves tokens and uses the read-only permission
scope.

## 5. The three scaffolding modes

The skill carries every template internally. Mode picks which subset of
templates lands in the user repo on `/kit-runner --init <mode>`.

| Mode | What it scaffolds | When to pick |
|---|---|---|
| **bare** | Nothing. Returns a discovery manifest only. Drives Explore-Plan-Code with discovered test/build cmds. | One-off bug fix on an unfamiliar repo |
| **light** | `AGENTS.md`, `CLAUDE.md` (1-line pointer), `docs/adr/{README,template,0001-baseline}.md`, `docs/devlog/README.md`, `.devlog-template.md`, `.claude/commands/{devlog,adr}.md`, hook `inject-recent-devlog.sh` (SessionStart only), extend pre-bash hook for devlog append-only | Side projects, occasional touch |
| **full** | Everything in `light` + `.powerstack4/{task_plan,findings,progress,reasoning,context-snapshot}.md` seeds, `.claude/STANDING_PROTOCOL.md`, `scripts/ralph/{loop.sh,PROMPT.md,cost-guard.sh,progress.txt,README.md}`, all 3 hooks (SessionStart inject, Stop async fragment, SessionEnd minimal safety-net), `.claude/rules/*.md` path-scoped rule files, optional `.taskmaster/config.json` if Taskmaster MCP detected | Multi-week serious projects (FRAME) |

The chosen mode is recorded in the discovery cache so subsequent runs do
not re-prompt.

## 6. Discovery flow

When the user runs `/kit-runner [plan-path] [--mode=interactive|ralph] [--init=bare|light|full]`:

1. **Read cache** — `bash scripts/cache_get.sh` looks at
   `~/.claude/projects/<repo-hash>/.kit-runner-cache.json`. If the file
   exists *and* its `head` field equals the current `git rev-parse HEAD`,
   reuse it. Else discard.
2. **Lazy verb-scoped discovery** — if the user said `/kit-runner test`,
   only `detect_tests.sh` runs. Full discovery only on `--init` or when no
   verb is supplied. Modeled on Nx's project-graph cache.
3. **discover.sh** emits JSON like:
   ```json
   {
     "head": "b2f9c63",
     "scanned_at": "2026-04-25T14:02:33Z",
     "languages": ["typescript", "python"],
     "package_manager": "npm",
     "monorepo": null,
     "test_cmd": "npm run test:run",
     "build_cmd": "npm run build",
     "ci": "github_actions",
     "commit_style": "conventional",
     "memory": {
       "agents_md": false, "claude_md": true,
       "changelog": null, "devlog_dir": null, "adr_dir": null
     },
     "kit": {
       "powerstack4_skill_user_local": true,
       "ralph_harness": "scripts/ralph/loop.sh",
       "taskmaster_config": ".taskmaster/config.json",
       "taskmaster_tasks": null,
       "standing_protocol": ".claude/STANDING_PROTOCOL.md",
       "powerstack4_state": ".powerstack4/"
     },
     "mode": "full"
   }
   ```
4. **Branch on `kit` field**:
   - If `kit.standing_protocol` and `kit.powerstack4_state` exist → drive
     standing-protocol loop with the supplied plan path.
   - If `kit` is mostly empty and no `mode` is cached → ask once which mode
     (bare/light/full). Cache the answer. Run `init_<mode>.sh`.
5. **Standing-protocol loop** (when kit detected and a plan is supplied):
   1. Write PRD: `.taskmaster/docs/<plan-slug>-prd.txt`
   2. `mcp__task-master__parse_prd` → atomic tasks
   3. `expand_task` for any task with complexity > 7
   4. `next_task` → `set_task_status: in_progress`
   5. Implement
   6. `superpowers:verification-before-completion`
   7. Append journal entry to `.powerstack4/task_plan.md`
   8. `set_task_status: completed`
   9. Conventional Commit with Co-Authored-By Claude
   10. At `--checkpoint` boundaries → 5-agent deep-review (`docs/runbooks/deep-review-a10.md`)
6. **Ralph mode** — if `--mode=ralph`, the skill writes the resolved plan
   path into `scripts/ralph/PROMPT.md`, resets `progress.txt`, then
   spawns `bash scripts/ralph/loop.sh` (background, foreground monitoring
   left to the user).

## 7. Devlog mechanism — `/devlog` primary, SessionEnd safety-net

### 7.1 `/devlog` slash command (primary)

`templates/slash-devlog.md` lands at `.claude/commands/devlog.md` in
modes `light` and `full`. It runs **inside the active session**, where
Claude has the full conversation context, the actual decisions, the real
gotchas — i.e. where LLM summarization is meaningful.

```yaml
---
description: Append a devlog entry for the just-completed task
allowed-tools: Bash(git log:*), Bash(git rev-parse:*), Bash(git status:*), Read, Write
argument-hint: [task-summary]
---
Read .devlog-template.md, fill it in based on the current task ($ARGUMENTS),
recent conversation, and `git log --oneline -10`. Append (do not overwrite)
to docs/devlog/YYYY-MM-DD-{slug}.md. Update docs/devlog/README.md index.
```

### 7.2 SessionEnd hook (safety-net — minimal, not LLM-driven)

`templates/hook-session-end-minimal.sh` writes a single-line breadcrumb if
no devlog entry was appended for the current session:

```bash
# pseudocode
session_id="$1"
if [ ! -f "docs/devlog/$(date +%F)-session-${session_id:0:8}.md" ]; then
  cat > "docs/devlog/$(date +%F)-session-${session_id:0:8}.md" <<EOF
---
date: $(date -u +%FT%TZ)
session_id: ${session_id}
branch: $(git rev-parse --abbrev-ref HEAD)
commits: $(git log --oneline ${SESSION_START_REF}..HEAD | wc -l) commit(s)
summary: "(auto-stub — Claude forgot to /devlog this session)"
status: stub
---
EOF
fi
```

**Critical: no `claude -p --model haiku` call**. Bug
[#41577](https://github.com/anthropics/claude-code/issues/41577) (closed as
duplicate, *not fixed*) kills `claude -p` subprocess on session
termination, and `nohup` workarounds have zero error reporting back. The
safety-net hook stays simple — timestamp + branch + commit-range — so it
cannot fail silently.

### 7.3 Stop hook (per-turn fragment)

Append-only JSONL fragment to
`~/.claude/projects/<hash>/fragments/<session>.jsonl` per turn. `async: true`
so it never blocks the model. Used by `/devlog` if the user wants to
synthesize fragments instead of writing free-form, but the primary path is
free-form `/devlog` with the live conversation as input.

### 7.4 SessionStart hook (context inject)

`templates/hook-session-start.sh` reads the last 3 entries from
`docs/devlog/README.md` (titles only, never bodies) plus current `git status`
and current branch, emits as `additionalContext`. Total ≤500 tokens.

## 8. AGENTS.md + CLAUDE.md (Windows-safe, no symlink)

UBS RDP is Windows; `core.symlinks=false` is the enterprise default. A
symlink would materialize as a plain text file containing `"AGENTS.md"`,
which Claude Code would read as literal content.

**Convention:** keep both files.

- `AGENTS.md` — full content, ≤8 KB, cross-tool source of truth (Codex,
  Cursor, OpenCode, Factory, Roo Code all read this).
- `CLAUDE.md` — single line: `Read AGENTS.md for all project conventions.`
  plus three or four immutable rules (security, secrets, data residency)
  not duplicated in AGENTS.md.

This costs one extra file and eliminates the Windows edge case entirely.
Validated against SSW Rules + Prompt Shelf guides.

## 9. Path-scoped rules

`.claude/rules/{frontend.md, backend-docmining.md, pipeline.md}.md` with
YAML frontmatter:

```yaml
---
paths: ["src/components/**", "src/stores/**"]
---
[content — only loaded when Claude touches matching files]
```

Loaded only when Claude reads files under matching paths — keeps the global
context small while providing precise guidance per surface area.

## 10. Cache strategy

- **Path:** `~/.claude/projects/<repo-hash>/.kit-runner-cache.json`
  (mirrors Claude Code's own per-project state path).
- **Key:** `git rev-parse HEAD`.
- **Invalidation:** `head` field mismatch → re-run discovery.
- **Lazy probes:** verb-scoped (`/kit-runner test` → only `detect_tests.sh`).
- **Manual override:** `/kit-runner --refresh` discards cache.

## 11. Non-portable behaviors deliberately rejected

| Anti-pattern | Why we reject |
|---|---|
| Auto-create `.kit-runner.yml` | ETH Zurich −3% task success on auto-generated context files; Node.js tooling group "creeping scourge of root configs" issue |
| Always-on hook trigger | Discovery is non-trivial; verb-gated only |
| `jq` / `ripgrep` / `tree-sitter` deps | alirezarezvani standard: stdlib-only, zero installs |
| Symlink AGENTS.md ↔ CLAUDE.md | Windows `core.symlinks=false` materializes as text |
| `claude -p` in SessionEnd | Bug #41577 kills it silently; `nohup` workaround has no error reporting |
| Bloated AGENTS.md (file tree dumps) | ETH Zurich finding; staleness poisoning |

## 12. Acceptance criteria

1. `/kit-runner` invoked on a fresh empty git repo with `--init=bare`
   completes in <2 s, creates zero files, returns a JSON manifest.
2. `/kit-runner --init=light` on the same fresh repo creates exactly:
   `AGENTS.md`, `CLAUDE.md`, `docs/adr/{README,template,0001-baseline}.md`,
   `docs/devlog/README.md`, `.devlog-template.md`,
   `.claude/commands/{devlog,adr}.md`, plus `.claude/settings.json`
   updated to register the SessionStart inject hook only.
3. `/kit-runner --init=full` on the same fresh repo creates everything in
   #2 plus `.powerstack4/` seed files, `.claude/STANDING_PROTOCOL.md`,
   `scripts/ralph/{loop.sh,PROMPT.md,cost-guard.sh,progress.txt,README.md}`,
   all 3 hooks registered, `.claude/rules/` with at least one path-scoped
   sample, and `.taskmaster/config.json` if Taskmaster MCP is installed.
4. `/kit-runner docs/plans/2026-04-25-phase-c-local-infra-plan.md` on the
   FRAME repo (which already has Mode 3 wired) detects the kit, writes
   `<plan-slug>-prd.txt`, calls `mcp__task-master__parse_prd`, and runs
   the standing-protocol loop on the first atomic task.
5. `/kit-runner test` on FRAME runs only `detect_tests.sh`, returns
   `npm run test:run`, and does not re-walk the full tree.
6. Second invocation in same session reuses the cache (verified by
   inspecting `scanned_at` timestamp).
7. `/devlog "fixed sample.pdf 500 in container build"` on FRAME appends
   `docs/devlog/2026-04-25-fixed-sample-pdf-500.md` and updates the README
   index. Same-day second `/devlog` adds a second entry, never overwrites.
8. SessionEnd safety-net hook fires only when the session produced commits
   *and* no devlog file with the session id exists. Single-line stub, no
   LLM call.
9. On Windows with `core.symlinks=false`, `AGENTS.md` and `CLAUDE.md` are
   both regular files; Claude Code reads them as content.

## 13. Rollout

Single PR: build the portable skill at `~/.claude/skills/kit-runner/` plus
all internal templates. Verify against acceptance criteria #1–#9 in a
scratch repo. Then "apply to FRAME" by running `/kit-runner --init=full`
inside this repo from inside that scratch validation.

No separate per-repo PR — Mode 3 exercising itself produces the FRAME
artifacts as commits. Each commit is reviewed normally.

## 14. Open questions / explicit deferrals

- **`/rollup`** for monthly devlog compression — defer until devlog has
  ~50 entries.
- **claude-mem / vector search** — defer until grep across `docs/devlog/`
  becomes painful.
- **`.kit-runner.yml` override format** — left unspecified; honored if
  user already wrote one, but no schema published in v1. Add later if
  override demand emerges.
- **Cross-machine sync** of the cache — deliberately not done; cache is
  machine-local by design.
- **Ralph integration with Taskmaster** — current Ralph PROMPT.md still
  references Phase A. The `init_full.sh` template will produce a
  generalized PROMPT.md that defers to Taskmaster's `next_task`. Existing
  FRAME `scripts/ralph/PROMPT.md` will be migrated to the new template.

## 15. References

- Anthropic Skills architecture (progressive disclosure, ≤500-line SKILL.md
  body): `https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices`
- `agent: Explore` subagent docs: `https://code.claude.com/docs/en/skills`
- ETH Zurich AGENTS.md study (≈ −3% task success on LLM-generated context)
  — referenced by Augment Code's 2026 guide.
- Bug #41577 (SessionEnd kills `claude -p`): closed as duplicate, not
  fixed.
- alirezarezvani/claude-skills (stdlib-only portability standard, 232+
  skills, 5,200+ stars).
- 7tonshark `/adr` slash-command pattern.
- HumanLayer "Writing a Good CLAUDE.md" (instruction-following decay).
- SSW Rules + Prompt Shelf on AGENTS.md ↔ CLAUDE.md (no symlink, two-file
  pattern).
- Existing FRAME tooling: `~/.claude/skills/powerstack4/`,
  `scripts/ralph/`, `.claude/STANDING_PROTOCOL.md`, `.powerstack4/`,
  `.taskmaster/`.

---

**Status after this doc:** design approved. Next step is
`superpowers:writing-plans` to produce the atomic implementation plan
(one task per `init_*.sh`, each template, each hook, each acceptance
criterion).

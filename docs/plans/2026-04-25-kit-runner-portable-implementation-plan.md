# `kit-runner` Portable Skill — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the portable, self-discovering `kit-runner` skill at `~/.claude/skills/kit-runner/` (single skill, three scaffolding modes) per `docs/plans/2026-04-25-kit-runner-portable-design.md`, then bootstrap FRAME against it via Mode 3 self-application.

**Architecture:** A single Anthropic Skill (`agent: Explore`, restricted `allowed-tools`) whose `SKILL.md` body delegates to POSIX-bash scripts in `scripts/`. Discovery emits a JSON manifest cached at `~/.claude/projects/<repo-hash>/.kit-runner-cache.json` keyed on `git rev-parse HEAD`. Three init modes (`bare` / `light` / `full`) progressively materialize templates carried inside the skill. Stdlib only — no `jq`, `ripgrep`, `tree-sitter`, `bats-core`. Tests are plain `bash -e` scripts that compare diffs / assert filesystem state.

**Tech Stack:** POSIX bash 3.2 (macOS default), Python 3 stdlib (for JSON only — `python3 -c "import json…"`), git, Claude Code skills + hooks + slash commands. No third-party packages.

---

## Conventions used in this plan

- **Skill root:** `~/.claude/skills/kit-runner/` (abbreviated **`$KIT`** below).
- **Scratch repo for tests:** `/tmp/kit-runner-scratch/` — wiped between tests.
- **Test harness:** `$KIT/tests/run_all.sh` aggregates `test_*.sh`. Each test exits non-zero on failure. `set -euo pipefail` everywhere.
- **Commit style:** Conventional Commits (`feat(kit-runner): …`, `test(kit-runner): …`). All commits Co-Authored-By Claude.
- **Branch:** `feat/kit-runner-portable-skill` for the FRAME-side artifacts (the skill itself lives outside the repo at `~/.claude/skills/`, not committed to FRAME).
- **What lives in FRAME repo vs. `~/.claude`:** the skill source lives in `~/.claude/skills/kit-runner/` and is installed once per workstation. The FRAME repo only receives Mode 3 outputs (devlog/adr/hooks/rules/etc.) when we run `/kit-runner --init=full` from inside FRAME at the very end. The implementation plan itself lives in `docs/plans/` and the skill source can optionally be mirrored under `tooling/kit-runner/` for review — final placement decided in Task 24.

---

## Task 0: Bootstrap the skill skeleton + test harness

**Files:**
- Create: `~/.claude/skills/kit-runner/SKILL.md` (placeholder)
- Create: `~/.claude/skills/kit-runner/scripts/.gitkeep`
- Create: `~/.claude/skills/kit-runner/templates/.gitkeep`
- Create: `~/.claude/skills/kit-runner/references/.gitkeep`
- Create: `~/.claude/skills/kit-runner/tests/run_all.sh`
- Create: `~/.claude/skills/kit-runner/tests/lib/assert.sh`
- Create: `~/.claude/skills/kit-runner/tests/test_skeleton.sh`

**Step 1: Write the failing test**

`tests/test_skeleton.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail
KIT="${HOME}/.claude/skills/kit-runner"
. "${KIT}/tests/lib/assert.sh"

assert_file_exists "${KIT}/SKILL.md"
assert_file_exists "${KIT}/scripts/.gitkeep"
assert_file_exists "${KIT}/templates/.gitkeep"
assert_file_exists "${KIT}/references/.gitkeep"
grep -q '^name: kit-runner$' "${KIT}/SKILL.md" || { echo "SKILL.md missing name frontmatter"; exit 1; }
grep -q '^agent: Explore$' "${KIT}/SKILL.md" || { echo "SKILL.md missing agent: Explore"; exit 1; }
echo "OK: test_skeleton"
```

`tests/lib/assert.sh`:
```bash
#!/usr/bin/env bash
assert_file_exists() {
  [ -f "$1" ] || { echo "FAIL: missing file $1"; exit 1; }
}
assert_file_absent() {
  [ ! -e "$1" ] || { echo "FAIL: unexpected file $1"; exit 1; }
}
assert_eq() {
  [ "$1" = "$2" ] || { echo "FAIL: '$1' != '$2'"; exit 1; }
}
assert_contains() {
  grep -qF "$2" "$1" || { echo "FAIL: '$1' does not contain '$2'"; exit 1; }
}
```

**Step 2: Run test to verify it fails**

```bash
bash ~/.claude/skills/kit-runner/tests/test_skeleton.sh
```
Expected: `FAIL: missing file …/SKILL.md`

**Step 3: Write minimal implementation**

`SKILL.md` (placeholder, real body in Task 22):
```markdown
---
name: kit-runner
description: Portable self-discovering kit runner. Stub — full body wired in later task.
agent: Explore
allowed-tools: Read, Glob, Grep, Bash(~/.claude/skills/kit-runner/scripts/*)
---

# kit-runner (stub)

Implementation in progress. See `docs/plans/2026-04-25-kit-runner-portable-implementation-plan.md`.
```

Create empty `.gitkeep` files. Make the run script:

`tests/run_all.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
fails=0
for t in test_*.sh; do
  echo "==> ${t}"
  if ! bash "${t}"; then fails=$((fails+1)); fi
done
[ "${fails}" -eq 0 ] || { echo "${fails} test(s) failed"; exit 1; }
echo "All green."
```

```bash
chmod +x ~/.claude/skills/kit-runner/tests/run_all.sh
```

**Step 4: Verify it passes**

```bash
bash ~/.claude/skills/kit-runner/tests/run_all.sh
```
Expected: `OK: test_skeleton` then `All green.`

**Step 5: Commit (skill is outside the FRAME repo — use a separate `~/.claude/skills/kit-runner/` git repo)**

```bash
cd ~/.claude/skills/kit-runner
git init -b main
git add .
git commit -m "feat(kit-runner): scaffold skill skeleton + test harness

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 1: `detect_tests.sh` — language/test-runner detector

**Files:**
- Create: `$KIT/scripts/detect_tests.sh`
- Create: `$KIT/tests/test_detect_tests.sh`
- Create: `$KIT/tests/fixtures/repo_node/package.json`
- Create: `$KIT/tests/fixtures/repo_python/pyproject.toml`
- Create: `$KIT/tests/fixtures/repo_empty/.gitkeep`

**Step 1: Write the failing test**

`tests/test_detect_tests.sh` — three sub-cases:
1. Node fixture with `"test:run": "vitest run"` → emits `{"test_cmd": "npm run test:run"}`.
2. Python fixture with `[tool.pytest.ini_options]` → emits `{"test_cmd": "pytest"}`.
3. Empty fixture → emits `{"test_cmd": null}`.

```bash
#!/usr/bin/env bash
set -euo pipefail
KIT="${HOME}/.claude/skills/kit-runner"
. "${KIT}/tests/lib/assert.sh"

run() { ( cd "$1" && bash "${KIT}/scripts/detect_tests.sh" ); }

out=$(run "${KIT}/tests/fixtures/repo_node")
echo "${out}" | grep -q '"test_cmd": "npm run test:run"' \
  || { echo "node case failed: ${out}"; exit 1; }

out=$(run "${KIT}/tests/fixtures/repo_python")
echo "${out}" | grep -q '"test_cmd": "pytest"' \
  || { echo "python case failed: ${out}"; exit 1; }

out=$(run "${KIT}/tests/fixtures/repo_empty")
echo "${out}" | grep -q '"test_cmd": null' \
  || { echo "empty case failed: ${out}"; exit 1; }

echo "OK: test_detect_tests"
```

Fixtures:

`tests/fixtures/repo_node/package.json`:
```json
{ "name": "fx-node", "scripts": { "test:run": "vitest run", "build": "tsc -b" } }
```

`tests/fixtures/repo_python/pyproject.toml`:
```toml
[project]
name = "fx-py"
[tool.pytest.ini_options]
testpaths = ["tests"]
```

**Step 2: Run test to verify it fails**

```bash
bash ~/.claude/skills/kit-runner/tests/test_detect_tests.sh
```
Expected: failure (script doesn't exist).

**Step 3: Write minimal implementation**

`scripts/detect_tests.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail
emit() { printf '{"test_cmd": %s}\n' "$1"; }

if [ -f package.json ]; then
  if python3 -c "import json,sys; d=json.load(open('package.json')); s=d.get('scripts',{});
import sys
for k in ('test:run','test'):
  if k in s: print(k); sys.exit(0)
sys.exit(1)" 2>/dev/null; then
    key=$(python3 -c "import json; d=json.load(open('package.json')); s=d.get('scripts',{});
import sys
for k in ('test:run','test'):
  if k in s: print(k); sys.exit(0)")
    emit "\"npm run ${key}\""
    exit 0
  fi
fi

if [ -f pyproject.toml ]; then
  if grep -q '\[tool.pytest' pyproject.toml; then emit '"pytest"'; exit 0; fi
fi

if [ -f Cargo.toml ]; then emit '"cargo test"'; exit 0; fi
if [ -f go.mod ]; then emit '"go test ./..."'; exit 0; fi

emit "null"
```

```bash
chmod +x ~/.claude/skills/kit-runner/scripts/detect_tests.sh
```

**Step 4: Verify**

```bash
bash ~/.claude/skills/kit-runner/tests/run_all.sh
```
Expected: both tests green.

**Step 5: Commit**

```bash
cd ~/.claude/skills/kit-runner
git add scripts/detect_tests.sh tests/test_detect_tests.sh tests/fixtures/
git commit -m "feat(kit-runner): detect_tests.sh — node/python/rust/go runner detection

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: `detect_ci.sh` — CI system detector

**Files:**
- Create: `$KIT/scripts/detect_ci.sh`
- Create: `$KIT/tests/test_detect_ci.sh`
- Add fixtures: `tests/fixtures/repo_gha/.github/workflows/ci.yml`, `tests/fixtures/repo_gitlab/.gitlab-ci.yml`

**Step 1: Failing test** — three cases (`github_actions`, `gitlab`, `null`).

`tests/test_detect_ci.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail
KIT="${HOME}/.claude/skills/kit-runner"
. "${KIT}/tests/lib/assert.sh"
run() { ( cd "$1" && bash "${KIT}/scripts/detect_ci.sh" ); }

out=$(run "${KIT}/tests/fixtures/repo_gha")
echo "${out}" | grep -q '"ci": "github_actions"' || { echo "gha: ${out}"; exit 1; }
out=$(run "${KIT}/tests/fixtures/repo_gitlab")
echo "${out}" | grep -q '"ci": "gitlab"' || { echo "gitlab: ${out}"; exit 1; }
out=$(run "${KIT}/tests/fixtures/repo_empty")
echo "${out}" | grep -q '"ci": null' || { echo "empty: ${out}"; exit 1; }
echo "OK: test_detect_ci"
```

**Step 2: Run, fail.**
**Step 3: Implement** —

`scripts/detect_ci.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail
ci=null
[ -d .github/workflows ] && ls .github/workflows/*.yml >/dev/null 2>&1 && ci='"github_actions"'
[ -f .gitlab-ci.yml ] && ci='"gitlab"'
[ -f azure-pipelines.yml ] && ci='"azure_pipelines"'
[ -f Jenkinsfile ] && ci='"jenkins"'
[ -f .circleci/config.yml ] && ci='"circleci"'
printf '{"ci": %s}\n' "${ci}"
```

**Step 4: Run, pass.**
**Step 5: Commit `feat(kit-runner): detect_ci.sh`.**

---

## Task 3: `detect_kit.sh` — recognize FRAME-style kit features

Detects: powerstack4 user-local skill, Ralph harness, Taskmaster config, standing protocol, `.powerstack4/` state dir.

**Files:** `$KIT/scripts/detect_kit.sh`, `$KIT/tests/test_detect_kit.sh`, fixture `tests/fixtures/repo_kit/` mirroring FRAME's layout (touch `scripts/ralph/loop.sh`, `.taskmaster/config.json`, `.claude/STANDING_PROTOCOL.md`, `.powerstack4/task_plan.md`).

**Step 1: Failing test** — fixture-with-kit emits all `true`/paths; empty fixture emits all `false`/`null`.

**Step 3: Implement**

`scripts/detect_kit.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail
ps4_skill=false; [ -d "${HOME}/.claude/skills/powerstack4" ] && ps4_skill=true
ralph=null;       [ -f scripts/ralph/loop.sh ] && ralph='"scripts/ralph/loop.sh"'
tm_config=null;   [ -f .taskmaster/config.json ] && tm_config='".taskmaster/config.json"'
tm_tasks=null;    [ -f .taskmaster/tasks/tasks.json ] && tm_tasks='".taskmaster/tasks/tasks.json"'
sp=null;          [ -f .claude/STANDING_PROTOCOL.md ] && sp='".claude/STANDING_PROTOCOL.md"'
ps4_state=null;   [ -d .powerstack4 ] && ps4_state='".powerstack4/"'

cat <<EOF
{"powerstack4_skill_user_local": ${ps4_skill}, "ralph_harness": ${ralph}, "taskmaster_config": ${tm_config}, "taskmaster_tasks": ${tm_tasks}, "standing_protocol": ${sp}, "powerstack4_state": ${ps4_state}}
EOF
```

**Step 5: Commit `feat(kit-runner): detect_kit.sh`.**

---

## Task 4: `conv_commits.sh` — commit-style detector

Looks at last 20 commits, computes % matching `^(feat|fix|chore|docs|test|refactor|build|ci)(\(.+\))?: `. Emits `"conventional"` if ≥0.6, else `"freeform"`.

**Files:** `$KIT/scripts/conv_commits.sh`, `$KIT/tests/test_conv_commits.sh` (uses temp git repo with seeded commits).

**Step 1: Failing test** —
```bash
tmp=$(mktemp -d)
cd "${tmp}" && git init -q -b main
git -c user.email=t@t -c user.name=t commit --allow-empty -m "feat: a" -q
git -c user.email=t@t -c user.name=t commit --allow-empty -m "fix: b"  -q
git -c user.email=t@t -c user.name=t commit --allow-empty -m "junk c"  -q
out=$(bash "${KIT}/scripts/conv_commits.sh")
echo "${out}" | grep -q '"commit_style": "conventional"' || exit 1
```

**Step 3: Implement** —
```bash
#!/usr/bin/env bash
set -euo pipefail
total=$(git log --oneline -20 2>/dev/null | wc -l | tr -d ' ')
[ "${total}" = "0" ] && { echo '{"commit_style": null}'; exit 0; }
matches=$(git log --pretty=%s -20 | grep -cE '^(feat|fix|chore|docs|test|refactor|build|ci)(\([^)]+\))?: ' || true)
ratio=$(python3 -c "print(${matches}/${total})")
if python3 -c "import sys; sys.exit(0 if float('${ratio}') >= 0.6 else 1)"; then
  echo '{"commit_style": "conventional"}'
else
  echo '{"commit_style": "freeform"}'
fi
```

**Step 5: Commit.**

---

## Task 5: `cache_get.sh` + `cache_put.sh` — HEAD-keyed manifest cache

**Files:** `$KIT/scripts/cache_get.sh`, `$KIT/scripts/cache_put.sh`, `$KIT/tests/test_cache.sh`.

Cache path: `${HOME}/.claude/projects/$(git rev-parse --show-toplevel | shasum | cut -c1-12)/.kit-runner-cache.json`.

**Step 1: Failing test** —
1. In a temp git repo, `cache_get.sh` returns empty (exit 1).
2. `cache_put.sh '{"head":"abc","x":1}'` writes file under `~/.claude/projects/<hash>/`.
3. After `git commit --allow-empty -m x`, `cache_get.sh` returns empty again because `head` mismatches.
4. With matching head, `cache_get.sh` echoes the JSON and exits 0.

Test must redirect `${HOME}` to a tmp dir so we don't pollute real `~/.claude/projects`:
```bash
export HOME=$(mktemp -d)
mkdir -p "${HOME}/.claude/projects"
```

**Step 3: Implement**

`scripts/cache_put.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail
json="$1"
root=$(git rev-parse --show-toplevel)
hash=$(printf '%s' "${root}" | shasum | cut -c1-12)
dir="${HOME}/.claude/projects/${hash}"
mkdir -p "${dir}"
printf '%s\n' "${json}" > "${dir}/.kit-runner-cache.json"
```

`scripts/cache_get.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail
root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 1
hash=$(printf '%s' "${root}" | shasum | cut -c1-12)
file="${HOME}/.claude/projects/${hash}/.kit-runner-cache.json"
[ -f "${file}" ] || exit 1
head=$(git rev-parse HEAD 2>/dev/null) || exit 1
cached_head=$(python3 -c "import json,sys; print(json.load(open('${file}')).get('head',''))")
[ "${head}" = "${cached_head}" ] || exit 1
cat "${file}"
```

**Step 5: Commit `feat(kit-runner): cache_get/put with HEAD-keyed invalidation`.**

---

## Task 6: `discover.sh` aggregator

Composes the per-detector scripts into a single JSON manifest. Adds `head`, `scanned_at`, `languages`, `package_manager`, `monorepo`, `memory{}`, `mode` (read from cache if present).

**Files:** `$KIT/scripts/discover.sh`, `$KIT/tests/test_discover.sh`.

**Step 1: Failing test** — on FRAME repo (or fixture mirroring FRAME), assert manifest has `kit.standing_protocol == ".claude/STANDING_PROTOCOL.md"` and `package_manager == "npm"` and `head` matches `git rev-parse HEAD`.

**Step 3: Implement** — calls each `detect_*.sh`, merges via `python3 -c "import json,sys; …"`. Emits to stdout.

```bash
#!/usr/bin/env bash
set -euo pipefail
KIT="${HOME}/.claude/skills/kit-runner"
head=$(git rev-parse HEAD 2>/dev/null || echo null)
ts=$(date -u +%FT%TZ)
tests_json=$(bash "${KIT}/scripts/detect_tests.sh")
ci_json=$(bash "${KIT}/scripts/detect_ci.sh")
kit_json=$(bash "${KIT}/scripts/detect_kit.sh")
commits_json=$(bash "${KIT}/scripts/conv_commits.sh")

# language/pm — straight stat checks
pm=null
[ -f package-lock.json ] && pm='"npm"'
[ -f pnpm-lock.yaml ]    && pm='"pnpm"'
[ -f yarn.lock ]         && pm='"yarn"'
[ -f uv.lock ]           && pm='"uv"'
[ -f poetry.lock ]       && pm='"poetry"'

mem_agents=false; [ -f AGENTS.md ] && mem_agents=true
mem_claude=false; [ -f CLAUDE.md ] && mem_claude=true
mem_changelog=null; [ -f CHANGELOG.md ] && mem_changelog='"CHANGELOG.md"'
mem_devlog=null;    [ -d docs/devlog ] && mem_devlog='"docs/devlog/"'
mem_adr=null;       [ -d docs/adr ] && mem_adr='"docs/adr/"'

cat <<EOF | python3 -c "import json,sys; d=json.load(sys.stdin); print(json.dumps(d, indent=2))"
{"head": "${head}", "scanned_at": "${ts}",
 "package_manager": ${pm},
 "memory": {"agents_md": ${mem_agents}, "claude_md": ${mem_claude}, "changelog": ${mem_changelog}, "devlog_dir": ${mem_devlog}, "adr_dir": ${mem_adr}},
 ${tests_json#\{}, ${ci_json#\{}, ${commits_json#\{}, "kit": ${kit_json}, "mode": null}
EOF
```

(The `${X#\{}` trick strips the leading `{` of each fragment so they merge into one object — assumes each emitter outputs single-line `{...}`. Validate by running through `python3 -m json.tool`.)

**Step 4: Verify** on FRAME and on a fresh `mktemp -d` repo.

**Step 5: Commit.**

---

## Task 7: `init_bare.sh` — Mode 1 (no scaffolding, manifest only)

**Files:** `$KIT/scripts/init_bare.sh`, `$KIT/tests/test_init_bare.sh`.

**Step 1: Failing test** — in fresh `mktemp -d` git repo:
```bash
bash "${KIT}/scripts/init_bare.sh"
# assert no new files created
[ "$(git status --porcelain | wc -l | tr -d ' ')" = "0" ] || { echo "bare init created files"; exit 1; }
# assert cache written
file="${HOME}/.claude/projects/$(printf '%s' "$(pwd)" | shasum | cut -c1-12)/.kit-runner-cache.json"
[ -f "${file}" ] || exit 1
grep -q '"mode": "bare"' "${file}" || exit 1
```

**Step 3: Implement** —
```bash
#!/usr/bin/env bash
set -euo pipefail
KIT="${HOME}/.claude/skills/kit-runner"
manifest=$(bash "${KIT}/scripts/discover.sh")
manifest=$(printf '%s' "${manifest}" | python3 -c 'import json,sys; d=json.load(sys.stdin); d["mode"]="bare"; print(json.dumps(d))')
bash "${KIT}/scripts/cache_put.sh" "${manifest}"
printf '%s\n' "${manifest}"
```

**Step 5: Commit.**

---

## Task 8: AGENTS.md + CLAUDE.md templates (Windows-safe two-file)

**Files:** `$KIT/templates/AGENTS.md.tpl`, `$KIT/templates/CLAUDE.md.tpl`, `$KIT/tests/test_templates_agents.sh`.

**Step 1: Failing test** —
```bash
[ -f "${KIT}/templates/AGENTS.md.tpl" ] || exit 1
[ -f "${KIT}/templates/CLAUDE.md.tpl" ] || exit 1
# CLAUDE.md.tpl is one-line pointer + small immutable rules block, ≤ 1 KB.
size=$(wc -c < "${KIT}/templates/CLAUDE.md.tpl" | tr -d ' ')
[ "${size}" -lt 1024 ] || { echo "CLAUDE.md.tpl too large (${size})"; exit 1; }
grep -q "Read AGENTS.md" "${KIT}/templates/CLAUDE.md.tpl" || exit 1
# AGENTS.md template ≤ 8 KB, contains the agreed sections
size=$(wc -c < "${KIT}/templates/AGENTS.md.tpl" | tr -d ' ')
[ "${size}" -lt 8192 ] || exit 1
for s in "## Project" "## Stack" "## Run" "## Conventions"; do
  grep -qF "${s}" "${KIT}/templates/AGENTS.md.tpl" || { echo "missing ${s}"; exit 1; }
done
```

**Step 3: Implement** — `AGENTS.md.tpl` with placeholders `{{PROJECT}}`, `{{STACK}}`, `{{RUN_CMDS}}`, `{{CONVENTIONS}}`. `CLAUDE.md.tpl`:
```
Read AGENTS.md for all project conventions.

## Immutable rules (do not duplicate in AGENTS.md)
- Never commit secrets (.env, *.pem, credentials.json).
- Honor .gitignore — do not stage ignored paths.
- Conventional Commits with Co-Authored-By Claude when applicable.
```

**Step 5: Commit.**

---

## Task 9: ADR template + `/adr` slash command

**Files:** `$KIT/templates/adr-template.md`, `$KIT/templates/slash-adr.md`, `$KIT/tests/test_templates_adr.sh`.

`adr-template.md` is the standard MADR-lite frontmatter block (`id`, `title`, `date`, `status`, `decision`, `consequences`, `alternatives`).

`slash-adr.md`:
```yaml
---
description: Capture an architectural decision as a numbered ADR
allowed-tools: Bash(ls docs/adr:*), Read, Write
argument-hint: [decision-summary]
---
Read docs/adr/template.md and the existing ADRs in docs/adr/. Compute next id (max + 1, zero-padded 4 digits). Fill template with $ARGUMENTS as the title; capture decision context from recent conversation. Write to docs/adr/NNNN-{slug}.md. Update docs/adr/README.md index.
```

Test asserts both files exist and `slash-adr.md` carries valid frontmatter (`description:`, `allowed-tools:`, `argument-hint:`).

**Step 5: Commit.**

---

## Task 10: devlog template + `/devlog` slash command (PRIMARY mechanism)

**Files:** `$KIT/templates/devlog-template.md`, `$KIT/templates/slash-devlog.md`, `$KIT/tests/test_templates_devlog.sh`.

Per design §7.1 verbatim. `devlog-template.md`:
```markdown
---
date: {{ISO_DATE}}
session_id: {{SESSION_ID}}
branch: {{BRANCH}}
commits: {{COMMIT_COUNT}}
summary: "{{SUMMARY}}"
status: {{STATUS}}
---

## What I did
-

## Why
-

## Gotchas / lessons
-

## Follow-ups
-
```

`slash-devlog.md`:
```yaml
---
description: Append a devlog entry for the just-completed task
allowed-tools: Bash(git log:*), Bash(git rev-parse:*), Bash(git status:*), Read, Write
argument-hint: [task-summary]
---
Read .devlog-template.md, fill it in based on the current task ($ARGUMENTS), recent conversation, and `git log --oneline -10`. Append (do not overwrite) to docs/devlog/YYYY-MM-DD-{slug}.md. Update docs/devlog/README.md index.
```

Test asserts both exist; `slash-devlog.md` has the four required frontmatter keys and references `$ARGUMENTS`.

**Step 5: Commit.**

---

## Task 11: SessionStart inject hook template

**Files:** `$KIT/templates/hook-session-start.sh`, `$KIT/tests/test_hook_session_start.sh`.

Reads last 3 entries from `docs/devlog/README.md` (titles only), `git status --porcelain | head -10`, current branch. Emits JSON Hook output:
```json
{"hookSpecificOutput": {"hookEventName": "SessionStart", "additionalContext": "<...>"}}
```

Total ≤ 500 tokens (≈ 2000 chars). Test runs hook in fixture repo and asserts JSON parses + size cap.

```bash
#!/usr/bin/env bash
set -euo pipefail
ctx=""
if [ -f docs/devlog/README.md ]; then
  recent=$(grep -E '^- \[' docs/devlog/README.md 2>/dev/null | head -3 || true)
  [ -n "${recent}" ] && ctx="Recent devlog:\n${recent}\n"
fi
branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "(no git)")
status=$(git status --porcelain 2>/dev/null | head -10 || true)
ctx="${ctx}Branch: ${branch}\n"
[ -n "${status}" ] && ctx="${ctx}Status:\n${status}\n"
# truncate to 2000 chars
ctx=$(printf '%b' "${ctx}" | cut -c1-2000)
python3 -c "import json,sys; print(json.dumps({'hookSpecificOutput':{'hookEventName':'SessionStart','additionalContext':sys.argv[1]}}))" "${ctx}"
```

**Step 5: Commit.**

---

## Task 12: Stop hook fragment template (async, append-only JSONL)

**Files:** `$KIT/templates/hook-stop-fragment.sh`, `$KIT/tests/test_hook_stop.sh`.

Appends a single JSON line per turn to `~/.claude/projects/<hash>/fragments/<session>.jsonl` with `{ts, branch, status_summary}`. Returns immediately (`async: true` is set in the hook registration in `init_*.sh`, not here).

Test: invoke twice, assert file has 2 lines, both parse as JSON.

**Step 5: Commit.**

---

## Task 13: SessionEnd minimal safety-net hook

**Files:** `$KIT/templates/hook-session-end-minimal.sh`, `$KIT/scripts/devlog_append_minimal.sh`, `$KIT/tests/test_hook_session_end.sh`.

Per design §7.2 verbatim. **Critical: NO `claude -p` invocation** (bug #41577). Test:

1. In a fresh fixture repo, set up `git log --oneline …HEAD` to show 1 commit. Run hook → asserts `docs/devlog/$(date +%F)-session-stub*.md` created with `status: stub`.
2. Pre-create a non-stub devlog file with the session id → run hook → assert no new file written, no overwrite.

```bash
#!/usr/bin/env bash
set -euo pipefail
session_id="${1:-${CLAUDE_SESSION_ID:-unknown}}"
target="docs/devlog/$(date +%F)-session-${session_id:0:8}.md"
[ -f "${target}" ] && exit 0
# Only write if there were commits this session — heuristic: SESSION_START_REF env var
range="${SESSION_START_REF:-HEAD~5}..HEAD"
n=$(git log --oneline ${range} 2>/dev/null | wc -l | tr -d ' ' || echo 0)
[ "${n}" = "0" ] && exit 0
mkdir -p docs/devlog
cat > "${target}" <<EOF
---
date: $(date -u +%FT%TZ)
session_id: ${session_id}
branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
commits: ${n}
summary: "(auto-stub — Claude forgot to /devlog this session)"
status: stub
---
EOF
```

**Step 5: Commit.**

---

## Task 14: pre-bash protect-paths hook

**Files:** `$KIT/templates/hook-pre-bash-protect-paths.sh`, `$KIT/tests/test_hook_protect_paths.sh`.

Blocks `Edit` / `Write` / `Bash(rm/mv/sed)` against past-day devlog files. Reads PreToolUse JSON from stdin, exits non-zero with `permissionDecision: deny` for blocked commands.

Test: simulate a tool call attempting to overwrite `docs/devlog/2026-04-20-old.md` — expect deny. Allow today's file.

**Step 5: Commit.**

---

## Task 15: `init_light.sh` — Mode 2

**Files:** `$KIT/scripts/init_light.sh`, `$KIT/tests/test_init_light.sh`.

**Step 1: Failing test** — in `mktemp -d` git repo:
```bash
bash "${KIT}/scripts/init_light.sh"
for f in AGENTS.md CLAUDE.md docs/adr/README.md docs/adr/template.md \
         docs/adr/0001-baseline.md docs/devlog/README.md .devlog-template.md \
         .claude/commands/devlog.md .claude/commands/adr.md \
         .claude/settings.json; do
  [ -f "${f}" ] || { echo "missing ${f}"; exit 1; }
done
# settings.json registers SessionStart inject hook
python3 -c "import json; s=json.load(open('.claude/settings.json'));
assert any('inject-recent-devlog' in str(h) for h in s.get('hooks',{}).get('SessionStart',[])), 'no SessionStart hook'"
# cache marks mode=light
file="${HOME}/.claude/projects/$(printf '%s' "$(pwd)" | shasum | cut -c1-12)/.kit-runner-cache.json"
grep -q '"mode": "light"' "${file}"
```

**Step 3: Implement** — copies templates with placeholder substitution; merges into `.claude/settings.json` (preserve existing keys).

**Step 5: Commit.**

---

## Task 16: powerstack4 seed templates

**Files:** `$KIT/templates/powerstack4-init/{task_plan.md,findings.md,progress.md,reasoning.md,context-snapshot.md}`, `$KIT/tests/test_templates_powerstack4.sh`.

Each seed has the section headers powerstack4 expects (mirror current `.powerstack4/*.md` structure in FRAME). Use Read on FRAME's existing `.powerstack4/findings.md` and `task_plan.md` as the source of structure, then strip FRAME-specific content to leave only headings.

Test: each file exists, each contains the expected H1/H2 markers.

**Step 5: Commit.**

---

## Task 17: standing-protocol template

**Files:** `$KIT/templates/standing-protocol.tpl`, `$KIT/tests/test_template_standing_protocol.sh`.

Generalize FRAME's `.claude/STANDING_PROTOCOL.md` (replace project-specific paths/names with placeholders `{{PLAN_PATH}}`, `{{TASKMASTER_TAG}}`).

Test: file exists, contains the canonical 9-step loop in numbered list form.

**Step 5: Commit.**

---

## Task 18: Ralph harness templates

**Files:** `$KIT/templates/ralph-loop.sh.tpl`, `$KIT/templates/ralph-prompt.md.tpl`, `$KIT/templates/ralph-cost-guard.sh.tpl`, `$KIT/templates/ralph-progress.txt.tpl`, `$KIT/templates/ralph-readme.md.tpl`, `$KIT/tests/test_templates_ralph.sh`.

`ralph-loop.sh.tpl` is the Ralph harness with `{{PROMPT_PATH}}`, `{{COST_LIMIT_USD}}`, `{{MAX_ITERATIONS}}` placeholders. `ralph-prompt.md.tpl` is **generalized** — defers to `mcp__task-master__next_task` instead of hardcoding Phase A.

Test: each file exists and contains its expected placeholders.

**Step 5: Commit.**

---

## Task 19: path-scoped rule templates

**Files:** `$KIT/templates/rules/rule-frontend.md`, `$KIT/templates/rules/rule-backend.md`, `$KIT/templates/rules/rule-pipeline.md`, `$KIT/tests/test_templates_rules.sh`.

Each starts with YAML frontmatter:
```yaml
---
paths: ["src/components/**", "src/stores/**"]
---
```

Test: each rule has frontmatter with non-empty `paths` array (parsed via `python3 -c "import yaml..."` — but stdlib has no yaml; instead grep `^paths: \[` and assert non-empty).

**Step 5: Commit.**

---

## Task 20: `init_full.sh` — Mode 3 (everything)

**Files:** `$KIT/scripts/init_full.sh`, `$KIT/tests/test_init_full.sh`.

**Step 1: Failing test** — in fresh repo, after `init_full.sh`:
- Everything from Task 15 acceptance.
- Plus: `.powerstack4/{task_plan,findings,progress,reasoning,context-snapshot}.md`, `.claude/STANDING_PROTOCOL.md`, `scripts/ralph/{loop.sh,PROMPT.md,cost-guard.sh,progress.txt,README.md}`, `.claude/rules/` with at least one `*.md`.
- `.claude/settings.json` registers all 3 hooks (SessionStart, Stop, SessionEnd).
- If Taskmaster MCP detected (`command -v task-master 2>/dev/null` or `~/.config/task-master/`), `.taskmaster/config.json` exists.
- Cache marks `mode=full`.

**Step 3: Implement** — calls `init_light.sh` first, then layers Mode-3 extras.

**Step 5: Commit.**

---

## Task 21: References docs (stack-fingerprints, monorepo-signals, memory-locations, kit-features)

**Files:** `$KIT/references/{stack-fingerprints.md, monorepo-signals.md, memory-locations.md, kit-features.md}`, `$KIT/tests/test_references.sh`.

These are markdown reference tables. `stack-fingerprints.md` maps `marker file → likely test/build/lint commands` (Node/Python/Go/Rust/Java/Ruby). `kit-features.md` documents how `detect_kit.sh` recognizes the FRAME-style kit, and how to extend for other conventions.

Test: each file > 0 bytes, contains at least one markdown table.

**Step 5: Commit.**

---

## Task 22: Wire SKILL.md routing logic

**Files:** Update `$KIT/SKILL.md` (replacing Task 0 stub), `$KIT/tests/test_skill_md.sh`.

Per design §4.1 frontmatter verbatim, plus body explaining the verb-routing:

| Invocation | What runs |
|---|---|
| `/kit-runner` | `discover.sh` → cache-or-rerun, print manifest, branch on kit |
| `/kit-runner test` | `cache_get.sh` || `detect_tests.sh` only |
| `/kit-runner build` | similar — verb-scoped |
| `/kit-runner --refresh` | discard cache, full rediscover |
| `/kit-runner --init=<bare\|light\|full>` | run `init_<mode>.sh` |
| `/kit-runner <plan-path> [--mode=interactive\|ralph]` | drive standing-protocol loop |

Body length ≤ 500 lines per Anthropic best-practices. Description ≤ 1,536 chars (frontmatter `description:` field).

Test:
- `description:` line ≤ 1536 chars.
- Body line count ≤ 500.
- Lists each verb table row.
- `agent: Explore` and `allowed-tools:` present and restrict bash to `~/.claude/skills/kit-runner/scripts/*`.

**Step 5: Commit.**

---

## Task 23: Acceptance suite — criteria #1–#9

**Files:** `$KIT/tests/acceptance/{ac01_bare.sh, ac02_light.sh, ac03_full.sh, ac04_kit_loop.sh, ac05_verb_test.sh, ac06_cache_reuse.sh, ac07_devlog.sh, ac08_session_end_safety_net.sh, ac09_windows_no_symlink.sh}`, `$KIT/tests/acceptance/run_all.sh`.

Each acceptance test corresponds 1:1 to design §12 criterion N. Use `mktemp -d` + `git init` for fresh fixtures. AC04 uses **a snapshot copy** of FRAME's repo (set `CWD=/Users/arpit/Desktop/FRAME2.0` and operate read-only — no commits inside FRAME during this AC), or skips if `${KIT_AC04_FRAME_PATH:-}` is unset.

AC09 is non-Windows from a Mac, so simulate by:
```bash
git -c core.symlinks=false clone . /tmp/sym-test
ls -l /tmp/sym-test/AGENTS.md /tmp/sym-test/CLAUDE.md
# both must be regular files, neither a symlink
```

**Step 1–4 per criterion** as described in design §12. Do these as 9 separate Tasks (23a–23i) — each one written-failing-then-passing — or as a single audit Task that fills in any gaps caught by the spec runner. Recommended: split (one commit per criterion) for clean review.

**Step 5: Final commit `test(kit-runner): all 9 acceptance criteria green`.**

---

## Task 24: Decide skill source location (FRAME mirror vs. standalone)

**Files:** `docs/plans/2026-04-25-kit-runner-portable-implementation-plan.md` (this file — append decision), optionally `tooling/kit-runner/` (FRAME mirror).

Two sub-options, decide before Task 25:

- **Option A — Standalone repo at `~/.claude/skills/kit-runner/` only.** No FRAME-side mirror. Other devs install with `git clone <url> ~/.claude/skills/kit-runner`.
- **Option B — Mirror at `tooling/kit-runner/`.** A `~/.claude/skills/kit-runner/install.sh` symlinks (Mac/Linux) or copies (Windows) the mirror into `~/.claude/skills/`. FRAME repo contains the source of truth.

Recommendation: **Option B**, because FRAME-specific kit-features must evolve in lockstep with FRAME (`detect_kit.sh` keys off `.taskmaster/`, `.powerstack4/`, `scripts/ralph/`). Capture decision in an ADR via `/adr "kit-runner source location"` after the FRAME Mode-3 bootstrap (Task 25) lands.

This Task is a **decision** — no code changes other than appending the chosen option to this plan and writing one ADR.

---

## Task 25: Apply Mode 3 to FRAME (self-bootstrap)

**Files (in FRAME repo, branch `feat/kit-runner-bootstrap`):**
- Newly created by `/kit-runner --init=full`: `.claude/commands/{devlog,adr}.md`, `docs/adr/{README,template,0001-baseline}.md`, `docs/devlog/README.md`, `.devlog-template.md`, `.claude/rules/*.md`, hook scripts under `.claude/hooks/`, updated `.claude/settings.json`.
- Already present (skip overwrite): `AGENTS.md` (write only if missing), `CLAUDE.md` (write only if missing — FRAME already has CLAUDE.md), `.powerstack4/*` (skip — already populated), `scripts/ralph/*` (skip — already populated), `.claude/STANDING_PROTOCOL.md` (skip — already present), `.taskmaster/config.json` (skip).

**`init_full.sh` must guard each write with `[ ! -f "${target}" ]` so re-running on FRAME is idempotent.** Verify Task 20's test covers this.

**Step 1: Failing test** — script `tests/acceptance/ac10_frame_self_bootstrap.sh` runs `init_full.sh` against a worktree of FRAME (`git worktree add /tmp/frame-bootstrap HEAD`), asserts:
- `AGENTS.md`, `docs/adr/README.md`, `docs/devlog/README.md`, `.claude/commands/devlog.md` are present after init.
- Existing FRAME files (`CLAUDE.md`, `.powerstack4/task_plan.md`, `.taskmaster/config.json`) are bytewise unchanged (`diff` against the worktree's HEAD).
- `git status` lists only newly-created files; no modifications to existing tracked files.

**Step 3: Implement** — fix `init_full.sh` idempotence if test fails.

**Step 4: Run on FRAME for real** —
```bash
cd /Users/arpit/Desktop/FRAME2.0
git checkout -b feat/kit-runner-bootstrap
# DRY RUN first
KIT_DRY_RUN=1 bash ~/.claude/skills/kit-runner/scripts/init_full.sh
# review printed plan, then real run
bash ~/.claude/skills/kit-runner/scripts/init_full.sh
git status
```

Review every new file before staging. Stage in groups:

```bash
git add AGENTS.md  # only if newly created
git commit -m "feat(kit): seed AGENTS.md (cross-tool source of truth)
Co-Authored-By: Claude <noreply@anthropic.com>"

git add docs/adr docs/devlog .devlog-template.md
git commit -m "feat(kit): scaffold ADR + devlog directories
Co-Authored-By: Claude <noreply@anthropic.com>"

git add .claude/commands .claude/hooks .claude/rules .claude/settings.json
git commit -m "feat(kit): register /devlog, /adr, hooks, path-scoped rules
Co-Authored-By: Claude <noreply@anthropic.com>"
```

**Step 5: Open PR** — `gh pr create --title "feat(kit): bootstrap kit-runner Mode 3 in FRAME"` with body summarizing the design doc + this plan + the acceptance test results.

---

## Verification before completion

After each Task: run `bash ~/.claude/skills/kit-runner/tests/run_all.sh`; expect **All green**. After Task 23: also run `bash ~/.claude/skills/kit-runner/tests/acceptance/run_all.sh`; expect 9/9.

Use `superpowers:verification-before-completion` skill at every Task boundary as the standing protocol mandates.

---

## Out of scope (deferred per design §3, §14)

- `/rollup` weekly devlog compression (defer until ≥50 entries).
- claude-mem / vector search across history.
- `.kit-runner.yml` user-supplied override format.
- Cross-machine cache sync.
- Phase C-Local Steps 2–6 (SPA Dockerfile, compose, Helm, kind) — driven later by `/kit-runner docs/plans/2026-04-25-phase-c-local-infra-plan.md` after Task 25 lands.

---

## Plan complete and saved to `docs/plans/2026-04-25-kit-runner-portable-implementation-plan.md`.

Two execution options:

**1. Subagent-Driven (this session)** — I dispatch a fresh subagent per task, review between tasks, fast iteration. Stays in the current Claude Code session.

**2. Parallel Session (separate)** — Open a new session with `superpowers:executing-plans`, batch execution with checkpoints.

Which approach?

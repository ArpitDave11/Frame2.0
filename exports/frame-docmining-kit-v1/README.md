# FRAME DocMining Kit — kit-hardening-v1

A mechanically-enforced guardrail kit for Claude Code projects. Converts
advisory rules ("please don't edit X") into blocking checks at the tool-call,
bash-command, and git-commit levels.

Built originally for the FRAME2.0 DocMining integration, but portable to any
TypeScript + Python repo that uses Claude Code.

## What's in the box

| Layer | File(s) | What it does |
|---|---|---|
| **Claude Code hooks** | `kit/.claude/hooks/*` + `kit/.claude/settings.json` | Block edits/writes/bash that touch protected paths; gate session stop on typecheck; inject a standing protocol on every prompt |
| **Git pre-commit hooks** | `kit/.pre-commit-config.yaml` + `kit/scripts/hooks/*.sh` | Commit-level backstop for non-Claude-Code authors; require journal update on scoped commits |
| **Ralph Loop harness** | `kit/scripts/ralph/*` | Fresh-context `claude -p` loop for mechanical boilerplate work, with iteration + spend caps |
| **Runbook** | `kit/docs/runbooks/kit-hardening-v1.md` | Operator manual: what each gate does, how to bypass, coexistence notes |
| **Test harness** | `kit/scripts/hooks/test-hooks.sh` | 17 smoke tests for the hooks |

## The six gates

| ID | Event | Enforces |
|---|---|---|
| H1 | `PreToolUse` (Edit/Write) | Deny edits to protected paths |
| H2 | `PreToolUse` (Bash) | Deny write-redirects (`>`, `>>`, `sed -i`, `tee`) targeting protected paths; deny `git commit --no-verify` |
| H3 | `PreToolUse` (Edit/Write) | Deny edits to **existing** test files (creating new tests is allowed) |
| H4 | `Stop` | Block session termination while TypeScript typecheck is broken on scoped files |
| H5 | `pre-commit` (git) | Commits touching scoped files must update the task journal |
| H6 | `UserPromptSubmit` | Inject `STANDING_PROTOCOL.md` into every turn's context |

Every gate has an audited human-only bypass. See `kit/docs/runbooks/kit-hardening-v1.md` for the bypass table.

## Install

See [`INSTALL.md`](INSTALL.md) for step-by-step instructions.

**TL;DR:**

```bash
cd /path/to/your/repo
/path/to/frame-docmining-kit-v1/install.sh
```

## Customize for a non-FRAME project

Several values in the kit are FRAME-specific (path regexes, branch names,
typecheck command). See [`CUSTOMIZATION.md`](CUSTOMIZATION.md) for the
checklist of what to edit before using this kit in a different repo.

## Version

- **v1** (2026-04) — Initial release. Hooks H1–H6, Ralph Loop, pre-commit config.

## Not in this kit

Per the underlying research doc §9, these are deferred:
- Managed-settings deployment (team use)
- F-ID traceability via shtracer
- SessionStart compact re-injection
- Observability stack

Revisit if you adopt the kit for team/long-running projects.

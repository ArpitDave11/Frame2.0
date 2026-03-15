# powerstack4 - Unified Orchestration Skill with Context Survival

**Date:** 2026-03-14
**Status:** Design (Reviewed & Revised)
**Skill Location:** `/Users/arpit/.claude/skills/powerstack4/`

---

## Goal

A single Claude Code skill that orchestrates four capabilities — Context7 (documentation accuracy), Sequential Thinking (architectural reasoning), Taskmaster (project structure), and planning-with-files patterns (progress tracking) — through an event-driven model with continuous context offloading to disk.

## Problem Statement

These four capabilities are individually powerful but currently operate in isolation. Developers must manually decide when to invoke each one, leading to:

1. **Missed documentation lookups** — using deprecated APIs because Context7 wasn't called
2. **Shallow reasoning** — jumping to implementation without structured branching analysis
3. **Unstructured execution** — no dependency-aware task decomposition from Taskmaster
4. **Lost context** — conversation state vanishes when the context window fills up or sessions end

powerstack4 solves all four by acting as an always-on event dispatcher that routes to the right capability at the right time, while continuously offloading state to disk so no work is ever lost.

## Implementation Medium: Hybrid Skill + Hooks

**Critical design decision:** A SKILL.md is markdown instructions that Claude interprets — it cannot enforce rules programmatically. powerstack4 uses a **hybrid approach**:

- **Hooks** (programmatically enforced) handle mechanical behaviors:
  - `PreToolUse` hook: reads task_plan.md header before each tool call (goal alignment)
  - `PostToolUse` hook: increments action counter and triggers offload at threshold
  - `Stop` hook: runs session-completion checks and final offload
- **SKILL.md instructions** (judgment-based) handle when to invoke reasoning, fetch docs, decompose tasks, and escalate

This split ensures the critical behaviors (offloading, recitation) actually happen, while leaving judgment calls (when to reason deeply, when to fetch docs) to Claude's interpretation.

## Architecture: Event-Driven Orchestrator

The skill uses trigger conditions (not fixed phases) to activate capabilities. They interleave freely based on what's happening in the conversation.

### Trigger Table

| Trigger Condition | Capability | Action |
|---|---|---|
| Session starts | Resume Engine | Check `.powerstack4/` for saved state. Reload if exists. |
| New project/feature/task described | Taskmaster MCP | Write PRD, parse into subtasks, write to `tasks.md`. |
| Architectural decision or complexity detected | Sequential Thinking (prompt pattern) | Structured branching reasoning. Write to `reasoning.md`. |
| Library/API/framework referenced | Context7 MCP | Fetch current docs. Cache in `docs-cache.md`. |
| Subtask completed or phase boundary reached | Progress Tracking | Update `task_plan.md`, `findings.md`, `progress.md`. |
| Every 5 productive tool calls | Offload Engine | Summarize state to `context-snapshot.md`. |
| Before architectural or scope decisions | Recitation | Re-read first 30 lines of `task_plan.md`. |

### Capability Priority

When multiple triggers fire simultaneously, resolve in this order:

1. **Offload** — context safety always wins
2. **Recite** — stay aligned with goals
3. **Context7** — get correct info before reasoning
4. **Sequential Thinking** — reason before acting
5. **Taskmaster** — structure before execution
6. **Progress Tracking** — track after acting

**Note:** Priority numbers indicate resolution order when triggers conflict. Rule numbers (below) indicate logical sequence for a new project. These are independent orderings.

## The 7 Orchestration Rules

### Counter Definition

**Productive tool calls** are tool calls that advance the user's task (file reads, writes, edits, bash commands, MCP tool invocations). **Housekeeping tool calls** — offload writes, recitation reads, progress file updates — do NOT increment the counter and do NOT re-trigger rules. This prevents infinite loops.

### RULE 1: TASKMASTER-FIRST

**When:** User describes a new project, feature, or task.
**Do:**
1. Write a PRD file to `.taskmaster/docs/prd.txt` summarizing the user's requirements
2. Call `mcp__task-master__parse_prd` with the PRD file path to generate structured tasks
3. For tasks with complexity score > 7, call `mcp__task-master__expand_task` to break down further
4. Use `mcp__task-master__next_task` to determine the first unblocked task
5. Mirror the task state to `.powerstack4/tasks.md` for context-survival purposes
6. Call Sequential Thinking (RULE 3) to validate the decomposition is sound

**Taskmaster writes to `.taskmaster/tasks/tasks.json` natively.** The `.powerstack4/tasks.md` file is a human-readable mirror used for session recovery and offloading. Both locations are maintained.

### RULE 2: DOCS-ON-REFERENCE

**When:** Any library, framework, or API is mentioned or about to be used.
**Do:**
1. Check `.powerstack4/docs-cache.md` for existing cached docs
2. **Cache TTL:** Entries older than 24 hours are stale and re-fetched
3. If cache miss or stale: Call `mcp__plugin_context7_context7__resolve-library-id` then `mcp__plugin_context7_context7__query-docs`
4. Cache results in `docs-cache.md` with ISO timestamp, library name, and version
5. **Cache size limit:** Keep only the most relevant 200 lines per library. If `docs-cache.md` exceeds 1000 lines, remove the oldest entries
6. Inject relevant documentation into current reasoning context

### RULE 3: REASON-ON-COMPLEXITY

**When:** Architectural decision needed, multiple valid approaches exist, or debugging a non-trivial issue.

**Sequential Thinking is a prompt-based reasoning pattern, not an MCP tool call.** It instructs Claude to use structured, explicit multi-step reasoning with branching and revision.

**Do:**
1. Structure reasoning as numbered thought steps (STEP 1, STEP 2, ...)
2. At decision points, create explicit branches: "BRANCH A: [approach]... BRANCH B: [approach]..."
3. Evaluate each branch against constraints (performance, complexity, maintainability)
4. Allow revision: "REVISING STEP 3: [original was wrong because...]"
5. Record the winning approach, rejected alternatives, and reasoning in `.powerstack4/reasoning.md`
6. Apply the chosen approach

**Examples of "architectural decisions" (triggers RULE 3):**
- Choosing between state management approaches (Redux vs Context vs Zustand)
- Deciding on database schema design
- Selecting an authentication strategy
- Structuring a complex module's API

**Examples that do NOT trigger RULE 3:**
- Naming a variable
- Writing a straightforward function body
- Fixing a simple typo or syntax error

### RULE 4: TRACK-AT-BOUNDARIES

**When:** After completing a subtask, reaching a phase boundary, or making a significant discovery. NOT after every single tool call.

**Do:**
- Update `task_plan.md` with current phase status (`pending → in_progress → complete`)
- Update `progress.md` with completed subtask and result
- If research or discovery: Update `findings.md`
- Call `mcp__task-master__set_task_status` to sync Taskmaster's native state

**Batching:** Progress updates happen at subtask boundaries, not per-tool-call. A subtask that requires 5 file edits triggers ONE progress update after the 5th edit, not 5 updates.

### RULE 5: OFFLOAD-EVERY-5

**When:** Every 5 productive tool calls (see Counter Definition above).
**Do:**
1. Summarize current conversation state to `.powerstack4/context-snapshot.md`
2. Include: active task, all decisions made, progress, next steps, open questions, files modified
3. After writing to disk: do not repeat verbose reasoning inline in subsequent messages — reference the file instead (e.g., "see reasoning.md for the full analysis")
4. Context window should hold only the active working set; everything else lives on disk

**Note:** Claude cannot programmatically delete its own context. "Offloading" means writing state to disk so that if context is automatically compacted or the session is cleared, recovery is possible. The `PostToolUse` hook increments the counter; the skill instructions tell Claude what to write.

### RULE 6: RECITE-BEFORE-DECIDE

**When:** Before architectural decisions (RULE 3 triggers) or scope-changing actions. NOT before every tool call.

**Do:**
- Re-read first 30 lines of `task_plan.md`
- Verify the upcoming action aligns with stated goals
- If misaligned, course-correct before proceeding

### RULE 7: THREE-STRIKE-ESCALATE

**When:** Same logical approach fails 3 times.
**Do:**
- Log all 3 attempts with exact error details to `findings.md`
- Stop execution immediately
- Escalate to user with full context of what was tried and why it failed
- Never attempt the same failed approach a 4th time
- On next attempt, mutate the approach (different strategy, not same retry)

**Tool failures vs task failures:** If an MCP tool fails (timeout, rate limit, server error), retry the tool call up to 2 times with backoff. Tool retries do NOT count toward the 3-strike escalation. The 3-strike rule applies only to logical/approach failures (e.g., "this algorithm doesn't produce correct output" or "this architecture doesn't satisfy the requirement").

## Continuous Context Offloading (Context Survival)

### The Core Principle

```
Context Window = RAM (volatile, limited, expensive)
Filesystem = Disk (persistent, unlimited, cheap)

→ Anything important gets written to disk immediately.
→ Context holds only the active working set.
→ After offloading, reference files instead of repeating content.
```

### context-snapshot.md Format

```markdown
# Context Snapshot
## Last Updated: [ISO timestamp]
## Active Task: [task name from Taskmaster]
## Current Phase: [phase from task_plan.md]
## Session Duration: [approximate]

## Conversation Summary
[Compressed summary of full conversation — decisions, discoveries, direction]

## Decisions Made
- [timestamp] Decision: [what] | Reason: [why] | Alternative rejected: [what]
- ...

## What's Been Tried
- [action] → [result: success/failure] → [lesson learned]
- ...

## Next Steps
1. [immediate next action]
2. [following action]
3. [action after that]

## Open Questions
- [anything unresolved or needing user input]

## Files Modified This Session
- [path] — [what changed and why]
- ...

## Error Log
- [timestamp] Error: [description] | Attempt: [N/3] | Resolution: [what worked or "escalated"]
```

### File Size Management

State files can grow unbounded across long sessions. Apply these limits:

| File | Max Size | Action When Exceeded |
|---|---|---|
| `context-snapshot.md` | 300 lines | Overwrite entirely (it's a snapshot, not a log) |
| `reasoning.md` | 500 lines | Archive to `reasoning-archive-YYYY-MM-DD.md`, keep last 200 lines |
| `progress.md` | 500 lines | Archive to `progress-archive-YYYY-MM-DD.md`, keep last 100 lines |
| `docs-cache.md` | 1000 lines | Remove oldest entries |
| `findings.md` | 500 lines | Archive to `findings-archive-YYYY-MM-DD.md`, keep last 200 lines |
| `session-log.md` | 300 lines | Archive to `session-log-archive-YYYY-MM-DD.md`, keep last 100 lines |

### Session Recovery Protocol

When a new session starts (or after `/clear`):

1. Check for `.powerstack4/context-snapshot.md`
2. If found, read state files in this order: `context-snapshot.md`, `task_plan.md`, `tasks.md` (skip files that don't exist)
3. Run the **5-Question Reboot Check**:
   - Q1: What am I trying to accomplish? (from `task_plan.md` goal)
   - Q2: What phase am I in? (from `progress.md` current phase)
   - Q3: What did I just finish? (from `context-snapshot.md` last actions)
   - Q4: What's next? (from `tasks.md` dependency graph — next unblocked task via `mcp__task-master__next_task`)
   - Q5: Are there errors to avoid repeating? (from `findings.md` error log)
4. Present brief summary to user: "Resuming from where we left off. Currently on [task], phase [N]. Next step: [action]."
5. Continue execution from the exact next step

## Decision Autonomy Model

### Autonomous Decisions (no human prompt)

The skill handles these automatically:
- When to fetch docs (any library reference triggers Context7)
- When to activate structured reasoning (any architectural or complex choice)
- When to offload to disk (every 5 productive actions, always)
- When to read task plan (before architectural decisions)
- Which subtask to work on next (follows Taskmaster dependency graph)
- How to recover from errors (up to 3 attempts, mutate approach each time)
- When to update progress files (at subtask boundaries)
- When to cache documentation (always after Context7 fetch)

### Escalated to Human

The skill asks the user for:
- **3-Strike Escalation**: After 3 failed logical approaches to the same problem
- **Scope changes**: Task turns out significantly larger than initially understood
- **Ambiguous requirements**: Task description doesn't make intent clear
- **Destructive actions**: Deleting files, force-pushing, dropping data

## File Structure

### Project-Level State (per-project, in project root)

```
.powerstack4/                      # Created in project root (nearest .git ancestor or cwd)
├── context-snapshot.md            # Full context state (continuously updated)
├── tasks.md                       # Taskmaster mirror (human-readable task graph)
├── reasoning.md                   # Sequential Thinking traces (branches, revisions)
├── docs-cache.md                  # Context7 results (timestamped, versioned)
├── session-log.md                 # Chronological log of actions and results
├── task_plan.md                   # Phases, status, decisions, errors
├── findings.md                    # Requirements, research, technical decisions
└── progress.md                    # Session progress, test results, error log
```

**Project root detection:** The nearest ancestor directory containing `.git`. If no `.git` found, use the current working directory when powerstack4 first activates.

**Ownership:** powerstack4 owns all files in `.powerstack4/`. If a user manually edits these files, always re-read before writing to avoid overwriting their changes.

### Skill Files (in user's skills directory)

```
/Users/arpit/.claude/skills/powerstack4/
├── SKILL.md                       # Main skill definition (orchestration logic + instructions)
└── references/
    ├── context-snapshot-template.md   # Template for context snapshots
    ├── tasks-template.md              # Template for Taskmaster mirror
    ├── reasoning-template.md          # Template for reasoning traces
    └── recovery-prompt.md             # The 5-question reboot check prompt
```

**Note:** Uses `references/` directory (standard skill convention), not `templates/` or `prompts/`.

## Conflict Avoidance with planning-with-files

The planning-with-files plugin is already installed and has its own hooks that manage `task_plan.md`, `findings.md`, and `progress.md` at the project root.

**Resolution:** powerstack4 places ALL its state files inside the `.powerstack4/` subdirectory. The planning-with-files plugin continues to manage files at the project root if it's active. They operate on different file paths and do not conflict.

**Recommended setup:** When using powerstack4, the user may optionally disable the planning-with-files plugin (since powerstack4 subsumes its functionality). If both are active, they coexist without conflict but produce redundant tracking.

## Graceful Degradation

If an MCP server is unavailable, the skill degrades gracefully:

| Missing Capability | Fallback Behavior |
|---|---|
| Context7 MCP | Use `WebSearch` for documentation. Note reduced confidence in results. |
| Taskmaster MCP | Use Claude's own task decomposition. Write tasks manually to `.powerstack4/tasks.md`. |
| Sequential Thinking | Already a prompt pattern — always available as long as Claude is running. |
| planning-with-files hooks | Write files directly without hook validation. No functional loss. |

## Activation

The skill uses a broad `description` field so Claude's automatic skill matching activates it for any coding task:

```yaml
name: powerstack4
description: Use for any development task — orchestrates documentation lookup, structured reasoning, task decomposition, and progress tracking with continuous context offloading
user-invocable: true
```

**Session start behavior:** The SKILL.md instructions tell Claude to check for `.powerstack4/context-snapshot.md` at the start of any task. A `SessionStart` hook (defined in the skill's hook configuration) runs a lightweight check script that prints "powerstack4 state found" or "no powerstack4 state" to prime Claude's awareness.

## Prerequisites

Required MCP servers:

1. **Context7**: `npx -y @upstash/context7-mcp@latest`
   - Tools: `mcp__plugin_context7_context7__resolve-library-id`, `mcp__plugin_context7_context7__query-docs`
   - Status: Already installed
2. **Taskmaster**: `npx -y task-master-ai`
   - Tools: `mcp__task-master__parse_prd`, `mcp__task-master__expand_task`, `mcp__task-master__get_tasks`, `mcp__task-master__next_task`, `mcp__task-master__set_task_status`, `mcp__task-master__update_subtask`
   - Status: Already installed
   - Config: Set provider to `claude-code` in `.taskmaster/config.json` (no extra API keys)
3. **Sequential Thinking**: Prompt-based pattern (no MCP server required)
4. **planning-with-files**: Installed as plugin (optional when powerstack4 is active)

## Anti-Patterns

1. **Never skip offloading** — Even if context seems small, always write to disk at the 5-action threshold
2. **Never retry same failure** — After 3 strikes, mutate the approach or escalate
3. **Never reason without docs** — If a library is involved, fetch Context7 docs first
4. **Never start coding without task breakdown** — Taskmaster (or manual decomposition) runs before implementation
5. **Never assume context persists** — Always write conclusions to disk, context can be compressed at any time
6. **Never ignore the dependency graph** — Work on unblocked tasks only, respect the order
7. **Never make architectural decisions without structured reasoning** — Use branching for non-trivial choices
8. **Never count housekeeping calls** — Offloads, recitations, and progress writes do not increment the productive action counter
9. **Never confuse tool failures with task failures** — MCP timeouts get retried; logical failures count toward 3-strike

## Success Criteria

1. **Zero context loss**: A session can be `/clear`ed and resumed with no information loss
2. **Current documentation**: Every library usage is backed by Context7's current docs (or WebSearch fallback)
3. **Structured reasoning**: Every architectural decision has a branching analysis with alternatives considered
4. **Dependency awareness**: Tasks execute in the correct order per Taskmaster's dependency graph
5. **Full audit trail**: Every decision, phase transition, and error is logged to disk files
6. **Autonomous execution**: The skill handles capability routing without human intervention for functional decisions
7. **Sustainable overhead**: The housekeeping-to-productive ratio stays below 1:3 (one housekeeping action per 3 productive actions)

# Extreme Initiative — GitLab Integration Redesign

**Date:** 2026-04-25
**Status:** Approved (brainstorm)
**Prerequisite:** `docs/plans/2026-04-25-extreme-initiative-design.md` (local-first wizard, 14 tasks complete)
**Reference:** `docs/research/storyforge_gitlab_traversal_complete.md` (API traversal patterns)
**Next step:** `superpowers:writing-plans` for atomic implementation tasks

---

## 1. Goal

Redesign the Extreme Initiative module (already built as a local-first wizard) to integrate with GitLab's real group/epic hierarchy. Streams = GitLab groups fetched from API. Crews = real subgroups. Publish creates a Stream Epic → Crew Epic hierarchy with correct parent-child linking.

**What changes:** Store state, settings, a new service layer, InitStep (fetches tree), RefineCrewsStep (real publish).
**What doesn't change:** The wizard UX, StepIndicator, SplitCrewsStep chip assignment, AI actions, component architecture.

## 2. Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Approach | Extend initiativeStore + add initiativeService (Approach 1) | Minimal rework of 12 existing components |
| Group tree fetch | Eager upfront on wizard entry | User sees full picture; groups rarely change |
| Epic creation timing | At publish only (Step 4) | No orphan epics if user abandons mid-wizard |
| Settings | New `streamGroupId` field alongside existing `groupId` | Each module uses its own field |
| Publish scope | Epics only (v1) | Issues deferred; user creates via existing Issues tab |
| API layer | Compose existing `gitlabClient.ts` functions | 95 functions already exist; no new HTTP code |

## 3. Store Changes — `initiativeStore` Extensions

### New types

```typescript
interface StreamGroup {
  id: number;          // GitLab group.id (global)
  name: string;
  fullPath: string;
}

// Crew gains gitlabGroupId
interface Crew {
  id: string;                  // local UID (for UI keying)
  gitlabGroupId: number;       // GitLab subgroup.id — NEW
  name: string;                // subgroup.name (from API, not user-typed)
  refinedEpic?: string;
  refineStatus: 'pending' | 'refining' | 'done' | 'error';
}

interface GroupNode {
  id: number;
  name: string;
  fullPath: string;
  children: GroupNode[];
}

interface PublishState {
  status: 'idle' | 'publishing' | 'done' | 'error';
  streamEpicId?: number;
  streamEpicIid?: number;
  crewEpicIds: Record<string, { id: number; iid: number }>;
  error?: string;
}
```

### New state fields

```typescript
// Added to InitiativeState:
streamGroup: StreamGroup | null;    // replaces streams[] + selectedStreamId
groupTree: GroupNode | null;        // full Stream→Crew(→Pod) tree
crewSubgroups: StreamGroup[];       // flat list of Crew-level subgroups
publish: PublishState;              // publish progress tracking
```

### Removed

- `streams: Stream[]` — replaced by `streamGroup` (single, from API)
- `selectedStreamId` — replaced by `streamGroup.id`

### Key invariant

`Crew.gitlabGroupId` maps 1:1 to a real GitLab subgroup. Crew names come from the API, not user input. The crew count is determined by how many subgroups exist under the Stream group (user selects which to include).

## 4. Settings Extension

Add to `configStore` / GitLab settings UI:

```typescript
streamGroupId: string;    // Stream-level group ID for Extreme Initiative
```

Settings modal gains one field:

```
GitLab Configuration
  Personal Access Token: [••••••••••]
  Group ID:              [391331]           ← existing (Crew-level, Requirements)
  Stream Group ID:       [280115]           ← NEW (Stream-level, Initiative)
  Endpoint:              [devcloud.ubs.net]
```

Validation: `fetchGroupMetadata(config, streamGroupId)` on save — show group name on success, inline error on failure.

Module routing:
- Requirements tab → uses `groupId`
- Extreme Initiative tab → uses `streamGroupId`

## 5. Service Layer — `initiativeService.ts`

**New file:** `src/services/gitlab/initiativeService.ts`

Four functions composing existing `gitlabClient.ts` calls:

### 5.1 `fetchStreamTree`

```typescript
fetchStreamTree(config, streamGroupId): Promise<Result<{
  stream: StreamGroup;
  crews: StreamGroup[];
  tree: GroupNode;
}>>
```

Internally:
1. `fetchGroupMetadata(config, streamGroupId)` → stream name/path
2. `fetchGitLabSubgroups(config, streamGroupId)` → crew subgroups
3. For each crew: `fetchGitLabSubgroups(config, crewGroupId)` → pods (cached for future use)

### 5.2 `publishInitiativeEpics`

```typescript
publishInitiativeEpics(config, {
  streamGroupId: number,
  streamTitle: string,
  streamEpicMarkdown: string,
  crews: Array<{ gitlabGroupId: number; name: string; refinedEpic: string }>
}): Promise<Result<{
  streamEpicId: number;
  streamEpicIid: number;
  crewEpics: Array<{ crewName: string; epicId: number; epicIid: number }>;
}>>
```

Internally (sequential, order matters):

**Step A — Create Stream Epic:**
```
createGitLabEpic(config, {
  title: streamTitle,
  description: streamEpicMarkdown,
  group_id: streamGroupId
})
→ streamEpic.id (global), streamEpic.iid (internal)
```

**Step B — For each crew:**
```
createGitLabEpic(config, {
  title: crew.name,
  description: crew.refinedEpic,
  group_id: crew.gitlabGroupId    // crew's own subgroup
})
→ crewEpic.iid

updateGitLabEpic(config, crew.gitlabGroupId, crewEpic.iid, {
  parent_id: streamEpic.id        // GLOBAL id, not iid! (storyforge §2.2)
})
```

**Error handling:** Partial success tracked. If Step A succeeds but Step B fails for a crew, `publishState` records which crews failed. User retries just those. No rollback (matches storyforge — orphan epics accepted as documented risk).

### 5.3 `fetchStreamEpics`

```typescript
fetchStreamEpics(config, streamGroupId): Promise<Result<
  Array<{ id: number; iid: number; title: string }>
>>
```

For "resume" / "update existing" flow. Wraps `fetchGroupEpics(config, streamGroupId)`.

### 5.4 `fetchCrewSubgroups`

```typescript
fetchCrewSubgroups(config, streamGroupId): Promise<Result<StreamGroup[]>>
```

Lightweight alternative to `fetchStreamTree` when full tree isn't needed. Wraps `fetchGitLabSubgroups(config, streamGroupId)`.

### ID Handling Rules (from storyforge §2)

| Operation | ID used |
|-----------|---------|
| Create Stream Epic | `streamGroupId` (from settings) |
| Create Crew Epic | `crew.gitlabGroupId` (from subgroup fetch) |
| Set parent on Crew Epic | `parent_id` = `streamEpic.id` (**global**, not iid) |
| Edit Crew Epic path | `crew.gitlabGroupId` + `crewEpic.iid` (**internal**) |

## 6. Wizard Step Changes

### Step 1 (InitStep) — Major change

**Before:** User types crew names, picks/creates local Stream.
**After:**
- Stream auto-loaded from `configStore.streamGroupId` via `fetchStreamTree()` on mount
- Shows stream group name + full_path (read-only)
- Crews = real GitLab subgroups displayed as selectable checkboxes
- User picks which crews to include (not name them)
- Crew count stepper removed — count comes from subgroups
- "Let AI suggest crew names" removed — names from GitLab
- If `streamGroupId` not configured: "Configure Stream Group ID in Settings" with link

### Step 2 (StreamEpicStep) — Minor change

AI prompt includes real crew names from fetched subgroups. Still local-only until publish.

### Step 3 (SplitCrewsStep) — Minor change

Crew chips show real GitLab subgroup names. `Crew.gitlabGroupId` carried through. "+ New Crew" button removed. Many-to-many chip assignment UI unchanged.

### Step 4 (RefineCrewsStep) — Major change

**Before:** AI refines, "Publish" shows a toast.
**After:** AI refines (same), then "Publish Initiative" calls `publishInitiativeEpics()`:
1. Publish progress UI: "Creating Stream Epic..." → "Creating Crew Alpha..." → "Linking..." → done
2. Each crew card shows publish status alongside refine status
3. On success: clickable links to created epics in GitLab
4. On partial failure: which crews failed + "Retry failed" button
5. `publish.status` tracks overall progress

### Unchanged components

StepIndicator, CrewChipSelector, HeaderRow, SharedHeaderBadge, CrewSummaryRail, CrewCard, StreamCombobox (replaced by read-only stream display).

## 7. Data Flow — End to End

```
Settings                    Step 1 (Init)                Step 2 (Epic)
─────────                   ──────────────               ─────────────
streamGroupId ──→ fetchStreamTree(streamGroupId)
                      │
                      ├──→ streamGroup: {id, name, fullPath}
                      ├──→ crewSubgroups: [{id, name, fullPath}, ...]
                      └──→ groupTree: {stream, crews: [{...pods}]}
                                │
                      User picks which crews to include
                      User types title + description
                                │
                                ▼
                      crews = selected subgroups (with gitlabGroupId)
                                │
                                ├──────────────────────→ AI generates epic
                                                         using real crew names
                                                         ↓
                                                    streamEpicMarkdown (local)
                                                    parseHeadersFromEpic()
                                                         │
Step 3 (Split)               Step 4 (Refine + Publish)   │
──────────────               ─────────────────────────    │
  headers[] ←────────────────────────────────────────────┘
  crews[] (with gitlabGroupId)
  │
  AI proposes → user edits → AI refines per crew
  │
  User clicks "Publish Initiative"
  │
  ▼
  publishInitiativeEpics(config, {
    streamGroupId, streamTitle, streamEpicMarkdown,
    crews: [{ gitlabGroupId, name, refinedEpic }, ...]
  })
  │
  ├─ A: createGitLabEpic(streamGroupId, title, markdown)
  │     → streamEpic.id (global), streamEpic.iid
  │
  ├─ B: for each crew:
  │     createGitLabEpic(crew.gitlabGroupId, crewName, crewMarkdown)
  │     → crewEpic.iid
  │     updateGitLabEpic(crew.gitlabGroupId, crewEpic.iid,
  │       { parent_id: streamEpic.id })  ← GLOBAL id
  │
  └─ publishState = { streamEpicId, crewEpicIds: {...} }
```

**Local until publish.** Only Step 1 mount (tree fetch) and Step 4 publish touch GitLab.

## 8. Testing Strategy

| What | File | Key Assertions |
|------|------|----------------|
| `initiativeService` | `initiativeService.test.ts` | fetchStreamTree returns stream + crews; publishInitiativeEpics creates stream epic then crew epics with correct parent_id (global, not iid); partial failure tracked |
| Store extensions | `initiativeStore.test.ts` (extend) | setStreamGroup; crews from subgroups with gitlabGroupId; publish state transitions |
| InitStep API | `InitStep.test.ts` | Loading state; renders crew subgroups; error if streamGroupId missing |
| RefineCrewsStep publish | `RefineCrewsStep.test.ts` | Publish calls service; per-crew progress; GitLab links on success; retry on failure |
| Settings | existing settings test | streamGroupId field renders and validates |
| Integration | `initiativeFlow.test.ts` (extend) | Full flow with mocked GitLab: tree → wizard → publish → verify ID chain |

~12-15 new tests. Existing 38 initiative tests stay green (additive changes).

## 9. Scope Guards

- DO NOT create issues at publish time (v1 = epics only)
- DO NOT traverse Pod → Commons → Home (deferred to v2 when issues are added)
- DO NOT modify existing `gitlabClient.ts` functions — compose them
- DO NOT remove local-first wizard capability — it still works without GitLab configured
- DO NOT add `@gitbeaker/rest` — keep using raw fetch via existing gitlabClient

## 10. File Summary

**New files:**
- `src/services/gitlab/initiativeService.ts` + test

**Modified files:**
- `src/stores/initiativeStore.ts` — add StreamGroup, GroupNode, PublishState types; add streamGroup, groupTree, crewSubgroups, publish state; modify Crew to include gitlabGroupId
- `src/stores/initiativeStore.test.ts` — extend with new state tests
- `src/stores/configStore.ts` — add `streamGroupId` field
- `src/components/initiative/steps/InitStep.tsx` — fetch tree on mount, crew selection from subgroups
- `src/components/initiative/steps/RefineCrewsStep.tsx` — real publish flow with progress
- `src/components/initiative/shared/StreamCombobox.tsx` — replace with read-only stream display (or remove)
- Settings modal component — add streamGroupId field
- `src/test/integration/initiativeFlow.test.ts` — extend with GitLab mock flow

---

**Status:** Design approved. Next step: `superpowers:writing-plans` to produce atomic implementation tasks.

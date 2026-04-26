# Context Snapshot
## Last Updated: 2026-04-25T23:30:00Z
## Active Task: Extreme Initiative GitLab integration redesign (plan only)
## Current Phase: EI module local-first DONE, GitLab integration PLANNING

## Branch Layout
- `main` (88ed7ca) — stable, pre-DocMining
- `dev` (2f85269) — development branch with full infra
- `feature/phase-a-docmining` (8a0b828) — current, all EI tasks done

## Extreme Initiative Status
- 14/14 implementation tasks complete (38 new tests, all green)
- 12 new component files + 1 store + 3 AI actions + 0 new dependencies
- Next: redesign to integrate GitLab API traversal (ultraplan dispatched)
  - Stream = GitLab group fetched from API (not local-only)
  - Full hierarchy: Stream Group → Crew Subgroup → Pod Subgroup → Commons → Home
  - Epic tree: Stream Epic → Crew Epic → Pod Epic → Issues
  - Traversal reference: docs/research/storyforge_gitlab_traversal_complete.md

## Key GitLab Integration Facts (from research)
- Two parallel hierarchies: Group tree (org) + Epic tree (work breakdown)
- Three ID types: group.id (global), epic.id (global) vs epic.iid (internal), issue.id vs issue.iid
- parent_id in epic edit = global epic.id (NOT iid)
- Cross-group issue-to-epic linking requires 2 API calls
- Commons → Home project convention for auto-discovery
- GitBeaker `@gitbeaker/rest` for API calls

## Local Kind Cluster
- 3 namespaces: frame.local / frame-dev.local / frame-engg.local
- `bash infra/local/deploy-all.sh status` to check

## Files Modified This Session (EI module)
- src/stores/initiativeStore.ts + test (new)
- src/stores/uiStore.ts (TabId extended)
- src/components/layout/ViewRouter.tsx (initiative case)
- src/components/layout/WorkspaceSidebar.tsx (Lightning nav)
- src/components/initiative/ (12 new files)
- src/services/ai/initiative/ (3 actions + 3 tests)
- src/test/integration/initiativeFlow.test.ts (new)

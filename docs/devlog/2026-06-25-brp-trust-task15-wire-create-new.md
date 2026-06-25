# 2026-06-25 — BRP trust T15: wire Create New (+ wizard) into Pod view

**Tag:** brp-trust · **Task:** 15/15

## What
- PodView: added a "Create New" action button (Sparkle icon) between "Add epics"
  and "Run analysis"; new optional `onOpenCreateEpic` prop (optional so existing
  callers/tests still type-check).
- BrpView: `createEpicOpen` modal state; renders `<EpicWizard mode="create">`
  plumbed to the real actions — `onGenerate` → generateEpicFromRequirement (T11),
  `onPublish` → publishGeneratedEpicAction (T14, auto-loads into the pod).

## Verification (visual loop, live app)
- "Create New" renders in the pod header.
- Click → wizard opens on the Requirement step (matches Figma 46:200).
- Typing enables Generate; clicking runs the REAL pipeline action (reached Stage 1,
  then rendered the error state cleanly — no AI configured locally, expected).
- Preview/publish states covered by EpicWizard's 9 unit tests + Figma 45:200.
- Full BRP suite: 703 passed (1 failure is the pre-existing env-driven
  configTypes.azureEndpoint test, unrelated). tsc clean (13 baseline).

## Remaining follow-up (flagged, not done)
Re-analyze TRIGGER is not yet wired onto epic rows. The EpicWizard already
supports `mode="reanalyze"` (built + tested) and brpGitlabService has
`updateEpicWithStories`, but EpicRow has no Re-analyze action yet and the
reanalyze publish should route through updateEpicWithStories (vs create). This is
the one open sub-item of T15.

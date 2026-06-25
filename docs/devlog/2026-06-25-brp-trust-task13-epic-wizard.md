# 2026-06-25 — BRP trust T13: EpicWizard component

**Tag:** brp-trust · **Task:** 13/15 · Figma 45:200 / 46:200

## What
`EpicWizard.tsx` — slim modal, state machine input → generating → preview →
publishing → done/error. Create + Re-analyze modes. Pure/presentational:
caller plumbs `onGenerate` (→ generateEpicFromRequirement) and `onPublish`
(→ T14). Preview lists each story with an editable Fibonacci `<select>`, SPIDR
chip, AC count + reference anchor; footer shows the LIVE total = Σ points with
the explicit sum expression. Tokens-only, role=dialog/aria-modal/Escape, real
generating/publishing/error/done states.

## Trust behavior
Total is `useMemo(Σ stories.points)`; editing any story's points re-sums
instantly (INV2 at the UI). Publish sends the edited stories.

## Verification
- New EpicWizard.test.tsx: 9 cases incl. live-total + edit-propagation to publish,
  generation error, reanalyze context, a11y. All pass. tsc clean (13 baseline).
- Visual loop deferred to T15 (wizard becomes reachable once wired into BrpView).

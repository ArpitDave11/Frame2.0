# 2026-06-25 — BRP trust T5: reference-class anchoring

**Tag:** brp-trust · **Task:** 5/15

## What
`buildUserPrompt` now presents the closed reference epics as a calibration ladder
sorted by ACTUAL story points (low→high), with epicId surfaced, plus explicit
sizing rules: size each story by relative comparison to the nearest reference,
cite the reference's epicId in that story's rationale, and keep the decomposition
on the references' scale. No references → graceful NONE with a lower-confidence
directive. This is the dominant accuracy lever from the research (~59% MAE).

## Verification
- New `azureEstimator.anchoring.test.ts`: references sorted by actualSp, actualSp +
  relative-sizing/citation instructions present, graceful no-reference path.
  Existing azure estimator tests still pass — 18/18.

## Note
Per-story `referenceEpicId`/`rationale` capture in the parsed output lands in T6,
where the model output migrates to the canonical `stories` shape.

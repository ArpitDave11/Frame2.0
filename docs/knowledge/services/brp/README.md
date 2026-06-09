# BRP — Service-layer knowledge base

BRP (Breakdown & Re-groom Planning) is FRAME's capacity-driven epic-
sizing surface. Scrum Masters load a GitLab **Crew** → its **Pods** →
their **Epics**, set per-pod capacity (5 inputs), and run **Analysis**
to get FRAME estimates + variance bands.

## What's here

This directory documents the BRP **service** layer.

| Doc | Source | Role |
|---|---|---|
| [simulatedEstimator.md](./simulatedEstimator.md) | `src/services/brp/ai/{types,simulatedEstimator,estimatorProvider,schemas}.ts` | The AI seam — deterministic v1 implementation, swap point for the P7 real LLM, Zod schemas for the LLM boundary |
| [brpGitlabService.md](./brpGitlabService.md) | `src/services/brp/brpGitlabService.ts` | The GitLab→BRP boundary. Four operations: `fetchCrews`, `fetchPods`, `fetchPodEpics`, `fetchReferenceEpics` |

## Where the other layers live

| Layer | Knowledge doc | Source |
|---|---|---|
| Domain (pure types + 4 derivation functions) | [../../domain/brp.md](../../domain/brp.md) | `src/domain/brp.ts`, `brp.constants.ts` |
| Store (Zustand) | [../../stores/brpStore.md](../../stores/brpStore.md) | `src/stores/brpStore.ts` |
| Components | not yet built — Phase 5 PRD | `src/components/brp/*` (planned) |
| Wiring (action layer) | not yet built — Phase 6 PRD | `src/actions/brpActions.ts` (planned) |

## Architecture in one diagram

```
                ┌──────────────────────────────────────┐
                │  Phase 5 components (src/components/brp)
                │  — call pure functions at render time
                │  — dispatch brpStore actions
                └──────────────┬───────────────────────┘
                               │  selectors / actions
                               ▼
                ┌──────────────────────────────────────┐
                │  brpStore  (src/stores/brpStore.ts)  │
                │  state + 15 actions                  │
                │  imports ONLY AIEstimator interface  │
                └────┬─────────────────────────┬───────┘
                     │ getReferences           │ AIEstimator
                     │                         │
                     ▼                         ▼
        ┌──────────────────────┐   ┌──────────────────────────┐
        │  brpGitlabService    │   │  estimatorProvider       │
        │  composes gitlabClient│   │  → createSimulatedEstimator │
        │                      │   │   (P7 swap point)         │
        └────────┬─────────────┘   └───────────┬──────────────┘
                 │                              │
                 ▼                              ▼
        gitlab.com (live) or                  pure deterministic
        UBS GitLab (via dev proxy)            no network in v1
```

All four service modules import the BRP types from
[`src/domain/brp.ts`](../../domain/brp.md). The domain module imports
nothing outside of `src/domain/brp.constants.ts` (dependency-free —
trivially unit-testable).

## Deep-review (2026-05-25)

5-agent deep-review on the headless layer. See
[`docs/reviews/2026-05-25-brp-headless-deep-review.md`](../../../reviews/2026-05-25-brp-headless-deep-review.md).

| Severity | Count | Status |
|---|---|---|
| Critical | 3 | All fixed |
| Important | 15 | 12 fixed, 3 acknowledged (Phase 5/6 wiring) |
| Nice-to-have | 10 | Logged |
| Emergent (live smoke) | 1 | Fixed: numeric→string id coercion in `brpGitlabService` |

Three acknowledgments are documented in
[`docs/reviews/acknowledged.md`](../../../reviews/acknowledged.md):
I5 (error channel), I6 (progress state), I8 (Result error widening).
All three are intrinsic to UI wiring decisions and become must-fix
items in the Phase 5/6 PRD.

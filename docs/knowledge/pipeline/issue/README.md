# Issue Refinery — pipeline

Isolated 3-stage AI pipeline that runs entirely under `src/pipeline/issue/` — separate from the epic pipeline (`src/pipeline/orchestrator*` / `src/pipeline/stages/**`) which is scope-guarded and untouched by this feature.

```
runIssuePipeline
  ├─ runComprehension   (temp 0.2, reasoningEffort: minimal)
  ├─ runRefinement      (temp 0.4)
  └─ runValidation      (temp 0.2, reasoningEffort: minimal)
```

Each stage calls Azure OpenAI with `response_format: { type: 'json_schema', strict: true }`, parses the response with its Zod schema, and performs a single Instructor-style retry on schema-validation failure.

| Module | File | Purpose |
|---|---|---|
| [`runIssuePipeline`](runIssuePipeline.md) | [src/pipeline/issue/runIssuePipeline.ts](../../../../src/pipeline/issue/runIssuePipeline.ts) | Pure orchestrator; sequential composition + per-stage error tagging |
| [`stageRunner`](stageRunner.md) | [src/pipeline/issue/stageRunner.ts](../../../../src/pipeline/issue/stageRunner.ts) | Shared `runStageWithRetry()` — called by all 3 stage modules |
| [`promptAssembly`](promptAssembly.md) | [src/pipeline/issue/promptAssembly.ts](../../../../src/pipeline/issue/promptAssembly.ts) | Sandwich-cached prompt builder |
| [`schemas`](schemas.md) | [src/pipeline/issue/schemas.ts](../../../../src/pipeline/issue/schemas.ts) | Zod schemas for all 3 stage outputs |
| [`toStrictJsonSchema`](toStrictJsonSchema.md) | [src/pipeline/issue/toStrictJsonSchema.ts](../../../../src/pipeline/issue/toStrictJsonSchema.ts) | Strips Zod-emitted keywords Azure strict mode rejects |
| [`types`](types.md) | [src/pipeline/issue/types.ts](../../../../src/pipeline/issue/types.ts) | `ComprehensionResult`, `RefinementResult`, `ValidationResult`, `Phase` |
| `comprehension/runComprehension` | [src/pipeline/issue/comprehension/runComprehension.ts](../../../../src/pipeline/issue/comprehension/runComprehension.ts) | Thin stage-runner wrapper |
| `refinement/runRefinement` | [src/pipeline/issue/refinement/runRefinement.ts](../../../../src/pipeline/issue/refinement/runRefinement.ts) | Thin stage-runner wrapper |
| `validation/runValidation` | [src/pipeline/issue/validation/runValidation.ts](../../../../src/pipeline/issue/validation/runValidation.ts) | Thin stage-runner wrapper |

## Scope invariant
No imports from `src/pipeline/orchestrator*` or `src/pipeline/stages/**`. Verified by a `grep` check in the test suite. The epic pipeline and the issue pipeline are independent.

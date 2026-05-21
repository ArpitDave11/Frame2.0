# runIssuePipeline

[src/pipeline/issue/runIssuePipeline.ts](../../../../src/pipeline/issue/runIssuePipeline.ts)

Pure async orchestrator: composes the 3 stage runners sequentially and forwards each stage's output to the next.

## Signature

```ts
runIssuePipeline(
  aiConfig: AIClientConfig,
  epicBody: string,
  issueBody: string,
  options?: { onStageStart?: (stage: StageId) => void },
): Promise<IssuePipelineResult>
```

## Result shape

```ts
{
  comprehension: ComprehensionResult,
  refined: RefinementResult,
  validation: ValidationResult,
}
```

Notably **no** `cachedTokens` field — the Phase A review (C3) flagged the previous `[0, 0, 0]` placeholder as fake observability and the field was removed. Re-add when `aiClient.callAI` exposes `data.usage.prompt_tokens_details.cached_tokens`.

## Failure mode
Each stage is wrapped in try/catch. On failure, the orchestrator throws an `IssuePipelineError` carrying `{ stage, cause }`. Partial results from earlier stages are NOT returned — strict success-or-error so the action layer cannot accidentally commit a mid-flight state.

## onStageStart callback
Optional. Called synchronously just before each stage's AI call. The action layer passes a closure that advances `issueRefineryStore.phase` through `comprehending → refining → validating` (B-C4). The callback being a parameter (not an imported store reference) preserves the orchestrator's purity.

## Stale-child / abandoned-run handling
The action layer is responsible for checking whether the selected child issue is still the one the run started against (B-C2). The orchestrator itself is unaware of the store.

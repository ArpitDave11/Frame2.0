# stageRunner

[src/pipeline/issue/stageRunner.ts](../../../../src/pipeline/issue/stageRunner.ts)

Shared helper that the 3 stage modules (Comprehension / Refinement / Validation) wrap. Owns:

- JSON-Schema generation via `z.toJSONSchema(schema)` → [`toStrictJsonSchema()`](toStrictJsonSchema.md) (strips keywords Azure rejects).
- Network-retry wrapping via `withRetry` from `@/services/ai/throttler` — handles 429 / 5xx automatically.
- **Instructor-style** schema-fail retry: on JSON parse or schema validation failure, one additional call is issued with `PREVIOUS ATTEMPT FAILED JSON-SCHEMA VALIDATION:\n<error>\n…` appended to the user prompt.
- Final throw on second schema failure with the diagnostic in the message.

## Signature

```ts
runStageWithRetry<S extends ZodTypeAny>({
  stageName,        // e.g. "issue-refinery:comprehension"
  schema,           // the Zod schema for the response
  schemaName,       // json_schema.name value
  aiConfig,
  systemPrompt,
  userPrompt,
  temperature,
  reasoningEffort?, // Azure-specific knob
}): Promise<z.infer<S>>
```

## Why a shared helper?
Before the Phase A fix loop, each of the three stage modules had ~80 LOC of near-identical retry/parse code (I3 finding). Extracting `runStageWithRetry` collapsed them to ~30 LOC wrappers and eliminated copy-paste drift.

## Gotchas
- The retry's `userPrompt` appends to the original — the static cache prefix (built by [`promptAssembly`](promptAssembly.md)) is preserved at the START so Azure's prompt cache still hits on the retry.
- `schema.safeParse` enforces Zod-only bounds (e.g. `minLength`, `maxItems`) AFTER the model returns, because `toStrictJsonSchema()` strips those from the schema sent to Azure (strict mode rejects them).

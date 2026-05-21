# schemas

[src/pipeline/issue/schemas.ts](../../../../src/pipeline/issue/schemas.ts)

Zod schemas for the three stage outputs. Each field's constraints (word budgets, vocabulary, prefix rules) live in `.describe()` per the Azure prompt-engineering research finding that schema descriptions are materially stronger than the same rules in prose.

## Schemas

- `ComprehensionSchema` → `{ epicIntent, issueIntent, gaps[≤8], ambiguities[≤8], alignmentNotes[≤6] }`
- `RefinementSchema` → `{ refinedBody (≥50 chars, 4 required sections, no H1, preserve GitLab quick actions, 150–450 words) }`
- `ValidationSchema` → `{ score 0–100 integer, findings[≤10] prefixed with [critical] / [important] / [nit] }`

## Compile-time compatibility
A `IsExactly<>` type-level check in the same file asserts that `z.infer<typeof XSchema>` is bidirectionally assignable to the predeclared interfaces in [`types.ts`](types.md). If the two contracts drift, the build fails at the assert site.

## Wire-time stripping
The schemas as-emitted by `z.toJSONSchema()` contain keywords Azure strict mode rejects (`minLength`, `maxItems`, `minimum`, `maximum`, `$schema`, `"type": "integer"`). The [`toStrictJsonSchema`](toStrictJsonSchema.md) helper strips them before the schema is sent to Azure. Local `safeParse` still enforces the bounds after the model returns.

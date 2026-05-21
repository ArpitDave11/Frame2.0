# types

[src/pipeline/issue/types.ts](../../../../src/pipeline/issue/types.ts)

Forward-declared TypeScript interfaces for the Issue Refinery pipeline. Defined in a dedicated module so the store can reference `ComprehensionResult` / `ValidationResult` / `Phase` without pulling in the Zod module.

## Exports

- `ComprehensionResult` — `{ epicIntent, issueIntent, gaps[], ambiguities[], alignmentNotes[] }`
- `RefinementResult` — `{ refinedBody }`
- `ValidationResult` — `{ score, findings[] }`
- `Phase` — string-literal union: `'idle' | 'comprehending' | 'refining' | 'validating' | 'ready' | 'publishing' | 'error'`

## Compatibility with Zod schemas
The Zod schemas in [`schemas.ts`](schemas.md) include a compile-time `IsExactly<>` check that asserts `z.infer<typeof XSchema>` is bidirectionally assignable to the interfaces here. If the two drift, the build breaks.

## Phase machine
Forward transitions:
`idle → comprehending → refining → validating → ready → publishing → idle | error`.

Allowed reverse transitions:
- From `ready` back to `comprehending` on a user-initiated re-Refine.
- From `error` back to `idle` on user dismiss (or implicitly on a new child selection — `setSelectedChild` clears phase).

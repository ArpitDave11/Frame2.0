# toStrictJsonSchema

[src/pipeline/issue/toStrictJsonSchema.ts](../../../../src/pipeline/issue/toStrictJsonSchema.ts)

Recursive stripper that converts Zod's `z.toJSONSchema()` output into a shape Azure / OpenAI strict-mode `json_schema` actually accepts.

## Problem
Zod 4's JSON-Schema emitter produces keywords that strict mode rejects with HTTP 400. The forbidden set includes `$schema`, `minLength`, `maxLength`, `pattern`, `format`, `minimum`, `maximum`, `exclusiveMinimum`, `exclusiveMaximum`, `multipleOf`, `minItems`, `maxItems`, `uniqueItems`, `minProperties`, `maxProperties`, `default`, and `"type": "integer"` (must be `"number"`).

This was the Phase A critical finding C1 — without the stripper the very first stage call would 400.

## Behavior
- Recursively walks any object/array structure.
- Drops keys in the `UNSUPPORTED_KEYWORDS` set.
- Downcasts `"type": "integer"` → `"type": "number"`.
- Preserves the supported set: `type, properties, required, additionalProperties, enum, items, anyOf, oneOf, not, $ref, $defs, description, title`.

## Compensation
The original Zod bounds are not lost — they still fire in `Schema.safeParse()` post-response. The stripper just moves the validation from Azure's side to ours, which is where we want it for the Instructor retry pattern anyway (we own the error text we feed back to the model).

## Testing
See [src/pipeline/issue/toStrictJsonSchema.test.ts](../../../../src/pipeline/issue/toStrictJsonSchema.test.ts) (6 tests) and the cross-cutting assertion in [stageRunner.test.ts](../../../../src/pipeline/issue/stageRunner.test.ts) ("strips disallowed keywords before passing the schema to callAI").

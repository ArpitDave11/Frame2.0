/**
 * Issue Refinery — strict-mode JSON-schema adapter.
 *
 * Azure / OpenAI `response_format: { type: 'json_schema', strict: true }` accepts
 * only a fixed subset of JSON Schema keywords:
 *   type, properties, required, additionalProperties, enum, items,
 *   anyOf, oneOf, not, $ref, $defs, description, title
 *
 * Zod's `z.toJSONSchema()` emits a superset including `minLength`, `maxItems`,
 * `minimum`, `maximum`, `multipleOf`, `pattern`, `format`, `uniqueItems`,
 * `minProperties`, `maxProperties`, `exclusiveMinimum`, `exclusiveMaximum`,
 * `minItems`, a `$schema` declaration, and `"type": "integer"`. Sending any of
 * those returns HTTP 400 from Azure with `Unknown keyword in schema`.
 *
 * This module recursively strips the unsupported keywords and downcasts
 * `integer` to `number`. The constraints themselves are still enforced
 * locally by `Schema.safeParse()` on the response content — they just move
 * out of the Azure-side validator and into our own post-response check.
 */

const UNSUPPORTED_KEYWORDS = new Set([
  '$schema',
  'minLength',
  'maxLength',
  'pattern',
  'format',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'multipleOf',
  'minItems',
  'maxItems',
  'uniqueItems',
  'minProperties',
  'maxProperties',
  'default',
]);

export function toStrictJsonSchema(input: unknown): Record<string, unknown> {
  if (!isPlainObject(input)) {
    throw new Error('toStrictJsonSchema: top-level input must be an object');
  }
  return strip(input) as Record<string, unknown>;
}

function strip(node: unknown): unknown {
  if (Array.isArray(node)) {
    return node.map(strip);
  }
  if (!isPlainObject(node)) {
    return node;
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    if (UNSUPPORTED_KEYWORDS.has(key)) continue;
    if (key === 'type' && value === 'integer') {
      result[key] = 'number';
      continue;
    }
    result[key] = strip(value);
  }
  return result;
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

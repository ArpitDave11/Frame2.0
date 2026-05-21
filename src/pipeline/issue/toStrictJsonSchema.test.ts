/**
 * Strip-helper tests — ensures Zod's JSON-schema output becomes a shape
 * Azure / OpenAI strict mode actually accepts.
 */

import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { toStrictJsonSchema } from './toStrictJsonSchema';

/** Local helper that asserts a property exists and returns it typed. */
function prop<T extends Record<string, unknown>>(obj: Record<string, unknown>, key: string): T {
  const v = obj[key];
  if (v === undefined || v === null || typeof v !== 'object' || Array.isArray(v)) {
    throw new Error(`expected object at key "${key}", got ${JSON.stringify(v)}`);
  }
  return v as T;
}

describe('toStrictJsonSchema', () => {
  it('strips $schema, minLength, maxItems, minimum, maximum', () => {
    const raw = {
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {
        title: { type: 'string', minLength: 1 },
        score: { type: 'integer', minimum: 0, maximum: 100 },
        tags: { type: 'array', maxItems: 8, items: { type: 'string' } },
      },
      required: ['title', 'score', 'tags'],
      additionalProperties: false,
    };

    const out = toStrictJsonSchema(raw);

    expect(out).not.toHaveProperty('$schema');
    const props = prop<Record<string, Record<string, unknown>>>(out, 'properties');
    expect(prop(props, 'title')).not.toHaveProperty('minLength');
    expect(prop(props, 'score')).not.toHaveProperty('minimum');
    expect(prop(props, 'score')).not.toHaveProperty('maximum');
    expect(prop(props, 'tags')).not.toHaveProperty('maxItems');
  });

  it('downcasts integer to number (strict mode only allows number)', () => {
    const raw = { type: 'object', properties: { n: { type: 'integer' } } };
    const out = toStrictJsonSchema(raw);
    const props = prop<Record<string, Record<string, unknown>>>(out, 'properties');
    expect(prop(props, 'n').type).toBe('number');
  });

  it('preserves the allowed keyword set', () => {
    const raw = {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['a', 'b'], description: 'a kind' },
        items: { type: 'array', items: { type: 'string' } },
      },
      required: ['kind'],
      additionalProperties: false,
    };
    const out = toStrictJsonSchema(raw);
    expect(out).toEqual(raw);
  });

  it('recursively cleans nested objects and arrays of subschemas', () => {
    const raw = {
      type: 'object',
      properties: {
        nested: {
          type: 'object',
          properties: { x: { type: 'string', minLength: 5 } },
          minProperties: 1,
        },
        list: {
          type: 'array',
          items: { type: 'integer', minimum: 0, multipleOf: 2 },
          uniqueItems: true,
        },
      },
    };
    const out = toStrictJsonSchema(raw);
    const props = prop<Record<string, Record<string, unknown>>>(out, 'properties');
    const nested = prop(props, 'nested');
    expect(nested).not.toHaveProperty('minProperties');
    const nestedProps = prop<Record<string, Record<string, unknown>>>(nested, 'properties');
    expect(prop(nestedProps, 'x')).not.toHaveProperty('minLength');
    const list = prop(props, 'list');
    expect(list).not.toHaveProperty('uniqueItems');
    const listItems = prop<Record<string, unknown>>(list, 'items');
    expect(listItems.type).toBe('number');
    expect(listItems).not.toHaveProperty('minimum');
    expect(listItems).not.toHaveProperty('multipleOf');
  });

  it('round-trips a real Zod schema into a strict-clean shape', () => {
    const schema = z.object({
      title: z.string().min(1).describe('the title'),
      score: z.number().int().min(0).max(100),
      tags: z.array(z.string()).max(8),
    });
    const out = toStrictJsonSchema(z.toJSONSchema(schema));
    const props = prop<Record<string, Record<string, unknown>>>(out, 'properties');

    expect(out).not.toHaveProperty('$schema');
    expect(prop(props, 'title')).toEqual({ type: 'string', description: 'the title' });
    expect(prop(props, 'score')).toMatchObject({ type: 'number' });
    expect(prop(props, 'score')).not.toHaveProperty('minimum');
    expect(prop(props, 'tags')).toMatchObject({ type: 'array', items: { type: 'string' } });
    expect(prop(props, 'tags')).not.toHaveProperty('maxItems');
  });

  it('throws when top-level input is not an object', () => {
    expect(() => toStrictJsonSchema(null)).toThrow();
    expect(() => toStrictJsonSchema('x')).toThrow();
    expect(() => toStrictJsonSchema([1, 2])).toThrow();
  });
});

/**
 * Issue Refinery — shared stage-runner tests.
 *
 * Most stage-behavior assertions live in the per-stage test files. This
 * file focuses on the cross-cutting contract: the JSON schema reaching
 * `callAI` has been stripped to a shape Azure / OpenAI strict mode accepts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { runStageWithRetry } from './stageRunner';
import type { AIClientConfig } from '@/services/ai/types';

vi.mock('@/services/ai/aiClient', () => ({ callAI: vi.fn() }));
import { callAI } from '@/services/ai/aiClient';

const CFG: AIClientConfig = {
  provider: 'azure',
  azure: {} as never,
  openai: {} as never,
  endpoints: {} as never,
};

const SCHEMA = z.object({
  title: z.string().min(1),
  score: z.number().int().min(0).max(100),
  tags: z.array(z.string()).max(8),
});

function firstCallSchema(): Record<string, unknown> {
  const call = vi.mocked(callAI).mock.calls[0];
  if (!call) throw new Error('callAI not invoked');
  const schema = call[1].responseFormat?.json_schema.schema;
  if (!schema) throw new Error('schema not present on request');
  return schema as Record<string, unknown>;
}

function propRecord(obj: Record<string, unknown>, key: string): Record<string, unknown> {
  const v = obj[key];
  if (v === undefined || v === null || typeof v !== 'object' || Array.isArray(v)) {
    throw new Error(`expected object at key "${key}"`);
  }
  return v as Record<string, unknown>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('runStageWithRetry — strict-schema discipline', () => {
  it('strips disallowed keywords before passing the schema to callAI', async () => {
    vi.mocked(callAI).mockResolvedValueOnce({
      content: JSON.stringify({ title: 'x', score: 50, tags: [] }),
      model: 'sonnet',
    });

    await runStageWithRetry({
      stageName: 'test',
      schema: SCHEMA,
      schemaName: 'X',
      aiConfig: CFG,
      systemPrompt: 'sys',
      userPrompt: 'user',
      temperature: 0.2,
    });

    const schemaSent = firstCallSchema();
    expect(schemaSent).not.toHaveProperty('$schema');

    const props = propRecord(schemaSent, 'properties');
    expect(propRecord(props, 'title')).not.toHaveProperty('minLength');
    expect(propRecord(props, 'score')).not.toHaveProperty('minimum');
    expect(propRecord(props, 'score')).not.toHaveProperty('maximum');
    expect(propRecord(props, 'tags')).not.toHaveProperty('maxItems');
    expect(propRecord(props, 'score').type).toBe('number');
  });

  it('preserves type, properties, required, additionalProperties, description', async () => {
    vi.mocked(callAI).mockResolvedValueOnce({
      content: JSON.stringify({ title: 'x', score: 50, tags: [] }),
      model: 'sonnet',
    });

    await runStageWithRetry({
      stageName: 'test',
      schema: SCHEMA,
      schemaName: 'X',
      aiConfig: CFG,
      systemPrompt: 'sys',
      userPrompt: 'user',
      temperature: 0.2,
    });

    const schemaSent = firstCallSchema();
    expect(schemaSent.type).toBe('object');
    expect(schemaSent.required).toEqual(['title', 'score', 'tags']);
    expect(schemaSent.additionalProperties).toBe(false);
  });

  it('still validates locally with the original Zod bounds — out-of-range score is rejected', async () => {
    vi.mocked(callAI)
      .mockResolvedValueOnce({ content: JSON.stringify({ title: 'x', score: 200, tags: [] }), model: 'sonnet' })
      .mockResolvedValueOnce({ content: JSON.stringify({ title: 'x', score: -5, tags: [] }), model: 'sonnet' });

    await expect(
      runStageWithRetry({
        stageName: 'test',
        schema: SCHEMA,
        schemaName: 'X',
        aiConfig: CFG,
        systemPrompt: 'sys',
        userPrompt: 'user',
        temperature: 0.2,
      }),
    ).rejects.toThrow(/schema validation failed twice/);

    expect(callAI).toHaveBeenCalledTimes(2);
  });
});

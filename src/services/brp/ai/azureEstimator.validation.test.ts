import { describe, it, expect } from 'vitest';
import { createAzureEstimator } from './azureEstimator';
import { validateStories } from './storyValidation';
import type { AIClientConfig, AIRequest, AIResponse } from '@/services/ai/types';
import type { AnalysisEvent } from './types';
import type { Epic, SizedStory } from '@/domain/brp';

const baseConfig = (): AIClientConfig => ({
  provider: 'azure',
  azure: { endpoint: 'https://az.example', deploymentName: 'gpt-4', apiKey: 'k', apiVersion: '2024-02-01', model: 'gpt-4' },
  openai: { apiKey: '', model: '' },
  endpoints: { gitlabBaseUrl: 'g', azureEndpoint: 'https://az.example', openaiBaseUrl: 'o' },
});

const epic = (): Epic => ({
  id: 'gid://e/1', iid: 42, title: 'Improve checkout', description: 'a'.repeat(200),
  gitlabWebUrl: 'https://gitlab/1', podId: 'p1', source: 'gitlab',
  humanEstimate: null, analysisStatus: 'raw', frameResult: null,
});

function story(overrides: Partial<SizedStory> = {}): SizedStory {
  return {
    title: 's', points: 5, acceptanceCriteria: ['ac'],
    splitPattern: 'Path', provenance: 'frame-generated', ...overrides,
  };
}

/** Canonical stories-shape payload the migrated model emits. */
function storiesPayload(stories: SizedStory[]) {
  return JSON.stringify({ stories, rationale: 'overall', confidence: 0.7 });
}

async function collect(iter: AsyncIterable<AnalysisEvent>): Promise<AnalysisEvent[]> {
  const out: AnalysisEvent[] = [];
  for await (const ev of iter) out.push(ev);
  return out;
}

/** Returns a different body on each call, so a re-prompt can succeed. */
function scriptedCall(bodies: string[]) {
  let i = 0;
  const calls: AIRequest[] = [];
  const fn = async (_c: unknown, _e: string, req: AIRequest): Promise<AIResponse> => {
    calls.push(req);
    const body = bodies[Math.min(i, bodies.length - 1)]!;
    i++;
    return { content: body, model: 'stub' };
  };
  return { fn, calls };
}

// ─── validateStories (unit) ─────────────────────────────────

describe('validateStories (T6)', () => {
  it('passes a well-formed 2-story decomposition', () => {
    expect(validateStories([story(), story({ points: 3 })]).ok).toBe(true);
  });
  it('rejects fewer than 2 stories', () => {
    const r = validateStories([story()]);
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/at least 2/i);
  });
  it('rejects a story with no acceptance criteria', () => {
    const r = validateStories([story(), story({ acceptanceCriteria: [] })]);
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/acceptance criteria/i);
  });
  it('rejects more than 8 stories', () => {
    const r = validateStories(Array.from({ length: 9 }, () => story()));
    expect(r.ok).toBe(false);
    expect(r.errors.join(' ')).toMatch(/at most 8/i);
  });
});

// ─── estimator: normalization + reconciliation loop ─────────

describe('azureEstimator — stories output + reconciliation (T6)', () => {
  it('normalizes canonical stories output; load mirrors Σ points', async () => {
    const sc = scriptedCall([storiesPayload([story({ points: 5 }), story({ points: 8 })])]);
    const events = await collect(createAzureEstimator({ readConfig: baseConfig, call: sc.fn }).analyzeEpic(epic(), []));
    expect(events.map((e) => e.kind)).toEqual(['started', 'done']);
    const done = events[1] as Extract<AnalysisEvent, { kind: 'done' }>;
    expect(done.result.stories!.map((s) => s.points)).toEqual([5, 8]);
    // legacy mirror back-filled from stories
    expect(done.result.breakdown.map((b) => b.points)).toEqual([5, 8]);
  });

  it('re-prompts once on a validation failure, then succeeds', async () => {
    const bad = storiesPayload([story()]); // only 1 story → fails MIN_STORIES
    const good = storiesPayload([story({ points: 3 }), story({ points: 5 })]);
    const sc = scriptedCall([bad, good]);
    const events = await collect(createAzureEstimator({ readConfig: baseConfig, call: sc.fn }).analyzeEpic(epic(), []));
    expect(events.map((e) => e.kind)).toEqual(['started', 'done']);
    expect(sc.calls).toHaveLength(2); // initial + one re-prompt
    expect(sc.calls[1]!.userPrompt).toMatch(/rejected/i); // feedback included
  });

  it('emits error after the re-prompt still fails validation', async () => {
    const bad = storiesPayload([story()]); // always 1 story
    const sc = scriptedCall([bad, bad]);
    const events = await collect(createAzureEstimator({ readConfig: baseConfig, call: sc.fn }).analyzeEpic(epic(), []));
    expect(events.map((e) => e.kind)).toEqual(['started', 'error']);
    expect(sc.calls).toHaveLength(2); // one retry, then give up
    expect((events[1] as Extract<AnalysisEvent, { kind: 'error' }>).message).toMatch(/after re-prompt/i);
  });
});

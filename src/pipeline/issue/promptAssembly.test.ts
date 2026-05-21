/**
 * Issue Refinery — promptAssembly tests (R-4).
 *
 * The single most important test in this file is the byte-equality assertion
 * on the cache prefix. If it ever turns red, the prompt cache is busted and
 * stage-2 / stage-3 cost will balloon ~4x.
 */

import { describe, it, expect } from 'vitest';
import { buildPrompts, getCachePrefix, SYSTEM_RULES, STAGE_INSTRUCTIONS } from './promptAssembly';
import type { ComprehensionResult } from './types';

const EPIC_BODY = 'Replace legacy gateway with Stripe. Compliance + reliability win.';
const ISSUE_BODY = 'add the Stripe SDK to the checkout flow.';

const COMP: ComprehensionResult = {
  epicIntent: 'Replace legacy gateway.',
  issueIntent: 'Wire Stripe SDK.',
  gaps: ['No test-mode flag mentioned.'],
  ambiguities: [],
  alignmentNotes: ['Match epic §2.'],
};

describe('buildPrompts — sandwich structure', () => {
  it('systemPrompt is byte-identical across all three stages', () => {
    const a = buildPrompts('comprehension', EPIC_BODY, ISSUE_BODY);
    const b = buildPrompts('refinement', EPIC_BODY, ISSUE_BODY, { comprehension: COMP });
    const c = buildPrompts('validation', EPIC_BODY, ISSUE_BODY, { refined: '## Summary\nx' });
    expect(a.systemPrompt).toBe(SYSTEM_RULES);
    expect(b.systemPrompt).toBe(SYSTEM_RULES);
    expect(c.systemPrompt).toBe(SYSTEM_RULES);
  });

  it('cache prefix is byte-identical across all three stages', () => {
    const a = buildPrompts('comprehension', EPIC_BODY, ISSUE_BODY);
    const b = buildPrompts('refinement', EPIC_BODY, ISSUE_BODY, { comprehension: COMP });
    const c = buildPrompts('validation', EPIC_BODY, ISSUE_BODY, { refined: '## Summary\nx' });

    const prefix = getCachePrefix(EPIC_BODY, ISSUE_BODY);
    expect(a.userPrompt.startsWith(prefix)).toBe(true);
    expect(b.userPrompt.startsWith(prefix)).toBe(true);
    expect(c.userPrompt.startsWith(prefix)).toBe(true);
  });

  it('stage tails differ between stages', () => {
    const a = buildPrompts('comprehension', EPIC_BODY, ISSUE_BODY);
    const b = buildPrompts('refinement', EPIC_BODY, ISSUE_BODY, { comprehension: COMP });
    const c = buildPrompts('validation', EPIC_BODY, ISSUE_BODY, { refined: '## Summary\nx' });

    expect(a.userPrompt).not.toBe(b.userPrompt);
    expect(b.userPrompt).not.toBe(c.userPrompt);
    expect(a.userPrompt).not.toBe(c.userPrompt);
  });
});

describe('buildPrompts — cache-discipline assertions', () => {
  it('static prefix contains no Date / Date.now / timestamp tokens', () => {
    const prefix = getCachePrefix(EPIC_BODY, ISSUE_BODY);
    expect(prefix).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
    expect(prefix).not.toMatch(/timestamp/i);
    expect(prefix).not.toMatch(/requestId|request-id|reqId/i);
  });

  it('SYSTEM_RULES contains no Date / timestamp tokens', () => {
    expect(SYSTEM_RULES).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
    expect(SYSTEM_RULES).not.toMatch(/timestamp|requestId|UUID/i);
  });

  it('two calls with the same inputs produce identical output', () => {
    // Detects any non-deterministic interpolation (Date.now, Math.random, etc.).
    const a = buildPrompts('comprehension', EPIC_BODY, ISSUE_BODY);
    const b = buildPrompts('comprehension', EPIC_BODY, ISSUE_BODY);
    expect(a.systemPrompt).toBe(b.systemPrompt);
    expect(a.userPrompt).toBe(b.userPrompt);
  });
});

describe('buildPrompts — stage-specific tails', () => {
  it('comprehension prompt embeds no previous-stage data block', () => {
    const { userPrompt } = buildPrompts('comprehension', EPIC_BODY, ISSUE_BODY);
    // The stage instruction itself does not reference previous stages.
    expect(userPrompt).toContain(STAGE_INSTRUCTIONS.comprehension);
    // Must not embed the data tags (which would carry literal JSON or refined body).
    expect(userPrompt).not.toMatch(/<comprehension>[\s\S]*<\/comprehension>/);
    expect(userPrompt).not.toMatch(/<refined>[\s\S]*<\/refined>/);
  });

  it('refinement prompt embeds the serialized comprehension result', () => {
    const { userPrompt } = buildPrompts('refinement', EPIC_BODY, ISSUE_BODY, { comprehension: COMP });
    expect(userPrompt).toContain(STAGE_INSTRUCTIONS.refinement);
    expect(userPrompt).toMatch(/<comprehension>[\s\S]*<\/comprehension>/);
    expect(userPrompt).toContain(JSON.stringify(COMP));
  });

  it('validation prompt embeds the refined body verbatim', () => {
    const refined = '## Summary\nshort\n\n## Acceptance Criteria\n- one';
    const { userPrompt } = buildPrompts('validation', EPIC_BODY, ISSUE_BODY, { refined });
    expect(userPrompt).toContain(STAGE_INSTRUCTIONS.validation);
    expect(userPrompt).toMatch(/<refined>[\s\S]*<\/refined>/);
    expect(userPrompt).toContain(refined);
  });

  it('refinement called without previous.comprehension embeds no <comprehension> block', () => {
    // The stage runner will short-circuit before this case; we only assert the
    // builder doesn't throw and doesn't accidentally insert an empty data block.
    const { userPrompt } = buildPrompts('refinement', EPIC_BODY, ISSUE_BODY);
    expect(userPrompt).not.toMatch(/<comprehension>[\s\S]*<\/comprehension>/);
    expect(userPrompt).toContain(STAGE_INSTRUCTIONS.refinement);
  });
});

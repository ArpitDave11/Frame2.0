/**
 * Issue Refinery — schema round-trip + validation tests (R-3).
 */

import { describe, it, expect } from 'vitest';
import {
  ComprehensionSchema,
  RefinementSchema,
  ValidationSchema,
} from './schemas';

describe('ComprehensionSchema', () => {
  it('parses a valid object', () => {
    const ok = ComprehensionSchema.safeParse({
      epicIntent: 'Replace legacy gateway.',
      issueIntent: 'Wire Stripe SDK.',
      gaps: ['No mention of test mode.'],
      ambiguities: [],
      alignmentNotes: ['Should follow epic §2.'],
    });
    expect(ok.success).toBe(true);
  });

  it('rejects when epicIntent is empty', () => {
    const result = ComprehensionSchema.safeParse({
      epicIntent: '',
      issueIntent: 'X',
      gaps: [],
      ambiguities: [],
      alignmentNotes: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects more than 8 gaps', () => {
    const result = ComprehensionSchema.safeParse({
      epicIntent: 'X',
      issueIntent: 'Y',
      gaps: new Array(9).fill('too many'),
      ambiguities: [],
      alignmentNotes: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing required field', () => {
    const result = ComprehensionSchema.safeParse({
      epicIntent: 'X',
      issueIntent: 'Y',
      gaps: [],
      ambiguities: [],
      // alignmentNotes missing
    });
    expect(result.success).toBe(false);
  });
});

describe('RefinementSchema', () => {
  it('accepts a body that meets the 50-char floor', () => {
    const result = RefinementSchema.safeParse({
      refinedBody: '## Summary\nA short summary.\n\n## Acceptance Criteria\n- one\n- two',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a too-short body', () => {
    const result = RefinementSchema.safeParse({ refinedBody: 'too short' });
    expect(result.success).toBe(false);
  });
});

describe('ValidationSchema', () => {
  it('parses a valid score+findings object', () => {
    const result = ValidationSchema.safeParse({
      score: 85,
      findings: ['[nit] tighten summary', '[important] add rollback'],
    });
    expect(result.success).toBe(true);
  });

  it('accepts score = 0', () => {
    expect(ValidationSchema.safeParse({ score: 0, findings: [] }).success).toBe(true);
  });

  it('accepts score = 100', () => {
    expect(ValidationSchema.safeParse({ score: 100, findings: [] }).success).toBe(true);
  });

  it('rejects score > 100', () => {
    expect(ValidationSchema.safeParse({ score: 150, findings: [] }).success).toBe(false);
  });

  it('rejects score < 0', () => {
    expect(ValidationSchema.safeParse({ score: -1, findings: [] }).success).toBe(false);
  });

  it('rejects non-integer score', () => {
    expect(ValidationSchema.safeParse({ score: 85.5, findings: [] }).success).toBe(false);
  });

  it('rejects more than 10 findings', () => {
    expect(
      ValidationSchema.safeParse({ score: 50, findings: new Array(11).fill('x') }).success,
    ).toBe(false);
  });
});

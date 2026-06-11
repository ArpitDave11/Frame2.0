/**
 * Tests for the One-Click draft store.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useOneClickStore } from './oneClickStore';
import type { GeneratedIssue } from '@/pipeline/issue/generation/generateIssue';

const GEN: GeneratedIssue = {
  title: 'Add percent button',
  description: '## Summary\nA percent button.',
  acceptanceCriteria: ['Pressing % divides by 100'],
  dependencies: [],
  risks: ['Edge cases on empty display'],
  suggestedWeight: 3,
  suggestedPriority: 'HIGH',
  suggestedLabels: ['feature'],
  suggestedAssignee: 'arpit',
  rationale: { weight: 'moderate', priority: 'useful', assignee: 'owner', labels: 'matched' },
};

beforeEach(() => useOneClickStore.getState().reset());

describe('oneClickStore', () => {
  it('openModal resets and opens at the epic-choice step', () => {
    useOneClickStore.getState().setPrompt('stale');
    useOneClickStore.getState().openModal();
    const s = useOneClickStore.getState();
    expect(s.open).toBe(true);
    expect(s.step).toBe('epic-choice');
    expect(s.prompt).toBe('');
  });

  it('builds an editable draft and normalizes the priority', () => {
    useOneClickStore.getState().setDraftFromGenerated(GEN);
    const d = useOneClickStore.getState().draft!;
    expect(d.title).toBe('Add percent button');
    expect(d.weight).toBe(3);
    expect(d.priority).toBe('high'); // normalized from "HIGH"
    expect(d.labels).toEqual(['feature']);
    expect(d.assignee).toBeNull(); // resolved by the action layer, not the store
  });

  it('falls back to medium for an unknown priority', () => {
    useOneClickStore.getState().setDraftFromGenerated({ ...GEN, suggestedPriority: 'whatever' });
    expect(useOneClickStore.getState().draft!.priority).toBe('medium');
  });

  it('patchDraft updates a single field', () => {
    useOneClickStore.getState().setDraftFromGenerated(GEN);
    useOneClickStore.getState().patchDraft({ weight: 8 });
    expect(useOneClickStore.getState().draft!.weight).toBe(8);
    expect(useOneClickStore.getState().draft!.title).toBe('Add percent button');
  });

  it('setCreated records the result and moves to the published step', () => {
    useOneClickStore.getState().setCreated({ iid: 42, webUrl: 'https://x/42' });
    const s = useOneClickStore.getState();
    expect(s.createdIssue).toEqual({ iid: 42, webUrl: 'https://x/42' });
    expect(s.step).toBe('published');
  });
});

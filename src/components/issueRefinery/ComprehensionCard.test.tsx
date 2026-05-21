/**
 * Issue Refinery — ComprehensionCard tests (R-11).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComprehensionCard } from './ComprehensionCard';
import { useIssueRefineryStore } from '@/stores/issueRefineryStore';
import type { ComprehensionResult } from '@/pipeline/issue/types';

const FULL: ComprehensionResult = {
  epicIntent: 'Replace legacy gateway with Stripe.',
  issueIntent: 'Wire Stripe SDK into checkout.',
  gaps: ['No test-mode flag mentioned.', 'No rollback plan.'],
  ambiguities: ['"existing flow" could mean v1 or v2 checkout.'],
  alignmentNotes: ['Should mirror epic §2 acceptance criteria.'],
};

beforeEach(() => {
  useIssueRefineryStore.getState().reset();
});

describe('ComprehensionCard', () => {
  it('renders null (nothing) when comprehension is null', () => {
    const { container } = render(<ComprehensionCard />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the card with intents and three finding lists when populated', () => {
    useIssueRefineryStore.getState().setComprehension(FULL);
    render(<ComprehensionCard />);

    expect(screen.queryByTestId('comprehension-card')).not.toBeNull();
    expect(screen.queryByText('Replace legacy gateway with Stripe.')).not.toBeNull();
    expect(screen.queryByText('Wire Stripe SDK into checkout.')).not.toBeNull();
    expect(screen.queryByTestId('comprehension-gaps')).not.toBeNull();
    expect(screen.queryByTestId('comprehension-ambiguities')).not.toBeNull();
    expect(screen.queryByTestId('comprehension-alignment')).not.toBeNull();
  });

  it('renders every gap, ambiguity, and alignment note item', () => {
    useIssueRefineryStore.getState().setComprehension(FULL);
    render(<ComprehensionCard />);
    for (const text of [...FULL.gaps, ...FULL.ambiguities, ...FULL.alignmentNotes]) {
      expect(screen.queryByText(text)).not.toBeNull();
    }
  });

  it('shows an empty-state message for empty finding categories', () => {
    useIssueRefineryStore.getState().setComprehension({ ...FULL, gaps: [], ambiguities: [], alignmentNotes: [] });
    render(<ComprehensionCard />);
    expect(screen.queryByText(/No gaps identified/i)).not.toBeNull();
    expect(screen.queryByText(/No ambiguities identified/i)).not.toBeNull();
    expect(screen.queryByText(/No alignment notes/i)).not.toBeNull();
  });
});

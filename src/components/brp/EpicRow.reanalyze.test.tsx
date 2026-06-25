import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EpicRow } from './EpicRow';
import type { Epic, SizedStory } from '@/domain/brp';

function story(p: SizedStory['points']): SizedStory {
  return { title: 's', points: p, acceptanceCriteria: ['ac'], splitPattern: 'Path', provenance: 'frame-generated' };
}

function epic(overrides: Partial<Epic> = {}): Epic {
  return {
    id: 'e1', iid: 142, title: 'Guest checkout flow', description: 'd', gitlabWebUrl: '#',
    podId: 'p1', source: 'gitlab', humanEstimate: 13, analysisStatus: 'done',
    frameResult: { frameEstimate: 13, breakdown: [], stories: [story(13)], rationale: 'r', confidence: 0.8, references: [], generatedStories: null, modelVersion: 'm', analyzedAt: 'now' },
    ...overrides,
  };
}

function renderRow(e: Epic, onReanalyze?: () => void) {
  return render(
    <table><tbody>
      <EpicRow epic={e} isSelected={false} onSelect={() => {}} onHumanEstimateChange={() => {}} onReanalyze={onReanalyze} />
    </tbody></table>,
  );
}

describe('EpicRow — Re-analyze action (T15)', () => {
  it('does not render the Re-analyze button when no handler is provided', () => {
    renderRow(epic());
    expect(screen.queryByTestId('epic-row-reanalyze-e1')).toBeNull();
  });

  it('renders "Re-analyze" for an epic that already has stories', () => {
    renderRow(epic(), vi.fn());
    expect(screen.getByTestId('epic-row-reanalyze-e1').textContent).toMatch(/Re-analyze$/);
  });

  it('emphasises "Re-analyze to size" for a story-less epic (INV6)', () => {
    renderRow(epic({ frameResult: null, analysisStatus: 'raw' }), vi.fn());
    expect(screen.getByTestId('epic-row-reanalyze-e1').textContent).toMatch(/Re-analyze to size/);
  });

  it('invokes the handler on click without toggling row selection', () => {
    const onReanalyze = vi.fn();
    const onSelect = vi.fn();
    render(
      <table><tbody>
        <EpicRow epic={epic()} isSelected={false} onSelect={onSelect} onHumanEstimateChange={() => {}} onReanalyze={onReanalyze} />
      </tbody></table>,
    );
    fireEvent.click(screen.getByTestId('epic-row-reanalyze-e1'));
    expect(onReanalyze).toHaveBeenCalledTimes(1);
    expect(onSelect).not.toHaveBeenCalled();
  });
});

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DetailPanel } from './DetailPanel';
import type { Epic, FrameResult, GeneratedStory } from '@/domain/brp';

const frameResult = (overrides: Partial<FrameResult> = {}): FrameResult => ({
  frameEstimate: 8 as FrameResult['frameEstimate'],
  breakdown: [
    { title: 'Backend API', points: 5 as FrameResult['frameEstimate'] },
    { title: 'UI form', points: 3 as FrameResult['frameEstimate'] },
  ],
  rationale: 'Solid scope. Three subsystems touched.',
  confidence: 0.82,
  references: [
    { epicId: 'r1', title: 'Past similar epic', similarity: 0.71, actualSp: 8 },
  ],
  generatedStories: null,
  modelVersion: 'sim-1',
  analyzedAt: '2026-05-23T00:00:00Z',
  ...overrides,
});

const epic = (overrides: Partial<Epic> = {}): Epic => ({
  id: 'gid://gitlab/Epic/100',
  iid: 42,
  title: 'Improve checkout flow',
  description: 'a'.repeat(200),
  gitlabWebUrl: 'https://gitlab.com/group/-/epics/42',
  podId: 'pod-1',
  source: 'gitlab',
  humanEstimate: 5,
  analysisStatus: 'done',
  frameResult: frameResult(),
  ...overrides,
});

describe('DetailPanel', () => {
  it('returns null when epic is null', () => {
    const { container } = render(<DetailPanel epic={null} onClose={() => {}} />);
    expect(container.querySelector('[data-testid="detail-panel"]')).toBeNull();
  });

  it('renders title, iid, and GitLab link', () => {
    render(<DetailPanel epic={epic()} onClose={() => {}} />);
    expect(screen.getByTestId('detail-panel-title').textContent).toBe('Improve checkout flow');
    expect(screen.getByTestId('detail-panel-id').textContent).toContain('!42');
    const link = screen.getByTestId('detail-panel-gitlab-link') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('https://gitlab.com/group/-/epics/42');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('renders FRAME rationale, breakdown, and references when available', () => {
    render(<DetailPanel epic={epic()} onClose={() => {}} />);
    expect(screen.getByTestId('detail-rationale').textContent).toBe(
      'Solid scope. Three subsystems touched.',
    );
    expect(screen.getByTestId('detail-section-breakdown')).toBeTruthy();
    expect(screen.getByTestId('detail-breakdown-item-0').textContent).toContain('Backend API');
    expect(screen.getByTestId('detail-breakdown-item-0').textContent).toContain('5 SP');
    expect(screen.getByTestId('detail-breakdown-item-1').textContent).toContain('UI form');
    expect(screen.getByTestId('detail-reference-0').textContent).toContain('Past similar epic');
    expect(screen.getByTestId('detail-reference-0').textContent).toContain('71% sim');
    expect(screen.getByTestId('detail-reference-0').textContent).toContain('8 SP');
  });

  it('omits breakdown and references sections when arrays are empty', () => {
    render(
      <DetailPanel
        epic={epic({
          frameResult: frameResult({ breakdown: [], references: [] }),
        })}
        onClose={() => {}}
      />,
    );
    expect(screen.queryByTestId('detail-section-breakdown')).toBeNull();
    expect(screen.queryByTestId('detail-section-references')).toBeNull();
    expect(screen.getByTestId('detail-section-rationale')).toBeTruthy();
  });

  it('shows generated stories section only when present', () => {
    const generated: GeneratedStory[] = [
      {
        title: 'New story FRAME made up',
        points: 3 as FrameResult['frameEstimate'],
        acceptanceCriteria: ['AC 1', 'AC 2'],
      },
    ];
    render(
      <DetailPanel
        epic={epic({ frameResult: frameResult({ generatedStories: generated }) })}
        onClose={() => {}}
      />,
    );
    expect(screen.getByTestId('detail-section-generated')).toBeTruthy();
    const story = screen.getByTestId('detail-generated-story-0');
    expect(story.textContent).toContain('New story FRAME made up');
    expect(story.textContent).toContain('3 SP');
    expect(story.textContent).toContain('AC 1');
    expect(story.textContent).toContain('AC 2');
  });

  it('does NOT render generated stories section when generatedStories is null', () => {
    render(<DetailPanel epic={epic()} onClose={() => {}} />);
    expect(screen.queryByTestId('detail-section-generated')).toBeNull();
  });

  it('renders empty state when frameResult is null', () => {
    render(
      <DetailPanel
        epic={epic({ frameResult: null, analysisStatus: 'raw' })}
        onClose={() => {}}
      />,
    );
    expect(screen.getByTestId('detail-empty-state')).toBeTruthy();
    expect(screen.queryByTestId('detail-section-rationale')).toBeNull();
  });

  it('shows the "Send to detailed grooming" CTA for re-groom variance', () => {
    const onSendToGrooming = vi.fn();
    // human=2, frame=8 → |6|/8 = 0.75 → re-groom
    const e = epic({
      humanEstimate: 2,
      frameResult: frameResult({ frameEstimate: 8 as FrameResult['frameEstimate'] }),
    });
    render(
      <DetailPanel
        epic={e}
        onClose={() => {}}
        onSendToGrooming={onSendToGrooming}
      />,
    );
    const cta = screen.getByTestId('detail-send-to-grooming');
    fireEvent.click(cta);
    expect(onSendToGrooming).toHaveBeenCalledTimes(1);
    expect(onSendToGrooming).toHaveBeenCalledWith(e);
  });

  it('shows the CTA for flagged variance', () => {
    const onSendToGrooming = vi.fn();
    // short description + no FRAME result → flagged
    const e = epic({
      description: 'short',
      analysisStatus: 'raw',
      frameResult: null,
    });
    render(
      <DetailPanel
        epic={e}
        onClose={() => {}}
        onSendToGrooming={onSendToGrooming}
      />,
    );
    expect(screen.getByTestId('detail-send-to-grooming')).toBeTruthy();
  });

  it('hides the CTA for caution / pending variance (default fixture is caution)', () => {
    // Default fixture: human=5, frame=8 → ratio 0.375 → caution (NOT re-groom).
    const { rerender } = render(
      <DetailPanel
        epic={epic()}
        onClose={() => {}}
        onSendToGrooming={() => {}}
      />,
    );
    expect(screen.queryByTestId('detail-send-to-grooming')).toBeNull();
    // pending: planner hasn't entered an estimate
    rerender(
      <DetailPanel
        epic={epic({ humanEstimate: null })}
        onClose={() => {}}
        onSendToGrooming={() => {}}
      />,
    );
    expect(screen.queryByTestId('detail-send-to-grooming')).toBeNull();
  });

  it('hides the CTA when onSendToGrooming is not provided (even for re-groom)', () => {
    const e = epic({
      humanEstimate: 2,
      frameResult: frameResult({ frameEstimate: 8 as FrameResult['frameEstimate'] }),
    });
    render(<DetailPanel epic={e} onClose={() => {}} />);
    expect(screen.queryByTestId('detail-send-to-grooming')).toBeNull();
  });

  it('close button calls onClose', () => {
    const onClose = vi.fn();
    render(<DetailPanel epic={epic()} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('detail-panel-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('reflects the variance band as a data attribute (default fixture is caution)', () => {
    render(<DetailPanel epic={epic()} onClose={() => {}} />);
    expect(screen.getByTestId('detail-panel').getAttribute('data-variance')).toBe('caution');
  });

  it('exposes an aria-label that names the epic', () => {
    render(<DetailPanel epic={epic()} onClose={() => {}} />);
    expect(screen.getByTestId('detail-panel').getAttribute('aria-label')).toBe(
      'Details for Improve checkout flow',
    );
  });
});

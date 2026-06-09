/**
 * Task 4-1 — capacity breakdown section in PodView. Separate file so
 * the H3 hook doesn't block PodView.test.tsx edits.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PodView } from './PodView';
import type { Crew, Epic, FrameResult, Pod } from '@/domain/brp';

const frameResult = (estimate: number, confidence = 0.8): FrameResult => ({
  frameEstimate: estimate as FrameResult['frameEstimate'],
  breakdown: [],
  rationale: 'r',
  confidence,
  references: [],
  generatedStories: null,
  modelVersion: 'sim-1',
  analyzedAt: '2026-05-23T00:00:00Z',
});

const epic = (id: string, overrides: Partial<Epic> = {}): Epic => ({
  id,
  iid: Number(id) || 0,
  title: `Epic ${id}`,
  description: 'a'.repeat(200),
  gitlabWebUrl: `https://gitlab/${id}`,
  podId: 'p1',
  source: 'gitlab',
  humanEstimate: 5,
  analysisStatus: 'done',
  frameResult: frameResult(5),
  ...overrides,
});

const pod = (epics: Epic[] = []): Pod => ({
  id: 'p1',
  name: 'Pod Alpha',
  gitlabSubgroupId: 100,
  capacity: {
    resources: 6,
    spPerResource: 10,
    sprintCount: 6,
    holidayDays: 2,
    leaveDays: 5,
  },
  epics,
});

const crew: Crew = {
  id: 'c1',
  name: 'Crew One',
  gitlabGroupId: 1,
  pods: [],
};

function renderView(overrides: Partial<React.ComponentProps<typeof PodView>> = {}) {
  const handlers = {
    onBackToPortfolio: vi.fn(),
    onSelectEpic: vi.fn(),
    onHumanEstimateChange: vi.fn(),
    onOpenCapacityDialog: vi.fn(),
    onOpenMetricsModal: vi.fn(),
    onOpenEpicPicker: vi.fn(),
    onRunAnalysis: vi.fn(),
  };
  const props = {
    pod: pod(),
    crew,
    selectedEpicId: null,
    analysisRunning: false,
    analysisCompleted: 0,
    analysisTotal: 0,
    ...handlers,
    ...overrides,
  };
  const utils = render(<PodView {...props} />);
  return { ...utils, props, handlers };
}

describe('PodView capacity breakdown (Task 4-1)', () => {
  it('renders the breakdown section with title', () => {
    renderView();
    expect(screen.getByTestId('pod-view-capacity-breakdown')).toBeTruthy();
  });

  it('shows gross / holiday / leave / total from computeCapacity', () => {
    // 6 resources × 10 SP × 6 sprints = 360 gross
    // 2 holidays × 6 = 12 deduction
    // 5 leave (person-days, used as-is)
    // total = 360 − 12 − 5 = 343
    renderView();
    expect(screen.getByTestId('capacity-line-gross').textContent).toContain('360 SP');
    expect(screen.getByTestId('capacity-line-holidays').textContent).toContain('−12 SP');
    expect(screen.getByTestId('capacity-line-leave').textContent).toContain('−5 SP');
    expect(screen.getByTestId('capacity-line-total').textContent).toContain('343 SP');
  });

  it('shows FRAME load total under the breakdown', () => {
    const e1 = epic('1', { humanEstimate: 5, frameResult: frameResult(5) });
    const e2 = epic('2', { humanEstimate: 5, frameResult: frameResult(5) });
    renderView({ pod: { ...pod([e1, e2]) } });
    expect(screen.getByTestId('pod-view-load-pct').textContent).toContain('3%'); // 10/343 ≈ 3%
  });

  it('load bar width is proportional to frameLoad/totalCapacity, capped at 100', () => {
    const e1 = epic('1', { humanEstimate: 5, frameResult: frameResult(5) });
    renderView({ pod: pod([e1]) });
    // 5/343 ≈ 1.46% → rounds to 1
    const fill = screen.getByTestId('pod-view-load-bar-fill') as HTMLDivElement;
    expect(fill.style.width).toBe('1%');
  });

  it('load bar caps at 100% even when frameLoad exceeds capacity', () => {
    // 6 epics at frame=89 → 534 frameLoad vs 343 capacity → over.
    const epics = Array.from({ length: 6 }, (_, i) =>
      epic(String(i + 1), { humanEstimate: 13, frameResult: frameResult(89) }),
    );
    renderView({ pod: pod(epics) });
    const fill = screen.getByTestId('pod-view-load-bar-fill') as HTMLDivElement;
    expect(fill.style.width).toBe('100%');
  });

  it('balance shows "+X SP" when positive and green color', () => {
    const e1 = epic('1', { humanEstimate: 5, frameResult: frameResult(5) });
    renderView({ pod: pod([e1]) });
    const balance = screen.getByTestId('pod-view-capacity-balance');
    expect(balance.textContent).toContain('+338');
    expect(balance.getAttribute('data-overcommitted')).toBe('false');
  });

  it('balance shows negative value (no prefix) and red color when overcommitted', () => {
    const epics = Array.from({ length: 6 }, (_, i) =>
      epic(String(i + 1), { humanEstimate: 13, frameResult: frameResult(89) }),
    );
    renderView({ pod: pod(epics) });
    const balance = screen.getByTestId('pod-view-capacity-balance');
    expect(balance.textContent).toContain('-191');
    expect(balance.getAttribute('data-overcommitted')).toBe('true');
  });

  it('Edit capacity button calls onOpenCapacityDialog', () => {
    const { handlers } = renderView();
    fireEvent.click(screen.getByTestId('pod-view-capacity-edit'));
    expect(handlers.onOpenCapacityDialog).toHaveBeenCalledTimes(1);
  });
});

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
  podId: 'pod-1',
  source: 'gitlab',
  humanEstimate: 5,
  analysisStatus: 'done',
  frameResult: frameResult(5),
  ...overrides,
});

const pod = (epics: Epic[] = []): Pod => ({
  id: 'pod-1',
  name: 'Pod Alpha',
  gitlabSubgroupId: 100,
  capacity: {
    resources: 5,
    spPerResource: 10,
    sprintCount: 6,
    holidayDays: 2,
    leaveDays: 4,
  },
  epics,
});

const crew: Crew = {
  id: 'crew-1',
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
    onCancelAnalysis: vi.fn(),
    onSendToGrooming: vi.fn(),
    onDismissAnalysisResult: vi.fn(),
  };
  const props = {
    pod: pod([epic('1'), epic('2')]),
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

describe('PodView', () => {
  it('renders pod name + crew name in the header', () => {
    renderView();
    expect(screen.getByTestId('pod-view-title').textContent).toBe('Pod Alpha');
    expect(screen.getByTestId('pod-view-crew').textContent).toBe('Crew One');
  });

  it('shows the empty-epics state when pod has no epics', () => {
    renderView({ pod: pod([]) });
    expect(screen.getByTestId('pod-view-empty-epics')).toBeTruthy();
    expect(screen.queryByTestId('pod-view-table')).toBeNull();
  });

  it('renders one EpicRow per epic when the pod has epics', () => {
    renderView();
    expect(screen.getByTestId('epic-row-1')).toBeTruthy();
    expect(screen.getByTestId('epic-row-2')).toBeTruthy();
  });

  it('metrics strip shows capacity / FRAME load / balance from computePodMetrics', () => {
    renderView();
    expect(screen.getByTestId('pod-view-capacity').textContent).toBe('286');
    expect(screen.getByTestId('pod-view-frame-load').textContent).toBe('10');
    expect(screen.getByTestId('pod-view-balance').textContent).toBe('276 SP free');
    expect(screen.getByTestId('pod-view-balance').getAttribute('data-overcommitted')).toBe('false');
  });

  it('Back button calls onBackToPortfolio', () => {
    const { handlers } = renderView();
    fireEvent.click(screen.getByTestId('pod-view-back'));
    expect(handlers.onBackToPortfolio).toHaveBeenCalledTimes(1);
  });

  it('each action button calls the corresponding handler', () => {
    const { handlers } = renderView();
    fireEvent.click(screen.getByTestId('pod-view-action-capacity'));
    expect(handlers.onOpenCapacityDialog).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('pod-view-action-metrics'));
    expect(handlers.onOpenMetricsModal).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('pod-view-action-add-epics'));
    expect(handlers.onOpenEpicPicker).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('pod-view-action-analyze'));
    expect(handlers.onRunAnalysis).toHaveBeenCalledTimes(1);
  });

  it('Run analysis button is disabled when pod has no epics', () => {
    renderView({ pod: pod([]) });
    expect(
      (screen.getByTestId('pod-view-action-analyze') as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('Run analysis button is disabled while analysis is running', () => {
    renderView({ analysisRunning: true, analysisTotal: 5, analysisCompleted: 2 });
    expect(
      (screen.getByTestId('pod-view-action-analyze') as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it('shows AnalysisProgress while running', () => {
    renderView({
      analysisRunning: true,
      analysisCompleted: 1,
      analysisTotal: 2,
      analysisCurrentEpicTitle: 'Epic 2',
    });
    expect(screen.getByTestId('analysis-progress-running')).toBeTruthy();
  });

  it('clicking an EpicRow calls onSelectEpic with the epic id', () => {
    const { handlers } = renderView();
    fireEvent.click(screen.getByTestId('epic-row-1'));
    expect(handlers.onSelectEpic).toHaveBeenCalledWith('1');
  });

  it('clicking the already-selected EpicRow toggles selection off (null)', () => {
    const { handlers } = renderView({ selectedEpicId: '1' });
    fireEvent.click(screen.getByTestId('epic-row-1'));
    expect(handlers.onSelectEpic).toHaveBeenCalledWith(null);
  });

  it('shows the DetailPanel when an epic is selected', () => {
    renderView({ selectedEpicId: '1' });
    expect(screen.getByTestId('detail-panel')).toBeTruthy();
    expect(screen.getByTestId('detail-panel-title').textContent).toBe('Epic 1');
  });

  it('closing the DetailPanel calls onSelectEpic(null)', () => {
    const { handlers } = renderView({ selectedEpicId: '1' });
    fireEvent.click(screen.getByTestId('detail-panel-close'));
    expect(handlers.onSelectEpic).toHaveBeenCalledWith(null);
  });

  it('changing a human estimate forwards (epicId, value) to onHumanEstimateChange', () => {
    const { handlers } = renderView();
    const input = screen.getByTestId('epic-row-human-1') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '13' } });
    fireEvent.blur(input);
    expect(handlers.onHumanEstimateChange).toHaveBeenCalledWith('1', 13);
  });

  it('over-committed pods flip the balance styling', () => {
    const epics = Array.from({ length: 6 }, (_, i) =>
      epic(String(i + 1), { humanEstimate: 13, frameResult: frameResult(89) }),
    );
    renderView({ pod: pod(epics) });
    const bal = screen.getByTestId('pod-view-balance');
    expect(bal.textContent).toBe('Over by 248 SP');
    expect(bal.getAttribute('data-overcommitted')).toBe('true');
  });
});

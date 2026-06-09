import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock recharts so tests don't depend on layout measurements that jsdom can't
// provide. Each chart primitive renders a div whose attributes capture the
// props we want to assert against — the BRP code under test feeds them.
vi.mock('recharts', () => {
  const passthrough =
    (testid: string) =>
    ({ children }: { children?: React.ReactNode }) => (
      <div data-testid={testid}>{children}</div>
    );

  return {
    ResponsiveContainer: passthrough('rc-responsive'),
    BarChart: ({ data, children }: { data: unknown; children?: React.ReactNode }) => (
      <div data-testid="rc-bar-chart" data-rows={JSON.stringify(data)}>
        {children}
      </div>
    ),
    Bar: ({ dataKey, name }: { dataKey: string; name: string }) => (
      <div data-testid={`rc-bar-${dataKey}`} data-name={name} />
    ),
    PieChart: passthrough('rc-pie-chart'),
    Pie: ({
      data,
      children,
    }: {
      data: unknown;
      children?: React.ReactNode;
    }) => (
      <div data-testid="rc-pie" data-rows={JSON.stringify(data)}>
        {children}
      </div>
    ),
    Cell: ({ fill }: { fill: string }) => (
      <div data-testid="rc-cell" data-fill={fill} />
    ),
    CartesianGrid: passthrough('rc-grid'),
    XAxis: passthrough('rc-xaxis'),
    YAxis: passthrough('rc-yaxis'),
    Tooltip: passthrough('rc-tooltip'),
    Legend: passthrough('rc-legend'),
  };
});

import { MetricsModal } from './MetricsModal';
import type { Epic, Pod, FrameResult } from '@/domain/brp';

// ─── Fixtures ───────────────────────────────────────────────

const baseFrameResult = (estimate: number, confidence = 0.8): FrameResult => ({
  frameEstimate: estimate as FrameResult['frameEstimate'],
  breakdown: [],
  rationale: 'r',
  confidence,
  references: [],
  generatedStories: null,
  modelVersion: 'sim-1',
  analyzedAt: '2026-05-23T00:00:00Z',
});

const epic = (
  id: string,
  overrides: Partial<Epic> = {},
): Epic => ({
  id,
  iid: Number(id) || 0,
  title: `Epic ${id}`,
  description: 'a'.repeat(200),
  gitlabWebUrl: `https://gitlab/${id}`,
  podId: 'pod-1',
  source: 'gitlab',
  humanEstimate: 5,
  analysisStatus: 'done',
  frameResult: baseFrameResult(5),
  ...overrides,
});

const pod = (epics: Epic[]): Pod => ({
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

function renderModal(p: Pod, propsOverrides: Partial<React.ComponentProps<typeof MetricsModal>> = {}) {
  const props = {
    open: true,
    pod: p,
    onClose: vi.fn(),
    ...propsOverrides,
  };
  const utils = render(<MetricsModal {...props} />);
  return { ...utils, props };
}

// ─── Tests ──────────────────────────────────────────────────

describe('MetricsModal', () => {
  it('renders nothing when open=false', () => {
    const { container } = renderModal(pod([epic('1')]), { open: false });
    expect(container.querySelector('[data-testid="metrics-modal"]')).toBeNull();
  });

  it('renders the pod name in the title', () => {
    renderModal(pod([epic('1')]));
    expect(screen.getByTestId('metrics-modal-title').textContent).toContain('Pod Alpha');
  });

  it('exposes role=dialog + aria-modal + tablist + tabs', () => {
    renderModal(pod([epic('1')]));
    const dlg = screen.getByTestId('metrics-modal');
    expect(dlg.getAttribute('role')).toBe('dialog');
    expect(dlg.getAttribute('aria-modal')).toBe('true');
    expect(screen.getByTestId('metrics-tab-variance').getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTestId('metrics-tab-capacity').getAttribute('aria-selected')).toBe('false');
  });

  it('starts on the variance tab and renders the chart + summary', () => {
    renderModal(
      pod([
        epic('1', { humanEstimate: 3, frameResult: baseFrameResult(5) }),
        epic('2', { humanEstimate: 8, frameResult: baseFrameResult(8) }),
      ]),
    );
    expect(screen.getByTestId('metrics-variance-tab')).toBeTruthy();
    // Chart data is fed to the mocked BarChart via the `data` prop.
    const chart = screen.getByTestId('rc-bar-chart');
    const rows = JSON.parse(chart.getAttribute('data-rows') ?? '[]');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ human: 3, frame: 5 });
    expect(rows[1]).toMatchObject({ human: 8, frame: 8 });
    // Summary uses computePodMetrics totals.
    expect(screen.getByTestId('metrics-human-total').textContent).toBe('11');
    expect(screen.getByTestId('metrics-frame-total').textContent).toBe('13');
    expect(screen.getByTestId('metrics-variance-delta').textContent).toBe('+2');
  });

  it('excludes flagged epics from the chart data', () => {
    // A flagged epic — short description and no FRAME result.
    const flagged = epic('flagged', {
      description: 'short',
      analysisStatus: 'raw',
      frameResult: null,
    });
    const ok = epic('ok', { humanEstimate: 5, frameResult: baseFrameResult(5) });
    renderModal(pod([flagged, ok]));
    const rows = JSON.parse(
      screen.getByTestId('rc-bar-chart').getAttribute('data-rows') ?? '[]',
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toContain('ok');
  });

  it('switching to capacity tab swaps tabpanels and seeds donut data', () => {
    renderModal(
      pod([
        epic('agree', { humanEstimate: 5, frameResult: baseFrameResult(5) }),
        epic('regroom', { humanEstimate: 2, frameResult: baseFrameResult(8) }),
      ]),
    );
    fireEvent.click(screen.getByTestId('metrics-tab-capacity'));
    expect(screen.getByTestId('metrics-tab-capacity').getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTestId('metrics-capacity-tab')).toBeTruthy();
    const rows = JSON.parse(
      screen.getByTestId('rc-pie').getAttribute('data-rows') ?? '[]',
    );
    // Two epics → both bands shown (agree + re-groom).
    const bands = rows.map((r: { band: string }) => r.band).sort();
    expect(bands).toEqual(['agree', 're-groom']);
  });

  it('capacity tab shows "Over by X" when load > capacity', () => {
    // 5×10×6=300 gross; 2×5=10 holiday; 4 leave; total=286.
    // Force load > capacity by adding many big epics.
    const epics = Array.from({ length: 6 }, (_, i) =>
      epic(String(i + 1), { humanEstimate: 13, frameResult: baseFrameResult(89) }),
    );
    renderModal(pod(epics));
    fireEvent.click(screen.getByTestId('metrics-tab-capacity'));
    // frameLoad = 6×89 = 534; capacity = 286; over by 248.
    expect(screen.getByTestId('metrics-balance-message').textContent).toContain('Over by 248 SP');
  });

  it('capacity tab shows "Fits — X SP free" when load ≤ capacity', () => {
    const epics = [epic('1', { humanEstimate: 5, frameResult: baseFrameResult(5) })];
    renderModal(pod(epics));
    fireEvent.click(screen.getByTestId('metrics-tab-capacity'));
    expect(screen.getByTestId('metrics-balance-message').textContent).toContain('Fits — 281 SP free');
  });

  it('clicking close button calls onClose', () => {
    const { props } = renderModal(pod([epic('1')]));
    fireEvent.click(screen.getByTestId('metrics-modal-close'));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('clicking the backdrop calls onClose', () => {
    const { props } = renderModal(pod([epic('1')]));
    fireEvent.click(screen.getByTestId('metrics-modal-backdrop'));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('Escape calls onClose', () => {
    const { props } = renderModal(pod([epic('1')]));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('truncates long epic titles in the chart', () => {
    const long = epic('long', {
      title: 'A very long epic title indeed that exceeds the limit',
      humanEstimate: 1,
      frameResult: baseFrameResult(1),
    });
    renderModal(pod([long]));
    const rows = JSON.parse(
      screen.getByTestId('rc-bar-chart').getAttribute('data-rows') ?? '[]',
    );
    expect(rows[0].name.length).toBeLessThanOrEqual(18);
    expect(rows[0].name.endsWith('…')).toBe(true);
  });

  it('shows variance bands legend on capacity tab with percentages', () => {
    renderModal(
      pod([
        epic('1', { humanEstimate: 5, frameResult: baseFrameResult(5) }),
        epic('2', { humanEstimate: 5, frameResult: baseFrameResult(5) }),
        epic('3', { humanEstimate: 1, frameResult: baseFrameResult(8) }),
      ]),
    );
    fireEvent.click(screen.getByTestId('metrics-tab-capacity'));
    // 2 agree (67%) + 1 re-groom (33%).
    const agree = screen.getByTestId('metrics-legend-agree');
    expect(agree.textContent).toContain('In tolerance');
    expect(agree.textContent).toContain('2');
    expect(agree.textContent).toContain('67%');
  });
});

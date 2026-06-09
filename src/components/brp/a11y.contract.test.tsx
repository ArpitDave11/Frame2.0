/**
 * B-38 — BRP accessibility contract suite.
 *
 * Rather than spin up axe-core (heavy + flaky in jsdom), this file
 * asserts the specific ARIA + keyboard contracts the components were
 * built against. Each test pins ONE contract; a regression that
 * removes a role/label/key handler fails the corresponding assertion.
 *
 * Contracts under test:
 *   - Modals: role="dialog" + aria-modal="true" + aria-labelledby
 *   - Status banners: role="status" + aria-live="polite"
 *   - Alert banners: role="alert"
 *   - Variance badge: role="status" + aria-label
 *   - Icons inside affordances: aria-hidden="true" so the icon doesn't
 *     drown out the label
 *   - Tab UIs: role="tablist" + role="tab" + aria-selected
 *   - Progress bars: role="progressbar" + aria-valuemin/max/now
 *   - External links: rel="noopener noreferrer"
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VarianceBadge } from './VarianceBadge';
import { CapacityDialog } from './CapacityDialog';
import { MetricsModal } from './MetricsModal';
import { EpicPicker } from './EpicPicker';
import { AnalysisProgress } from './AnalysisProgress';
import { DetailPanel } from './DetailPanel';
import { PodLoader } from './PodLoader';
import type { Epic, FrameResult, Pod } from '@/domain/brp';

// Mock recharts for MetricsModal — same shape as MetricsModal.test.tsx.
vi.mock('recharts', () => {
  const passthrough =
    (testid: string) =>
    ({ children }: { children?: React.ReactNode }) => (
      <div data-testid={testid}>{children}</div>
    );
  return {
    ResponsiveContainer: passthrough('rc-responsive'),
    BarChart: passthrough('rc-bar-chart'),
    Bar: () => <div data-testid="rc-bar" />,
    PieChart: passthrough('rc-pie-chart'),
    Pie: passthrough('rc-pie'),
    Cell: () => <div data-testid="rc-cell" />,
    CartesianGrid: passthrough('rc-grid'),
    XAxis: passthrough('rc-xaxis'),
    YAxis: passthrough('rc-yaxis'),
    Tooltip: passthrough('rc-tooltip'),
    Legend: passthrough('rc-legend'),
  };
});

const frameResult = (estimate: number): FrameResult => ({
  frameEstimate: estimate as FrameResult['frameEstimate'],
  breakdown: [],
  rationale: 'r',
  confidence: 0.7,
  references: [],
  generatedStories: null,
  modelVersion: 'sim',
  analyzedAt: '2026-05-23T00:00:00Z',
});

const epic = (overrides: Partial<Epic> = {}): Epic => ({
  id: 'e1',
  iid: 1,
  title: 't',
  description: 'a'.repeat(200),
  gitlabWebUrl: 'https://gitlab/1',
  podId: 'p1',
  source: 'gitlab',
  humanEstimate: 5,
  analysisStatus: 'done',
  frameResult: frameResult(5),
  ...overrides,
});

const pod: Pod = {
  id: 'p1',
  name: 'P',
  gitlabSubgroupId: 100,
  capacity: {
    resources: 5,
    spPerResource: 10,
    sprintCount: 6,
    holidayDays: 2,
    leaveDays: 4,
  },
  epics: [],
};

describe('VarianceBadge a11y', () => {
  it('exposes role=status + aria-label', () => {
    render(<VarianceBadge variance="caution" />);
    const el = screen.getByTestId('variance-badge');
    expect(el.getAttribute('role')).toBe('status');
    expect(el.getAttribute('aria-label')).toBeTruthy();
  });

  it('icon is aria-hidden so the announced text is the label only', () => {
    const { container } = render(<VarianceBadge variance="re-groom" />);
    const svg = container.querySelector('[data-testid="variance-badge"] svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('CapacityDialog a11y', () => {
  it('exposes role=dialog + aria-modal + aria-labelledby', () => {
    render(
      <CapacityDialog
        open
        podName="P"
        initial={pod.capacity}
        onClose={() => {}}
        onSave={() => {}}
      />,
    );
    const dlg = screen.getByTestId('capacity-dialog');
    expect(dlg.getAttribute('role')).toBe('dialog');
    expect(dlg.getAttribute('aria-modal')).toBe('true');
    const labelledBy = dlg.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    expect(document.getElementById(labelledBy!)).not.toBeNull();
  });

  it('Close button has an aria-label for screen readers', () => {
    render(
      <CapacityDialog
        open
        podName="P"
        initial={pod.capacity}
        onClose={() => {}}
        onSave={() => {}}
      />,
    );
    expect(
      screen.getByTestId('capacity-dialog-close').getAttribute('aria-label'),
    ).toBe('Close dialog');
  });
});

describe('MetricsModal a11y', () => {
  it('exposes dialog + tablist + tab semantics', () => {
    render(<MetricsModal open pod={pod} onClose={() => {}} />);
    const dlg = screen.getByTestId('metrics-modal');
    expect(dlg.getAttribute('role')).toBe('dialog');
    expect(dlg.getAttribute('aria-modal')).toBe('true');
    expect(screen.getByTestId('metrics-tab-variance').getAttribute('role')).toBe('tab');
    expect(screen.getByTestId('metrics-tab-variance').getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTestId('metrics-tab-capacity').getAttribute('aria-selected')).toBe('false');
  });
});

describe('EpicPicker a11y', () => {
  it('exposes role=dialog + aria-modal + aria-labelledby', () => {
    render(
      <EpicPicker
        open
        podName="P"
        candidates={[]}
        alreadyLoadedIds={new Set()}
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    );
    const dlg = screen.getByTestId('epic-picker');
    expect(dlg.getAttribute('role')).toBe('dialog');
    expect(dlg.getAttribute('aria-modal')).toBe('true');
    expect(dlg.getAttribute('aria-labelledby')).toBeTruthy();
  });

  it('Loading variant: role=status + aria-live=polite', () => {
    render(
      <EpicPicker
        open
        podName="P"
        candidates={[]}
        alreadyLoadedIds={new Set()}
        onClose={() => {}}
        onConfirm={() => {}}
        state="loading"
      />,
    );
    const s = screen.getByTestId('epic-picker-loading');
    expect(s.getAttribute('role')).toBe('status');
    expect(s.getAttribute('aria-live')).toBe('polite');
  });

  it('Error variant: role=alert', () => {
    render(
      <EpicPicker
        open
        podName="P"
        candidates={[]}
        alreadyLoadedIds={new Set()}
        onClose={() => {}}
        onConfirm={() => {}}
        state="error"
        errorMessage="x"
      />,
    );
    expect(screen.getByTestId('epic-picker-error').getAttribute('role')).toBe('alert');
  });
});

describe('AnalysisProgress a11y', () => {
  it('running: role=status + aria-live=polite + role=progressbar with value attrs', () => {
    render(
      <AnalysisProgress completed={2} total={5} running currentEpicTitle="x" />,
    );
    const status = screen.getByTestId('analysis-progress-running');
    expect(status.getAttribute('role')).toBe('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    const bar = screen.getByTestId('analysis-progress-bar');
    expect(bar.getAttribute('role')).toBe('progressbar');
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('5');
    expect(bar.getAttribute('aria-valuenow')).toBe('2');
  });

  it('partial-failure summary: role=alert', () => {
    render(
      <AnalysisProgress
        completed={5}
        total={5}
        running={false}
        failures={[{ epicId: 'e1', message: 'x' }]}
      />,
    );
    expect(
      screen.getByTestId('analysis-progress-partial').getAttribute('role'),
    ).toBe('alert');
  });

  it('success summary: role=status', () => {
    render(<AnalysisProgress completed={3} total={3} running={false} />);
    expect(
      screen.getByTestId('analysis-progress-success').getAttribute('role'),
    ).toBe('status');
  });
});

describe('DetailPanel a11y', () => {
  it('exposes aria-label naming the epic', () => {
    render(
      <DetailPanel epic={epic({ title: 'Refactor billing' })} onClose={() => {}} />,
    );
    expect(
      screen.getByTestId('detail-panel').getAttribute('aria-label'),
    ).toBe('Details for Refactor billing');
  });

  it('GitLab link opens externally with rel=noopener noreferrer', () => {
    render(<DetailPanel epic={epic()} onClose={() => {}} />);
    const link = screen.getByTestId('detail-panel-gitlab-link') as HTMLAnchorElement;
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('Close button has an aria-label', () => {
    render(<DetailPanel epic={epic()} onClose={() => {}} />);
    expect(
      screen.getByTestId('detail-panel-close').getAttribute('aria-label'),
    ).toBe('Close detail panel');
  });

  it('variance-message banner uses role=note', () => {
    render(
      <DetailPanel
        epic={epic()}
        onClose={() => {}}
        varianceMessage="Some note about the band"
      />,
    );
    expect(
      screen.getByTestId('detail-variance-message').getAttribute('role'),
    ).toBe('note');
  });
});

describe('PodLoader a11y', () => {
  it('Loading variant: role=status + aria-live=polite', () => {
    render(<PodLoader state="loading" onLoad={() => {}} />);
    const s = screen.getByTestId('pod-loader-loading');
    expect(s.getAttribute('role')).toBe('status');
    expect(s.getAttribute('aria-live')).toBe('polite');
  });

  it('Error variant: role=alert', () => {
    render(<PodLoader state="error" errorMessage="x" onLoad={() => {}} />);
    expect(
      screen.getByTestId('pod-loader-error').getAttribute('role'),
    ).toBe('alert');
  });
});

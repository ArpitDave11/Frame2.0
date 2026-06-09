/**
 * PortfolioView tests — card-grid view.
 *
 * Pinned shape: a responsive grid of pod cards. Each card summarises a
 * pod (metrics + a variance distribution bar + count chips) and drills
 * into PodView via Open. Individual epics are no longer listed in the
 * portfolio — that detail lives in PodView.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PortfolioView } from './PortfolioView';
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
  podId: 'pod-x',
  source: 'gitlab',
  humanEstimate: 5,
  analysisStatus: 'done',
  frameResult: frameResult(5),
  ...overrides,
});

const pod = (id: string, name: string, epics: Epic[] = []): Pod => ({
  id,
  name,
  gitlabSubgroupId: Number(id.replace(/[^0-9]/g, '')) || 0,
  capacity: {
    resources: 5,
    spPerResource: 10,
    sprintCount: 6,
    holidayDays: 2,
    leaveDays: 4,
  },
  epics: epics.map((e) => ({ ...e, podId: id })),
});

const crew = (id: string, name: string, pods: Pod[] = []): Crew => ({
  id,
  name,
  gitlabGroupId: Number(id) || 0,
  pods,
});

describe('PortfolioView (card grid)', () => {
  it('renders the empty-crews state when there are no crews', () => {
    render(
      <PortfolioView
        crews={[]}
        crewFilterId={null}
        onSelectCrew={() => {}}
        onSelectPod={() => {}}
      />,
    );
    expect(screen.getByTestId('portfolio-view-empty-crews')).toBeTruthy();
  });

  it('renders the empty-pods state when a crew has no pods', () => {
    render(
      <PortfolioView
        crews={[crew('1', 'Alpha', [])]}
        crewFilterId={null}
        onSelectCrew={() => {}}
        onSelectPod={() => {}}
      />,
    );
    expect(screen.getByTestId('portfolio-view-empty-pods')).toBeTruthy();
  });

  it('renders one pod card per pod across crews when no filter', () => {
    render(
      <PortfolioView
        crews={[
          crew('1', 'Alpha', [pod('p1', 'Pod A'), pod('p2', 'Pod B')]),
          crew('2', 'Bravo', [pod('p3', 'Pod C')]),
        ]}
        crewFilterId={null}
        onSelectCrew={() => {}}
        onSelectPod={() => {}}
      />,
    );
    expect(screen.getByTestId('portfolio-pod-section-p1')).toBeTruthy();
    expect(screen.getByTestId('portfolio-pod-section-p2')).toBeTruthy();
    expect(screen.getByTestId('portfolio-pod-section-p3')).toBeTruthy();
  });

  it('filters to only the chosen crew when crewFilterId is set', () => {
    render(
      <PortfolioView
        crews={[
          crew('1', 'Alpha', [pod('p1', 'Pod A')]),
          crew('2', 'Bravo', [pod('p2', 'Pod B')]),
        ]}
        crewFilterId="2"
        onSelectCrew={() => {}}
        onSelectPod={() => {}}
      />,
    );
    expect(screen.queryByTestId('portfolio-pod-section-p1')).toBeNull();
    expect(screen.getByTestId('portfolio-pod-section-p2')).toBeTruthy();
  });

  it('clicking the Open button calls onSelectPod with the pod id', () => {
    const onSelectPod = vi.fn();
    render(
      <PortfolioView
        crews={[crew('1', 'Alpha', [pod('p1', 'Pod A')])]}
        crewFilterId={null}
        onSelectCrew={() => {}}
        onSelectPod={onSelectPod}
      />,
    );
    fireEvent.click(screen.getByTestId('portfolio-pod-open-p1'));
    expect(onSelectPod).toHaveBeenCalledWith('p1');
  });

  it('forwards crew filter changes to onSelectCrew via the embedded CrewSelector', () => {
    const onSelectCrew = vi.fn();
    render(
      <PortfolioView
        crews={[crew('1', 'Alpha'), crew('2', 'Bravo')]}
        crewFilterId={null}
        onSelectCrew={onSelectCrew}
        onSelectPod={() => {}}
      />,
    );
    fireEvent.change(screen.getByTestId('crew-selector-select'), {
      target: { value: '2' },
    });
    expect(onSelectCrew).toHaveBeenCalledWith('2');
  });

  it('pod card shows capacity + FRAME load + confidence from computePodMetrics', () => {
    // 5×10×6 = 300 gross; 2×5 = 10 holiday; 4 leave; total = 286.
    // Two agree epics (human=5,frame=5) → frameLoad=10; conf 0.8 → 80%.
    const e1 = epic('1', { humanEstimate: 5, frameResult: frameResult(5, 0.8) });
    const e2 = epic('2', { humanEstimate: 5, frameResult: frameResult(5, 0.8) });
    render(
      <PortfolioView
        crews={[crew('1', 'Alpha', [pod('p1', 'Pod A', [e1, e2])])]}
        crewFilterId={null}
        onSelectCrew={() => {}}
        onSelectPod={() => {}}
      />,
    );
    expect(screen.getByTestId('portfolio-pod-capacity-p1').textContent).toContain('286');
    expect(screen.getByTestId('portfolio-pod-frameload-p1').textContent).toContain('10');
    expect(screen.getByTestId('portfolio-pod-confidence-p1').textContent).toBe('80%');
  });

  it('pod card flips to over-committed styling when balance is negative', () => {
    const epics = Array.from({ length: 6 }, (_, i) =>
      epic(String(i + 1), { humanEstimate: 13, frameResult: frameResult(89) }),
    );
    render(
      <PortfolioView
        crews={[crew('1', 'Alpha', [pod('p1', 'Pod A', epics)])]}
        crewFilterId={null}
        onSelectCrew={() => {}}
        onSelectPod={() => {}}
      />,
    );
    const section = screen.getByTestId('portfolio-pod-section-p1');
    expect(section.getAttribute('data-overcommitted')).toBe('true');
  });

  it('summarises epics as a variance distribution + count chips (no inline rows)', () => {
    const e1 = epic('row-1', { humanEstimate: 5, frameResult: frameResult(5) });
    const e2 = epic('row-2', { humanEstimate: 3, frameResult: frameResult(8) });
    render(
      <PortfolioView
        crews={[crew('1', 'Alpha', [pod('p1', 'Pod A', [e1, e2])])]}
        crewFilterId={null}
        onSelectCrew={() => {}}
        onSelectPod={() => {}}
      />,
    );
    // Epics are summarised on the card — no inline rows in the portfolio.
    expect(screen.queryByTestId('portfolio-epic-row-row-1')).toBeNull();
    expect(screen.getByTestId('portfolio-pod-distribution-p1')).toBeTruthy();
    expect(screen.getByTestId('portfolio-pod-chips-p1').textContent).toContain('2 epics');
  });

  it('shows a balance pill (free vs over) on each card', () => {
    const ok = epic('ok', { humanEstimate: 5, frameResult: frameResult(5) });
    render(
      <PortfolioView
        crews={[crew('1', 'Alpha', [pod('p1', 'Pod A', [ok])])]}
        crewFilterId={null}
        onSelectCrew={() => {}}
        onSelectPod={() => {}}
      />,
    );
    const pill = screen.getByTestId('portfolio-pod-balance-p1');
    expect(pill.getAttribute('data-overcommitted')).toBe('false');
    expect(pill.textContent).toMatch(/free/i);
  });

  it('pod with no epics shows a "no epics loaded yet" placeholder', () => {
    render(
      <PortfolioView
        crews={[crew('1', 'Alpha', [pod('p1', 'Pod A', [])])]}
        crewFilterId={null}
        onSelectCrew={() => {}}
        onSelectPod={() => {}}
      />,
    );
    expect(screen.getByTestId('portfolio-pod-empty-p1').textContent).toMatch(/no epics/i);
    expect(screen.getByTestId('portfolio-pod-confidence-p1').textContent).toBe('—');
  });
});

describe('PortfolioView — re-groom filter (Phase 3)', () => {
  it('shows the filter button when onToggleReGroomFilter is provided', () => {
    render(
      <PortfolioView
        crews={[crew('1', 'Alpha', [pod('p1', 'Pod A')])]}
        crewFilterId={null}
        onSelectCrew={() => {}}
        onSelectPod={() => {}}
        onToggleReGroomFilter={() => {}}
        reGroomOnlyFilter={false}
      />,
    );
    expect(screen.getByTestId('portfolio-regroom-filter')).toBeTruthy();
  });

  it('filter toggle calls the supplied handler', () => {
    const onToggle = vi.fn();
    render(
      <PortfolioView
        crews={[crew('1', 'Alpha', [pod('p1', 'Pod A')])]}
        crewFilterId={null}
        onSelectCrew={() => {}}
        onSelectPod={() => {}}
        onToggleReGroomFilter={onToggle}
      />,
    );
    fireEvent.click(screen.getByTestId('portfolio-regroom-filter'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('hides pods that have no re-groom epic when filter is on', () => {
    // p1 has a re-groom epic (human=1, frame=8 → 0.875 ratio).
    // p2 has only agree epics → should be hidden.
    const rg = epic('rg', { humanEstimate: 1, frameResult: frameResult(8) });
    const ok = epic('ok', { humanEstimate: 5, frameResult: frameResult(5) });
    render(
      <PortfolioView
        crews={[
          crew('1', 'Alpha', [
            pod('p1', 'Pod A', [rg, ok]),
            pod('p2', 'Pod B', [ok]),
          ]),
        ]}
        crewFilterId={null}
        onSelectCrew={() => {}}
        onSelectPod={() => {}}
        reGroomOnlyFilter
        onToggleReGroomFilter={() => {}}
      />,
    );
    expect(screen.getByTestId('portfolio-pod-section-p1')).toBeTruthy();
    expect(screen.queryByTestId('portfolio-pod-section-p2')).toBeNull();
  });

  it('shows the celebratory empty-state when filter is on AND no re-groom epics anywhere', () => {
    const ok = epic('ok', { humanEstimate: 5, frameResult: frameResult(5) });
    render(
      <PortfolioView
        crews={[crew('1', 'Alpha', [pod('p1', 'Pod A', [ok])])]}
        crewFilterId={null}
        onSelectCrew={() => {}}
        onSelectPod={() => {}}
        reGroomOnlyFilter
        onToggleReGroomFilter={() => {}}
      />,
    );
    expect(screen.getByTestId('portfolio-view-no-regroom')).toBeTruthy();
  });
});

describe('PortfolioView — PI badge (Phase 3)', () => {
  it('renders the PI badge when piName is provided', () => {
    render(
      <PortfolioView
        crews={[crew('1', 'Alpha')]}
        crewFilterId={null}
        onSelectCrew={() => {}}
        onSelectPod={() => {}}
        piName="PI-26.2"
      />,
    );
    expect(screen.getByTestId('portfolio-pi-badge').textContent).toBe('PI-26.2');
  });

  it('omits the PI badge when piName is missing', () => {
    render(
      <PortfolioView
        crews={[crew('1', 'Alpha')]}
        crewFilterId={null}
        onSelectCrew={() => {}}
        onSelectPod={() => {}}
      />,
    );
    expect(screen.queryByTestId('portfolio-pi-badge')).toBeNull();
  });
});

describe('PortfolioView — SummaryStrip wiring (Phase 2)', () => {
  it('renders SummaryStrip when crews exist', () => {
    render(
      <PortfolioView
        crews={[crew('1', 'Alpha', [pod('p1', 'Pod A')])]}
        crewFilterId={null}
        onSelectCrew={() => {}}
        onSelectPod={() => {}}
      />,
    );
    expect(screen.getByTestId('summary-strip')).toBeTruthy();
  });

  it('omits SummaryStrip when no crews', () => {
    render(
      <PortfolioView
        crews={[]}
        crewFilterId={null}
        onSelectCrew={() => {}}
        onSelectPod={() => {}}
      />,
    );
    expect(screen.queryByTestId('summary-strip')).toBeNull();
  });
});

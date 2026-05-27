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

describe('PortfolioView', () => {
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

  it('renders an empty-pods state when a crew has no pods', () => {
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

  it('renders one PodCard per pod across crews when no filter', () => {
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
    expect(screen.getByTestId('portfolio-pod-card-p1')).toBeTruthy();
    expect(screen.getByTestId('portfolio-pod-card-p2')).toBeTruthy();
    expect(screen.getByTestId('portfolio-pod-card-p3')).toBeTruthy();
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
    expect(screen.queryByTestId('portfolio-pod-card-p1')).toBeNull();
    expect(screen.getByTestId('portfolio-pod-card-p2')).toBeTruthy();
  });

  it('clicking a PodCard calls onSelectPod with the pod id', () => {
    const onSelectPod = vi.fn();
    render(
      <PortfolioView
        crews={[crew('1', 'Alpha', [pod('p1', 'Pod A')])]}
        crewFilterId={null}
        onSelectCrew={() => {}}
        onSelectPod={onSelectPod}
      />,
    );
    fireEvent.click(screen.getByTestId('portfolio-pod-card-p1'));
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

  it('PodCard shows capacity, FRAME load, balance, and band counts from computePodMetrics', () => {
    // 5x10x6 = 300 gross; 2x5 = 10 holiday; 4 leave; total = 286.
    // Two agree epics (human=5,frame=5) → frameLoad=10 → balance=276 free.
    const e1 = epic('1', { humanEstimate: 5, frameResult: frameResult(5) });
    const e2 = epic('2', { humanEstimate: 5, frameResult: frameResult(5) });
    render(
      <PortfolioView
        crews={[crew('1', 'Alpha', [pod('p1', 'Pod A', [e1, e2])])]}
        crewFilterId={null}
        onSelectCrew={() => {}}
        onSelectPod={() => {}}
      />,
    );
    expect(screen.getByTestId('portfolio-pod-capacity-p1').textContent).toBe('286');
    expect(screen.getByTestId('portfolio-pod-frameload-p1').textContent).toBe('10');
    expect(screen.getByTestId('portfolio-pod-balance-p1').textContent).toBe('276 SP free');
    expect(screen.getByTestId('portfolio-pod-balance-p1').getAttribute('data-overcommitted')).toBe('false');
  });

  it('PodCard flips to over-committed styling when balance is negative', () => {
    // 6 epics of frame=89 → frameLoad=534 > capacity=286 → over by 248.
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
    const balance = screen.getByTestId('portfolio-pod-balance-p1');
    expect(balance.textContent).toBe('Over by 248 SP');
    expect(balance.getAttribute('data-overcommitted')).toBe('true');
  });

  it('PodCard distribution bar shows segments only for bands with non-zero counts', () => {
    // Mix: 2 agree, 1 re-groom, 0 caution/flagged, 0 pending.
    const epics = [
      epic('a1', { humanEstimate: 5, frameResult: frameResult(5) }),
      epic('a2', { humanEstimate: 5, frameResult: frameResult(5) }),
      epic('r1', { humanEstimate: 1, frameResult: frameResult(8) }),
    ];
    render(
      <PortfolioView
        crews={[crew('1', 'Alpha', [pod('p1', 'Pod A', epics)])]}
        crewFilterId={null}
        onSelectCrew={() => {}}
        onSelectPod={() => {}}
      />,
    );
    expect(screen.getByTestId('portfolio-pod-distribution-p1-agree')).toBeTruthy();
    expect(screen.getByTestId('portfolio-pod-distribution-p1-re-groom')).toBeTruthy();
    expect(screen.queryByTestId('portfolio-pod-distribution-p1-caution')).toBeNull();
    expect(screen.queryByTestId('portfolio-pod-distribution-p1-flagged')).toBeNull();
    expect(screen.queryByTestId('portfolio-pod-distribution-p1-pending')).toBeNull();
  });

  it('PodCard shows a "no epics loaded" hint when the pod is empty', () => {
    render(
      <PortfolioView
        crews={[crew('1', 'Alpha', [pod('p1', 'Pod A', [])])]}
        crewFilterId={null}
        onSelectCrew={() => {}}
        onSelectPod={() => {}}
      />,
    );
    expect(screen.getByTestId('portfolio-pod-card-p1').textContent).toContain('No epics loaded');
    expect(screen.queryByTestId('portfolio-pod-distribution-p1')).toBeNull();
  });
});

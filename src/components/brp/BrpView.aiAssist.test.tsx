/**
 * B-34 UI wiring tests for BrpView's AI-assist surface:
 *   - DetailPanel.varianceMessage renders the interpreter output
 *   - EpicRow.isLikelyDuplicate renders the duplicate tag
 *
 * Kept in a separate file because the H3 pre-edit hook blocks edits
 * to BrpView.test.tsx, DetailPanel.test.tsx, EpicRow.test.tsx. New
 * files are allowed.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrpView } from './BrpView';
import { useBrpStore } from '@/stores/brpStore';
import { useConfigStore } from '@/stores/configStore';
import type { Crew, Epic, FrameResult, Pod } from '@/domain/brp';

const frameResult = (estimate: number, confidence = 0.8): FrameResult => ({
  frameEstimate: estimate as FrameResult['frameEstimate'],
  breakdown: [{ title: 'b', points: estimate as FrameResult['frameEstimate'] }],
  rationale: 'r',
  confidence,
  references: [],
  generatedStories: null,
  modelVersion: 'sim',
  analyzedAt: '2026-05-23T00:00:00Z',
});

const epic = (id: string, podId: string, overrides: Partial<Epic> = {}): Epic => ({
  id,
  iid: Number(id) || 0,
  title: `Epic ${id}`,
  description: 'a'.repeat(200),
  gitlabWebUrl: `https://gitlab/${id}`,
  podId,
  source: 'gitlab',
  humanEstimate: 5,
  analysisStatus: 'done',
  frameResult: frameResult(5),
  ...overrides,
});

const pod = (id: string, name: string, epics: Epic[] = []): Pod => ({
  id,
  name,
  gitlabSubgroupId: Number(id.replace(/\D/g, '')) || 0,
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

function reset() {
  useBrpStore.getState().reset();
  useConfigStore.setState((s) => ({
    config: {
      ...s.config,
      gitlab: {
        ...s.config.gitlab,
        enabled: true,
        baseUrl: 'https://gitlab.example/api/v4',
        accessToken: 'glpat-fake',
        rootGroupId: '999',
        defaultGroupId: '999',
      },
    },
  }));
}

describe('BrpView AI-assist wiring (B-34)', () => {
  beforeEach(reset);

  it('DetailPanel shows varianceMessage when a non-agree epic is selected', async () => {
    // human=1, frame=8 → ratio 0.875 → re-groom band, interpreter explains.
    const e = epic('e1', 'p1', {
      humanEstimate: 1,
      frameResult: frameResult(8, 0.8),
    });
    const p = { ...pod('p1', 'P'), epics: [e] };
    useBrpStore.getState().loadCrew(crew('c1', 'C', [p]));
    act(() => {
      useBrpStore.getState().selectPod('p1');
      useBrpStore.getState().selectEpic('e1');
    });
    render(<BrpView />);

    await waitFor(() => {
      expect(screen.getByTestId('detail-variance-message')).toBeTruthy();
    });
    expect(screen.getByTestId('detail-variance-message').textContent).toMatch(
      /grooming/i,
    );
  });

  it('DetailPanel does NOT show varianceMessage for an agree epic', async () => {
    // human=5, frame=5 → agree → interpreter returns null.
    const e = epic('e1', 'p1', {
      humanEstimate: 5,
      frameResult: frameResult(5, 0.8),
    });
    const p = { ...pod('p1', 'P'), epics: [e] };
    useBrpStore.getState().loadCrew(crew('c1', 'C', [p]));
    act(() => {
      useBrpStore.getState().selectPod('p1');
      useBrpStore.getState().selectEpic('e1');
    });
    render(<BrpView />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.queryByTestId('detail-variance-message')).toBeNull();
  });

  it('clears varianceMessage when the epic is deselected', async () => {
    const e = epic('e1', 'p1', {
      humanEstimate: 1,
      frameResult: frameResult(8),
    });
    const p = { ...pod('p1', 'P'), epics: [e] };
    useBrpStore.getState().loadCrew(crew('c1', 'C', [p]));
    act(() => {
      useBrpStore.getState().selectPod('p1');
      useBrpStore.getState().selectEpic('e1');
    });
    render(<BrpView />);
    await waitFor(() => {
      expect(screen.getByTestId('detail-variance-message')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('detail-panel-close'));
    expect(screen.queryByTestId('detail-variance-message')).toBeNull();
  });

  it('EpicRow shows "Likely duplicate" tag for epics in a dup group', async () => {
    const e1 = epic('dup-1', 'p1', { title: 'Improve checkout flow performance' });
    const e2 = epic('dup-2', 'p1', { title: 'Improve checkout flow speed' });
    const e3 = epic('unique', 'p1', { title: 'Migrate logging to opentelemetry' });
    const p = { ...pod('p1', 'P'), epics: [e1, e2, e3] };
    useBrpStore.getState().loadCrew(crew('c1', 'C', [p]));
    act(() => {
      useBrpStore.getState().selectPod('p1');
    });
    render(<BrpView />);

    await waitFor(() => {
      expect(screen.getByTestId('epic-row-duplicate-dup-1')).toBeTruthy();
    });
    expect(screen.getByTestId('epic-row-duplicate-dup-2')).toBeTruthy();
    expect(screen.queryByTestId('epic-row-duplicate-unique')).toBeNull();
  });

  it('does NOT show duplicate tags when no titles overlap', async () => {
    const e1 = epic('a', 'p1', { title: 'Migrate logging to opentelemetry' });
    const e2 = epic('b', 'p1', { title: 'Onboarding email templates' });
    const p = { ...pod('p1', 'P'), epics: [e1, e2] };
    useBrpStore.getState().loadCrew(crew('c1', 'C', [p]));
    act(() => {
      useBrpStore.getState().selectPod('p1');
    });
    render(<BrpView />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.queryByTestId('epic-row-duplicate-a')).toBeNull();
    expect(screen.queryByTestId('epic-row-duplicate-b')).toBeNull();
  });
});

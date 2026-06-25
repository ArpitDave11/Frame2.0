import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EpicWizard } from './EpicWizard';
import type { GeneratedEpicDraft } from '@/services/brp/brpActions';
import type { SizedStory } from '@/domain/brp';

function story(title: string, points: SizedStory['points']): SizedStory {
  return { title, points, acceptanceCriteria: ['ac1', 'ac2'], splitPattern: 'Path', provenance: 'frame-generated' };
}

const draft: GeneratedEpicDraft = {
  epicContent: '# Export reports',
  frameResult: {
    frameEstimate: 13, breakdown: [], stories: [story('CSV export', 5), story('PDF export', 3), story('Async generation', 8)],
    rationale: 'r', confidence: 0.8, references: [], generatedStories: null, modelVersion: 'azure-v2', analyzedAt: 'now',
  },
};

function setup(overrides: Partial<React.ComponentProps<typeof EpicWizard>> = {}) {
  const onClose = vi.fn();
  const onGenerate = vi.fn().mockResolvedValue({ success: true, data: draft });
  const onPublish = vi.fn().mockResolvedValue({ success: true });
  const props = { open: true, mode: 'create' as const, podName: 'Checkout Pod', onClose, onGenerate, onPublish, ...overrides };
  const utils = render(<EpicWizard {...props} />);
  return { ...utils, onClose, onGenerate, onPublish };
}

describe('EpicWizard', () => {
  it('renders nothing when closed', () => {
    const { container } = setup({ open: false });
    expect(container.querySelector('[data-testid="epic-wizard"]')).toBeNull();
  });

  it('starts on the input step with the requirement textarea', () => {
    setup();
    expect(screen.getByTestId('epic-wizard').getAttribute('data-step')).toBe('input');
    expect(screen.getByTestId('epic-wizard-requirement')).toBeTruthy();
  });

  it('disables Generate until a requirement is typed', () => {
    setup();
    expect((screen.getByTestId('epic-wizard-generate') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByTestId('epic-wizard-requirement'), { target: { value: 'export reports' } });
    expect((screen.getByTestId('epic-wizard-generate') as HTMLButtonElement).disabled).toBe(false);
  });

  it('generates → preview, listing the decomposed stories', async () => {
    const { onGenerate } = setup();
    fireEvent.change(screen.getByTestId('epic-wizard-requirement'), { target: { value: 'export reports' } });
    fireEvent.click(screen.getByTestId('epic-wizard-generate'));
    await waitFor(() => expect(screen.getByTestId('epic-wizard').getAttribute('data-step')).toBe('preview'));
    expect(onGenerate).toHaveBeenCalledWith('export reports');
    expect(screen.getByTestId('epic-wizard-story-0')).toBeTruthy();
    expect(screen.getByTestId('epic-wizard-story-2')).toBeTruthy();
  });

  it('shows the live total = Σ story points and updates when a point is edited', async () => {
    setup();
    fireEvent.change(screen.getByTestId('epic-wizard-requirement'), { target: { value: 'x' } });
    fireEvent.click(screen.getByTestId('epic-wizard-generate'));
    await waitFor(() => screen.getByTestId('epic-wizard-total'));
    expect(screen.getByTestId('epic-wizard-total').textContent).toBe('16'); // 5+3+8
    fireEvent.change(screen.getByTestId('epic-wizard-points-0'), { target: { value: '13' } });
    expect(screen.getByTestId('epic-wizard-total').textContent).toBe('24'); // 13+3+8
    expect(screen.getByTestId('epic-wizard-total-expr').textContent).toContain('13 + 3 + 8');
  });

  it('publishes the (edited) stories and reaches the done step', async () => {
    const { onPublish } = setup();
    fireEvent.change(screen.getByTestId('epic-wizard-requirement'), { target: { value: 'x' } });
    fireEvent.click(screen.getByTestId('epic-wizard-generate'));
    await waitFor(() => screen.getByTestId('epic-wizard-publish'));
    fireEvent.change(screen.getByTestId('epic-wizard-points-0'), { target: { value: '13' } });
    fireEvent.click(screen.getByTestId('epic-wizard-publish'));
    await waitFor(() => expect(screen.getByTestId('epic-wizard').getAttribute('data-step')).toBe('done'));
    const published = onPublish.mock.calls[0]![0] as SizedStory[];
    expect(published.map((s) => s.points)).toEqual([13, 3, 8]);
  });

  it('surfaces a generation error', async () => {
    setup({ onGenerate: vi.fn().mockResolvedValue({ success: false, error: { message: 'pipeline boom' } }) });
    fireEvent.change(screen.getByTestId('epic-wizard-requirement'), { target: { value: 'x' } });
    fireEvent.click(screen.getByTestId('epic-wizard-generate'));
    await waitFor(() => expect(screen.getByTestId('epic-wizard-error').textContent).toMatch(/pipeline boom/));
  });

  it('reanalyze mode shows the epic context', () => {
    setup({ mode: 'reanalyze', epicTitle: 'Fraud rule engine' });
    expect(screen.getByTestId('epic-wizard-title').textContent).toMatch(/Re-analyze/);
    expect(screen.getByTestId('epic-wizard-reanalyze-context').textContent).toMatch(/Fraud rule engine/);
  });

  it('exposes role=dialog + aria-modal and Escape closes', () => {
    const { onClose } = setup();
    const dlg = screen.getByTestId('epic-wizard');
    expect(dlg.getAttribute('role')).toBe('dialog');
    expect(dlg.getAttribute('aria-modal')).toBe('true');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});

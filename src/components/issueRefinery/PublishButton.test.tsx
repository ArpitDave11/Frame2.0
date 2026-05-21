/**
 * Issue Refinery — PublishButton tests (R-13).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PublishButton } from './PublishButton';
import { useIssueRefineryStore } from '@/stores/issueRefineryStore';

vi.mock('@/actions/refineIssueAction', () => ({ publishRefinedIssue: vi.fn() }));
import { publishRefinedIssue } from '@/actions/refineIssueAction';

beforeEach(() => {
  vi.clearAllMocks();
  useIssueRefineryStore.getState().reset();
});

describe('PublishButton — disabled gating', () => {
  it('is disabled when phase is idle', () => {
    render(<PublishButton />);
    expect((screen.getByTestId('publish-btn') as HTMLButtonElement).disabled).toBe(true);
  });

  it('is disabled when phase is ready but draft is empty', () => {
    useIssueRefineryStore.getState().setRefinedDraft('   ', false);
    useIssueRefineryStore.getState().setPhase('ready', null);
    render(<PublishButton />);
    expect((screen.getByTestId('publish-btn') as HTMLButtonElement).disabled).toBe(true);
  });

  it('is enabled when phase=ready and draft is non-empty', () => {
    useIssueRefineryStore.getState().setRefinedDraft('## Summary\nx', false);
    useIssueRefineryStore.getState().setPhase('ready', null);
    render(<PublishButton />);
    expect((screen.getByTestId('publish-btn') as HTMLButtonElement).disabled).toBe(false);
  });

  it('disables and shows "Publishing…" when phase=publishing', () => {
    useIssueRefineryStore.getState().setRefinedDraft('## Summary\nx', false);
    useIssueRefineryStore.getState().setPhase('publishing', null);
    render(<PublishButton />);
    const btn = screen.getByTestId('publish-btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toMatch(/publishing/i);
  });
});

describe('PublishButton — click', () => {
  it('calls publishRefinedIssue directly when not user-edited', () => {
    useIssueRefineryStore.getState().setRefinedDraft('## Summary\nx', false);
    useIssueRefineryStore.getState().setPhase('ready', null);
    render(<PublishButton />);
    fireEvent.click(screen.getByTestId('publish-btn'));
    expect(publishRefinedIssue).toHaveBeenCalledTimes(1);
  });

  it('asks for confirmation when userEditedDraft is true; proceeds if confirmed', () => {
    useIssueRefineryStore.getState().setRefinedDraft('## Summary\nx', true);
    useIssueRefineryStore.getState().setPhase('ready', null);
    const confirmFn = vi.fn().mockReturnValue(true);

    render(<PublishButton confirmFn={confirmFn} />);
    fireEvent.click(screen.getByTestId('publish-btn'));

    expect(confirmFn).toHaveBeenCalledTimes(1);
    expect(publishRefinedIssue).toHaveBeenCalledTimes(1);
  });

  it('aborts when the user cancels the confirm dialog', () => {
    useIssueRefineryStore.getState().setRefinedDraft('## Summary\nx', true);
    useIssueRefineryStore.getState().setPhase('ready', null);
    const confirmFn = vi.fn().mockReturnValue(false);

    render(<PublishButton confirmFn={confirmFn} />);
    fireEvent.click(screen.getByTestId('publish-btn'));

    expect(confirmFn).toHaveBeenCalledTimes(1);
    expect(publishRefinedIssue).not.toHaveBeenCalled();
  });
});

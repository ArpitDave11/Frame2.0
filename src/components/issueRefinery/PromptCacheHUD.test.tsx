/**
 * Issue Refinery — PromptCacheHUD tests (R-13).
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PromptCacheHUD } from './PromptCacheHUD';
import { useIssueRefineryStore } from '@/stores/issueRefineryStore';

beforeEach(() => {
  useIssueRefineryStore.getState().reset();
});

describe('PromptCacheHUD', () => {
  it('shows "no data yet" when lastCachedTokens is empty', () => {
    render(<PromptCacheHUD forceVisible />);
    expect(screen.queryByTestId('cache-hud')).not.toBeNull();
    expect(screen.queryByText(/No data yet/i)).not.toBeNull();
  });

  it('renders one item per recorded stage call', () => {
    const s = useIssueRefineryStore.getState();
    s.recordCachedTokens(0);
    s.recordCachedTokens(2200);
    s.recordCachedTokens(2200);

    render(<PromptCacheHUD forceVisible />);
    expect(screen.queryByText(/stage 1/i)).not.toBeNull();
    expect(screen.queryByText(/stage 2/i)).not.toBeNull();
    expect(screen.queryByText(/stage 3/i)).not.toBeNull();
    expect(screen.queryAllByText(/cached/i).length).toBeGreaterThanOrEqual(3);
  });

  it('does not throw when forceVisible omitted (DEV-flag gating exercised)', () => {
    expect(() => render(<PromptCacheHUD />)).not.toThrow();
  });
});

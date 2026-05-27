/**
 * PodLoader — "Load pods from GitLab" button with state (B-23).
 *
 * Renders one of:
 *   idle     → blue/red CTA "Load pods"
 *   loading  → spinner + label
 *   error    → red banner + Retry
 *   success  → muted "Loaded" hint (caller usually swaps this for a Crew/Pod
 *              picker once data is available, so this is just a finished state)
 *
 * Pure presentational. Caller plumbs the state + onLoad/onRetry. Disabled
 * when there is no selectedCrewId (the action wouldn't know what to fetch).
 */

import { Spinner, Warning, ArrowsClockwise } from '@phosphor-icons/react';
import { color, font, fontSize, fontWeight, radius } from '@/theme/tokens';

export type PodLoaderState = 'idle' | 'loading' | 'success' | 'error';

export interface PodLoaderProps {
  state: PodLoaderState;
  /** Required when state === 'error'. */
  errorMessage?: string;
  /** Render disabled when there is no crew selected. */
  disabled?: boolean;
  onLoad: () => void;
  onRetry?: () => void;
}

const buttonBase: React.CSSProperties = {
  fontFamily: font.sans,
  fontSize: fontSize.sm,
  fontWeight: fontWeight.medium,
  padding: '8px 14px',
  borderRadius: radius.sm,
  border: 'none',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
};

export function PodLoader({
  state,
  errorMessage,
  disabled = false,
  onLoad,
  onRetry,
}: PodLoaderProps) {
  if (state === 'loading') {
    return (
      <div
        data-testid="pod-loader-loading"
        role="status"
        aria-live="polite"
        style={{
          ...buttonBase,
          background: color.neutral50,
          color: color.grayV,
          cursor: 'wait',
        }}
      >
        <Spinner size={14} className="spin" aria-hidden="true" />
        Loading pods…
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div
        data-testid="pod-loader-error"
        role="alert"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 14px',
          background: color.pastelI,
          border: `1px solid ${color.bordeauxI}`,
          color: color.red,
          borderRadius: radius.sm,
          fontFamily: font.sans,
          fontSize: fontSize.sm,
        }}
      >
        <Warning size={14} weight="fill" aria-hidden="true" />
        <span data-testid="pod-loader-error-message">
          {errorMessage ?? 'Failed to load pods.'}
        </span>
        <button
          type="button"
          data-testid="pod-loader-retry"
          onClick={() => (onRetry ?? onLoad)()}
          style={{
            ...buttonBase,
            background: color.red,
            color: color.white,
            padding: '4px 10px',
          }}
        >
          <ArrowsClockwise size={12} weight="bold" aria-hidden="true" />
          Retry
        </button>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <span
        data-testid="pod-loader-success"
        style={{
          fontFamily: font.sans,
          fontSize: fontSize.xs,
          color: color.grayV,
        }}
      >
        Pods loaded.
      </span>
    );
  }

  // idle
  return (
    <button
      type="button"
      data-testid="pod-loader-load"
      disabled={disabled}
      onClick={onLoad}
      style={{
        ...buttonBase,
        background: disabled ? color.neutral50 : color.red,
        color: disabled ? color.grayIII : color.white,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      Load pods
    </button>
  );
}

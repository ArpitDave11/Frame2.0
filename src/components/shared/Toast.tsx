/**
 * Toast — Individual notification card.
 *
 * Left color bar based on type. Auto-dismisses after duration.
 * X button for immediate dismiss. ubsFade entry animation.
 */

import { useEffect } from 'react';
import { X } from '@phosphor-icons/react';
import type { Toast as ToastType } from '@/stores/uiStore';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

const COLOR_MAP: Record<ToastType['type'], string> = {
  success: '#22c55e',
  error: '#E60000',
  info: '#3b82f6',
  warning: '#f59e0b',
};

interface ToastProps {
  toast: ToastType;
  onDismiss: () => void;
  duration?: number;
}

export function Toast({ toast, onDismiss, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [onDismiss, duration]);

  const barColor = COLOR_MAP[toast.type];

  return (
    <div
      data-testid={`toast-${toast.id}`}
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'stretch',
        maxWidth: 360,
        background: 'var(--col-background-ui-10)',
        border: '1px solid var(--col-border-illustrative)',
        borderRadius: 8,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        animation: 'ubsFade 0.2s ease',
        fontFamily: F,
      }}
    >
      {/* Color bar */}
      <div
        data-testid={`toast-bar-${toast.id}`}
        style={{
          width: 4,
          flexShrink: 0,
          background: barColor,
        }}
      />

      {/* Content */}
      <div style={{ flex: 1, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 300, color: 'var(--col-text-primary)', flex: 1 }}>
          {toast.title}
        </span>
        <button
          onClick={onDismiss}
          data-testid={`toast-dismiss-${toast.id}`}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--col-text-subtle)',
            padding: 2,
            flexShrink: 0,
          }}
        >
          <X size={14} weight="regular" />
        </button>
      </div>
    </div>
  );
}

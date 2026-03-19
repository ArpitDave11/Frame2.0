/**
 * ComplexitySelector — 3-button toggle for complexity level.
 *
 * Simple | Moderate | Complex
 * Selected: red bg + white text. Unselected: transparent + subtle.
 */

import type { ComplexityLevel } from '@/domain/types';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

const OPTIONS: { value: ComplexityLevel; label: string }[] = [
  { value: 'simple', label: 'Simple' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'complex', label: 'Complex' },
];

interface ComplexitySelectorProps {
  value: ComplexityLevel;
  onChange: (level: ComplexityLevel) => void;
  disabled?: boolean;
}

export function ComplexitySelector({ value, onChange, disabled }: ComplexitySelectorProps) {
  return (
    <div
      data-testid="complexity-selector"
      style={{
        display: 'inline-flex',
        border: '1px solid var(--col-border-illustrative)',
        borderRadius: '0.375rem',
        overflow: 'hidden',
      }}
    >
      {OPTIONS.map((opt) => {
        const isSelected = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => !disabled && onChange(opt.value)}
            disabled={disabled}
            data-testid={`complexity-${opt.value}`}
            style={{
              padding: '6px 14px',
              border: 'none',
              borderRight: opt.value !== 'complex' ? '1px solid var(--col-border-illustrative)' : 'none',
              background: isSelected ? 'var(--col-background-brand)' : 'transparent',
              color: isSelected ? '#ffffff' : 'var(--col-text-subtle)',
              fontSize: 13,
              fontWeight: isSelected ? 500 : 300,
              fontFamily: F,
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'all .15s',
              opacity: disabled ? 0.5 : 1,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

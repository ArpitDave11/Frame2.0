/**
 * StepIndicator — 4-step non-linear stepper bar for the Initiative wizard.
 *
 * Renders Init → Stream Epic → Split Crews → Refine as a horizontal bar
 * with connecting lines. Completed steps are clickable; future steps are
 * aria-disabled.
 */

import type { WizardStep } from '@/stores/initiativeStore';

const STEPS: { key: WizardStep; label: string }[] = [
  { key: 'init', label: 'Init' },
  { key: 'streamEpic', label: 'Stream Epic' },
  { key: 'splitCrews', label: 'Split Crews' },
  { key: 'refineCrews', label: 'Refine' },
];

const RED = '#E60000';
const GRAY = '#CCCABC';
const FONT_FAMILY = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

interface StepIndicatorProps {
  current: WizardStep;
  onStepClick: (step: WizardStep) => void;
  completedSteps: WizardStep[];
}

export default function StepIndicator({ current, onStepClick, completedSteps }: StepIndicatorProps) {
  return (
    <nav
      data-testid="step-indicator"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 0,
        fontFamily: FONT_FAMILY,
      }}
    >
      {STEPS.map((step, i) => {
        const isActive = step.key === current;
        const isCompleted = completedSteps.includes(step.key);
        const isFuture = !isActive && !isCompleted;
        const color = isFuture ? GRAY : RED;

        return (
          <div key={step.key} style={{ display: 'flex', alignItems: 'center' }}>
            <button
              type="button"
              data-testid={`step-${step.key}`}
              aria-disabled={isFuture ? 'true' : undefined}
              onClick={() => {
                if (isCompleted) onStepClick(step.key);
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                background: 'none',
                border: 'none',
                padding: '4px 12px',
                cursor: isCompleted ? 'pointer' : 'default',
                fontFamily: FONT_FAMILY,
              }}
            >
              {/* Circle */}
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  border: `2px solid ${color}`,
                  backgroundColor: isFuture ? 'transparent' : color,
                  display: 'inline-block',
                }}
              />
              {/* Label */}
              <span
                style={{
                  fontSize: 12,
                  fontWeight: isActive ? 700 : 400,
                  color,
                  whiteSpace: 'nowrap',
                }}
              >
                {step.label}
              </span>
            </button>
            {/* Connector line (except after last) */}
            {i < STEPS.length - 1 && (
              <span
                style={{
                  width: 32,
                  height: 2,
                  backgroundColor: completedSteps.includes(STEPS[i + 1].key) || STEPS[i + 1].key === current
                    ? RED
                    : GRAY,
                  display: 'inline-block',
                  flexShrink: 0,
                }}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}

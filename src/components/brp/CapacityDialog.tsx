/**
 * CapacityDialog — modal for editing a Pod's capacity inputs (B-19).
 *
 * Pure controlled component:
 * - `open` → render or null
 * - `initial` → seeds the form (resets if the prop changes while open)
 * - `onSave(inputs)` → caller plumbs to `brpStore.updatePodCapacity`
 * - `onClose()` → caller closes the modal
 *
 * Live breakdown is computed with `computeCapacity` from src/domain/brp.ts
 * so the dialog and the rest of BRP cannot drift. Inputs match the
 * canonical domain field names (sprintCount, not sprintsInPI).
 *
 * Accessibility: dialog role="dialog" + aria-modal + aria-labelledby,
 * close button + Escape close, backdrop click closes.
 */

import { useEffect, useId, useRef, useState } from 'react';
import { X } from '@phosphor-icons/react';
import { computeCapacity } from '@/domain/brp';
import type { CapacityInputs } from '@/domain/brp';
import { color, font, fontSize, fontWeight, radius, shadow } from '@/theme/tokens';

export interface CapacityDialogProps {
  open: boolean;
  podName: string;
  initial: CapacityInputs;
  onClose: () => void;
  onSave: (inputs: CapacityInputs) => void;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  border: `1px solid ${color.grayI}`,
  borderRadius: radius.sm,
  fontSize: fontSize.sm,
  fontFamily: font.mono,
  background: color.white,
  color: color.black,
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: fontSize.xs,
  color: color.grayV,
  marginBottom: 6,
  fontWeight: fontWeight.medium,
};

const hintStyle: React.CSSProperties = {
  fontSize: '0.6875rem',
  color: color.grayIII,
  marginTop: 4,
};

export function CapacityDialog({
  open,
  podName,
  initial,
  onClose,
  onSave,
}: CapacityDialogProps) {
  const [inputs, setInputs] = useState<CapacityInputs>(initial);
  const titleId = useId();
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  // Reset local state whenever the initial inputs change (different pod
  // selected, or store updated mid-dialog).
  useEffect(() => {
    setInputs(initial);
  }, [initial]);

  // Escape closes; only while open. Listener is added/removed by `open`.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Auto-focus the first field when opening for keyboard-only flow.
  useEffect(() => {
    if (open) firstFieldRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const breakdown = computeCapacity(inputs);

  const update = (patch: Partial<CapacityInputs>) =>
    setInputs((prev) => ({ ...prev, ...patch }));

  const parseField = (raw: string): number => {
    const n = parseInt(raw, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };

  return (
    <>
      <div
        data-testid="capacity-dialog-backdrop"
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          zIndex: 999,
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="capacity-dialog"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 480,
          maxHeight: '90vh',
          overflowY: 'auto',
          background: color.white,
          borderRadius: radius.xl,
          boxShadow: shadow.xl,
          zIndex: 1000,
          fontFamily: font.sans,
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '24px 28px',
            borderBottom: `1px solid ${color.neutral200}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: color.neutral50,
          }}
        >
          <h2
            id={titleId}
            data-testid="capacity-dialog-title"
            style={{
              fontSize: fontSize.lg,
              fontWeight: fontWeight.medium,
              margin: 0,
              letterSpacing: '-0.2px',
              color: color.black,
            }}
          >
            Capacity — {podName}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            data-testid="capacity-dialog-close"
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: 6,
              color: color.grayIII,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={22} weight="bold" aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label htmlFor={`${titleId}-resources`} style={labelStyle}>
              Resources
            </label>
            <input
              ref={firstFieldRef}
              id={`${titleId}-resources`}
              type="number"
              min={1}
              value={inputs.resources}
              data-testid="capacity-input-resources"
              onChange={(e) => update({ resources: parseField(e.target.value) })}
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor={`${titleId}-sp`} style={labelStyle}>
              SP per resource / sprint
            </label>
            <input
              id={`${titleId}-sp`}
              type="number"
              min={1}
              value={inputs.spPerResource}
              data-testid="capacity-input-sp-per-resource"
              onChange={(e) => update({ spPerResource: parseField(e.target.value) })}
              style={inputStyle}
            />
            <div style={hintStyle}>Default: 10</div>
          </div>

          <div>
            <label htmlFor={`${titleId}-sprints`} style={labelStyle}>
              Sprints in PI
            </label>
            <input
              id={`${titleId}-sprints`}
              type="number"
              min={1}
              value={inputs.sprintCount}
              data-testid="capacity-input-sprint-count"
              onChange={(e) => update({ sprintCount: parseField(e.target.value) })}
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor={`${titleId}-holidays`} style={labelStyle}>
              Holiday days (each multiplies by resources)
            </label>
            <input
              id={`${titleId}-holidays`}
              type="number"
              min={0}
              value={inputs.holidayDays}
              data-testid="capacity-input-holiday-days"
              onChange={(e) => update({ holidayDays: parseField(e.target.value) })}
              style={inputStyle}
            />
          </div>

          <div>
            <label htmlFor={`${titleId}-leave`} style={labelStyle}>
              Leave (total person-days)
            </label>
            <input
              id={`${titleId}-leave`}
              type="number"
              min={0}
              value={inputs.leaveDays}
              data-testid="capacity-input-leave-days"
              onChange={(e) => update({ leaveDays: parseField(e.target.value) })}
              style={inputStyle}
            />
          </div>

          {/* Live breakdown — driven by `computeCapacity` so it can never
              drift from the rest of BRP. */}
          <div
            data-testid="capacity-dialog-breakdown"
            style={{
              background: color.neutral50,
              border: `1px solid ${color.neutral200}`,
              borderRadius: radius.md,
              padding: 16,
              fontSize: fontSize.sm,
            }}
          >
            <BreakdownRow
              label="Gross"
              value={`${breakdown.gross} SP`}
              testid="capacity-breakdown-gross"
            />
            <BreakdownRow
              label="− Holidays"
              value={`−${breakdown.holidayDeduction} SP`}
              muted
              testid="capacity-breakdown-holidays"
            />
            <BreakdownRow
              label="− Leave"
              value={`−${breakdown.leaveDeduction} SP`}
              muted
              testid="capacity-breakdown-leave"
            />
            <div
              style={{
                borderTop: `2px solid ${color.black}`,
                marginTop: 8,
                paddingTop: 12,
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <span style={{ fontWeight: fontWeight.semibold, color: color.black }}>
                Total capacity
              </span>
              <span
                data-testid="capacity-breakdown-total"
                style={{
                  fontFamily: font.mono,
                  fontWeight: fontWeight.semibold,
                  fontSize: fontSize.base,
                  color: color.black,
                }}
              >
                {breakdown.total} SP
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '16px 28px',
            borderTop: `1px solid ${color.neutral200}`,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            data-testid="capacity-dialog-cancel"
            style={{
              background: color.white,
              color: color.grayV,
              border: `1px solid ${color.grayI}`,
              padding: '10px 20px',
              borderRadius: radius.md,
              fontSize: fontSize.sm,
              fontWeight: fontWeight.medium,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(inputs);
              onClose();
            }}
            data-testid="capacity-dialog-save"
            style={{
              background: color.red,
              color: color.white,
              border: 'none',
              padding: '10px 24px',
              borderRadius: radius.md,
              fontSize: fontSize.sm,
              fontWeight: fontWeight.medium,
              cursor: 'pointer',
            }}
          >
            Save
          </button>
        </div>
      </div>
    </>
  );
}

function BreakdownRow({
  label,
  value,
  muted = false,
  testid,
}: {
  label: string;
  value: string;
  muted?: boolean;
  testid: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: 10,
      }}
    >
      <span style={{ color: muted ? color.grayIII : color.grayV }}>{label}</span>
      <span
        data-testid={testid}
        style={{
          fontFamily: font.mono,
          fontWeight: muted ? fontWeight.normal : fontWeight.medium,
          color: muted ? color.grayIII : color.black,
        }}
      >
        {value}
      </span>
    </div>
  );
}

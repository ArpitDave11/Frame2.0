/**
 * VarianceBadge — renders one of 5 variance bands as an inline badge
 * (B-18, port from docs/Brp_plan/ui_sample_brp/VarianceBadge.tsx with
 * FRAME design tokens — no raw hsl(), no font literals).
 *
 * Display labels use the sample wording (less judgmental than the type
 * names): "In tolerance / Discuss / Re-groom / Needs detail / Pending".
 * Internal type names (`VarianceBand` from src/domain/brp.ts) stay as
 * `'agree' | 'caution' | 're-groom' | 'flagged' | 'pending'`.
 *
 * Accessibility:
 * - Each band has a Phosphor icon so color isn't the only signal.
 * - `role="status"` + `aria-label` lets screen readers announce the band.
 * - The badge is non-interactive; consumers wrap it with their own
 *   clickable element when needed.
 */

import { CheckCircle, Warning, Flag, Question, Clock } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import { color, fontSize, fontWeight, radius } from '@/theme/tokens';
import type { VarianceBand } from '@/domain/brp';

interface BandConfig {
  bg: string;
  text: string;
  border: string;
  Icon: Icon;
  label: string;
}

// One entry per band. Quality remediation (Phase 1): the original
// palette used pastelI/pastelII/grayV across all 4 non-pending bands,
// rendering the badges indistinguishable at a glance. The semantic
// green/amber/red/purple tokens (Phase 0 of remediation) restore the
// signal — each band reads as its own band without reading the label.
// `pending` keeps its CSS-var-based muted palette so unanalyzed epics
// look quiet rather than competing for attention.
const BAND_CONFIG: Record<VarianceBand, BandConfig> = {
  agree: {
    bg: color.semanticGreenBg,
    text: color.semanticGreenText,
    border: color.semanticGreenBorder,
    Icon: CheckCircle,
    label: 'In tolerance',
  },
  caution: {
    bg: color.semanticAmberBg,
    text: color.semanticAmberText,
    border: color.semanticAmberBorder,
    Icon: Warning,
    label: 'Discuss',
  },
  're-groom': {
    bg: color.semanticRedBg,
    text: color.red,                 // keep brand red for re-groom severity
    border: color.semanticRedBorder,
    Icon: Warning,
    label: 'Re-groom',
  },
  flagged: {
    bg: color.semanticPurpleBg,
    text: color.semanticPurpleText,
    border: color.semanticPurpleBorder,
    Icon: Flag,
    label: 'Needs detail',
  },
  pending: {
    bg: 'var(--muted)',
    text: 'var(--muted-foreground)',
    border: 'var(--border)',
    Icon: Clock,
    label: 'Pending',
  },
};

export interface VarianceBadgeProps {
  variance: VarianceBand;
  /** Optional override for the screen-reader-announced label. */
  ariaLabel?: string;
}

export function VarianceBadge({ variance, ariaLabel }: VarianceBadgeProps) {
  const cfg = BAND_CONFIG[variance] ?? BAND_CONFIG.pending ?? {
    bg: 'var(--muted)',
    text: 'var(--muted-foreground)',
    border: 'var(--border)',
    Icon: Question,
    label: 'Unknown',
  };
  const Icon = cfg.Icon;

  return (
    <span
      role="status"
      aria-label={ariaLabel ?? `Variance: ${cfg.label}`}
      data-testid="variance-badge"
      data-variance={variance}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        padding: '5px 11px',
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: radius.sm,
        fontSize: fontSize.xs,
        fontWeight: fontWeight.semibold,
        color: cfg.text,
        letterSpacing: '0.2px',
        whiteSpace: 'nowrap',
      }}
    >
      <Icon size={13} weight="fill" aria-hidden="true" />
      {cfg.label}
    </span>
  );
}

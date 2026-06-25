/**
 * EpicWizard — slim wizard for generating & sizing an epic, then publishing
 * it to GitLab (T13). Two doors into one engine:
 *   - mode 'create'    → blank requirement → new epic
 *   - mode 'reanalyze' → existing epic + planner direction → refined epic
 *
 * Pure/presentational like the other BRP modals: the caller (BrpView) plumbs
 * the async actions (`onGenerate`, `onPublish`) which compose `brpActions`.
 * The component owns only the wizard state machine + the editable preview.
 *
 * Trust mechanism (INV2): the epic's load shown here is computed live as the
 * SUM of the visible story points — never a separate number — so the total can
 * never contradict the decomposition. Editing a story's points re-sums instantly.
 */

import { useEffect, useId, useMemo, useState } from 'react';
import { X, Sparkle } from '@phosphor-icons/react';
import { FIBONACCI_POINTS } from '@/domain/brp.constants';
import type { FibonacciPoint, SizedStory } from '@/domain/brp';
import type { GeneratedEpicDraft } from '@/services/brp/brpActions';
import { color, font, fontSize, fontWeight, radius, shadow } from '@/theme/tokens';

type WizardStep = 'input' | 'generating' | 'preview' | 'publishing' | 'done' | 'error';

export interface EpicWizardResult {
  success: boolean;
  error?: { message: string };
}

export interface EpicWizardProps {
  open: boolean;
  mode: 'create' | 'reanalyze';
  podName: string;
  /** For reanalyze: the epic being refined (shown for context). */
  epicTitle?: string;
  onClose: () => void;
  /** Runs the pipeline + FRAME sizing; returns a draft or an error. */
  onGenerate: (
    requirement: string,
  ) => Promise<{ success: true; data: GeneratedEpicDraft } | { success: false; error: { message: string } }>;
  /** Publishes the (possibly edited) stories to GitLab + loads into the pod. */
  onPublish: (stories: SizedStory[], epicContent: string) => Promise<EpicWizardResult>;
}

const FIB = [...FIBONACCI_POINTS];

export function EpicWizard({ open, mode, podName, epicTitle, onClose, onGenerate, onPublish }: EpicWizardProps) {
  const titleId = useId();
  const [step, setStep] = useState<WizardStep>('input');
  const [requirement, setRequirement] = useState('');
  const [draft, setDraft] = useState<GeneratedEpicDraft | null>(null);
  const [stories, setStories] = useState<SizedStory[]>([]);
  const [errorMsg, setErrorMsg] = useState('');

  // Reset everything whenever the wizard (re)opens.
  useEffect(() => {
    if (open) {
      setStep('input');
      setRequirement('');
      setDraft(null);
      setStories([]);
      setErrorMsg('');
    }
  }, [open, mode, epicTitle]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const total = useMemo(() => stories.reduce((s, x) => s + x.points, 0), [stories]);
  const sumExpr = useMemo(() => stories.map((s) => s.points).join(' + '), [stories]);

  if (!open) return null;

  const heading = mode === 'create' ? 'Create New Epic' : 'Re-analyze Epic';
  const canGenerate = requirement.trim().length > 0 && step === 'input';

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setStep('generating');
    setErrorMsg('');
    const res = await onGenerate(requirement.trim());
    if (res.success) {
      setDraft(res.data);
      setStories(res.data.frameResult.stories ?? []);
      setStep('preview');
    } else {
      setErrorMsg(res.error.message);
      setStep('error');
    }
  };

  const handlePublish = async () => {
    if (!draft) return;
    setStep('publishing');
    setErrorMsg('');
    const res = await onPublish(stories, draft.epicContent);
    if (res.success) {
      setStep('done');
    } else {
      setErrorMsg(res.error?.message ?? 'Publish failed.');
      setStep('error');
    }
  };

  const setStoryPoints = (i: number, points: FibonacciPoint) =>
    setStories((prev) => prev.map((s, idx) => (idx === i ? { ...s, points } : s)));

  return (
    <>
      <div
        data-testid="epic-wizard-backdrop"
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999 }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="epic-wizard"
        data-step={step}
        style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 600, maxHeight: '90vh', display: 'flex', flexDirection: 'column',
          background: color.white, borderRadius: radius.xl, boxShadow: shadow.xl, zIndex: 1000,
          fontFamily: font.sans,
        }}
      >
        {/* Header */}
        <div style={{ padding: '22px 28px', borderBottom: `1px solid ${color.neutral200}`, background: color.neutral50, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 id={titleId} data-testid="epic-wizard-title" style={{ margin: 0, fontSize: fontSize.lg, fontWeight: fontWeight.medium, color: color.black, letterSpacing: '-0.2px' }}>
              {heading}
            </h2>
            <button type="button" onClick={onClose} aria-label="Close wizard" data-testid="epic-wizard-close" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: color.grayIII, display: 'flex' }}>
              <X size={20} weight="bold" aria-hidden="true" />
            </button>
          </div>
          <Steps step={step} />
        </div>

        {/* Body */}
        <div style={{ padding: 28, overflowY: 'auto', flex: 1 }}>
          {(step === 'input' || step === 'generating') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {mode === 'reanalyze' && epicTitle && (
                <div data-testid="epic-wizard-reanalyze-context" style={{ fontSize: fontSize.sm, color: color.grayV }}>
                  Refining <strong>{epicTitle}</strong> — add the missing direction below.
                </div>
              )}
              <label htmlFor={`${titleId}-req`} style={labelStyle}>
                {mode === 'create' ? 'High-level requirement' : 'Direction / missing context'}
              </label>
              <textarea
                id={`${titleId}-req`}
                data-testid="epic-wizard-requirement"
                value={requirement}
                disabled={step === 'generating'}
                onChange={(e) => setRequirement(e.target.value)}
                placeholder="Describe what you want to build — FRAME decomposes it into sized stories."
                rows={6}
                style={{ ...inputStyle, fontFamily: font.sans, resize: 'vertical', minHeight: 130 }}
              />
              <p style={{ ...hintStyle, marginTop: 0 }}>
                FRAME runs the 6-stage pipeline, then sizes each story against this pod’s closed epics. The epic’s load is the sum of those story points.
              </p>
              {step === 'generating' && (
                <div role="status" aria-live="polite" data-testid="epic-wizard-generating" style={{ fontSize: fontSize.sm, color: color.grayV }}>
                  Generating epic and sizing stories…
                </div>
              )}
            </div>
          )}

          {(step === 'preview' || step === 'publishing') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p data-testid="epic-wizard-summary" style={{ margin: 0, fontSize: fontSize.sm, color: color.grayV }}>
                FRAME decomposed this into {stories.length} user {stories.length === 1 ? 'story' : 'stories'}.
              </p>
              <ul data-testid="epic-wizard-stories" role="list" style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {stories.map((s, i) => (
                  <StoryRow key={i} story={s} index={i} titleId={titleId} disabled={step === 'publishing'} onPoints={(p) => setStoryPoints(i, p)} />
                ))}
              </ul>
              {step === 'publishing' && (
                <div role="status" aria-live="polite" data-testid="epic-wizard-publishing" style={{ fontSize: fontSize.sm, color: color.grayV }}>
                  Publishing to GitLab and loading into {podName}…
                </div>
              )}
            </div>
          )}

          {step === 'done' && (
            <div data-testid="epic-wizard-done" role="status" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 0' }}>
              <div style={{ fontSize: fontSize.base, fontWeight: fontWeight.medium, color: color.black }}>Epic published ✓</div>
              <div style={{ fontSize: fontSize.sm, color: color.grayV }}>
                {stories.length} stories ({total} SP) added to {podName}.
              </div>
            </div>
          )}

          {step === 'error' && (
            <div data-testid="epic-wizard-error" role="alert" style={{ padding: '14px 16px', background: color.pastelI, border: `1px solid ${color.bordeauxI}`, borderRadius: radius.sm, color: color.red, fontSize: fontSize.sm }}>
              {errorMsg || 'Something went wrong.'}
            </div>
          )}
        </div>

        {/* Footer */}
        <Footer
          step={step}
          total={total}
          sumExpr={sumExpr}
          count={stories.length}
          canGenerate={canGenerate}
          onClose={onClose}
          onGenerate={handleGenerate}
          onPublish={handlePublish}
          onRetry={() => setStep(draft ? 'preview' : 'input')}
        />
      </div>
    </>
  );
}

// ─── Sub-components ─────────────────────────────────────────

function Steps({ step }: { step: WizardStep }) {
  const order: WizardStep[] = ['input', 'generating', 'preview', 'publishing'];
  const labels: Record<string, string> = { input: 'Requirement', generating: 'Generate', preview: 'Preview', publishing: 'Publish' };
  const activeIdx = step === 'done' ? 3 : step === 'error' ? order.indexOf('input') : order.indexOf(step);
  const cells = [
    { key: 'input', n: 1, label: 'Requirement' },
    { key: 'generating', n: 2, label: 'Generate' },
    { key: 'preview', n: 3, label: 'Preview' },
    { key: 'publishing', n: 4, label: 'Publish' },
  ];
  return (
    <div data-testid="epic-wizard-steps" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {cells.map((c, i) => {
        const active = i <= Math.max(activeIdx, 0);
        return (
          <span key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 18, height: 18, borderRadius: 9, background: active ? color.black : color.neutral200, color: active ? color.white : color.grayV, fontSize: 11, fontWeight: fontWeight.semibold, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{c.n}</span>
              <span style={{ fontSize: fontSize.xs, fontWeight: active ? fontWeight.semibold : fontWeight.normal, color: active ? color.black : color.grayIII }}>{labels[c.key]}</span>
            </span>
            {i < cells.length - 1 && <span style={{ color: color.grayI }}>—</span>}
          </span>
        );
      })}
    </div>
  );
}

function StoryRow({ story, index, titleId, disabled, onPoints }: { story: SizedStory; index: number; titleId: string; disabled: boolean; onPoints: (p: FibonacciPoint) => void }) {
  const selId = `${titleId}-pts-${index}`;
  return (
    <li data-testid={`epic-wizard-story-${index}`} style={{ border: `1px solid ${color.neutral200}`, borderRadius: radius.md, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <span style={{ flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: color.black }}>{story.title}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <label htmlFor={selId} style={{ fontSize: fontSize.xs, color: color.grayIII }}>SP</label>
          <select
            id={selId}
            data-testid={`epic-wizard-points-${index}`}
            value={story.points}
            disabled={disabled}
            onChange={(e) => onPoints(Number(e.target.value) as FibonacciPoint)}
            style={{ fontFamily: font.mono, fontSize: fontSize.sm, padding: '6px 10px', border: `1px solid ${color.grayI}`, borderRadius: radius.sm, background: color.white, color: color.black }}
          >
            {FIB.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.6875rem', fontWeight: fontWeight.medium, color: color.grayV, padding: '3px 8px', background: color.neutral50, border: `1px solid ${color.neutral200}`, borderRadius: radius.sm }}>{story.splitPattern}</span>
        <span style={{ fontSize: fontSize.xs, color: color.grayIII }}>
          {story.acceptanceCriteria.length} acceptance criteria
          {story.referenceEpicId ? ` · anchored to ${story.referenceEpicId}` : ''}
        </span>
      </div>
    </li>
  );
}

function Footer({ step, total, sumExpr, count, canGenerate, onClose, onGenerate, onPublish, onRetry }: { step: WizardStep; total: number; sumExpr: string; count: number; canGenerate: boolean; onClose: () => void; onGenerate: () => void; onPublish: () => void; onRetry: () => void }) {
  const showTotal = step === 'preview' || step === 'publishing';
  return (
    <div style={{ padding: '16px 28px', borderTop: `1px solid ${color.neutral200}`, background: showTotal ? color.neutral50 : color.white, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {showTotal ? (
          <>
            <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: color.grayV }}>Total load</span>
              <span data-testid="epic-wizard-total" style={{ fontFamily: font.mono, fontSize: '1.5rem', fontWeight: fontWeight.semibold, color: color.black }}>{total}</span>
              <span style={{ fontSize: fontSize.xs, color: color.grayIII }}>SP</span>
            </span>
            <span data-testid="epic-wizard-total-expr" style={{ fontSize: '0.6875rem', color: color.grayIII }}>= sum of {count} story points ({sumExpr || '0'})</span>
          </>
        ) : (
          <span style={{ fontSize: fontSize.xs, color: color.grayIII }}>FRAME · trustworthy sizing</span>
        )}
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button type="button" onClick={onClose} data-testid="epic-wizard-cancel" style={btnGhost}>
          {step === 'done' ? 'Close' : 'Cancel'}
        </button>
        {(step === 'input' || step === 'generating') && (
          <button type="button" onClick={onGenerate} disabled={!canGenerate} data-testid="epic-wizard-generate" style={{ ...btnPrimary, opacity: canGenerate ? 1 : 0.5, cursor: canGenerate ? 'pointer' : 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Sparkle size={14} weight="fill" aria-hidden="true" />
            {step === 'generating' ? 'Generating…' : 'Generate epic'}
          </button>
        )}
        {(step === 'preview' || step === 'publishing') && (
          <button type="button" onClick={onPublish} disabled={step === 'publishing' || count === 0} data-testid="epic-wizard-publish" style={{ ...btnPrimary, opacity: step === 'publishing' || count === 0 ? 0.6 : 1, cursor: step === 'publishing' ? 'wait' : 'pointer' }}>
            {step === 'publishing' ? 'Publishing…' : 'Publish to GitLab'}
          </button>
        )}
        {step === 'error' && (
          <button type="button" onClick={onRetry} data-testid="epic-wizard-retry" style={btnPrimary}>Back</button>
        )}
      </div>
    </div>
  );
}

// ─── Styles ─────────────────────────────────────────────────

const labelStyle: React.CSSProperties = { display: 'block', fontSize: fontSize.xs, color: color.grayV, fontWeight: fontWeight.medium };
const hintStyle: React.CSSProperties = { fontSize: '0.6875rem', color: color.grayIII };
const inputStyle: React.CSSProperties = { width: '100%', padding: '12px 14px', border: `1px solid ${color.grayI}`, borderRadius: radius.sm, fontSize: fontSize.sm, background: color.white, color: color.black, boxSizing: 'border-box' };
const btnGhost: React.CSSProperties = { background: color.white, color: color.grayV, border: `1px solid ${color.grayI}`, padding: '10px 18px', borderRadius: radius.md, fontSize: fontSize.sm, fontWeight: fontWeight.medium, cursor: 'pointer' };
const btnPrimary: React.CSSProperties = { background: color.red, color: color.white, border: 'none', padding: '10px 20px', borderRadius: radius.md, fontSize: fontSize.sm, fontWeight: fontWeight.medium, cursor: 'pointer' };

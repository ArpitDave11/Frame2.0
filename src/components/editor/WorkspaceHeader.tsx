/**
 * WorkspaceHeader — Epic Planner toolbar.
 *
 * Pixel-matched to UI_Prototype WorkspaceHeader.tsx with added
 * ComplexitySelector and Undo button. Reads multiple stores.
 */

import {
  FolderSimple,
  FloppyDisk,
  Lightning,
  ListBullets,
  UploadSimple,
  Star,
  GearSix,
  ArrowCounterClockwise,
} from '@phosphor-icons/react';
import { useUiStore } from '@/stores/uiStore';
import { useEpicStore } from '@/stores/epicStore';
import { usePipelineStore } from '@/stores/pipelineStore';
import { useBlueprintStore } from '@/stores/blueprintStore';
import { useGitlabStore } from '@/stores/gitlabStore';
import { EPIC_CATEGORIES } from '@/domain/categoryConstants';
import { ComplexitySelector } from '@/components/editor/ComplexitySelector';
import { refinePipelineAction } from '@/pipeline/refinePipelineAction';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

export function WorkspaceHeader() {
  // ─── Store reads ────────────────────────────────────────────
  const markdown = useEpicStore((s) => s.markdown);
  const category = useEpicStore((s) => s.document?.category ?? '');
  const complexity = useEpicStore((s) => s.complexity);
  const qualityScore = useEpicStore((s) => s.document?.metadata?.qualityScore ?? null);
  const sla = useEpicStore((s) => s.sla);
  const canUndo = useEpicStore((s) => s.previousMarkdown !== null);
  const isRunning = usePipelineStore((s) => s.isRunning);
  const diagramReady = useBlueprintStore((s) => !!s.code);
  const hasGitLabContext = useGitlabStore((s) => s.loadedEpicIid !== null);

  // ─── Store writes ───────────────────────────────────────────
  const setMarkdown = useEpicStore((s) => s.setMarkdown);
  const setComplexity = useEpicStore((s) => s.setComplexity);
  const setSla = useEpicStore((s) => s.setSla);
  const undo = useEpicStore((s) => s.undo);
  const openModal = useUiStore((s) => s.openModal);

  // ─── Derived state ──────────────────────────────────────────
  const hasContent = !!markdown.trim();
  const canRefine = hasContent && !isRunning;
  const canPublish = hasContent;

  // ─── Handlers ───────────────────────────────────────────────
  const handleLoad = () => openModal('loadEpic');
  const handleRefine = () => {
    openModal('pipeline');
    refinePipelineAction(); // fire-and-forget
  };
  const handlePublish = () => openModal('publish');
  const handleIssues = () => openModal('issueCreation');
  const handleSettings = () => openModal('settings');

  return (
    <header
      data-testid="workspace-header"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        height: 56,
        background: 'var(--col-background-ui-10)',
        borderBottom: '1px solid var(--col-border-illustrative)',
        flexShrink: 0,
        zIndex: 10,
        fontFamily: F,
      }}
    >
      {/* Left side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        {/* Load */}
        <button
          onClick={handleLoad}
          data-testid="btn-load"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            border: '1px solid var(--col-border-illustrative)',
            borderRadius: '0.375rem',
            background: 'var(--col-background-ui-10)',
            color: 'var(--col-text-primary)',
            fontSize: 13,
            fontWeight: 400,
            cursor: 'pointer',
            fontFamily: F,
          }}
        >
          <FolderSimple size={14} weight="regular" /> Load
        </button>

        {/* Category dropdown */}
        <select
          value={category}
          onChange={(e) => {
            const catId = e.target.value;
            if (!catId) return;
            const cat = EPIC_CATEGORIES.find((c) => c.id === catId);
            if (!cat) return;

            // If editor has content, confirm before replacing
            if (markdown.trim()) {
              const confirmed = window.confirm(
                'Changing category will reset your content with the new template. Continue?',
              );
              if (!confirmed) return;
            }

            const md = cat.secs.map((s) => `## ${s}\n\n_Your content here..._\n`).join('\n');
            setMarkdown(md);
          }}
          data-testid="category-select"
          style={{
            padding: '6px 28px 6px 12px',
            border: '1px solid var(--col-border-illustrative)',
            borderRadius: '0.375rem',
            background: 'var(--col-background-ui-10)',
            color: category ? 'var(--col-text-primary)' : 'var(--col-text-subtle)',
            fontSize: 13,
            fontFamily: F,
            fontWeight: 300,
            cursor: 'pointer',
            minWidth: 170,
            appearance: 'none' as const,
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23666' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 10px center',
          }}
        >
          <option value="">Select category...</option>
          {EPIC_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>

        {/* Complexity selector — NEW */}
        <ComplexitySelector
          value={complexity}
          onChange={setComplexity}
          disabled={isRunning}
        />

        {/* SLA Override — optional */}
        <div
          data-testid="sla-input-group"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            border: '1px solid var(--col-border-illustrative)',
            borderRadius: '0.375rem',
            padding: '0 10px',
            height: 32,
          }}
        >
          <label
            style={{
              fontSize: 11,
              fontWeight: 300,
              color: 'var(--col-text-subtle)',
              fontFamily: F,
              whiteSpace: 'nowrap',
            }}
          >
            SLA
          </label>
          <input
            type="number"
            min={1}
            max={100}
            value={sla ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              setSla(val ? Math.max(1, Math.min(100, parseInt(val, 10))) : null);
            }}
            placeholder="days"
            disabled={isRunning}
            data-testid="sla-input"
            style={{
              width: 48,
              border: 'none',
              outline: 'none',
              fontSize: 13,
              fontWeight: 400,
              fontFamily: F,
              color: 'var(--col-text-primary)',
              background: 'transparent',
              textAlign: 'center',
            }}
          />
        </div>

        {/* Save */}
        <button
          data-testid="btn-save"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            border: '1px solid var(--col-border-illustrative)',
            borderRadius: '0.375rem',
            background: 'var(--col-background-ui-10)',
            color: 'var(--col-text-primary)',
            fontSize: 13,
            fontWeight: 400,
            cursor: 'pointer',
            fontFamily: F,
          }}
        >
          <FloppyDisk size={14} weight="regular" /> Save
        </button>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Undo — NEW */}
        <button
          onClick={undo}
          disabled={!canUndo}
          data-testid="btn-undo"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            border: '1px solid var(--col-border-illustrative)',
            borderRadius: '0.375rem',
            background: 'var(--col-background-ui-10)',
            color: canUndo ? 'var(--col-text-primary)' : 'var(--col-text-subtle)',
            fontSize: 13,
            fontWeight: 400,
            cursor: canUndo ? 'pointer' : 'not-allowed',
            fontFamily: F,
            opacity: canUndo ? 1 : 0.4,
          }}
        >
          <ArrowCounterClockwise size={14} weight="regular" /> Undo
        </button>

        {/* Refine */}
        <button
          onClick={canRefine ? handleRefine : undefined}
          disabled={!canRefine}
          data-testid="btn-refine"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '7px 20px',
            border: 'none',
            borderRadius: '0.375rem',
            background: !canRefine ? 'var(--col-border-illustrative)' : 'var(--col-background-brand)',
            color: !canRefine ? 'var(--col-text-subtle)' : '#ffffff',
            fontSize: 13,
            fontWeight: 500,
            cursor: !canRefine ? 'not-allowed' : 'pointer',
            fontFamily: F,
            transition: 'background .15s',
          }}
        >
          <Lightning
            size={14}
            weight="fill"
            color={!canRefine ? 'var(--col-text-subtle)' : '#ffffff'}
          />
          Refine
        </button>

        {/* Separator */}
        <div style={{ width: 1, height: 24, background: 'var(--col-border-illustrative)' }} />

        {/* Issues */}
        <button
          onClick={hasGitLabContext ? handleIssues : undefined}
          disabled={!hasGitLabContext}
          data-testid="btn-issues"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            border: '1px solid var(--col-border-illustrative)',
            borderRadius: '0.375rem',
            background: 'var(--col-background-ui-10)',
            color: hasGitLabContext ? 'var(--col-text-primary)' : 'var(--col-text-subtle)',
            fontSize: 13,
            fontWeight: 400,
            cursor: hasGitLabContext ? 'pointer' : 'not-allowed',
            fontFamily: F,
            opacity: hasGitLabContext ? 1 : 0.4,
          }}
        >
          <ListBullets size={14} weight="regular" /> Issues
        </button>

        {/* Publish */}
        <button
          onClick={canPublish ? handlePublish : undefined}
          disabled={!canPublish}
          data-testid="btn-publish"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            border: `1px solid ${canPublish ? 'var(--col-background-brand)' : 'var(--col-border-illustrative)'}`,
            borderRadius: '0.375rem',
            background: 'var(--col-background-ui-10)',
            color: canPublish ? 'var(--col-background-brand)' : 'var(--col-text-subtle)',
            fontSize: 13,
            fontWeight: 500,
            cursor: canPublish ? 'pointer' : 'not-allowed',
            fontFamily: F,
            opacity: canPublish ? 1 : 0.4,
          }}
        >
          <UploadSimple
            size={14}
            weight="regular"
            color={canPublish ? 'var(--col-background-brand)' : 'var(--col-text-subtle)'}
          />
          Publish
        </button>

        {/* Separator */}
        <div style={{ width: 1, height: 24, background: 'var(--col-border-illustrative)' }} />

        {/* Score badge — clickable, opens critique modal */}
        {qualityScore !== null && (
          <div
            data-testid="score-badge"
            onClick={() => openModal('critique')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openModal('critique'); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 400,
              color: 'var(--col-text-subtle)',
              cursor: 'pointer',
              borderRadius: '0.375rem',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--col-border-illustrative, #e5e5e5)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
          >
            <Star
              size={12}
              weight="fill"
              color={
                qualityScore >= 7.0
                  ? '#22c55e'
                  : qualityScore >= 5.0
                    ? '#f59e0b'
                    : '#ef4444'
              }
            />
            <span
              style={{
                color:
                  qualityScore >= 7.0
                    ? '#22c55e'
                    : qualityScore >= 5.0
                      ? '#f59e0b'
                      : '#ef4444',
                fontWeight: 500,
              }}
            >
              {qualityScore.toFixed(1)}
            </span>
          </div>
        )}

        {/* Settings gear */}
        <button
          onClick={handleSettings}
          data-testid="btn-settings"
          style={{
            width: 34,
            height: 34,
            borderRadius: '0.375rem',
            border: '1px solid var(--col-border-illustrative)',
            background: 'var(--col-background-ui-10)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--col-text-subtle)',
          }}
        >
          <GearSix size={15} weight="regular" />
        </button>
      </div>
    </header>
  );
}

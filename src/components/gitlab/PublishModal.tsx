/**
 * PublishModal — Publish to GitLab modal content (T-12.2).
 *
 * Title input, target group select, quality score indicator, and action buttons.
 * Pixel-matches prototype App.tsx lines 496-618.
 */

import { useState } from 'react';
import { useEpicStore } from '@/stores/epicStore';
import { useConfigStore } from '@/stores/configStore';
import { useUiStore } from '@/stores/uiStore';
import { createGitLabEpic } from '@/services/gitlab/gitlabClient';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

export function PublishModal() {
  const markdown = useEpicStore((s) => s.markdown);
  const document = useEpicStore((s) => s.document);
  const config = useConfigStore((s) => s.config);
  const closeModal = useUiStore((s) => s.closeModal);
  const addToast = useUiStore((s) => s.addToast);

  const score = document?.metadata?.qualityScore ?? null;
  const defaultTitle = document?.title || 'Epic';

  const [title, setTitle] = useState(defaultTitle);
  const [targetGroup, setTargetGroup] = useState('pod-alpha');
  const [publishing, setPublishing] = useState(false);

  const handlePublish = async () => {
    setPublishing(true);
    const result = await createGitLabEpic(config.gitlab, {
      title,
      description: markdown,
      group_id: targetGroup,
    });
    setPublishing(false);

    if (result.success) {
      addToast({ type: 'success', title: 'Epic published to GitLab' });
      closeModal();
    } else {
      addToast({ type: 'error', title: result.error ?? 'Failed to publish epic' });
    }
  };

  return (
    <div
      data-testid="publish-modal"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        fontSize: 13,
        fontFamily: F,
      }}
    >
      {/* Title input */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label
          style={{
            fontSize: 12,
            fontWeight: 400,
            color: 'var(--col-text-subtle)',
          }}
        >
          Title
        </label>
        <input
          data-testid="publish-title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '0.375rem',
            border: '1px solid var(--col-border-illustrative)',
            fontSize: 13,
            fontFamily: F,
            fontWeight: 300,
            outline: 'none',
          }}
        />
      </div>

      {/* Target group select */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label
          style={{
            fontSize: 12,
            fontWeight: 400,
            color: 'var(--col-text-subtle)',
          }}
        >
          Target group
        </label>
        <select
          data-testid="publish-target-group"
          value={targetGroup}
          onChange={(e) => setTargetGroup(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '0.375rem',
            border: '1px solid var(--col-border-illustrative)',
            fontSize: 13,
            fontFamily: F,
            fontWeight: 300,
          }}
        >
          <option value="pod-alpha">pod-alpha</option>
          <option value="crew-platform">crew-platform</option>
        </select>
      </div>

      {/* Quality score indicator */}
      {score !== null && (
        <div
          data-testid="quality-score-indicator"
          style={{
            padding: '10px 16px',
            borderRadius: '0.375rem',
            borderLeft: `4px solid ${score >= 7 ? '#22c55e' : 'var(--col-background-brand)'}`,
            background: score >= 7 ? '#f0fdf4' : 'var(--input-background)',
            fontSize: 12,
            fontWeight: 300,
            color: score >= 7 ? '#166534' : 'var(--col-text-subtle)',
          }}
        >
          Quality score: <strong>{score.toFixed(1)}/10</strong> {'\u2014'}{' '}
          {score >= 7 ? 'Ready to publish' : 'Consider refining'}
        </div>
      )}

      {/* Action buttons */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          justifyContent: 'flex-end',
          marginTop: 4,
        }}
      >
        <button
          data-testid="publish-cancel-btn"
          onClick={closeModal}
          style={{
            padding: '7px 18px',
            border: '1px solid var(--col-border-illustrative)',
            borderRadius: '0.375rem',
            background: 'var(--col-background-ui-10)',
            fontSize: 13,
            fontWeight: 400,
            cursor: 'pointer',
            fontFamily: F,
          }}
        >
          Cancel
        </button>
        <button
          data-testid="publish-btn"
          onClick={handlePublish}
          disabled={publishing}
          style={{
            padding: '7px 18px',
            border: 'none',
            borderRadius: '0.375rem',
            background: 'var(--col-background-brand)',
            color: 'var(--col-text-inverted)',
            fontSize: 13,
            fontWeight: 500,
            cursor: publishing ? 'not-allowed' : 'pointer',
            fontFamily: F,
            opacity: publishing ? 0.7 : 1,
          }}
        >
          {publishing ? 'Publishing...' : 'Publish'}
        </button>
      </div>
    </div>
  );
}

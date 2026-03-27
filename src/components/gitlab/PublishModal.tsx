/**
 * PublishModal — Publish or update epic to/in GitLab (T-12.2).
 *
 * - If user loaded an epic from GitLab → shows "Update" to save changes back
 * - If user created a new epic → shows "Publish" to create in GitLab
 * - Fetches real subgroups for target group selection
 * - Sets loadedEpicContext after publish so Issues button activates
 */

import { useState, useEffect } from 'react';
import { useEpicStore } from '@/stores/epicStore';
import { useConfigStore } from '@/stores/configStore';
import { useGitlabStore } from '@/stores/gitlabStore';
import { useUiStore } from '@/stores/uiStore';
import {
  createGitLabEpic,
  updateGitLabEpic,
  fetchGitLabSubgroups,
  fetchGroupEpics,
} from '@/services/gitlab/gitlabClient';
import type { GitLabSubgroup, GitLabEpic } from '@/services/gitlab/types';
import { stripRequirementTags } from '@/domain/epicSerializer';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

export function PublishModal() {
  const markdown = useEpicStore((s) => s.markdown);
  const document = useEpicStore((s) => s.document);
  const config = useConfigStore((s) => s.config);
  const closeModal = useUiStore((s) => s.closeModal);
  const addToast = useUiStore((s) => s.addToast);

  // Detect if updating an existing loaded epic
  const loadedEpicIid = useGitlabStore((s) => s.loadedEpicIid);
  const loadedGroupId = useGitlabStore((s) => s.loadedGroupId);
  const isUpdate = loadedEpicIid !== null && loadedGroupId !== null;

  // F02: Pod/Crew level
  const publishLevel = useGitlabStore((s) => s.publishLevel);
  const setPublishLevel = useGitlabStore((s) => s.setPublishLevel);

  const score = document?.metadata?.qualityScore ?? null;
  const defaultTitle = document?.title || 'Epic';

  const [title, setTitle] = useState(defaultTitle);
  const [targetGroup, setTargetGroup] = useState(config.gitlab.rootGroupId || '');
  const [subgroups, setSubgroups] = useState<GitLabSubgroup[]>([]);
  const [parentEpics, setParentEpics] = useState<GitLabEpic[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<number | undefined>(undefined);
  const [publishing, setPublishing] = useState(false);
  const [loadingGroups, setLoadingGroups] = useState(false);

  // Fetch real subgroups on mount
  useEffect(() => {
    if (!config.gitlab.enabled || !config.gitlab.rootGroupId) return;
    let cancelled = false;
    setLoadingGroups(true);

    fetchGitLabSubgroups(config.gitlab, config.gitlab.rootGroupId).then((result) => {
      if (cancelled) return;
      setLoadingGroups(false);
      if (result.success && result.data) {
        setSubgroups(result.data);
      }
    });

    return () => { cancelled = true; };
  }, [config.gitlab]);

  // F01: Fetch parent epic candidates when target group changes
  useEffect(() => {
    if (!config.gitlab.enabled || !targetGroup || isUpdate) return;
    let cancelled = false;

    fetchGroupEpics(config.gitlab, targetGroup, { per_page: 50 }).then((result) => {
      if (cancelled) return;
      if (result.success && result.data) {
        setParentEpics(result.data);
      }
    });

    return () => { cancelled = true; };
  }, [config.gitlab, targetGroup, isUpdate]);

  const handlePublish = async () => {
    setPublishing(true);

    if (isUpdate) {
      // Update existing epic
      const result = await updateGitLabEpic(
        config.gitlab,
        loadedGroupId!,
        loadedEpicIid!,
        { title, description: stripRequirementTags(markdown) },
      );
      setPublishing(false);

      if (result.success && result.data) {
        // F12: Invalidate cache so Load modal shows fresh data
        useGitlabStore.getState().invalidateGroupCache(loadedGroupId!);
        addToast({ type: 'success', title: `Epic #${loadedEpicIid} updated in GitLab` });
        closeModal();
      } else {
        addToast({ type: 'error', title: result.error ?? 'Failed to update epic' });
      }
    } else {
      // Create new epic — F02: crew targets rootGroupId, pod targets selected subgroup
      const effectiveGroup = publishLevel === 'crew' ? config.gitlab.rootGroupId : targetGroup;
      const levelLabel = publishLevel === 'crew' ? 'crew-level' : 'pod-level';
      const result = await createGitLabEpic(config.gitlab, {
        title,
        description: stripRequirementTags(markdown),
        group_id: effectiveGroup,
        labels: [levelLabel],
        parent_id: selectedParentId,
      });
      setPublishing(false);

      if (result.success && result.data) {
        // Set GitLab context so Issues button activates
        useGitlabStore.getState().setLoadedEpicContext(
          result.data.iid,
          String(result.data.group_id || targetGroup),
        );
        // F12: Invalidate cache so Load modal shows fresh data
        useGitlabStore.getState().invalidateGroupCache(targetGroup);
        addToast({ type: 'success', title: 'Epic published to GitLab' });
        closeModal();
      } else {
        addToast({ type: 'error', title: result.error ?? 'Failed to publish epic' });
      }
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
      {/* F02: Pod/Crew level toggle — only for NEW epics */}
      {!isUpdate && (
        <div style={{ display: 'flex', gap: 0, borderRadius: '0.375rem', overflow: 'hidden', border: '1px solid var(--col-border-illustrative)' }}>
          {(['pod', 'crew'] as const).map((level) => (
            <button
              key={level}
              onClick={() => setPublishLevel(level)}
              data-testid={`level-${level}`}
              style={{
                flex: 1,
                padding: '8px 16px',
                border: 'none',
                background: publishLevel === level ? '#E60000' : 'var(--col-background-ui-10)',
                color: publishLevel === level ? '#fff' : 'var(--col-text-subtle)',
                fontSize: 13,
                fontWeight: publishLevel === level ? 500 : 300,
                fontFamily: F,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {level === 'pod' ? 'Pod Level' : 'Crew Level'}
            </button>
          ))}
        </div>
      )}

      {/* Update banner — when editing a loaded epic */}
      {isUpdate && (
        <div
          style={{
            padding: '10px 16px',
            borderRadius: '0.375rem',
            borderLeft: '4px solid #0072B2',
            background: '#F0F9FF',
            fontSize: 12,
            fontWeight: 300,
            color: 'var(--col-text-primary)',
          }}
        >
          Updating epic <strong>#{loadedEpicIid}</strong> in GitLab
        </div>
      )}

      {/* Title input */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <label style={{ fontSize: 12, fontWeight: 400, color: 'var(--col-text-subtle)' }}>
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
            background: 'var(--input-background)',
          }}
        />
      </div>

      {/* Target group select — only for NEW pod-level epics (crew always targets root) */}
      {!isUpdate && publishLevel === 'pod' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 12, fontWeight: 400, color: 'var(--col-text-subtle)' }}>
            Target group
          </label>
          <select
            data-testid="publish-target-group"
            value={targetGroup}
            onChange={(e) => setTargetGroup(e.target.value)}
            disabled={loadingGroups}
            style={{
              padding: '8px 12px',
              borderRadius: '0.375rem',
              border: '1px solid var(--col-border-illustrative)',
              fontSize: 13,
              fontFamily: F,
              fontWeight: 300,
              background: 'var(--input-background)',
            }}
          >
            <option value={config.gitlab.rootGroupId}>
              {config.gitlab.rootGroupId} (root)
            </option>
            {subgroups.map((sg) => (
              <option key={sg.id} value={sg.id}>
                {sg.full_path || sg.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* F01: Parent epic dropdown — only for NEW epics */}
      {!isUpdate && parentEpics.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 12, fontWeight: 400, color: 'var(--col-text-subtle)' }}>
            Parent epic (optional)
          </label>
          <select
            data-testid="publish-parent-epic"
            value={selectedParentId ?? ''}
            onChange={(e) => setSelectedParentId(e.target.value ? Number(e.target.value) : undefined)}
            style={{
              padding: '8px 12px',
              borderRadius: '0.375rem',
              border: '1px solid var(--col-border-illustrative)',
              fontSize: 13,
              fontFamily: F,
              fontWeight: 300,
              background: 'var(--input-background)',
            }}
          >
            <option value="">None (top-level epic)</option>
            {parentEpics.map((ep) => (
              <option key={ep.id} value={ep.id}>
                {ep.title} (#{ep.iid})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Quality score indicator */}
      {score !== null && (
        <div
          data-testid="quality-score-indicator"
          style={{
            padding: '10px 16px',
            borderRadius: '0.375rem',
            borderLeft: `4px solid ${score >= 7 ? '#5A5D5C' : 'var(--col-background-brand)'}`,
            background: score >= 7 ? '#F5F0E1' : 'var(--input-background)',
            fontSize: 12,
            fontWeight: 300,
            color: score >= 7 ? 'var(--col-text-primary)' : 'var(--col-text-subtle)',
          }}
        >
          Quality score: <strong>{score.toFixed(1)}/10</strong> {'\u2014'}{' '}
          {score >= 7 ? 'Ready to publish' : 'Consider refining'}
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
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
          {publishing
            ? (isUpdate ? 'Updating...' : 'Publishing...')
            : (isUpdate ? 'Update Epic' : 'Publish')}
        </button>
      </div>
    </div>
  );
}

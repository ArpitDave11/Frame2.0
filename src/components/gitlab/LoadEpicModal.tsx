/**
 * LoadEpicModal — Full load modal content (T-12.1).
 *
 * Search + list of GitLab epics. Click to load description into editor.
 * Pixel-matches prototype App.tsx lines 430-488.
 */

import { useState, useEffect, useCallback } from 'react';
import { useConfigStore } from '@/stores/configStore';
import { useEpicStore } from '@/stores/epicStore';
import { useGitlabStore } from '@/stores/gitlabStore';
import { useUiStore } from '@/stores/uiStore';
import { fetchGroupEpics, fetchEpicDetails } from '@/services/gitlab/gitlabClient';
import type { GitLabEpic } from '@/services/gitlab/types';
import { EpicCard } from './EpicCard';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

export function LoadEpicModal() {
  const config = useConfigStore((s) => s.config);
  const setMarkdown = useEpicStore((s) => s.setMarkdown);
  const closeModal = useUiStore((s) => s.closeModal);
  const addToast = useUiStore((s) => s.addToast);
  const setActiveView = useUiStore((s) => s.setActiveView);

  const [epics, setEpics] = useState<GitLabEpic[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const gitlabConfigured = config.gitlab.enabled && !!config.gitlab.rootGroupId;

  // Fetch epics on mount when GitLab is configured
  useEffect(() => {
    if (!gitlabConfigured) return;

    let cancelled = false;
    setLoading(true);

    fetchGroupEpics(config.gitlab, config.gitlab.rootGroupId, { include_descendant_groups: true }).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.success && result.data) {
        setEpics(result.data);
      } else {
        addToast({ type: 'error', title: result.error ?? 'Failed to fetch epics' });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [gitlabConfigured, config.gitlab, addToast]);

  const handleEpicClick = useCallback(
    async (epic: GitLabEpic) => {
      setLoading(true);
      const result = await fetchEpicDetails(config.gitlab, String(epic.group_id || config.gitlab.rootGroupId), epic.iid);
      setLoading(false);

      if (result.success && result.data) {
        setMarkdown(result.data.description ?? '');
        useGitlabStore.getState().setLoadedEpicContext(epic.iid, String(epic.group_id || config.gitlab.rootGroupId));
        closeModal();
        setActiveView('workspace');
        addToast({ type: 'success', title: `Loaded epic: ${epic.title}` });
      } else {
        addToast({ type: 'error', title: result.error ?? 'Failed to load epic details' });
      }
    },
    [config.gitlab, setMarkdown, closeModal, setActiveView, addToast],
  );

  // Not configured state
  if (!gitlabConfigured) {
    return (
      <div
        data-testid="gitlab-not-configured"
        style={{
          padding: '24px 16px',
          fontSize: 13,
          fontFamily: F,
          fontWeight: 300,
          color: 'var(--col-text-subtle)',
          textAlign: 'center',
        }}
      >
        Configure GitLab in Settings to load epics
      </div>
    );
  }

  // Client-side filter by search term
  const filtered = search.trim()
    ? epics.filter((e) => e.title.toLowerCase().includes(search.toLowerCase()))
    : epics;

  return (
    <div data-testid="load-epic-modal" style={{ fontFamily: F }}>
      <input
        data-testid="epic-search-input"
        placeholder="Search epics..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: '100%',
          padding: '9px 14px',
          borderRadius: '0.375rem',
          border: '1px solid var(--col-border-illustrative)',
          fontSize: 13,
          fontFamily: F,
          fontWeight: 300,
          marginBottom: 16,
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />

      {loading && (
        <div
          data-testid="loading-indicator"
          style={{
            padding: '16px',
            fontSize: 13,
            fontWeight: 300,
            color: 'var(--col-text-subtle)',
            textAlign: 'center',
          }}
        >
          Loading epics...
        </div>
      )}

      {!loading &&
        filtered.map((epic) => (
          <EpicCard
            key={epic.id}
            title={epic.title}
            iid={epic.iid}
            state={epic.state}
            onClick={() => handleEpicClick(epic)}
          />
        ))}

      {!loading && filtered.length === 0 && epics.length > 0 && (
        <div
          style={{
            padding: '16px',
            fontSize: 13,
            fontWeight: 300,
            color: 'var(--col-text-subtle)',
            textAlign: 'center',
          }}
        >
          No epics match your search
        </div>
      )}
    </div>
  );
}

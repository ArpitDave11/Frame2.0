/**
 * LoadEpicModal — GitLab epic browser with V4-parity navigation.
 *
 * Feature Spec: F03 (Epic Loading & Browsing with Group Context)
 * - Breadcrumb navigation (clickable path segments)
 * - Subgroup dropdown (one-shot navigation)
 * - Include descendants toggle (with cache invalidation per F12)
 * - Group name displayed per epic when descendants shown (V4-BUG-03 prevention)
 * - Cache-first fetching (5-minute TTL per F12)
 * - Correct group_id on load (V4-BUG-05 prevention: never IID alone)
 */

import { useState, useEffect, useCallback } from 'react';
import { useConfigStore } from '@/stores/configStore';
import { useEpicStore } from '@/stores/epicStore';
import { useGitlabStore, resolveGroupName } from '@/stores/gitlabStore';
import { useUiStore } from '@/stores/uiStore';
import { fetchEpicDetails } from '@/services/gitlab/gitlabClient';
import type { GitLabEpic } from '@/services/gitlab/types';
import { EpicCard } from './EpicCard';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

export function LoadEpicModal() {
  const config = useConfigStore((s) => s.config);
  const setMarkdown = useEpicStore((s) => s.setMarkdown);
  const closeModal = useUiStore((s) => s.closeModal);
  const addToast = useUiStore((s) => s.addToast);
  const setActiveView = useUiStore((s) => s.setActiveView);

  // Store-driven navigation (V4 parity)
  const epics = useGitlabStore((s) => s.epics);
  const breadcrumb = useGitlabStore((s) => s.breadcrumb);
  const currentGroupId = useGitlabStore((s) => s.currentGroupId);
  const groupCache = useGitlabStore((s) => s.groupCache);
  const loadingNavigation = useGitlabStore((s) => s.loadingNavigation);
  const includeDescendants = useGitlabStore((s) => s.includeDescendants);
  const navigateToGroup = useGitlabStore((s) => s.navigateToGroup);
  const navigateToBreadcrumb = useGitlabStore((s) => s.navigateToBreadcrumb);
  const setIncludeDescendants = useGitlabStore((s) => s.setIncludeDescendants);

  const [search, setSearch] = useState('');
  const [loadingEpic, setLoadingEpic] = useState(false);

  const gitlabConfigured = config.gitlab.enabled && !!config.gitlab.rootGroupId;

  // Navigate to root group on mount
  useEffect(() => {
    if (!gitlabConfigured) return;
    navigateToGroup(config.gitlab.rootGroupId);
  }, [gitlabConfigured, config.gitlab.rootGroupId, navigateToGroup]);

  // Subgroups from cache
  const cachedEntry = currentGroupId ? groupCache[currentGroupId] : undefined;
  const subgroups = cachedEntry?.subgroups ?? [];

  // F11 (ID Safety): Use epic.group_id, NEVER rootGroupId alone
  const handleEpicClick = useCallback(
    async (epic: GitLabEpic) => {
      setLoadingEpic(true);
      const epicGroupId = String(epic.group_id || config.gitlab.rootGroupId);
      const result = await fetchEpicDetails(config.gitlab, epicGroupId, epic.iid);
      setLoadingEpic(false);

      if (result.success && result.data) {
        setMarkdown(result.data.description ?? '');
        useGitlabStore.getState().setLoadedEpicContext(epic.iid, epicGroupId);
        closeModal();
        setActiveView('workspace');
        addToast({ type: 'success', title: `Loaded: ${epic.title}` });
      } else {
        addToast({ type: 'error', title: result.error ?? 'Failed to load epic' });
      }
    },
    [config.gitlab, setMarkdown, closeModal, setActiveView, addToast],
  );

  // Not configured
  if (!gitlabConfigured) {
    return (
      <div data-testid="gitlab-not-configured" style={{
        padding: '24px 16px', fontSize: 13, fontFamily: F,
        fontWeight: 300, color: 'var(--col-text-subtle)', textAlign: 'center',
      }}>
        Configure GitLab in Settings to load epics
      </div>
    );
  }

  // Client-side search filter
  const filtered = search.trim()
    ? epics.filter((e) => e.title.toLowerCase().includes(search.toLowerCase()))
    : epics;

  return (
    <div data-testid="load-epic-modal" style={{ fontFamily: F }}>

      {/* Breadcrumb (V4 parity) */}
      {breadcrumb.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16,
          padding: '10px 14px', backgroundColor: '#ECEBE4',
          borderRadius: 6, fontSize: 13, flexWrap: 'wrap',
          border: '1px solid var(--col-border-illustrative)',
        }}>
          <span style={{ color: 'var(--col-text-subtle)', fontWeight: 600 }}>Groups:</span>
          {breadcrumb.map((item, index) => (
            <span key={index} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {index > 0 && <span style={{ color: 'var(--col-text-subtle)' }}>/</span>}
              <button
                onClick={() => item.id && navigateToBreadcrumb(index)}
                disabled={!item.id || loadingNavigation || index === breadcrumb.length - 1}
                style={{
                  background: 'none', border: 'none', padding: '2px 6px',
                  color: index === breadcrumb.length - 1 ? 'var(--col-text-primary)' : '#E60000',
                  fontWeight: index === breadcrumb.length - 1 ? 600 : 500,
                  cursor: item.id && !loadingNavigation && index !== breadcrumb.length - 1 ? 'pointer' : 'default',
                  borderRadius: 4, fontFamily: F, fontSize: 13,
                }}
              >
                {item.name}
              </button>
            </span>
          ))}
          {loadingNavigation && (
            <span style={{ marginLeft: 8, color: 'var(--col-text-subtle)', fontStyle: 'italic' }}>Loading...</span>
          )}
        </div>
      )}

      {/* Subgroup Dropdown (V4 parity: one-shot navigation) */}
      {subgroups.length > 0 && (
        <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--col-text-primary)' }}>
            Navigate to Subgroup:
          </label>
          <select
            value=""
            onChange={(e) => { if (e.target.value) navigateToGroup(e.target.value); }}
            disabled={loadingNavigation}
            style={{
              flex: 1, maxWidth: 320, padding: '8px 12px', borderRadius: '0.375rem',
              border: '1px solid var(--col-border-illustrative)', fontSize: 13,
              fontFamily: F, fontWeight: 300,
              cursor: loadingNavigation ? 'not-allowed' : 'pointer',
            }}
          >
            <option value="">Select a subgroup ({subgroups.length} available)</option>
            {subgroups.map((sg) => (
              <option key={sg.id} value={String(sg.id)}>{sg.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Include Descendants Toggle (F12: cache invalidation on toggle) */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
        padding: '10px 14px', backgroundColor: '#ECEBE4',
        borderRadius: 6, border: '1px solid var(--col-border-illustrative)',
      }}>
        <label style={{
          display: 'flex', alignItems: 'center', gap: 10,
          cursor: 'pointer', fontSize: 13, fontWeight: 500, color: 'var(--col-text-primary)',
        }}>
          <input
            type="checkbox"
            checked={includeDescendants}
            onChange={(e) => setIncludeDescendants(e.target.checked)}
            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#E60000' }}
          />
          <span>Include epics from subgroups</span>
        </label>
      </div>

      {/* Search */}
      <input
        data-testid="epic-search-input"
        placeholder="Search epics by title..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: '100%', padding: '9px 14px', borderRadius: '0.375rem',
          border: '1px solid var(--col-border-illustrative)', fontSize: 13,
          fontFamily: F, fontWeight: 300, marginBottom: 16,
          outline: 'none', boxSizing: 'border-box',
        }}
      />

      {/* Loading */}
      {(loadingNavigation || loadingEpic) && (
        <div data-testid="loading-indicator" style={{
          padding: 16, fontSize: 13, fontWeight: 300,
          color: 'var(--col-text-subtle)', textAlign: 'center',
        }}>
          {loadingEpic ? 'Loading epic...' : 'Loading group...'}
        </div>
      )}

      {/* Epic List (F03: show group name when descendants enabled) */}
      {!loadingNavigation &&
        filtered.map((epic) => (
          <EpicCard
            key={epic.id}
            title={epic.title}
            iid={epic.iid}
            state={epic.state}
            groupName={includeDescendants ? resolveGroupName(epic, groupCache) : undefined}
            onClick={() => handleEpicClick(epic)}
          />
        ))}

      {/* Empty States */}
      {!loadingNavigation && filtered.length === 0 && epics.length > 0 && (
        <div style={{
          padding: 16, fontSize: 13, fontWeight: 300,
          color: 'var(--col-text-subtle)', textAlign: 'center',
        }}>
          No epics match your search
        </div>
      )}

      {!loadingNavigation && epics.length === 0 && !loadingEpic && (
        <div style={{
          padding: 16, fontSize: 13, fontWeight: 300,
          color: 'var(--col-text-subtle)', textAlign: 'center',
        }}>
          No epics found in this group
        </div>
      )}
    </div>
  );
}

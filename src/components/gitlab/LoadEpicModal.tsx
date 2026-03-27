/**
 * LoadEpicModal — GitLab epic browser with V4-parity navigation.
 *
 * Two modes:
 * - BROWSE: navigateToGroup with per_page:100, cached, breadcrumb nav
 * - SEARCH: server-side search across ALL subgroups (include_descendant_groups)
 *
 * Features: breadcrumb, subgroup dropdown, state filter, server-side search,
 * include descendants toggle, group names, "X of Y" count.
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

  // Browse state
  const browseEpics = useGitlabStore((s) => s.epics);
  const breadcrumb = useGitlabStore((s) => s.breadcrumb);
  const currentGroupId = useGitlabStore((s) => s.currentGroupId);
  const groupCache = useGitlabStore((s) => s.groupCache);
  const loadingNavigation = useGitlabStore((s) => s.loadingNavigation);
  const includeDescendants = useGitlabStore((s) => s.includeDescendants);
  const browseTotalCount = useGitlabStore((s) => s.browseTotalCount);
  const navigateToGroup = useGitlabStore((s) => s.navigateToGroup);
  const navigateToBreadcrumb = useGitlabStore((s) => s.navigateToBreadcrumb);
  const setIncludeDescendants = useGitlabStore((s) => s.setIncludeDescendants);

  // Search state
  const searchResults = useGitlabStore((s) => s.searchResults);
  const searchTotalCount = useGitlabStore((s) => s.searchTotalCount);
  const isSearching = useGitlabStore((s) => s.isSearching);
  const searchActive = useGitlabStore((s) => s.searchActive);
  const searchEpics = useGitlabStore((s) => s.searchEpics);
  const clearSearch = useGitlabStore((s) => s.clearSearch);

  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<'opened' | 'closed' | 'all'>('opened');
  const [loadingEpic, setLoadingEpic] = useState(false);

  const gitlabConfigured = config.gitlab.enabled && !!config.gitlab.rootGroupId;

  // Navigate to root on mount
  useEffect(() => {
    if (!gitlabConfigured) return;
    navigateToGroup(config.gitlab.rootGroupId);
  }, [gitlabConfigured, config.gitlab.rootGroupId, navigateToGroup]);

  const cachedEntry = currentGroupId ? groupCache[currentGroupId] : undefined;
  const subgroups = cachedEntry?.subgroups ?? [];

  // Server-side search handler
  const handleSearch = useCallback(() => {
    if (!search.trim()) { clearSearch(); return; }
    searchEpics(search.trim(), stateFilter);
  }, [search, stateFilter, searchEpics, clearSearch]);

  const handleSearchClear = useCallback(() => {
    setSearch('');
    clearSearch();
  }, [clearSearch]);

  // Which epics to display
  const displayEpics = searchActive ? searchResults : browseEpics;
  const displayTotal = searchActive ? searchTotalCount : browseTotalCount;
  const isLoading = loadingNavigation || isSearching;

  // Load epic handler
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

  return (
    <div data-testid="load-epic-modal" style={{ fontFamily: F }}>

      {/* Breadcrumb */}
      {breadcrumb.length > 0 && !searchActive && (
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

      {/* Subgroup Dropdown — hide during search */}
      {subgroups.length > 0 && !searchActive && (
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

      {/* Include Descendants Toggle — hide during search */}
      {!searchActive && (
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
      )}

      {/* Search bar + State filter + Search button */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {/* State filter */}
        <select
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value as 'opened' | 'closed' | 'all')}
          data-testid="epic-state-filter"
          style={{
            padding: '9px 12px', borderRadius: '0.375rem',
            border: '1px solid var(--col-border-illustrative)', fontSize: 13,
            fontFamily: F, fontWeight: 300, cursor: 'pointer',
            minWidth: 90,
          }}
        >
          <option value="opened">Opened</option>
          <option value="closed">Closed</option>
          <option value="all">All</option>
        </select>

        {/* Search input */}
        <input
          data-testid="epic-search-input"
          placeholder="Search epics across all subgroups..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
          style={{
            flex: 1, padding: '9px 14px', borderRadius: '0.375rem',
            border: '1px solid var(--col-border-illustrative)', fontSize: 13,
            fontFamily: F, fontWeight: 300, outline: 'none', boxSizing: 'border-box',
          }}
        />

        {/* Search button */}
        <button
          onClick={handleSearch}
          disabled={isSearching}
          data-testid="epic-search-btn"
          style={{
            padding: '9px 18px', borderRadius: '0.375rem', border: 'none',
            background: '#E60000', color: '#fff', fontSize: 13,
            fontFamily: F, fontWeight: 500, cursor: isSearching ? 'not-allowed' : 'pointer',
            opacity: isSearching ? 0.7 : 1, whiteSpace: 'nowrap',
          }}
        >
          {isSearching ? 'Searching...' : 'Search'}
        </button>

        {/* Clear button — only when search active */}
        {searchActive && (
          <button
            onClick={handleSearchClear}
            data-testid="epic-search-clear"
            style={{
              padding: '9px 14px', borderRadius: '0.375rem',
              border: '1px solid var(--col-border-illustrative)',
              background: 'var(--col-background-ui-10)', fontSize: 13,
              fontFamily: F, fontWeight: 400, cursor: 'pointer',
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Count display */}
      <div style={{
        fontSize: 12, fontWeight: 300, color: 'var(--col-text-subtle)',
        marginBottom: 12, fontFamily: F,
      }}>
        {searchActive
          ? `Search results: showing ${displayEpics.length} of ${displayTotal} epics`
          : `Showing ${displayEpics.length}${displayTotal > displayEpics.length ? ` of ${displayTotal}` : ''} epics`
        }
      </div>

      {/* Loading */}
      {(isLoading || loadingEpic) && (
        <div data-testid="loading-indicator" style={{
          padding: 16, fontSize: 13, fontWeight: 300,
          color: 'var(--col-text-subtle)', textAlign: 'center',
        }}>
          {loadingEpic ? 'Loading epic...' : isSearching ? 'Searching across all subgroups...' : 'Loading group...'}
        </div>
      )}

      {/* Epic List */}
      {!isLoading &&
        displayEpics.map((epic) => (
          <EpicCard
            key={epic.id}
            title={epic.title}
            iid={epic.iid}
            state={epic.state}
            groupName={(searchActive || includeDescendants) ? resolveGroupName(epic, groupCache) : undefined}
            onClick={() => handleEpicClick(epic)}
          />
        ))}

      {/* Empty States */}
      {!isLoading && displayEpics.length === 0 && !loadingEpic && (
        <div style={{
          padding: 16, fontSize: 13, fontWeight: 300,
          color: 'var(--col-text-subtle)', textAlign: 'center',
        }}>
          {searchActive ? 'No epics match your search' : 'No epics found in this group'}
        </div>
      )}
    </div>
  );
}

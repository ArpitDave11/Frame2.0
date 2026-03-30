/**
 * IssueManagerView — Issue Manager with user-scoped sprint view.
 *
 * Default: shows logged-in user's issues for current iteration.
 * Tabs: "My Sprint" (user-scoped) | "Linked Issues" (epic-scoped, legacy)
 * User search: unified bar with current user chip + autocomplete.
 */

import { useState, useEffect, useCallback } from 'react';
import { IssueList } from './IssueList';
import { IssueDetail } from './IssueDetail';
import { F } from './types';
import { useGitlabStore } from '@/stores/gitlabStore';
import { useUiStore } from '@/stores/uiStore';
import { useConfigStore } from '@/stores/configStore';
import { useAuth } from '@/components/auth';
import { fetchIssuesAction } from '@/actions/fetchIssuesAction';
import {
  fetchCurrentIteration,
  fetchRecentIterations,
  fetchCurrentUser,
  fetchGroupIssues,
  searchGroupMembers,
} from '@/services/gitlab/gitlabClient';
import type { IssueFilter } from './IssueList';
import type { MockIssue } from './types';
import type { GitLabIssue, GitLabIteration, GitLabMember } from '@/services/gitlab/types';

function mapGitLabIssueToMock(issue: GitLabIssue): MockIssue {
  return {
    id: `#${issue.iid}`,
    title: issue.title,
    status: issue.state === 'opened' ? 'in-progress' : 'done',
    priority: 'medium',
    updated: issue.created_at ? new Date(issue.created_at).toLocaleDateString() : '',
    assignee: issue.assignees?.[0]?.name
      ?? (typeof issue.assignee === 'object' ? issue.assignee?.name : issue.assignee)
      ?? 'Unassigned',
    web_url: issue.web_url,
    project_id: issue.project_id,
    iid: issue.iid,
    due_date: issue.due_date,
    time_estimate: issue.time_stats?.time_estimate ?? 0,
    time_spent: issue.time_stats?.total_time_spent ?? 0,
    notes_count: issue.user_notes_count ?? 0,
    weight: issue.weight,
  };
}

function formatIterationLabel(iter: GitLabIteration, currentId: number | null): string {
  const start = new Date(iter.start_date);
  const end = new Date(iter.due_date);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const label = `${fmt(start)} \u2013 ${fmt(end)}`;
  return iter.id === currentId ? `${label} \u00b7 Current` : label;
}

type ViewTab = 'sprint' | 'epic';

export function IssueManagerView() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<IssueFilter>('all');
  const [search, setSearch] = useState('');
  const activeTab = useUiStore((s) => s.issueSubTab);

  // Clear selection when switching views via sidebar
  useEffect(() => { setSelectedId(null); }, [activeTab]);

  // Sprint issues state
  const [sprintIssues, setSprintIssues] = useState<MockIssue[]>([]);
  const [loadingSprint, setLoadingSprint] = useState(false);

  // Iteration dropdown state
  const [iterations, setIterations] = useState<GitLabIteration[]>([]);
  const [selectedIterationId, setSelectedIterationId] = useState<number | null>(null);
  const [currentIterationId, setCurrentIterationId] = useState<number | null>(null);
  const [loadingIterations, setLoadingIterations] = useState(false);

  // User search state
  const [viewingUser, setViewingUser] = useState<{ username: string; name: string } | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userSuggestions, setUserSuggestions] = useState<GitLabMember[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  // Epic issues (legacy view)
  const gitlabIssues = useGitlabStore((s) => s.issues);
  const loadedEpicIid = useGitlabStore((s) => s.loadedEpicIid);
  const loadedGroupId = useGitlabStore((s) => s.loadedGroupId);

  const config = useConfigStore((s) => s.config);
  const isConfigured = config.gitlab.enabled;
  const { user: authUser } = useAuth();

  // Resolve actual GitLab username via GET /user (email prefix ≠ GitLab username)
  const [gitlabUsername, setGitlabUsername] = useState<string | null>(null);

  useEffect(() => {
    if (gitlabUsername || viewingUser) return;
    if (isConfigured) {
      fetchCurrentUser(config.gitlab).then((result) => {
        if (result.success && result.data) {
          setGitlabUsername(result.data.username);
          setViewingUser({ username: result.data.username, name: result.data.name });
        } else {
          const fallback = authUser?.email?.split('@')[0] ?? 'me';
          setGitlabUsername(fallback);
          setViewingUser({ username: fallback, name: authUser?.name ?? 'Me' });
          console.warn('[Issue Manager] GET /user failed, using email prefix as fallback:', result.error);
        }
      });
    } else if (authUser) {
      // GitLab not configured — use auth user for display
      const fallback = authUser.email?.split('@')[0] ?? 'me';
      setGitlabUsername(fallback);
      setViewingUser({ username: fallback, name: authUser.name });
    }
  }, [isConfigured, config.gitlab, authUser, gitlabUsername, viewingUser]);

  // Fetch recent iterations for dropdown
  useEffect(() => {
    if (!isConfigured || !config.gitlab.rootGroupId) return;
    setLoadingIterations(true);
    Promise.all([
      fetchRecentIterations(config.gitlab, config.gitlab.rootGroupId),
      fetchCurrentIteration(config.gitlab, config.gitlab.rootGroupId),
    ]).then(([recentResult, currentResult]) => {
      if (recentResult.success && recentResult.data) {
        setIterations(recentResult.data);
      }
      const currentId = currentResult.data?.[0]?.id ?? null;
      setCurrentIterationId(currentId);
      setSelectedIterationId(currentId);
    }).finally(() => setLoadingIterations(false));
  }, [isConfigured, config.gitlab]);

  // Fetch sprint issues for the viewing user
  const fetchSprintIssues = useCallback(async (username: string) => {
    if (!isConfigured || !config.gitlab.rootGroupId) return;
    setLoadingSprint(true);

    try {
      const issuesResult = await fetchGroupIssues(config.gitlab, config.gitlab.rootGroupId, {
        assignee_username: username,
        iteration_id: selectedIterationId ?? undefined,
        per_page: 100,
      });

      if (issuesResult.success && issuesResult.data) {
        setSprintIssues(issuesResult.data.map(mapGitLabIssueToMock));
      }
    } catch (err) {
      console.error('[Issue Manager] Sprint fetch failed:', err);
    } finally {
      setLoadingSprint(false);
    }
  }, [isConfigured, config.gitlab, selectedIterationId]);

  // Fetch on mount and when viewing user changes
  useEffect(() => {
    if (viewingUser && activeTab === 'sprint') {
      fetchSprintIssues(viewingUser.username);
    }
  }, [viewingUser, activeTab, fetchSprintIssues]);

  // Epic issues loading state
  const [loadingEpicIssues, setLoadingEpicIssues] = useState(false);

  // Fetch epic issues when tab switches to epic
  useEffect(() => {
    if (activeTab === 'epic' && isConfigured && loadedEpicIid && loadedGroupId) {
      setLoadingEpicIssues(true);
      fetchIssuesAction().finally(() => setLoadingEpicIssues(false));
    }
  }, [activeTab, isConfigured, loadedEpicIid, loadedGroupId]);

  // User search debounce
  useEffect(() => {
    if (!userSearch.trim() || !isConfigured || !config.gitlab.rootGroupId) {
      setUserSuggestions([]);
      setShowUserDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      setLoadingUsers(true);
      const result = await searchGroupMembers(config.gitlab, config.gitlab.rootGroupId, userSearch.trim());
      setLoadingUsers(false);
      if (result.success && result.data) {
        setUserSuggestions(result.data);
        setShowUserDropdown(true);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch, isConfigured, config.gitlab]);

  // Determine which issues to show (no mock fallback — show real data or empty)
  const epicIssues: MockIssue[] = gitlabIssues.map(mapGitLabIssueToMock);
  const displayIssues = activeTab === 'sprint' ? sprintIssues : epicIssues;

  // Auto-select first issue
  useEffect(() => {
    if (displayIssues.length > 0 && !selectedId) {
      setSelectedId(displayIssues[0]!.id);
    }
  }, [displayIssues, selectedId]);

  // Server-side search: re-fetch sprint issues when search changes (debounced)
  useEffect(() => {
    if (activeTab !== 'sprint' || !viewingUser || !isConfigured || !config.gitlab.rootGroupId) return;
    const timer = setTimeout(() => {
      const trimmed = search.trim();
      if (trimmed.length >= 2) {
        setLoadingSprint(true);
        fetchGroupIssues(config.gitlab, config.gitlab.rootGroupId, {
          assignee_username: viewingUser.username,
          iteration_id: selectedIterationId ?? undefined,
          search: trimmed,
          per_page: 50,
        }).then((result) => {
          if (result.success && result.data) setSprintIssues(result.data.map(mapGitLabIssueToMock));
        }).finally(() => setLoadingSprint(false));
      } else if (trimmed.length === 0) {
        // Empty search: re-fetch normal sprint
        fetchSprintIssues(viewingUser.username);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [search, activeTab, viewingUser, isConfigured, config.gitlab, fetchSprintIssues, selectedIterationId]);

  // Client-side filter (status filter + local text search for epic tab)
  const filtered = displayIssues.filter((issue) => {
    // For epic tab, apply client-side text search (sprint tab uses server-side)
    if (activeTab === 'epic') {
      const q = search.toLowerCase();
      if (q && !issue.title.toLowerCase().includes(q) && !issue.id.toLowerCase().includes(q)) return false;
    }
    switch (filter) {
      case 'active': return issue.status === 'in-progress' || issue.status === 'review';
      case 'blocked': return issue.status === 'blocked';
      default: return true;
    }
  });

  const selectedIssue = displayIssues.find((i) => i.id === selectedId) ?? null;

  return (
    <div
      data-testid="issue-manager-view"
      style={{ display: 'flex', flex: 1, overflow: 'hidden', background: '#f7f7f5', flexDirection: 'column' }}
    >
      {/* Tab bar + User search */}
      <div style={{
        padding: '8px 16px',
        background: '#fff',
        borderBottom: '1px solid var(--col-border-illustrative)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
      }}>
        {/* Unified user search bar (sprint tab only) */}
        {activeTab === 'sprint' && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, position: 'relative', marginLeft: 8 }}>
            {/* Current user chip */}
            {viewingUser && (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '3px 10px', borderRadius: 12,
                background: '#ECEBE4', fontSize: 11, fontWeight: 500,
                color: 'var(--col-text-primary)', fontFamily: F, whiteSpace: 'nowrap',
              }}>
                {viewingUser.name}
                <button
                  onClick={() => { setViewingUser(null); setSprintIssues([]); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--col-text-subtle)', padding: 0, lineHeight: 1 }}
                >
                  ×
                </button>
              </span>
            )}

            {/* Search input */}
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="text"
                data-testid="user-search-input"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                onFocus={() => { if (userSuggestions.length > 0) setShowUserDropdown(true); }}
                onBlur={() => setTimeout(() => setShowUserDropdown(false), 200)}
                placeholder={viewingUser ? 'Search another user...' : 'Type username to search...'}
                style={{
                  width: '100%', padding: '5px 10px', borderRadius: 6,
                  border: '1px solid var(--col-border-illustrative)',
                  fontSize: 11, fontFamily: F, fontWeight: 300, outline: 'none',
                }}
              />
              {loadingUsers && (
                <span style={{ position: 'absolute', right: 8, top: 6, fontSize: 10, color: 'var(--col-text-subtle)' }}>...</span>
              )}

              {/* Autocomplete dropdown */}
              {showUserDropdown && userSuggestions.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                  background: '#fff', border: '1px solid var(--col-border-illustrative)',
                  borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  maxHeight: 150, overflowY: 'auto',
                }}>
                  {userSuggestions.map((member) => (
                    <button
                      key={member.id}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setViewingUser({ username: member.username, name: member.name });
                        setUserSearch('');
                        setShowUserDropdown(false);
                        setSelectedId(null);
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        width: '100%', padding: '6px 10px', border: 'none',
                        background: 'transparent', cursor: 'pointer',
                        fontSize: 11, fontFamily: F, fontWeight: 300,
                        color: 'var(--col-text-primary)', textAlign: 'left',
                      }}
                    >
                      <span style={{ fontWeight: 500 }}>{member.username}</span>
                      <span style={{ color: 'var(--col-text-subtle)' }}>{member.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reset to my issues */}
            {viewingUser && gitlabUsername && viewingUser.username !== gitlabUsername && (
              <button
                onClick={() => {
                  setViewingUser({ username: gitlabUsername, name: authUser?.name ?? 'Me' });
                  setSelectedId(null);
                }}
                style={{
                  padding: '4px 10px', borderRadius: 6,
                  border: '1px solid var(--col-border-illustrative)',
                  background: 'var(--col-background-ui-10)',
                  fontSize: 10, fontFamily: F, fontWeight: 400,
                  cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >
                My Issues
              </button>
            )}

            {/* Iteration dropdown */}
            {iterations.length > 0 && (
              <select
                data-testid="iteration-dropdown"
                value={selectedIterationId ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedIterationId(val ? Number(val) : null);
                }}
                disabled={loadingIterations}
                style={{
                  padding: '4px 8px',
                  borderRadius: 6,
                  border: '1px solid var(--col-border-illustrative)',
                  background: 'var(--col-background-ui-10, #fff)',
                  fontSize: 11,
                  fontFamily: F,
                  fontWeight: 300,
                  color: 'var(--col-text-primary)',
                  cursor: 'pointer',
                  outline: 'none',
                  maxWidth: 200,
                }}
              >
                <option value="">All Iterations</option>
                {iterations.map((iter) => (
                  <option key={iter.id} value={iter.id}>
                    {formatIterationLabel(iter, currentIterationId)}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Loading indicator */}
        {loadingSprint && activeTab === 'sprint' && (
          <span style={{ fontSize: 11, color: 'var(--col-text-subtle)', fontStyle: 'italic' }}>Loading...</span>
        )}
      </div>

      {/* Epic tab loading indicator */}
      {loadingEpicIssues && activeTab === 'epic' && (
        <div style={{
          padding: '8px 24px', fontSize: 12, fontWeight: 300,
          color: 'var(--col-text-subtle)', fontFamily: F, textAlign: 'center',
          fontStyle: 'italic', borderBottom: '1px solid var(--col-border-illustrative)',
        }}>
          Loading epic issues...
        </div>
      )}

      {/* Epic tab: contextual empty states */}
      {activeTab === 'epic' && !loadingEpicIssues && !loadedEpicIid && (
        <div style={{
          padding: '24px', fontSize: 13, fontWeight: 300,
          color: 'var(--col-text-subtle)', fontFamily: F, textAlign: 'center',
        }}>
          Load an epic from GitLab to see its linked issues.
        </div>
      )}
      {activeTab === 'epic' && !loadingEpicIssues && loadedEpicIid && epicIssues.length === 0 && (
        <div style={{
          padding: '24px', fontSize: 13, fontWeight: 300,
          color: 'var(--col-text-subtle)', fontFamily: F, textAlign: 'center',
        }}>
          No issues are linked to this epic. Create issues from user stories, or link existing issues in GitLab.
        </div>
      )}

      {/* Sprint empty state */}
      {activeTab === 'sprint' && !loadingSprint && sprintIssues.length === 0 && (
        <div style={{
          padding: '24px', fontSize: 13, fontWeight: 300,
          color: 'var(--col-text-subtle)', fontFamily: F, textAlign: 'center',
        }}>
          {!isConfigured
            ? 'Configure GitLab in Settings to view sprint issues'
            : viewingUser
              ? `No issues found for ${viewingUser.name} in ${selectedIterationId ? 'this iteration' : 'any iteration'}`
              : 'Select a user to view their sprint issues'
          }
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <IssueList
          issues={filtered}
          selectedId={selectedId}
          filter={filter}
          search={search}
          onSelectIssue={setSelectedId}
          onFilterChange={setFilter}
          onSearchChange={setSearch}
        />
        <IssueDetail issue={selectedIssue} />
      </div>
    </div>
  );
}

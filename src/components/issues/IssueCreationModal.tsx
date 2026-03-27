/**
 * IssueCreationModal — Create GitLab issues from parsed user stories.
 *
 * Flow: parse stories → fetch existing issues → AI dedup → user selects → bulk create.
 */

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Warning, XCircle, Spinner, ArrowRight } from '@phosphor-icons/react';
import { useEpicStore } from '@/stores/epicStore';
import { useGitlabStore } from '@/stores/gitlabStore';
import { useConfigStore } from '@/stores/configStore';
import { parseUserStories } from '@/pipeline/utils/parseUserStories';
import { analyzeStoryDuplicates } from '@/services/ai/analyzeStoryDuplicates';
import { createIssuesAction } from '@/actions/createIssuesAction';
import { fetchIssuesAction } from '@/actions/fetchIssuesAction';
import { fetchGroupProjects } from '@/services/gitlab/gitlabClient';
import type { GitLabProject } from '@/services/gitlab/types';
import type { ParsedUserStory } from '@/pipeline/utils/parseUserStories';
import type { DuplicateAnalysis } from '@/services/ai/analyzeStoryDuplicates';
import type { CreationProgress } from '@/actions/createIssuesAction';
import type { AIClientConfig } from '@/services/ai/types';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

type Phase = 'parsing' | 'analyzing' | 'ready' | 'creating' | 'done';

interface StoryWithAnalysis {
  story: ParsedUserStory;
  analysis?: DuplicateAnalysis;
  selected: boolean;
}

export function IssueCreationModal() {
  const markdown = useEpicStore((s) => s.markdown);
  const epicDoc = useEpicStore((s) => s.document);
  const gitlabIssues = useGitlabStore((s) => s.issues);

  const cfg = useConfigStore((s) => s.config);

  const [phase, setPhase] = useState<Phase>('parsing');
  const [storiesWithAnalysis, setStoriesWithAnalysis] = useState<StoryWithAnalysis[]>([]);
  const [projectId, setProjectId] = useState('');
  const [issuesExpanded, setIssuesExpanded] = useState(true); // F09: collapsible
  const [projects, setProjects] = useState<GitLabProject[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [progress, setProgress] = useState<CreationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadedGroupId = useGitlabStore((s) => s.loadedGroupId);
  const epicTitle = epicDoc?.title ?? 'Untitled Epic';
  const isGitLabConfigured = cfg.gitlab.enabled && !!cfg.gitlab.accessToken;

  // F09: Auto-collapse when >5 existing issues
  useEffect(() => {
    if (gitlabIssues.length > 5) setIssuesExpanded(false);
  }, [gitlabIssues.length]);

  // F04: Auto-fetch projects from the epic's group
  useEffect(() => {
    if (!isGitLabConfigured || !loadedGroupId) return;
    let cancelled = false;
    setLoadingProjects(true);

    fetchGroupProjects(cfg.gitlab, loadedGroupId).then((result) => {
      if (cancelled) return;
      setLoadingProjects(false);
      if (result.success && result.data) {
        setProjects(result.data);
        // Auto-select if only 1 project
        if (result.data.length === 1) {
          setProjectId(String(result.data[0]!.id));
        }
      }
    });

    return () => { cancelled = true; };
  }, [isGitLabConfigured, loadedGroupId, cfg.gitlab]);
  const selectedCount = storiesWithAnalysis.filter((s) => s.selected).length;

  // Phase 1: Parse stories from markdown
  useEffect(() => {
    if (!markdown.trim()) {
      setError('No epic content — run the Refine pipeline first to generate user stories.');
      setPhase('ready');
      return;
    }

    const stories = parseUserStories(markdown);
    if (stories.length === 0) {
      setError('No user stories found in the epic. Make sure the epic has a "User Stories" section with ### US-XXX headers.');
      setPhase('ready');
      return;
    }

    const initial: StoryWithAnalysis[] = stories.map((s) => ({ story: s, selected: true }));
    setStoriesWithAnalysis(initial);
    setPhase('analyzing');
  }, [markdown]);

  // Phase 2: Analyze duplicates
  useEffect(() => {
    if (phase !== 'analyzing') return;

    const stories = storiesWithAnalysis.map((s) => s.story);
    const existingIssues = gitlabIssues.map((i) => ({
      id: `#${i.iid}`,
      title: i.title,
    }));

    if (!isGitLabConfigured || existingIssues.length === 0) {
      // No existing issues to compare — skip dedup
      setPhase('ready');
      return;
    }

    const aiConfig: AIClientConfig = {
      provider: cfg.ai.provider,
      azure: cfg.ai.azure,
      openai: cfg.ai.openai,
      endpoints: cfg.endpoints,
    };

    analyzeStoryDuplicates(stories, existingIssues, aiConfig)
      .then((analyses) => {
        setStoriesWithAnalysis((prev) =>
          prev.map((item) => {
            const analysis = analyses.find((a) => a.storyId === item.story.id);
            return {
              ...item,
              analysis,
              selected: analysis ? analysis.similarityScore < 80 : true,
            };
          }),
        );
        setPhase('ready');
      })
      .catch(() => {
        setPhase('ready'); // Continue without dedup
      });
  }, [phase, storiesWithAnalysis, gitlabIssues, isGitLabConfigured, cfg.ai]);

  const toggleStory = useCallback((storyId: string) => {
    setStoriesWithAnalysis((prev) =>
      prev.map((item) =>
        item.story.id === storyId ? { ...item, selected: !item.selected } : item,
      ),
    );
  }, []);

  const selectAll = useCallback(() => {
    setStoriesWithAnalysis((prev) => prev.map((item) => ({ ...item, selected: true })));
  }, []);

  const deselectAll = useCallback(() => {
    setStoriesWithAnalysis((prev) => prev.map((item) => ({ ...item, selected: false })));
  }, []);

  const handleCreate = useCallback(async () => {
    if (!projectId.trim()) {
      setError('Enter a GitLab project ID');
      return;
    }

    setPhase('creating');
    setError(null);

    const selected = storiesWithAnalysis.filter((s) => s.selected).map((s) => s.story);

    const result = await createIssuesAction(
      selected,
      epicTitle,
      markdown,
      projectId.trim(),
      setProgress,
    );

    setPhase('done');
    if (!result.success) {
      setError(`${result.errors.length} issue(s) failed to create`);
    }

    // F04: Sync new issues back to store so they're visible in Issue Manager
    if (result.created > 0) {
      fetchIssuesAction();
    }
  }, [storiesWithAnalysis, projectId, epicTitle, markdown]);

  // ─── Loading states ─────────────────────────────────────
  if (phase === 'parsing') {
    return (
      <div style={{ padding: 32, textAlign: 'center', fontFamily: F }}>
        <Spinner size={24} style={{ animation: 'spin 1s linear infinite' }} />
        <div style={{ marginTop: 12, fontSize: 13, fontWeight: 300, color: 'var(--col-text-subtle)' }}>
          Parsing user stories from epic...
        </div>
      </div>
    );
  }

  if (phase === 'analyzing') {
    return (
      <div style={{ padding: 32, textAlign: 'center', fontFamily: F }}>
        <Spinner size={24} style={{ animation: 'spin 1s linear infinite' }} />
        <div style={{ marginTop: 12, fontSize: 13, fontWeight: 300, color: 'var(--col-text-subtle)' }}>
          Analyzing stories for duplicates...
        </div>
      </div>
    );
  }

  // ─── Done state ─────────────────────────────────────────
  if (phase === 'done' && progress) {
    return (
      <div style={{ padding: 24, fontFamily: F }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <CheckCircle size={40} color="#059669" weight="fill" />
          <div style={{ fontSize: 16, fontWeight: 400, color: 'var(--col-text-primary)', marginTop: 12 }}>
            Created {progress.createdIds.length} of {progress.total} issues
          </div>
        </div>

        {progress.errors.length > 0 && (
          <div style={{ padding: 12, background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#b91c1c', marginBottom: 6 }}>Errors:</div>
            {progress.errors.map((err, i) => (
              <div key={i} style={{ fontSize: 12, fontWeight: 300, color: '#b91c1c' }}>{err}</div>
            ))}
          </div>
        )}

        {progress.createdIds.length > 0 && (
          <div style={{ fontSize: 12, fontWeight: 300, color: 'var(--col-text-subtle)', textAlign: 'center' }}>
            Issue IIDs: {progress.createdIds.join(', ')}
          </div>
        )}
      </div>
    );
  }

  // ─── Creating state ─────────────────────────────────────
  if (phase === 'creating' && progress) {
    const pct = Math.round((progress.current / progress.total) * 100);
    return (
      <div style={{ padding: 24, fontFamily: F }}>
        <div style={{ fontSize: 13, fontWeight: 400, color: 'var(--col-text-primary)', marginBottom: 12 }}>
          Creating issues... ({progress.current}/{progress.total})
        </div>
        <div style={{ fontSize: 12, fontWeight: 300, color: 'var(--col-text-subtle)', marginBottom: 8 }}>
          {progress.currentTitle}
        </div>
        {/* Progress bar */}
        <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: 'var(--col-background-brand)',
            borderRadius: 3,
            transition: 'width 0.3s ease',
          }} />
        </div>
      </div>
    );
  }

  // ─── Ready state — main UI ──────────────────────────────
  return (
    <div style={{ fontFamily: F, maxHeight: 500, display: 'flex', flexDirection: 'column' }}>
      {/* F09: Collapsible existing issues */}
      {gitlabIssues.length > 0 && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--col-border-illustrative)' }}>
          <div
            onClick={() => setIssuesExpanded(!issuesExpanded)}
            style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--col-text-subtle)', marginBottom: issuesExpanded ? 8 : 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <span style={{ transform: issuesExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s', display: 'inline-block' }}>&#9654;</span>
            Existing Issues ({gitlabIssues.length})
          </div>
          {issuesExpanded && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 120, overflowY: 'auto' }}>
            {gitlabIssues.slice(0, 10).map((issue) => (
              <span key={issue.id} style={{
                padding: '3px 8px',
                fontSize: 11,
                fontWeight: 400,
                borderRadius: 4,
                background: '#f3f4f6',
                color: 'var(--col-text-subtle)',
              }}>
                #{issue.iid} {issue.title.slice(0, 30)}{issue.title.length > 30 ? '...' : ''}
              </span>
            ))}
            {gitlabIssues.length > 10 && (
              <span style={{ fontSize: 11, color: 'var(--col-text-subtle)', padding: '3px 0' }}>
                +{gitlabIssues.length - 10} more
              </span>
            )}
          </div>
          )}
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div style={{ padding: '10px 16px', background: '#fef2f2', borderBottom: '1px solid #fecaca', fontSize: 12, fontWeight: 400, color: '#b91c1c' }}>
          {error}
        </div>
      )}

      {/* F04: Project picker */}
      {isGitLabConfigured && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--col-border-illustrative)' }}>
          <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--col-text-subtle)', display: 'block', marginBottom: 4 }}>
            Target Project
          </label>
          {loadingProjects ? (
            <div style={{ fontSize: 12, color: 'var(--col-text-subtle)', padding: '7px 0' }}>Loading projects...</div>
          ) : projects.length > 0 ? (
            <select
              data-testid="project-id-input"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              style={{
                width: '100%',
                padding: '7px 10px',
                border: '1px solid var(--col-border-illustrative)',
                borderRadius: 6,
                fontSize: 12,
                fontFamily: F,
                fontWeight: 300,
                boxSizing: 'border-box',
              }}
            >
              <option value="">Select a project...</option>
              {projects.map((p) => (
                <option key={p.id} value={String(p.id)}>{p.name} ({p.path_with_namespace})</option>
              ))}
            </select>
          ) : projects.length === 0 && !loadingProjects && loadedGroupId ? (
            <div style={{ fontSize: 12, color: '#b91c1c', padding: '7px 0' }}>
              No projects found in this group. Issues require a project.
            </div>
          ) : (
            <input
              data-testid="project-id-input"
              type="text"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="Enter project ID"
              style={{
                width: '100%',
                padding: '7px 10px',
                border: '1px solid var(--col-border-illustrative)',
                borderRadius: 6,
                fontSize: 12,
                fontFamily: F,
                fontWeight: 300,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          )}
        </div>
      )}

      {/* Select all / deselect all */}
      <div style={{ padding: '8px 16px', display: 'flex', gap: 8, borderBottom: '1px solid var(--col-border-illustrative)' }}>
        <button onClick={selectAll} style={linkBtnStyle}>Select All</button>
        <button onClick={deselectAll} style={linkBtnStyle}>Deselect All</button>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--col-text-subtle)' }}>
          {selectedCount} of {storiesWithAnalysis.length} selected
        </span>
      </div>

      {/* Story list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0', minHeight: 200 }}>
        {storiesWithAnalysis.map(({ story, analysis, selected }) => {
          const score = analysis?.similarityScore ?? 0;
          const isDuplicate = score >= 80;
          const isSimilar = score >= 50 && score < 80;

          return (
            <div
              key={story.id}
              onClick={() => toggleStory(story.id)}
              style={{
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                background: selected ? '#f0fdf4' : 'transparent',
                borderBottom: '1px solid #f3f4f6',
                transition: 'background 0.15s',
              }}
            >
              {/* Checkbox */}
              <div style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                border: `2px solid ${selected ? '#059669' : '#d1d5db'}`,
                background: selected ? '#059669' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {selected && <CheckCircle size={12} color="#fff" weight="fill" />}
              </div>

              {/* Story info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 400, color: 'var(--col-text-primary)' }}>
                  <span style={{ fontWeight: 500, color: 'var(--col-text-subtle)', marginRight: 6 }}>{story.id}</span>
                  {story.title}
                </div>
                <div style={{ fontSize: 11, fontWeight: 300, color: 'var(--col-text-subtle)', marginTop: 2 }}>
                  As a {story.asA}, I want {story.iWant}
                </div>
              </div>

              {/* Duplicate badge */}
              {isDuplicate && (
                <div style={{ ...badgeStyle, background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>
                  <XCircle size={12} weight="fill" />
                  {score}% — Duplicate{analysis?.matchedIssueTitle ? ` of ${analysis.matchedIssueTitle.slice(0, 20)}` : ''}
                </div>
              )}
              {isSimilar && (
                <div style={{ ...badgeStyle, background: '#fffbeb', color: '#92400e', border: '1px solid #fde68a' }}>
                  <Warning size={12} weight="fill" />
                  {score}% similar
                </div>
              )}
              {!isDuplicate && !isSimilar && analysis && (
                <div style={{ ...badgeStyle, background: '#f0fdf4', color: '#059669', border: '1px solid #bbf7d0' }}>
                  <CheckCircle size={12} weight="fill" />
                  Unique
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--col-border-illustrative)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 10,
      }}>
        {!isGitLabConfigured && (
          <span style={{ fontSize: 12, fontWeight: 300, color: '#b91c1c', flex: 1 }}>
            Configure GitLab in Settings to create issues
          </span>
        )}
        <button
          data-testid="create-issues-btn"
          onClick={handleCreate}
          disabled={selectedCount === 0 || !isGitLabConfigured || !projectId.trim()}
          style={{
            padding: '9px 20px',
            background: selectedCount > 0 && isGitLabConfigured && projectId.trim()
              ? 'var(--col-background-brand)'
              : '#e5e7eb',
            color: selectedCount > 0 && isGitLabConfigured && projectId.trim()
              ? '#ffffff'
              : 'var(--col-text-subtle)',
            fontFamily: F,
            fontSize: 12,
            fontWeight: 500,
            border: 'none',
            borderRadius: 6,
            cursor: selectedCount > 0 && isGitLabConfigured && projectId.trim() ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.2s ease',
            boxShadow: selectedCount > 0 ? '0 2px 8px rgba(225,43,30,0.2)' : 'none',
          }}
        >
          Create {selectedCount} Issue{selectedCount !== 1 ? 's' : ''}
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

const linkBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  fontSize: 11,
  fontWeight: 400,
  color: 'var(--col-background-brand)',
  cursor: 'pointer',
  fontFamily: "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif",
  padding: '2px 4px',
};

const badgeStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '3px 8px',
  borderRadius: 4,
  fontSize: 10,
  fontWeight: 500,
  whiteSpace: 'nowrap',
};

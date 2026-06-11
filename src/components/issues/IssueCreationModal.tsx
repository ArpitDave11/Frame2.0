/**
 * IssueCreationModal — Create GitLab issues from parsed user stories.
 *
 * Flow: parse stories → fetch existing issues → AI dedup → user selects → bulk create.
 */

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, Warning, XCircle, Spinner, ArrowRight, Plus, CaretRight, ArrowSquareOut } from '@phosphor-icons/react';
import { useEpicStore } from '@/stores/epicStore';
import { useGitlabStore } from '@/stores/gitlabStore';
import { useConfigStore } from '@/stores/configStore';
import { parseUserStories } from '@/pipeline/utils/parseUserStories';
import { analyzeStoryDuplicates } from '@/services/ai/analyzeStoryDuplicates';
import { createIssuesAction, resolveIssueMeta } from '@/actions/createIssuesAction';
import type { IssueCreationDefaults, IssueOverrides } from '@/actions/createIssuesAction';
import { IssueDefaultsBar, WeightChip, AssigneeChip, IterationChip } from '@/components/issues/IssueDefaultsBar';
import { fetchIssuesAction } from '@/actions/fetchIssuesAction';
import { fetchLabelsWithSearch } from '@/services/gitlab/gitlabClient';
import { resolveHomeProject } from '@/services/gitlab/resolveHomeProject';
import type { GitLabProject, GitLabLabel } from '@/services/gitlab/types';
import type { ParsedUserStory } from '@/pipeline/utils/parseUserStories';
import type { DuplicateAnalysis } from '@/services/ai/analyzeStoryDuplicates';
import type { CreationProgress } from '@/actions/createIssuesAction';
import type { AIClientConfig } from '@/services/ai/types';
import { generateCustomStories } from '@/services/ai/generateCustomStories';

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

  // A1: Label typeahead state
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [labelSearch, setLabelSearch] = useState('');
  const [labelSuggestions, setLabelSuggestions] = useState<GitLabLabel[]>([]);
  const [loadingLabels, setLoadingLabels] = useState(false);
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);

  // Custom issue creation state
  const [customInput, setCustomInput] = useState('');
  const [isGeneratingCustom, setIsGeneratingCustom] = useState(false);
  const [customError, setCustomError] = useState<string | null>(null);
  // Collapsed by default when stories exist — the list is the main content
  const [customOpen, setCustomOpen] = useState(false);

  // Defaults applied to all created issues (weight only when a story has no points)
  const [defaults, setDefaults] = useState<IssueCreationDefaults>({
    weight: null,
    assignee: null,
    iteration: null,
  });

  // Per-issue overrides — beat the AI estimate and the defaults for that issue only
  const [overrides, setOverrides] = useState<IssueOverrides>({});

  const setOverride = useCallback((storyId: string, patch: Partial<IssueCreationDefaults>) => {
    setOverrides((prev) => ({ ...prev, [storyId]: { ...prev[storyId], ...patch } }));
  }, []);
  const resetOverride = useCallback((storyId: string, key: keyof IssueCreationDefaults) => {
    setOverrides((prev) => {
      const next = { ...prev };
      if (!next[storyId]) return prev;
      const entry = { ...next[storyId] };
      delete entry[key];
      if (Object.keys(entry).length === 0) delete next[storyId];
      else next[storyId] = entry;
      return next;
    });
  }, []);

  // Per-story content preview (expanded story id)
  const [previewStoryId, setPreviewStoryId] = useState<string | null>(null);

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

    // Descend into subgroups (incl. `commons`) and default to the team's
    // canonical "home" project, so user stories save to <group>/commons/home
    // without the user hunting for a nested project.
    resolveHomeProject(cfg.gitlab, loadedGroupId).then((result) => {
      if (cancelled) return;
      setLoadingProjects(false);
      if (result.success) {
        setProjects(result.projects);
        if (result.home) {
          setProjectId(String(result.home.id));
        } else if (result.projects.length === 1) {
          setProjectId(String(result.projects[0]!.id));
        }
      }
    }).catch((err) => {
      if (!cancelled) {
        setLoadingProjects(false);
        console.error('[IssueCreationModal] resolveHomeProject failed:', err);
      }
    });

    return () => { cancelled = true; };
  }, [isGitLabConfigured, loadedGroupId, cfg.gitlab]);
  const selectedCount = storiesWithAnalysis.filter((s) => s.selected).length;

  // A1: Debounced label search
  useEffect(() => {
    if (!labelSearch.trim() || !isGitLabConfigured || !cfg.gitlab.rootGroupId) {
      setLabelSuggestions([]);
      setShowLabelDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      setLoadingLabels(true);
      const result = await fetchLabelsWithSearch(cfg.gitlab, cfg.gitlab.rootGroupId, labelSearch.trim());
      setLoadingLabels(false);
      if (result.success && result.data) {
        // Filter out already-selected labels
        setLabelSuggestions(result.data.filter((l) => !selectedLabels.includes(l.name)));
        setShowLabelDropdown(true);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [labelSearch, isGitLabConfigured, cfg.gitlab, selectedLabels]);

  // Phase 1: Parse stories from markdown
  useEffect(() => {
    if (!markdown.trim()) {
      setPhase('ready');
      return;
    }

    const stories = parseUserStories(markdown);
    if (stories.length === 0) {
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

  const handleGenerateCustomStories = useCallback(async () => {
    if (!customInput.trim()) return;
    setIsGeneratingCustom(true);
    setCustomError(null);

    try {
      const aiConfig: AIClientConfig = {
        provider: cfg.ai.provider,
        azure: cfg.ai.azure,
        openai: cfg.ai.openai,
        endpoints: cfg.endpoints,
      };

      const existingIssues = gitlabIssues.map((i) => ({
        title: i.title,
        iid: i.iid,
      }));

      const newStories = await generateCustomStories(
        aiConfig,
        customInput,
        markdown,
        storiesWithAnalysis.map((s) => s.story),
        existingIssues,
      );

      if (newStories.length === 0) {
        setCustomError('Could not generate stories. Try being more specific.');
        return;
      }

      setStoriesWithAnalysis((prev) => [
        ...prev,
        ...newStories.map((story) => ({ story, selected: true })),
      ]);

      setCustomInput('');
    } catch (err) {
      setCustomError((err as Error).message);
    } finally {
      setIsGeneratingCustom(false);
    }
  }, [customInput, cfg, markdown, storiesWithAnalysis, gitlabIssues]);

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
      selectedLabels.length > 0 ? selectedLabels : undefined,
      defaults,
      overrides,
    );

    setPhase('done');
    if (!result.success) {
      setError(`${result.errors.length} issue(s) failed to create`);
    }

    // F04: Sync new issues back to store so they're visible in Issue Manager
    if (result.created > 0) {
      fetchIssuesAction();
    }
  }, [storiesWithAnalysis, projectId, epicTitle, markdown, selectedLabels, defaults, overrides]);

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

        {progress.createdIssues.length > 0 && (
          <div
            data-testid="created-issues-links"
            style={{
              border: '1px solid var(--col-border-illustrative)',
              borderRadius: 8,
              maxHeight: 220,
              overflowY: 'auto',
            }}
          >
            {progress.createdIssues.map((issue) => (
              <a
                key={issue.iid}
                href={issue.webUrl || undefined}
                target="_blank"
                rel="noreferrer noopener"
                data-testid={`created-issue-link-${issue.iid}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '9px 14px',
                  borderBottom: '1px solid #f3f4f6',
                  fontSize: 12,
                  fontWeight: 400,
                  color: 'var(--col-text-primary)',
                  textDecoration: 'none',
                }}
              >
                <span style={{ fontWeight: 500, color: 'var(--col-text-subtle)', flexShrink: 0 }}>
                  #{issue.iid}
                </span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {issue.title}
                </span>
                {issue.webUrl && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--col-background-brand)', fontWeight: 500, flexShrink: 0 }}>
                    Open in GitLab <ArrowSquareOut size={12} weight="regular" />
                  </span>
                )}
              </a>
            ))}
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

      {/* No stories hint — show when no parsed stories and AI is available */}
      {storiesWithAnalysis.length === 0 && cfg.ai.provider !== 'none' && phase === 'ready' && (
        <div style={{
          padding: '16px 16px 0',
          fontSize: 13, fontWeight: 400, color: 'var(--col-text-subtle)',
          fontFamily: F, lineHeight: 1.5,
        }}>
          No user stories found yet. Use <strong style={{ fontWeight: 600, color: 'var(--col-text-primary)' }}>Custom Issue</strong> below to describe what you need — AI will generate stories from your description.
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

      {/* Defaults + selection toolbar */}
      {storiesWithAnalysis.length > 0 && (
      <div
        data-testid="issue-defaults-toolbar"
        style={{
          padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
          background: 'var(--col-background-ui-10)', borderBottom: '1px solid var(--col-border-illustrative)',
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--col-text-subtle)' }}>
          Defaults
        </span>
        {isGitLabConfigured && (
          <IssueDefaultsBar
            groupId={loadedGroupId ?? cfg.gitlab.rootGroupId}
            value={defaults}
            onChange={setDefaults}
          />
        )}
        <span style={{ fontSize: 10, fontWeight: 300, color: 'var(--col-text-subtle)' }}>
          fills any issue without its own value
        </span>
        <span style={{ flex: 1 }} />
        <button onClick={selectAll} style={linkBtnStyle}>Select All</button>
        <button onClick={deselectAll} style={linkBtnStyle}>Deselect All</button>
        <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--col-text-subtle)' }}>
          {selectedCount} of {storiesWithAnalysis.length} selected
        </span>
      </div>
      )}

      {/* Story list — hidden when no stories */}
      {storiesWithAnalysis.length > 0 && (
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0', minHeight: 200 }}>
        {storiesWithAnalysis.map(({ story, analysis, selected }) => {
          const score = analysis?.similarityScore ?? 0;
          const isDuplicate = score >= 80;
          const isSimilar = score >= 50 && score < 80;
          const isPreviewOpen = previewStoryId === story.id;
          const ov = overrides[story.id];
          const meta = resolveIssueMeta(story, defaults, ov);
          const chipGroupId = loadedGroupId ?? cfg.gitlab.rootGroupId;

          return (
            <div key={story.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
            <div
              onClick={() => toggleStory(story.id)}
              style={{
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                background: selected ? '#f0fdf4' : 'transparent',
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
                  {story.id.startsWith('custom-') && (
                    <span style={{
                      fontSize: 10, fontWeight: 500, padding: '2px 6px', borderRadius: 4,
                      background: 'var(--col-background-brand)', color: '#fff', marginLeft: 6,
                    }}>
                      AI Generated
                    </span>
                  )}
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

              {/* Per-issue meta — AI suggestion shown, any chip overridable for this issue only */}
              {isGitLabConfigured && (
                <div
                  data-testid={`issue-meta-${story.id}`}
                  onClick={(e) => e.stopPropagation()}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
                >
                  <WeightChip
                    value={meta.weight}
                    aiSuggested={story.storyPoints != null}
                    manual={!!ov && 'weight' in ov}
                    onChange={(weight) => setOverride(story.id, { weight })}
                    onReset={() => resetOverride(story.id, 'weight')}
                    testId={`row-weight-${story.id}`}
                  />
                  <AssigneeChip
                    groupId={chipGroupId}
                    value={meta.assignee}
                    manual={!!ov && 'assignee' in ov}
                    onChange={(assignee) => setOverride(story.id, { assignee })}
                    onReset={() => resetOverride(story.id, 'assignee')}
                    testId={`row-assignee-${story.id}`}
                  />
                  <IterationChip
                    groupId={chipGroupId}
                    value={meta.iteration}
                    manual={!!ov && 'iteration' in ov}
                    onChange={(iteration) => setOverride(story.id, { iteration })}
                    onReset={() => resetOverride(story.id, 'iteration')}
                    testId={`row-iteration-${story.id}`}
                  />
                </div>
              )}

              {/* Preview toggle — see exactly what the issue will contain */}
              <button
                data-testid={`preview-toggle-${story.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewStoryId(isPreviewOpen ? null : story.id);
                }}
                aria-expanded={isPreviewOpen}
                aria-label={`Preview issue content for ${story.title}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  background: 'transparent', border: '1px solid var(--col-border-illustrative)',
                  borderRadius: 4, padding: '3px 8px', fontSize: 10, fontWeight: 500,
                  color: 'var(--col-text-subtle)', cursor: 'pointer', fontFamily: F, flexShrink: 0,
                }}
              >
                <CaretRight
                  size={9}
                  weight="bold"
                  style={{ transform: isPreviewOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}
                />
                Preview
              </button>
            </div>

            {/* Expanded preview — the content that will be sent to GitLab */}
            {isPreviewOpen && (
              <div
                data-testid={`preview-panel-${story.id}`}
                style={{
                  padding: '12px 16px 14px 44px',
                  background: 'var(--col-background-ui-05, #F7F7F5)',
                  fontSize: 12,
                  fontFamily: F,
                  color: 'var(--col-text-primary)',
                  lineHeight: 1.6,
                }}
              >
                <div style={{ fontWeight: 500, marginBottom: 6 }}>
                  {story.id.startsWith('custom-') ? story.title : `${story.id}: ${story.title}`}
                </div>
                <div style={{ fontWeight: 300, marginBottom: 8 }}>
                  <strong style={{ fontWeight: 500 }}>As a</strong> {story.asA},{' '}
                  <strong style={{ fontWeight: 500 }}>I want</strong> {story.iWant}
                  {story.soThat && <>, <strong style={{ fontWeight: 500 }}>so that</strong> {story.soThat}</>}
                </div>
                {story.acceptanceCriteria.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--col-text-subtle)', marginBottom: 4 }}>
                      Acceptance criteria
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontWeight: 300 }}>
                      {story.acceptanceCriteria.map((ac, i) => (
                        <li key={i}>{ac}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, fontSize: 11, color: 'var(--col-text-subtle)', fontWeight: 300 }}>
                  <span>Weight: <strong style={{ fontWeight: 500 }}>{meta.weight ?? '—'} SP</strong></span>
                  <span>· Assignee: <strong style={{ fontWeight: 500 }}>{meta.assignee ? (meta.assignee.name || meta.assignee.username) : 'Unassigned'}</strong></span>
                  <span>· Iteration: <strong style={{ fontWeight: 500 }}>{meta.iteration?.title ?? 'None'}</strong></span>
                  <span>· Labels: <strong style={{ fontWeight: 500 }}>{['HALLMARK: FRAME', story.priority, ...selectedLabels].join(', ')}</strong></span>
                </div>
                <div style={{ marginTop: 8, fontSize: 10, fontStyle: 'italic', color: 'var(--col-text-subtle)' }}>
                  The full description is AI-expanded from this story at creation time.
                </div>
              </div>
            )}
            </div>
          );
        })}
      </div>
      )}

      {/* Custom issue — collapsed row; expands to the AI story generator */}
      {cfg.ai.provider !== 'none' && phase === 'ready' && storiesWithAnalysis.length > 0 && (
        <button
          data-testid="custom-issue-toggle"
          onClick={() => setCustomOpen((o) => !o)}
          aria-expanded={customOpen}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%',
            padding: '11px 16px', border: 'none', borderTop: '1px solid var(--col-border-illustrative)',
            background: 'transparent', cursor: 'pointer', fontFamily: F, textAlign: 'left',
          }}
        >
          <Plus size={13} weight="bold" color="var(--col-background-brand)" />
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--col-background-brand)' }}>
            Add a custom issue
          </span>
          <span style={{ fontSize: 10.5, fontWeight: 300, color: 'var(--col-text-subtle)' }}>
            describe it in plain language — AI drafts the story
          </span>
        </button>
      )}

      {/* Custom Issue Input — AI generates stories from description */}
      {cfg.ai.provider !== 'none' && phase === 'ready' && (storiesWithAnalysis.length === 0 || customOpen) && (
        <div
          data-testid="custom-issue-section"
          style={{
            padding: storiesWithAnalysis.length === 0 ? '16px 16px' : '12px 16px',
            backgroundColor: storiesWithAnalysis.length === 0 ? 'var(--col-background-ui-05, #F5F5F0)' : 'var(--col-background-ui-10, #FAFAFA)',
            borderBottom: '1px solid var(--col-border-illustrative, #e5e5e5)',
            border: storiesWithAnalysis.length === 0 ? '2px solid var(--col-background-brand)' : undefined,
            borderRadius: storiesWithAnalysis.length === 0 ? 8 : 0,
            margin: storiesWithAnalysis.length === 0 ? '8px 16px 12px' : 0,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--col-text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, fontFamily: F }}>
            <Plus size={14} weight="bold" color="var(--col-background-brand)" />
            Custom Issue
          </div>
          <textarea
            data-testid="custom-issue-input"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Describe what you need... e.g., 'Set up CI/CD pipeline with GitHub Actions'"
            style={{
              width: '100%', minHeight: 60, padding: 10, borderRadius: 6,
              border: '1px solid var(--col-border-illustrative)', fontSize: 13,
              resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
              background: 'var(--col-bg-surface, #fff)', color: 'var(--col-text, #222)',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerateCustomStories();
            }}
          />
          {customError && (
            <div style={{ fontSize: 12, color: 'var(--col-background-brand)', marginTop: 6, fontFamily: F }}>
              {customError}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <span style={{ fontSize: 11, color: 'var(--col-text-subtle)', fontFamily: F }}>
              AI generates user stories from your description + epic context (Cmd+Enter)
            </span>
            <button
              data-testid="generate-stories-btn"
              onClick={handleGenerateCustomStories}
              disabled={!customInput.trim() || isGeneratingCustom}
              style={{
                padding: '6px 16px', borderRadius: 6, border: 'none',
                background: customInput.trim() && !isGeneratingCustom ? 'var(--col-background-brand)' : 'var(--col-border-illustrative)',
                color: '#fff', cursor: customInput.trim() && !isGeneratingCustom ? 'pointer' : 'not-allowed',
                fontSize: 12, fontWeight: 500, fontFamily: F,
              }}
            >
              {isGeneratingCustom && <Spinner size={16} className="animate-spin" />}
              {isGeneratingCustom ? 'Generating...' : 'Generate Stories'}
            </button>
          </div>
        </div>
      )}

      {/* A1: Labels typeahead */}
      {isGitLabConfigured && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--col-border-illustrative)' }}>
          <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--col-text-subtle)', display: 'block', marginBottom: 6 }}>
            Labels (optional — applied to all issues)
          </label>

          {/* Selected label chips */}
          {selectedLabels.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 8 }}>
              {selectedLabels.map((label) => (
                <span
                  key={label}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '2px 8px', borderRadius: 12,
                    background: '#ECEBE4', fontSize: 11, fontWeight: 400,
                    color: 'var(--col-text-primary)', fontFamily: F,
                  }}
                >
                  {label}
                  <button
                    onClick={() => setSelectedLabels((prev) => prev.filter((l) => l !== label))}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--col-text-subtle)', padding: 0, lineHeight: 1 }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Search input + dropdown */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              data-testid="label-search-input"
              value={labelSearch}
              onChange={(e) => setLabelSearch(e.target.value)}
              onFocus={() => { if (labelSuggestions.length > 0) setShowLabelDropdown(true); }}
              onBlur={() => setTimeout(() => setShowLabelDropdown(false), 200)}
              placeholder="Type to search labels..."
              style={{
                width: '100%', padding: '6px 10px', borderRadius: 6,
                border: '1px solid var(--col-border-illustrative)',
                fontSize: 12, fontFamily: F, fontWeight: 300,
                outline: 'none', boxSizing: 'border-box',
              }}
            />
            {loadingLabels && (
              <span style={{ position: 'absolute', right: 10, top: 7, fontSize: 11, color: 'var(--col-text-subtle)' }}>...</span>
            )}

            {showLabelDropdown && labelSuggestions.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                background: '#fff', border: '1px solid var(--col-border-illustrative)',
                borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                maxHeight: 150, overflowY: 'auto',
              }}>
                {labelSuggestions.map((label) => (
                  <button
                    key={label.id}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setSelectedLabels((prev) => [...prev, label.name]);
                      setLabelSearch('');
                      setShowLabelDropdown(false);
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      width: '100%', padding: '6px 10px', border: 'none',
                      background: 'transparent', cursor: 'pointer',
                      fontSize: 12, fontFamily: F, fontWeight: 300,
                      color: 'var(--col-text-primary)', textAlign: 'left',
                    }}
                  >
                    <span style={{
                      width: 10, height: 10, borderRadius: 2,
                      background: label.color ?? '#ccc', flexShrink: 0,
                    }} />
                    {label.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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

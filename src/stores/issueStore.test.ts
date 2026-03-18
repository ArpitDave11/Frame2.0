import { describe, it, expect, beforeEach } from 'vitest';
import { useIssueStore } from './issueStore';
import type { ParsedUserStory } from './issueStore';

beforeEach(() => {
  useIssueStore.setState(useIssueStore.getInitialState());
});

// ─── Fixtures ───────────────────────────────────────────────

const STORIES: ParsedUserStory[] = [
  { id: 's1', title: 'Login form', description: 'As a user I want to log in', labels: ['auth'], isDuplicate: false },
  { id: 's2', title: 'Dashboard', description: 'As a user I want a dashboard', labels: ['ui'], isDuplicate: false },
  { id: 's3', title: 'Login (dup)', description: 'Duplicate of login', labels: ['auth'], isDuplicate: true },
];

const EXISTING_ISSUES = [
  { id: 101, iid: 1, title: 'Login form', state: 'opened', web_url: 'https://gitlab.example.com/issues/1' },
];

// ─── Initial State ──────────────────────────────────────────

describe('initial state', () => {
  it('no parsed stories', () => {
    expect(useIssueStore.getState().parsedStories).toEqual([]);
  });

  it('no selected story ids', () => {
    expect(useIssueStore.getState().selectedStoryIds).toEqual([]);
  });

  it('no existing issues', () => {
    expect(useIssueStore.getState().existingIssues).toEqual([]);
  });

  it('isAnalyzing is false', () => {
    expect(useIssueStore.getState().isAnalyzing).toBe(false);
  });

  it('isCreating is false', () => {
    expect(useIssueStore.getState().isCreating).toBe(false);
  });

  it('creationProgress defaults', () => {
    expect(useIssueStore.getState().creationProgress).toEqual({ current: 0, total: 0, currentTitle: '' });
  });
});

// ─── setParsedStories ───────────────────────────────────────

describe('setParsedStories', () => {
  it('sets stories', () => {
    useIssueStore.getState().setParsedStories(STORIES);
    expect(useIssueStore.getState().parsedStories).toEqual(STORIES);
  });
});

// ─── toggleStorySelection ───────────────────────────────────

describe('toggleStorySelection', () => {
  it('adds id on first call', () => {
    useIssueStore.getState().toggleStorySelection('s1');
    expect(useIssueStore.getState().selectedStoryIds).toEqual(['s1']);
  });

  it('removes id on second call', () => {
    useIssueStore.getState().toggleStorySelection('s1');
    useIssueStore.getState().toggleStorySelection('s1');
    expect(useIssueStore.getState().selectedStoryIds).toEqual([]);
  });

  it('accumulates multiple selections', () => {
    useIssueStore.getState().toggleStorySelection('s1');
    useIssueStore.getState().toggleStorySelection('s2');
    expect(useIssueStore.getState().selectedStoryIds).toEqual(['s1', 's2']);
  });
});

// ─── selectAll / deselectAll ────────────────────────────────

describe('selectAll / deselectAll', () => {
  it('selectAll selects all non-duplicate stories', () => {
    useIssueStore.getState().setParsedStories(STORIES);
    useIssueStore.getState().selectAll();
    expect(useIssueStore.getState().selectedStoryIds).toEqual(['s1', 's2']);
  });

  it('deselectAll empties selection', () => {
    useIssueStore.getState().toggleStorySelection('s1');
    useIssueStore.getState().toggleStorySelection('s2');
    useIssueStore.getState().deselectAll();
    expect(useIssueStore.getState().selectedStoryIds).toEqual([]);
  });
});

// ─── setExistingIssues ──────────────────────────────────────

describe('setExistingIssues', () => {
  it('sets existing issues', () => {
    useIssueStore.getState().setExistingIssues(EXISTING_ISSUES);
    expect(useIssueStore.getState().existingIssues).toEqual(EXISTING_ISSUES);
  });
});

// ─── setAnalyzing / setCreating ─────────────────────────────

describe('loading states', () => {
  it('setAnalyzing', () => {
    useIssueStore.getState().setAnalyzing(true);
    expect(useIssueStore.getState().isAnalyzing).toBe(true);
  });

  it('setCreating', () => {
    useIssueStore.getState().setCreating(true);
    expect(useIssueStore.getState().isCreating).toBe(true);
  });
});

// ─── updateCreationProgress ─────────────────────────────────

describe('updateCreationProgress', () => {
  it('updates progress', () => {
    useIssueStore.getState().updateCreationProgress({ current: 3, total: 10, currentTitle: 'Login form' });
    expect(useIssueStore.getState().creationProgress).toEqual({ current: 3, total: 10, currentTitle: 'Login form' });
  });
});

// ─── reset ──────────────────────────────────────────────────

describe('reset', () => {
  it('clears everything', () => {
    useIssueStore.getState().setParsedStories(STORIES);
    useIssueStore.getState().toggleStorySelection('s1');
    useIssueStore.getState().setExistingIssues(EXISTING_ISSUES);
    useIssueStore.getState().setAnalyzing(true);
    useIssueStore.getState().setCreating(true);
    useIssueStore.getState().updateCreationProgress({ current: 5, total: 10, currentTitle: 'Test' });

    useIssueStore.getState().reset();
    const state = useIssueStore.getState();
    expect(state.parsedStories).toEqual([]);
    expect(state.selectedStoryIds).toEqual([]);
    expect(state.existingIssues).toEqual([]);
    expect(state.isAnalyzing).toBe(false);
    expect(state.isCreating).toBe(false);
    expect(state.creationProgress).toEqual({ current: 0, total: 0, currentTitle: '' });
  });
});

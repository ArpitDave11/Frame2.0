/**
 * Tests for the commons/home project resolver — the pure ranking that picks
 * where user stories get filed.
 */

import { describe, it, expect } from 'vitest';
import { pickHomeProject, homeProjectScore } from './resolveHomeProject';
import type { GitLabProject } from './types';

function proj(path: string, over: Partial<GitLabProject> = {}): GitLabProject {
  return { id: Math.abs(hash(path)), name: path.split('/').pop()!, path_with_namespace: path, web_url: '', ...over };
}
function hash(s: string): number { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return h; }

describe('resolveHomeProject — picker', () => {
  it('prefers a <group>/commons/home project over siblings', () => {
    const projects = [
      proj('dave-group/pod-a1/docs'),
      proj('dave-group/pod-a1/commons/home'),
      proj('dave-group/pod-a1/api'),
    ];
    expect(pickHomeProject(projects)?.path_with_namespace).toBe('dave-group/pod-a1/commons/home');
  });

  it('falls back to any project named "home"', () => {
    const projects = [proj('g/service'), proj('g/home')];
    expect(pickHomeProject(projects)?.path_with_namespace).toBe('g/home');
  });

  it('falls back to a commons project when no home exists', () => {
    const projects = [proj('g/app'), proj('g/commons/shared')];
    expect(pickHomeProject(projects)?.path_with_namespace).toBe('g/commons/shared');
  });

  it('skips projects that cannot hold issues', () => {
    const projects = [
      proj('g/commons/home', { issues_enabled: false }),
      proj('g/fallback'),
    ];
    // commons/home is disqualified (issues disabled) → fallback wins
    expect(pickHomeProject(projects)?.path_with_namespace).toBe('g/fallback');
    expect(homeProjectScore(proj('g/commons/home', { issues_enabled: false }))).toBe(-1);
  });

  it('returns null when there are no issue-capable projects', () => {
    expect(pickHomeProject([])).toBeNull();
    expect(pickHomeProject([proj('g/x', { issues_enabled: false })])).toBeNull();
  });

  it('scores the canonical path highest', () => {
    expect(homeProjectScore(proj('g/pod/commons/home'))).toBe(100);
    expect(homeProjectScore(proj('g/home'))).toBe(80);
    expect(homeProjectScore(proj('g/commons/util'))).toBe(60);
    expect(homeProjectScore(proj('g/random'))).toBe(0);
  });
});

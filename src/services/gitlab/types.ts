/**
 * GitLab Service Types — Phase 3 (T-3.5).
 *
 * Type definitions for the GitLab API client. These are the canonical
 * GitLab API types — the store placeholders (T-2.5) re-export from here.
 */

// ─── Core Entities ──────────────────────────────────────────

export interface GitLabEpic {
  id: number;
  iid: number;
  title: string;
  description: string;
  state: string;
  web_url: string;
  labels: string[];
  created_at: string;
  updated_at: string;
  group_id: number;
}

export interface GitLabEpicChild {
  id: number;
  iid: number;
  title: string;
  type: 'epic' | 'issue';
}

export interface GitLabLabel {
  id: number;
  name: string;
  color: string;
  description?: string;
}

export interface GitLabIssue {
  id: number;
  iid: number;
  title: string;
  description?: string;
  state: string;
  web_url: string;
  labels: string[];
}

export interface GitLabGroupMetadata {
  id: number;
  name: string;
  full_path: string;
  description?: string;
  web_url: string;
  parent_id: number | null;
}

export interface GitLabSubgroup {
  id: string;
  name: string;
  full_path: string;
}

export interface GitLabBranch {
  name: string;
  default: boolean;
  web_url: string;
}

export interface GitLabTreeItem {
  id: string;
  name: string;
  type: 'tree' | 'blob';
  path: string;
  mode: string;
}

// ─── Result Types ───────────────────────────────────────────

export interface GitLabEpicListResult {
  success: boolean;
  data?: GitLabEpic[];
  error?: string;
  totalCount?: number;
}

export interface GitLabEpicResult {
  success: boolean;
  data?: GitLabEpic;
  error?: string;
}

export interface GitLabLabelResult {
  success: boolean;
  data?: GitLabLabel[];
  error?: string;
}

export interface GitLabEpicChildrenResult {
  success: boolean;
  data?: { epics: GitLabEpicChild[]; issues: GitLabEpicChild[] };
  error?: string;
}

export interface GitLabIssueResult {
  success: boolean;
  data?: GitLabIssue;
  error?: string;
}

export interface GitLabPublishResult {
  success: boolean;
  data?: { web_url: string; merge_request_url?: string };
  error?: string;
}

export interface GitLabGroupMetadataResult {
  success: boolean;
  data?: GitLabGroupMetadata;
  error?: string;
}

export interface GitLabSubgroupResult {
  success: boolean;
  data?: GitLabSubgroup[];
  error?: string;
}

export interface GitLabConnectionResult {
  success: boolean;
  error?: string;
}

// ─── Param Types ────────────────────────────────────────────

export interface GitLabEpicSearchParams {
  search?: string;
  state?: string;
  labels?: string[];
  page?: number;
  per_page?: number;
  include_descendant_groups?: boolean;
}

export interface GitLabCreateEpicParams {
  title: string;
  description?: string;
  labels?: string[];
  group_id?: string;
}

export interface GitLabUpdateEpicParams {
  title?: string;
  description?: string;
  labels?: string[];
}

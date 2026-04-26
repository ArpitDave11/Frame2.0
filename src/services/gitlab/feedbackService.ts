import type { GitLabConfig } from '@/domain/configTypes';
import { getBaseUrl, getGitLabAuthHeaders } from './gitlabClient';

// ─── Constants (hardcoded — feedback goes to a dedicated project) ───
const FEEDBACK_PROJECT_ID = ''; // TODO: set to your GitLab project ID
const FEEDBACK_FOLDER = 'feedback';
const FEEDBACK_BRANCH = 'main';

// ─── Types ──────────────────────────────────────────────────────────

export type FeedbackCategory = 'bug' | 'feature_request' | 'general';

export interface FeedbackInput {
  name: string;
  email: string;
  category: FeedbackCategory;
  message: string;
}

type Result = { ok: true } | { ok: false; error: string };

// ─── Submit ─────────────────────────────────────────────────────────

export async function submitFeedback(
  config: GitLabConfig,
  input: FeedbackInput,
): Promise<Result> {
  const ts = new Date();
  const dateStr = ts.toISOString().slice(0, 10);
  const timeStr = ts.toISOString();
  const slug = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
  const shortId = Math.random().toString(36).slice(2, 8);
  const fileName = `${dateStr}-${slug}-${shortId}.md`;
  const filePath = `${FEEDBACK_FOLDER}/${fileName}`;

  const content = `---
date: ${timeStr}
user: ${input.name}
email: ${input.email}
category: ${input.category}
---

${input.message}
`;

  const encodedPath = encodeURIComponent(filePath);
  const url = `${getBaseUrl()}/projects/${FEEDBACK_PROJECT_ID}/repository/files/${encodedPath}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getGitLabAuthHeaders(config),
      },
      body: JSON.stringify({
        branch: FEEDBACK_BRANCH,
        content: btoa(content),
        encoding: 'base64',
        commit_message: `feedback: ${input.category} from ${input.name}`,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return { ok: false, error: `GitLab ${response.status}: ${text}` };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

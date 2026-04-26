# Feedback Feature — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a Feedback modal accessible from the sidebar. User submits feedback (category + message), which is committed as a markdown file to a hardcoded GitLab project via the Repository Files API.

**Architecture:** New `feedbackService.ts` (one function, ~30 lines) uses `getBaseUrl()` + `getGitLabAuthHeaders()` from existing `gitlabClient.ts` to POST a file. New `FeedbackModal.tsx` (~80 lines) reads user info via `useAuth()`. Wired into existing ModalHost + sidebar nav.

**Tech Stack:** React 19, TypeScript, existing GitLab proxy (`/gitlab-api`), `useAuth()` from `AuthContext`, Vitest.

---

## Task 1: Create `feedbackService.ts` with `submitFeedback()`

**Files:**
- Create: `src/services/gitlab/feedbackService.ts`
- Create: `src/services/gitlab/feedbackService.test.ts`

**Step 1: Write the failing test**

```typescript
// src/services/gitlab/feedbackService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitFeedback } from './feedbackService';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('submitFeedback', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('commits a markdown file to the feedback project', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ file_path: 'feedback/test.md' }) });

    const result = await submitFeedback(
      { accessToken: 'tok', authMode: 'pat' as const, enabled: true, rootGroupId: '', streamGroupId: '' },
      { name: 'Arpit Dave', email: 'arpit@ubs.com', category: 'bug', message: 'Upload button broken' },
    );

    expect(result.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, opts] = mockFetch.mock.calls[0]!;
    expect(url).toContain('/repository/files/');
    expect(url).toContain('feedback%2F'); // URL-encoded path
    expect(opts.method).toBe('POST');

    const body = JSON.parse(opts.body);
    expect(body.branch).toBe('main');
    expect(body.commit_message).toContain('bug');
    expect(body.commit_message).toContain('Arpit Dave');

    // Decode content and verify frontmatter
    const content = atob(body.content);
    expect(content).toContain('user: Arpit Dave');
    expect(content).toContain('email: arpit@ubs.com');
    expect(content).toContain('category: bug');
    expect(content).toContain('Upload button broken');
  });

  it('returns error on API failure', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 403, text: () => Promise.resolve('Forbidden') });

    const result = await submitFeedback(
      { accessToken: 'tok', authMode: 'pat' as const, enabled: true, rootGroupId: '', streamGroupId: '' },
      { name: 'Test', email: 'test@test.com', category: 'general', message: 'test' },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('403');
  });

  it('returns error on network failure', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const result = await submitFeedback(
      { accessToken: 'tok', authMode: 'pat' as const, enabled: true, rootGroupId: '', streamGroupId: '' },
      { name: 'Test', email: 'test@test.com', category: 'general', message: 'test' },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('Network error');
  });
});
```

**Step 2: Run, fail** — module not found.

**Step 3: Implement**

```typescript
// src/services/gitlab/feedbackService.ts
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
```

**Step 4: Run, pass.**

**Step 5: Commit**

```bash
git add src/services/gitlab/feedbackService.ts src/services/gitlab/feedbackService.test.ts
git commit -m "feat(feedback): feedbackService — commit markdown file to GitLab project"
```

---

## Task 2: Add `'feedback'` to ModalId + wire ModalHost

**Files:**
- Modify: `src/stores/uiStore.ts:16` — add `'feedback'` to ModalId
- Modify: `src/components/layout/ModalHost.tsx` — add import + case

**Step 1: Modify uiStore.ts line 16**

```typescript
// Before:
export type ModalId = 'publish' | 'loadEpic' | 'issueCreation' | 'critique' | 'pipeline' | 'settings' | 'docUpload';

// After:
export type ModalId = 'publish' | 'loadEpic' | 'issueCreation' | 'critique' | 'pipeline' | 'settings' | 'docUpload' | 'feedback';
```

**Step 2: Add to ModalHost.tsx**

Add import at top:
```typescript
import { FeedbackModal } from '@/components/settings/FeedbackModal';
```

Add case in the switch (before default/closing):
```typescript
case 'feedback':
  return (
    <Modal open onClose={closeModal} title="Share Feedback" width={480}>
      <FeedbackModal />
    </Modal>
  );
```

**Step 3: Create placeholder FeedbackModal** (so it compiles — full implementation in Task 3):

```typescript
// src/components/settings/FeedbackModal.tsx
export function FeedbackModal() {
  return <div data-testid="feedback-modal">Feedback (placeholder)</div>;
}
```

**Step 4: Verify no TypeScript errors:**
```bash
npx tsc --noEmit 2>&1 | grep -c 'error TS'
```

**Step 5: Commit**

```bash
git add src/stores/uiStore.ts src/components/layout/ModalHost.tsx src/components/settings/FeedbackModal.tsx
git commit -m "feat(feedback): add feedback ModalId + ModalHost case + placeholder"
```

---

## Task 3: Implement `FeedbackModal.tsx`

**Files:**
- Modify: `src/components/settings/FeedbackModal.tsx` (replace placeholder)

**Step 1: Write the failing test**

```typescript
// src/components/settings/FeedbackModal.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthContext, type AuthContextValue } from '@/components/auth/AuthContext';
import React from 'react';

vi.mock('@/services/gitlab/feedbackService', () => ({
  submitFeedback: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock('@/stores/configStore', () => ({
  useConfigStore: vi.fn((sel) => sel({
    config: { gitlab: { enabled: true, accessToken: 'tok', authMode: 'pat', rootGroupId: '', streamGroupId: '' } }
  })),
}));

vi.mock('@/stores/uiStore', () => ({
  useUiStore: Object.assign(vi.fn((sel) => sel({ closeModal: vi.fn(), addToast: vi.fn() })), {
    getState: vi.fn(() => ({ closeModal: vi.fn(), addToast: vi.fn() })),
  }),
}));

const authValue: AuthContextValue = {
  isAuthenticated: true,
  user: { name: 'Arpit Dave', email: 'arpit@ubs.com', initials: 'AD' },
  login: vi.fn(),
  logout: vi.fn(),
  isLoading: false,
};

function renderWithAuth(ui: React.ReactElement) {
  return render(
    <AuthContext.Provider value={authValue}>{ui}</AuthContext.Provider>
  );
}

describe('FeedbackModal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders user name and email (read-only)', async () => {
    const { FeedbackModal } = await import('./FeedbackModal');
    renderWithAuth(<FeedbackModal />);
    expect(screen.getByText(/Arpit Dave/)).toBeTruthy();
    expect(screen.getByText(/arpit@ubs.com/)).toBeTruthy();
  });

  it('submit button is disabled when message is empty', async () => {
    const { FeedbackModal } = await import('./FeedbackModal');
    renderWithAuth(<FeedbackModal />);
    const btn = screen.getByTestId('feedback-submit');
    expect(btn.hasAttribute('disabled') || btn.getAttribute('aria-disabled') === 'true').toBe(true);
  });

  it('calls submitFeedback on submit with correct params', async () => {
    const { submitFeedback } = await import('@/services/gitlab/feedbackService');
    const { FeedbackModal } = await import('./FeedbackModal');
    renderWithAuth(<FeedbackModal />);

    const textarea = screen.getByTestId('feedback-message');
    fireEvent.change(textarea, { target: { value: 'Great tool!' } });

    const btn = screen.getByTestId('feedback-submit');
    fireEvent.click(btn);

    await waitFor(() => {
      expect(submitFeedback).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          name: 'Arpit Dave',
          email: 'arpit@ubs.com',
          category: 'general',
          message: 'Great tool!',
        }),
      );
    });
  });
});
```

**Step 2: Run, fail.**

**Step 3: Implement FeedbackModal**

```typescript
// src/components/settings/FeedbackModal.tsx
import React, { useState } from 'react';
import { useAuth } from '@/components/auth/AuthContext';
import { useConfigStore } from '@/stores/configStore';
import { useUiStore } from '@/stores/uiStore';
import { submitFeedback, type FeedbackCategory } from '@/services/gitlab/feedbackService';

const FONT = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";
const CATEGORIES: { value: FeedbackCategory; label: string }[] = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'general', label: 'General' },
];

export function FeedbackModal() {
  const { user } = useAuth();
  const config = useConfigStore((s) => s.config);
  const closeModal = useUiStore((s) => s.closeModal);

  const [category, setCategory] = useState<FeedbackCategory>('general');
  const [message, setMessage] = useState('');
  const [phase, setPhase] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!message.trim() || !user) return;
    setPhase('submitting');
    setError(null);

    const result = await submitFeedback(config.gitlab, {
      name: user.name,
      email: user.email,
      category,
      message: message.trim(),
    });

    if (result.ok) {
      setPhase('done');
      useUiStore.getState().addToast({ id: `fb-${Date.now()}`, type: 'success', title: 'Feedback submitted — thank you!' });
      setTimeout(() => closeModal(), 1200);
    } else {
      setPhase('error');
      setError(result.error);
    }
  };

  return (
    <div data-testid="feedback-modal" style={{ fontFamily: FONT, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* User info (read-only) */}
      <div style={{ fontSize: '0.85rem', color: '#5A5D5C' }}>
        From: <strong>{user?.name ?? 'Unknown'}</strong> ({user?.email ?? 'no email'})
      </div>

      {/* Category */}
      <div>
        <label style={{ fontSize: '0.85rem', fontWeight: 500, display: 'block', marginBottom: 4 }}>Category</label>
        <select
          data-testid="feedback-category"
          value={category}
          onChange={(e) => setCategory(e.target.value as FeedbackCategory)}
          style={{ padding: '6px 10px', border: '1px solid #CCCABC', borderRadius: 6, fontSize: '0.85rem', fontFamily: FONT }}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Message */}
      <div>
        <label style={{ fontSize: '0.85rem', fontWeight: 500, display: 'block', marginBottom: 4 }}>Your feedback</label>
        <textarea
          data-testid="feedback-message"
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe your feedback..."
          style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', border: '1px solid #CCCABC', borderRadius: 6, fontSize: '0.875rem', fontFamily: FONT, resize: 'vertical' }}
        />
      </div>

      {/* Error */}
      {phase === 'error' && error && (
        <div style={{ fontSize: '0.85rem', color: '#E60000' }}>{error}</div>
      )}

      {/* Done */}
      {phase === 'done' && (
        <div style={{ fontSize: '0.85rem', color: '#00A651' }}>Feedback submitted!</div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button
          onClick={closeModal}
          style={{ padding: '8px 16px', border: '1px solid #CCCABC', borderRadius: 6, background: 'transparent', cursor: 'pointer', fontFamily: FONT }}
        >
          Cancel
        </button>
        <button
          data-testid="feedback-submit"
          onClick={handleSubmit}
          disabled={!message.trim() || phase === 'submitting' || phase === 'done'}
          style={{
            padding: '8px 16px', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: FONT, color: '#fff',
            background: (!message.trim() || phase === 'submitting') ? '#CCCABC' : '#E60000',
          }}
        >
          {phase === 'submitting' ? 'Submitting...' : 'Submit'}
        </button>
      </div>
    </div>
  );
}
```

**Step 4: Run, pass.**

**Step 5: Commit**

```bash
git add src/components/settings/FeedbackModal.tsx src/components/settings/FeedbackModal.test.tsx
git commit -m "feat(feedback): FeedbackModal — category + message + submit to GitLab"
```

---

## Task 4: Add "Feedback" nav item to sidebar

**Files:**
- Modify: `src/components/layout/WorkspaceSidebar.tsx:40-54`

**Step 1: Add import**

```typescript
import { ChatCircle } from '@phosphor-icons/react';
```

(Or `ChatBubble` / `Megaphone` — check what Phosphor has. `ChatCircle` is confirmed in Phosphor v2.)

**Step 2: Add nav item** — insert after the settings item in `NAV_ITEMS`:

```typescript
{ id: 'feedback', icon: ChatCircle, label: 'Feedback', isModal: true },
```

**Step 3: Update the `handleNav` function** — it already handles `isModal: true` by calling `openModal('settings')`. Change it to use the item's `id` as the modal name:

Check the current handleNav code. If it hardcodes `openModal('settings')`, update to:
```typescript
if (item.isModal) {
  openModal(item.id as ModalId);
}
```

This way both Settings and Feedback use `isModal: true` and open their respective modals.

**Step 4: Verify** — run dev server, click Feedback in sidebar, modal opens.

**Step 5: Commit**

```bash
git add src/components/layout/WorkspaceSidebar.tsx
git commit -m "feat(feedback): add Feedback nav item to sidebar (ChatCircle icon)"
```

---

## Task 5: Set the hardcoded project ID + end-to-end test

**Files:**
- Modify: `src/services/gitlab/feedbackService.ts:8` — set `FEEDBACK_PROJECT_ID`

**Step 1: Get the project ID**

The user needs to provide the GitLab project ID for their feedback repo. It's visible at the top of the project's Settings > General page, or via:
```bash
curl -s -H "PRIVATE-TOKEN: <pat>" "https://gitlab.com/api/v4/projects?search=<repo-name>&owned=true" | python3 -c "import json,sys; [print(f'{p[\"id\"]}: {p[\"path_with_namespace\"]}') for p in json.load(sys.stdin)]"
```

**Step 2: Set the constant**

```typescript
const FEEDBACK_PROJECT_ID = '<the-number>';  // e.g. '12345678'
```

**Step 3: Manual E2E test**

1. Run `npm run dev`
2. Log in (or use mock auth)
3. Click "Feedback" in sidebar
4. Type a message, select "Bug", click Submit
5. Verify in GitLab: navigate to the project → `feedback/` folder → new `.md` file with frontmatter

**Step 4: Commit**

```bash
git add src/services/gitlab/feedbackService.ts
git commit -m "feat(feedback): set feedback project ID + verified E2E"
```

---

## Verification

After all 5 tasks, run:
```bash
npx vitest run src/services/gitlab/feedbackService.test.ts src/components/settings/FeedbackModal.test.tsx
```
Expected: All tests pass.

Use `superpowers:verification-before-completion` before claiming done.

---

## Out of scope

- No feedback history/listing UI
- No attachments/screenshots
- No settings field for project ID (hardcoded)
- No backend endpoint

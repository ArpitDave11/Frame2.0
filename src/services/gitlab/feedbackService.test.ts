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

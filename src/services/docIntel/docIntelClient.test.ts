import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeDocument } from './docIntelClient';

describe('docIntelClient', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('sends file via FormData and returns enriched result on success', async () => {
    const mockResponse = {
      status: 'success', markdown: '# Test', pages: 5, duration_ms: 3000,
      file_name: 'test.pdf', file_size: 1024, file_sha256: 'abc',
      outline: [{ level: 1, text: 'Intro', page: 1 }],
      tables: [{ index: 0, html: '<table></table>', csv: 'a,b' }],
      metadata: { filename: 'test.pdf', page_count: 5, binary_hash: 'abc' },
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(mockResponse), { status: 200 }),
    );

    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const result = await analyzeDocument(file);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.markdown).toBe('# Test');
      expect(result.data.outline).toHaveLength(1);
      expect(result.data.tables).toHaveLength(1);
      expect(result.data.metadata.pageCount).toBe(5);
    }
  });

  it('returns error on non-ok response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: 'File too large' }), { status: 413 }),
    );

    const file = new File(['x'], 'big.pdf', { type: 'application/pdf' });
    const result = await analyzeDocument(file);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('File too large');
  });

  it('returns error on network failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));

    const file = new File(['x'], 'test.pdf', { type: 'application/pdf' });
    const result = await analyzeDocument(file);

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('Network error');
  });
});

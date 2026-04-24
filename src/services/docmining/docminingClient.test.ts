/**
 * docminingClient tests — B-10 review C3 regression.
 *
 * Locks in the discriminated-union contract (`{ ok: true, data } | { ok: false, error }`)
 * so backend-contract refactors can't silently break the DocUploadModal caller.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { convertDocument } from './docminingClient';

type FetchMock = ReturnType<typeof vi.fn>;

function mockFetch(response: Partial<Response> & { json?: () => Promise<unknown> }): FetchMock {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function makeFile(name = 'spec.pdf', size = 1024): File {
  return new File([new Uint8Array(size)], name, { type: 'application/pdf' });
}

describe('convertDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('maps a successful response into ok:true with snake→camel mapping', async () => {
    mockFetch({
      ok: true,
      status: 200,
      json: async () => ({
        markdown: '# Hello',
        file_name: 'spec.pdf',
        pages: 3,
        duration_ms: 1234,
      }),
    });

    const outcome = await convertDocument(makeFile());

    expect(outcome).toEqual({
      ok: true,
      data: {
        markdown: '# Hello',
        fileName: 'spec.pdf',
        pages: 3,
        durationMs: 1234,
      },
    });
  });

  it('sends multipart body with file + include_markdown=true', async () => {
    const fetchMock = mockFetch({
      ok: true,
      status: 200,
      json: async () => ({ markdown: '', file_name: 'x.pdf', pages: 0, duration_ms: 0 }),
    });

    await convertDocument(makeFile('x.pdf'));

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/docmining/convert',
      expect.objectContaining({ method: 'POST' }),
    );
    const body = fetchMock.mock.calls[0][1].body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect(body.get('include_markdown')).toBe('true');
    expect(body.get('file')).toBeInstanceOf(File);
  });

  it('defaults missing markdown to empty string', async () => {
    mockFetch({
      ok: true,
      status: 200,
      json: async () => ({ markdown: null, file_name: 'x.pdf', pages: 0, duration_ms: 0 }),
    });

    const outcome = await convertDocument(makeFile());

    expect(outcome.ok).toBe(true);
    if (outcome.ok) expect(outcome.data.markdown).toBe('');
  });

  it('parses string HTTPException.detail on non-OK response', async () => {
    mockFetch({
      ok: false,
      status: 400,
      json: async () => ({ detail: 'File type not allowed' }),
    });

    const outcome = await convertDocument(makeFile());

    expect(outcome).toEqual({ ok: false, error: 'File type not allowed' });
  });

  it('parses nested detail.message when detail is an object', async () => {
    mockFetch({
      ok: false,
      status: 422,
      json: async () => ({ detail: { message: 'Unprocessable', code: 'bad' } }),
    });

    const outcome = await convertDocument(makeFile());

    expect(outcome).toEqual({ ok: false, error: 'Unprocessable' });
  });

  it('falls back to "HTTP <status>" when error body is not JSON', async () => {
    mockFetch({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error('not json');
      },
    });

    const outcome = await convertDocument(makeFile());

    expect(outcome).toEqual({ ok: false, error: 'HTTP 500' });
  });

  it('returns ok:false on network failure', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('network down'));
    vi.stubGlobal('fetch', fetchMock);

    const outcome = await convertDocument(makeFile());

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.error).toBe('network down');
  });

  it('reports a friendly message on caller-initiated abort', async () => {
    const controller = new AbortController();
    const abortErr = new DOMException('aborted', 'AbortError');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abortErr));

    controller.abort();
    const outcome = await convertDocument(makeFile(), { signal: controller.signal });

    expect(outcome).toEqual({ ok: false, error: 'Upload cancelled or timed out' });
  });
});

/**
 * DocMining client — talks to the FastAPI backend (backend/docmining) via the
 * Vite proxy at /api/docmining. Returns a discriminated union so callers don't
 * need to model HTTP status codes.
 */

export interface ConvertResult {
  markdown: string;
  fileName: string;
  pages: number;
  durationMs: number;
}

export type ConvertOutcome =
  | { ok: true; data: ConvertResult }
  | { ok: false; error: string };

export async function convertDocument(
  file: File,
  options?: { signal?: AbortSignal; timeoutMs?: number },
): Promise<ConvertOutcome> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('include_markdown', 'true');

  // Compose caller signal with an internal timeout (default 200 s — longer than backend's 180 s cap).
  const timeoutMs = options?.timeoutMs ?? 200_000;
  const timeoutSignal = AbortSignal.timeout(timeoutMs);
  const signal = options?.signal
    ? AbortSignal.any([options.signal, timeoutSignal])
    : timeoutSignal;

  try {
    const res = await fetch('/api/docmining/convert', {
      method: 'POST',
      body: fd,
      signal,
    });

    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        if (typeof body?.detail === 'string') {
          detail = body.detail;
        } else if (body?.detail?.message) {
          detail = body.detail.message;
        }
      } catch {
        // response was not JSON — keep the HTTP status fallback
      }
      return { ok: false, error: detail };
    }

    const json = await res.json();
    return {
      ok: true,
      data: {
        markdown: json.markdown ?? '',
        fileName: json.file_name,
        pages: json.pages,
        durationMs: json.duration_ms,
      },
    };
  } catch (e) {
    // AbortError: user cancelled or timeout fired — propagate a recognizable string
    // so the caller can distinguish from a real network error.
    if (e instanceof DOMException && e.name === 'AbortError') {
      // Node-side: timeoutSignal uses 'TimeoutError'; browser uses 'AbortError' for both.
      return { ok: false, error: 'Upload cancelled or timed out' };
    }
    if (e instanceof DOMException && e.name === 'TimeoutError') {
      return { ok: false, error: `Upload timed out after ${Math.round(timeoutMs / 1000)}s` };
    }
    // Log unexpected failures for dev-tools visibility (observability gap flagged in B-10 review).
    // eslint-disable-next-line no-console
    console.error('[docmining] convertDocument failed', e);
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

export const ALLOWED_UPLOAD_EXTENSIONS = [
  '.pdf', '.docx', '.pptx', '.xlsx',
  '.html', '.htm', '.png', '.jpg', '.jpeg',
  '.tiff', '.tif', '.md', '.txt',
] as const;

export const MAX_UPLOAD_MB = 50;

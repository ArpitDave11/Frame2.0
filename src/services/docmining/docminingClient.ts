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

export async function convertDocument(file: File): Promise<ConvertOutcome> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('include_markdown', 'true');

  try {
    const res = await fetch('/api/docmining/convert', {
      method: 'POST',
      body: fd,
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
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

export const ALLOWED_UPLOAD_EXTENSIONS = [
  '.pdf', '.docx', '.pptx', '.xlsx',
  '.html', '.htm', '.png', '.jpg', '.jpeg',
  '.tiff', '.tif', '.md', '.txt',
] as const;

export const MAX_UPLOAD_MB = 50;

/**
 * Doc Intelligence API client — calls POST /api/docmining/analyze
 * for enriched document extraction (markdown + outline + tables + metadata).
 */

import type { OutlineItem, TableItem, DocMetadata } from '@/stores/docIntelStore';

// ─── Types ─────────────────────────────────────────────────

export interface AnalyzeData {
  markdown: string;
  fileName: string;
  pages: number;
  durationMs: number;
  outline: OutlineItem[];
  tables: TableItem[];
  metadata: DocMetadata;
}

export type AnalyzeOutcome =
  | { ok: true; data: AnalyzeData }
  | { ok: false; error: string };

// ─── Client ────────────────────────────────────────────────

export async function analyzeDocument(file: File, signal?: AbortSignal): Promise<AnalyzeOutcome> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('include_markdown', 'true');

  try {
    const res = await fetch('/api/docmining/analyze', {
      method: 'POST',
      body: fd,
      signal,
    });

    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        if (typeof body?.detail === 'string') detail = body.detail;
      } catch { /* ignore */ }
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
        outline: (json.outline ?? []).map((o: Record<string, unknown>) => ({
          level: o.level as number,
          text: o.text as string,
          page: o.page as number,
        })),
        tables: (json.tables ?? []).map((t: Record<string, unknown>) => ({
          index: t.index as number,
          html: t.html as string,
          csv: t.csv as string,
        })),
        metadata: {
          filename: (json.metadata?.filename ?? json.file_name) as string,
          pageCount: (json.metadata?.page_count ?? json.pages) as number,
          fileSha256: (json.metadata?.binary_hash ?? json.file_sha256) as string,
        },
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

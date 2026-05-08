"""Export endpoint — converts markdown to DOCX or PDF."""
import logging
import subprocess
import tempfile
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

log = logging.getLogger(__name__)
router = APIRouter(prefix="/export", tags=["export"])


class ExportRequest(BaseModel):
    format: Literal["docx", "pdf"]
    markdown: str
    title: str = "Document"


def _md_to_html(md: str, title: str) -> str:
    """Wrap markdown-rendered HTML in a minimal document."""
    import markdown as md_lib
    body = md_lib.markdown(md, extensions=["tables", "fenced_code", "toc"])
    return f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>{title}</title>
<style>
body {{ font-family: 'Frutiger', Arial, sans-serif; font-size: 11pt; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; }}
h1 {{ font-size: 24pt; font-weight: 300; color: #1a1a1a; border-bottom: 4px solid #E60000; padding-bottom: 8px; }}
h2 {{ font-size: 18pt; font-weight: 300; color: #1a1a1a; margin-top: 32px; }}
h3 {{ font-size: 14pt; font-weight: 500; }}
table {{ border-collapse: collapse; width: 100%; margin: 16px 0; }}
th, td {{ border: 1px solid #ddd; padding: 8px 12px; text-align: left; }}
th {{ background: #f5f5f5; font-weight: 500; }}
code {{ background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }}
pre {{ background: #f5f5f5; padding: 16px; border-radius: 6px; overflow-x: auto; }}
blockquote {{ border-left: 4px solid #E60000; margin: 16px 0; padding: 8px 16px; color: #555; }}
img {{ max-width: 100%; height: auto; }}
</style>
</head><body>{body}</body></html>"""


@router.post("/")
async def export_document(req: ExportRequest) -> StreamingResponse:
    """Export markdown as DOCX or PDF."""
    if not req.markdown.strip():
        raise HTTPException(400, "Empty markdown content")

    with tempfile.TemporaryDirectory(prefix="frame-export-") as tmp:
        md_path = Path(tmp) / "input.md"
        md_path.write_text(req.markdown, encoding="utf-8")

        if req.format == "docx":
            out_path = Path(tmp) / "output.docx"
            ref_doc = Path(__file__).parent.parent.parent / "templates" / "ubs_template.docx"
            cmd = ["pandoc", "-f", "gfm", "-t", "docx", "-o", str(out_path), str(md_path)]
            if ref_doc.exists():
                cmd.extend(["--reference-doc", str(ref_doc)])
            try:
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
                if result.returncode != 0:
                    log.error("pandoc failed: %s", result.stderr)
                    raise HTTPException(500, f"DOCX conversion failed: {result.stderr[:200]}")
            except FileNotFoundError:
                raise HTTPException(500, "pandoc not installed on server")

            content = out_path.read_bytes()
            return StreamingResponse(
                iter([content]),
                media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                headers={"Content-Disposition": f'attachment; filename="{req.title}.docx"'},
            )

        elif req.format == "pdf":
            out_path = Path(tmp) / "output.pdf"
            html = _md_to_html(req.markdown, req.title)
            try:
                from weasyprint import HTML
                HTML(string=html).write_pdf(str(out_path))
            except Exception as e:
                log.error("weasyprint failed: %s", e)
                raise HTTPException(500, f"PDF conversion failed: {str(e)[:200]}")

            content = out_path.read_bytes()
            return StreamingResponse(
                iter([content]),
                media_type="application/pdf",
                headers={"Content-Disposition": f'attachment; filename="{req.title}.pdf"'},
            )

        raise HTTPException(400, f"Unsupported format: {req.format}")

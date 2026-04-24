import asyncio
import hashlib
import logging
import os
import tempfile
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Annotated

from docling.document_converter import DocumentConverter
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
)
from pydantic import BaseModel

from app.core.config import Settings, get_settings
from app.services.docling_service import convert_sync

log = logging.getLogger(__name__)
router = APIRouter(prefix="/documents", tags=["documents"])

# Extension-only MIME policy (decision #2)
ALLOWED_EXTENSIONS = {
    ".pdf", ".docx", ".pptx", ".xlsx",
    ".html", ".htm",
    ".png", ".jpg", ".jpeg", ".tiff", ".tif",
    ".md", ".txt",
}


class ConvertResponse(BaseModel):
    request_id: str
    file_name: str
    file_size: int
    file_sha256: str
    extension: str
    status: str
    pages: int
    duration_ms: int
    markdown: str | None = None
    errors: list[str] = []


def _sanitize(name: str) -> str:
    base = os.path.basename(name or "upload.bin").replace("\x00", "")
    return base[:255] or "upload.bin"


async def _stream_to_tempfile(
    upload: UploadFile, max_bytes: int, suffix: str
) -> tuple[Path, int, str]:
    """Stream uploaded bytes to a 0600-mode tempfile, enforcing max_bytes.

    Cleans up the tempfile on any failure (including non-HTTPException errors).
    """
    hasher = hashlib.sha256()
    total = 0
    fd, name = tempfile.mkstemp(prefix="docmining-", suffix=suffix)
    path = Path(name)
    try:
        with os.fdopen(fd, "wb") as out:
            while chunk := await upload.read(1024 * 1024):
                total += len(chunk)
                if total > max_bytes:
                    raise HTTPException(413, f"File exceeds {max_bytes} bytes.")
                hasher.update(chunk)
                out.write(chunk)
    except BaseException:
        path.unlink(missing_ok=True)
        raise
    return path, total, hasher.hexdigest()


def _cleanup(path: Path) -> None:
    try:
        path.unlink(missing_ok=True)
    except Exception as e:
        log.warning("cleanup_failed path=%s err=%s", path, e)


def get_converter(request: Request) -> DocumentConverter:
    return request.app.state.docling


def get_executor(request: Request) -> ThreadPoolExecutor:
    return request.app.state.executor


@router.post("/convert", response_model=ConvertResponse)
async def convert_document(
    file: Annotated[UploadFile, File()],
    include_markdown: Annotated[bool, Form()] = True,
    settings: Settings = Depends(get_settings),
    converter: DocumentConverter = Depends(get_converter),
    executor: ThreadPoolExecutor = Depends(get_executor),
) -> ConvertResponse:
    req_id = str(uuid.uuid4())
    name = _sanitize(file.filename or "upload.bin")
    ext = Path(name).suffix.lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            415,
            f"Extension '{ext}' not permitted. Allowed: {sorted(ALLOWED_EXTENSIONS)}",
        )

    # Derive tempfile suffix from the sanitized name, NOT the raw upload.filename.
    # A crafted "foo.pdf/../evil" would break mkstemp if passed through raw.
    path, size, sha = await _stream_to_tempfile(file, settings.max_file_bytes, ext)

    log.info(
        "convert.start id=%s file=%s size=%d sha=%s", req_id, name, size, sha[:12]
    )

    loop = asyncio.get_running_loop()
    t0 = time.perf_counter()
    try:
        try:
            payload = await asyncio.wait_for(
                loop.run_in_executor(
                    executor,
                    convert_sync,
                    converter, path, name, settings.max_pages, settings.max_file_bytes,
                ),
                timeout=settings.convert_timeout_s,
            )
        except asyncio.TimeoutError:
            raise HTTPException(504, f"Conversion exceeded {settings.convert_timeout_s}s.")

        ms = int((time.perf_counter() - t0) * 1000)
        if not payload["ok"]:
            # Stringify errors into the detail message; preserves FastAPI's
            # {"detail": "..."} contract. Structured error surfacing is a
            # Phase B concern (custom exception handler).
            msg = "; ".join(payload["errors"]) or "unknown conversion failure"
            raise HTTPException(422, f"Conversion failed: {msg}")

        log.info(
            "convert.done id=%s pages=%d ms=%d", req_id, payload["pages"], ms
        )

        return ConvertResponse(
            request_id=req_id,
            file_name=name,
            file_size=size,
            file_sha256=sha,
            extension=ext,
            status=payload["status"],
            pages=payload["pages"],
            duration_ms=ms,
            markdown=payload["markdown"] if include_markdown else None,
            errors=payload["errors"],
        )
    finally:
        # Deterministic cleanup — runs on every exit path (success, HTTPException,
        # unexpected error). BackgroundTasks was unreliable across exception paths.
        _cleanup(path)

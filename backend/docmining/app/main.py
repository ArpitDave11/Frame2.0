import logging
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.documents import router as documents_router
from app.core.config import get_settings
from app.services.docling_service import build_converter

log = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s - %(message)s",
    )
    # Hard invariant: Docling's PDF backends are NOT thread-safe (upstream #1191).
    # Settings.workers is constrained to ==1; this assert catches any code path
    # that bypasses Settings (e.g. direct Settings(workers=N) construction).
    assert settings.workers == 1, "Docling not thread-safe — workers must be 1"

    log.info("docmining.boot artifacts=%s workers=%d", settings.artifacts_path, settings.workers)

    # Sanity: artifacts dir exists
    if not Path(settings.artifacts_path).exists():
        log.warning("artifacts_path missing: %s (Docling will try HF download)", settings.artifacts_path)

    # Build Docling converter (models load here)
    converter = build_converter(
        artifacts_path=settings.artifacts_path,
        do_ocr=settings.ocr,
        num_threads=settings.workers,
    )
    # Warmup (optional — triggers model pre-load with a tiny in-memory doc)
    # Skipped in MVP to keep boot < 10s; first real request pays the cost.

    # max_workers hardcoded to 1 — literal, not from settings — so the thread-safety
    # invariant survives even if Settings is mis-constructed.
    executor = ThreadPoolExecutor(
        max_workers=1,
        thread_name_prefix="docling",
    )
    app.state.docling = converter
    app.state.executor = executor

    yield

    log.info("docmining.shutdown")
    # cancel_futures=True cancels queued but not-yet-running conversions;
    # the one running thread completes best-effort. Prevents SIGTERM hangs
    # that exceed k8s terminationGracePeriodSeconds.
    executor.shutdown(wait=True, cancel_futures=True)


app = FastAPI(
    title="Frame DocMining",
    version="0.1.0",
    lifespan=lifespan,
)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(documents_router, prefix="/api/v1")


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/readyz")
def readyz() -> dict[str, str]:
    ok = getattr(app.state, "docling", None) is not None
    return {"status": "ready" if ok else "loading"}

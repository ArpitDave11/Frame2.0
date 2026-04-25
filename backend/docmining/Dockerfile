# syntax=docker/dockerfile:1.7
#
# Frame DocMining — FastAPI + Docling 2.90 service.
#
# Two-stage build:
#   stage 1 (builder)  installs deps into /opt/venv with `uv` (~5x faster than pip)
#   stage 2 (runtime)  copies the venv + app + 1.2 GB of baked models, runs uvicorn
#
# The runtime is fully offline at request time — HF_HUB_OFFLINE=1 forbids any
# HuggingFace fetches. Models live at /app/models and are referenced by
# DOCMINING_ARTIFACTS_PATH (see .env.example).
#
# Build context: this directory (`backend/docmining`).
#   docker build -t frame-docmining:dev backend/docmining

# ---------- stage 1: builder --------------------------------------------------
FROM python:3.12-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

# Build-time only: gcc/g++ for any wheel that compiles (onnxruntime ships wheels
# but transitive deps may need it). Removed by stage boundary.
RUN apt-get update \
 && apt-get install -y --no-install-recommends build-essential \
 && rm -rf /var/lib/apt/lists/*

# uv installs into the venv we control, so the runtime stage can copy /opt/venv.
RUN pip install --no-cache-dir uv==0.5.4

# Create the venv early so its layer is cacheable across pyproject changes.
RUN uv venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH" \
    VIRTUAL_ENV=/opt/venv

WORKDIR /build

# Dep install layer — invalidated only when pyproject.toml changes.
COPY pyproject.toml ./
RUN uv pip install --no-cache .

# ---------- stage 2: runtime --------------------------------------------------
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH" \
    VIRTUAL_ENV=/opt/venv \
    # Offline invariants — must mirror .env.example. Burned into the image so
    # a missing/empty .env at deploy time does not silently let HF fetch.
    HF_HUB_OFFLINE=1 \
    TRANSFORMERS_OFFLINE=1 \
    HF_HUB_DISABLE_TELEMETRY=1 \
    TOKENIZERS_PARALLELISM=false \
    DOCMINING_ARTIFACTS_PATH=/app/models

# Runtime system libs:
#   libgomp1                    — onnxruntime OpenMP
#   libgl1 libglib2.0-0 libxcb1 — opencv-python (transitive via rapidocr) shared libs
#   ca-certificates             — TLS roots (defense in depth; HF_HUB_OFFLINE=1 normally)
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      libgomp1 libgl1 libglib2.0-0 libxcb1 ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Non-root runtime user. uid/gid 1000 matches the convention referenced in the
# Phase C plan; /tmp is writable for the temp-file streaming in
# app/api/v1/documents.py:_stream_to_tempfile.
RUN groupadd --gid 1000 app \
 && useradd --uid 1000 --gid app --create-home --shell /usr/sbin/nologin app

# Pull in the resolved venv from the builder. No build tools, no apt cache.
COPY --from=builder /opt/venv /opt/venv

WORKDIR /app

# Copy app code BEFORE models so model changes (1.2 GB layer) don't bust the
# code layer on every code edit.
COPY --chown=app:app app/ /app/app/
COPY --chown=app:app pyproject.toml /app/pyproject.toml

# Models last — heaviest layer, changes least often.
COPY --chown=app:app models/ /app/models/

USER app

EXPOSE 8000

# Use Python's stdlib so we don't need curl/wget in the runtime image.
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request,sys; \
sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/healthz', timeout=3).status == 200 else 1)"

# workers=1 is the Docling thread-safety invariant enforced by lifespan
# (app/main.py:26). DO NOT pass --workers > 1 here.
ENTRYPOINT ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]

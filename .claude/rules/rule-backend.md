---
paths: ["backend/**"]
---
# Backend Rules
- FastAPI with Pydantic v2 models for all request/response schemas.
- DocMining service: Docling 2.90, thread-safety invariant (workers=1).
- HF_HUB_OFFLINE=1 — models baked into image, no runtime downloads.
- Validate all external input at the boundary.
- Never log secrets or PII.

---
paths: ["src/pipeline/**"]
---
# Pipeline Rules
- Pipeline orchestrator is PURE — no store reads/writes inside pipeline stages.
- Action layer (refinePipelineAction.ts) is the thin boundary that reads stores and writes results back.
- Each stage function takes explicit parameters, returns typed results.
- Do not modify existing test files to make them pass — fix the implementation.
- Category templates v7.0.0 JSON is canonical — do not hand-edit.

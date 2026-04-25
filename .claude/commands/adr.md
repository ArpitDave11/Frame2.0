---
description: Capture an architectural decision as a numbered ADR
allowed-tools: Bash(ls docs/adr:*), Read, Write
argument-hint: [decision-summary]
---
Read docs/adr/template.md and the existing ADRs in docs/adr/. Compute next id (max + 1, zero-padded 4 digits). Fill template with $ARGUMENTS as the title; capture decision context from recent conversation. Write to docs/adr/NNNN-{slug}.md. Update docs/adr/README.md index.

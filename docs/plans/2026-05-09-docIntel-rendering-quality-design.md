# DocIntel Rendering Quality — Schema-First Design

**Date:** 2026-05-09
**Status:** Approved
**Research:** `docs/research/Production-Grade Patterns for Rendering Structured .md`

## Core Principle

"Stop fighting the LLM's markdown — own the structure in code."

Store parsed JSON objects in the store (not formatted markdown). Dedicated
renderers consume typed fields. AnalysisMarkdown renders only prose body
fields inside those structures.

## Files: 5 create, 3 modify

| File | Action |
|---|---|
| dataTypes.ts | Create — structured data types |
| SummaryCard.tsx | Create — pull-quote + audience brief |
| InsightsCard.tsx | Create — sub-cards + collapsible evidence |
| ExplanationsCard.tsx | Create — accordion + risks |
| VisualsCard.tsx | Create — MermaidPreview wrapper |
| docIntelStore.ts | Modify — add data field to Section |
| analyzeAction.ts | Modify — store parsed JSON in data |
| SectionCard.tsx | Modify — route to dedicated renderers |

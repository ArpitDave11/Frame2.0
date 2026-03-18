# Task Plan: Epic Generator v5 — T-4.8 BM25 Quality Scorer

## Goal
Build deterministic scoring module: BM25 saturation, filler detection (5 categories, 70+ patterns), 5-dimension section scoring with geometric mean aggregation, document-level scoring with complexity-scaled thresholds. Zero AI dependency.

## Current Phase
- **Phase**: T-4.8 Scoring Module
- **Status**: in_progress
- **Dependencies**: T-4.1 (pipelineTypes ✅)
- **Deliverables**: src/pipeline/epicScorer.ts + tests
- **Acceptance**: saturate() pure, filler detection 5 categories 70+ patterns, 5-dim scoring with geometric mean, complexity thresholds (80/85/90), all tests pass, zero AI dependency

## Decisions
- (none yet)

## Errors
- (none yet)

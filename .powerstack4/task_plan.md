# Task Plan: Epic Generator v5 — T-4.10 Stage 2 Implementation

## Goal
Implement Stage 2 (Category Classification): classifies epic into 1 of 7 categories with confidence score. Validates category against enum, clamps confidence to 0-1, serializes comprehension as readable summary. Same pattern as T-4.9.

## Current Phase
- **Phase**: T-4.10 Stage 2 Implementation
- **Status**: in_progress
- **Dependencies**: T-4.1 (types ✅), T-4.3 (classification prompt ✅), T-3.1-3.3 (callAI ✅), T-3.4 (withRetry ✅)
- **Deliverables**: src/pipeline/stages/runStage2Classification.ts + tests
- **Acceptance**: category validation against EpicCategory, confidence clamping 0-1, readable comprehension summary, all tests pass

## Decisions
- (none yet)

## Errors
- (none yet)

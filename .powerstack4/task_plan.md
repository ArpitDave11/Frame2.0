# Task Plan: Epic Generator v5 — T-4.9 Stage 1 Implementation

## Goal
Implement Stage 1 (Deep Comprehension): calls AI with comprehension prompt, parses JSON response, validates ComprehensionOutput. Uses withRetry for transient errors. Never throws on recoverable errors.

## Current Phase
- **Phase**: T-4.9 Stage 1 Implementation
- **Status**: in_progress
- **Dependencies**: T-4.1 (types ✅), T-4.2 (prompt ✅), T-3.1-3.3 (callAI ✅), T-3.4 (withRetry ✅), T-1.2 (getScaledWordTarget ✅)
- **Deliverables**: src/pipeline/stages/runStage1Comprehension.ts + tests
- **Acceptance**: matches StageFunction signature, uses buildComprehensionPrompt, uses withRetry, JSON parsing with fallback, progress reporting, graceful errors, all tests pass

## Decisions
- (none yet)

## Errors
- (none yet)

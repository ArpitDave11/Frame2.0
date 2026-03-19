/**
 * Few-shot example for Stage 4 — Content Refinement.
 * Realistic output for refining an "Error Handling" section of a technical design.
 */

export const REFINEMENT_EXAMPLE = `{
  "sectionId": "error-handling-strategy",
  "title": "Error Handling & Recovery Strategy",
  "content": "## Error Handling & Recovery Strategy\\n\\nThe payment platform employs a tiered error handling strategy to ensure reliability and data consistency across all transaction flows.\\n\\n### Error Classification\\n\\nErrors are classified into three tiers:\\n\\n| Tier | Category | Examples | Response |\\n|------|----------|----------|----------|\\n| T1 | Transient | Network timeout, 503 from provider | Automatic retry with exponential backoff |\\n| T2 | Business Logic | Insufficient funds, card declined | Return error to caller, no retry |\\n| T3 | System Critical | Database connection lost, corrupted state | Circuit breaker, alert on-call, manual recovery |\\n\\n### Retry Policy\\n\\nTransient failures (T1) follow this retry configuration:\\n- **Max retries**: 3 attempts\\n- **Backoff**: Exponential with jitter (base: 500ms, max: 10s)\\n- **Idempotency**: All retried operations use idempotency keys to prevent duplicate charges\\n- **Circuit breaker**: Opens after 5 consecutive failures within 60s window; half-open probe after 30s\\n\\n### Dead Letter Queue\\n\\nFailed transactions that exhaust retries are routed to a DLQ for manual review:\\n- Events include full request context and failure trace\\n- Retention: 14 days\\n- Alert threshold: >10 DLQ messages in 5 minutes triggers PagerDuty incident",
  "formatUsed": "prose"
}`;

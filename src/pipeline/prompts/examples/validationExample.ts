/**
 * Few-shot example for Stage 6 — Validation Gate.
 * Realistic output for validating a payment processing epic (truncated).
 */

export const VALIDATION_EXAMPLE = `{
  "traceabilityMatrix": [
    { "requirementId": "REQ-001", "coveredBy": ["sec-gateway-design", "US-001"], "coverage": "full" },
    { "requirementId": "REQ-002", "coveredBy": ["sec-ledger"], "coverage": "partial" },
    { "requirementId": "REQ-003", "coveredBy": ["sec-fraud", "US-002"], "coverage": "full" },
    { "requirementId": "REQ-004", "coveredBy": [], "coverage": "missing" }
    // ... additional rows truncated
  ],
  "auditChecks": [
    { "checkName": "Section Completeness", "passed": true, "score": 8, "details": "All required sections present. Deployment section is thin but covers essentials." },
    { "checkName": "Requirements Coverage", "passed": true, "score": 7, "details": "12 of 14 requirements fully covered. REQ-004 (partial refunds) and REQ-011 (audit logging) have gaps." },
    { "checkName": "Internal Consistency", "passed": true, "score": 9, "details": "Terminology is consistent. Entity names match across sections and diagram." },
    { "checkName": "Specificity", "passed": true, "score": 8, "details": "Most metrics are concrete (200ms p99, 3 retries). Two acceptance criteria remain vague." },
    { "checkName": "Actionability", "passed": true, "score": 7, "details": "A team could implement most features. Fraud ML model training pipeline needs more detail." },
    { "checkName": "Technical Accuracy", "passed": true, "score": 9, "details": "Architecture patterns are sound. Correct use of circuit breaker and idempotency patterns." },
    { "checkName": "User Story Quality", "passed": true, "score": 8, "details": "Stories follow format correctly. Acceptance criteria are testable." },
    { "checkName": "Architecture Diagram Quality", "passed": true, "score": 8, "details": "Mermaid diagram is valid and covers all key components. Missing async message flows." },
    { "checkName": "Risk Coverage", "passed": false, "score": 6, "details": "Risks identified but mitigation strategies are incomplete for settlement service failover." },
    { "checkName": "Edge Case Coverage", "passed": false, "score": 5, "details": "Missing: currency conversion edge cases, timezone handling for settlement windows, partial payment failure rollback." },
    { "checkName": "Stakeholder Clarity", "passed": true, "score": 8, "details": "Technical audience well-served. Could improve executive summary for non-technical stakeholders." },
    { "checkName": "Format Compliance", "passed": true, "score": 9, "details": "Follows technical_design template. Section ordering matches convention." }
    // ... scores above are complete (all 12 checks shown)
  ],
  "overallScore": 77,
  "passed": false,
  "detectedFailures": [
    { "pattern": "Orphan Requirements", "severity": "major", "recommendation": "REQ-004 (partial refunds) has no covering section or user story. Add a 'Refund & Chargeback Handling' section and create US-013 for partial refund flow." },
    { "pattern": "Missing Error Handling", "severity": "critical", "recommendation": "Section sec-gateway-design describes provider integration but omits timeout handling for Adyen webhook callbacks. Add webhook retry and dead-letter queue design." },
    { "pattern": "Vague Acceptance Criteria", "severity": "minor", "recommendation": "US-005 criterion #2 says 'system handles errors gracefully'. Replace with: 'Given a provider 500 error, when payment fails, then the user sees error code PAY-E-1001 with message and retry option within 2 seconds'." }
  ],
  "feedback": [
    "Add a dedicated 'Refund & Chargeback Handling' section covering partial refund workflow, chargeback dispute process, and refund SLA (REQ-004 is currently uncovered).",
    "Expand sec-gateway-design with Adyen webhook timeout handling: define retry schedule, DLQ routing, and reconciliation for missed webhooks.",
    "Replace vague acceptance criterion in US-005 with measurable error response spec including error code, message format, and response time SLA.",
    "Add settlement service failover strategy to the Risk Coverage section: define fallback provider, data replay mechanism, and manual settlement procedure."
  ]
}`;

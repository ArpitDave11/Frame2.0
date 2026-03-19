/**
 * Few-shot example for Stage 1 — Deep Comprehension.
 * Realistic output for a "Payment Processing" epic (truncated for token budget).
 */

export const COMPREHENSION_EXAMPLE = `{
  "keyEntities": [
    { "name": "PaymentGateway", "type": "service", "relationships": ["OrderService", "FraudEngine", "LedgerDB"] },
    { "name": "OrderService", "type": "service", "relationships": ["PaymentGateway", "InventoryService"] },
    { "name": "FraudEngine", "type": "component", "relationships": ["PaymentGateway", "RiskRulesDB"] },
    { "name": "LedgerDB", "type": "data_store", "relationships": ["PaymentGateway", "ReconciliationJob"] },
    { "name": "ReconciliationJob", "type": "component", "relationships": ["LedgerDB", "SettlementService"] },
    { "name": "SettlementService", "type": "external_dependency", "relationships": ["ReconciliationJob"] }
    // ... additional entities truncated
  ],
  "detectedGaps": [
    "No retry policy defined for failed payment attempts",
    "Missing idempotency key strategy for duplicate charge prevention",
    "No PCI-DSS compliance requirements documented",
    "Chargeback handling workflow not specified"
  ],
  "implicitRisks": [
    "Settlement service is a single external dependency with no failover",
    "Fraud engine latency could block the critical payment path",
    "Currency conversion rounding errors may cause ledger drift over time"
  ],
  "semanticSections": [
    { "id": "sec-overview", "title": "Payment System Overview", "content": "High-level description of payment processing flow from checkout to settlement", "purpose": "Establish scope and context for the payment platform" },
    { "id": "sec-gateway-design", "title": "Gateway Architecture", "content": "Details of the PaymentGateway service including provider abstraction layer", "purpose": "Define the core payment routing and provider integration layer" },
    { "id": "sec-fraud", "title": "Fraud Detection", "content": "Rule-based and ML scoring for transaction risk assessment", "purpose": "Document the fraud prevention strategy and decision thresholds" }
    // ... additional sections truncated
  ],
  "extractedRequirements": [
    { "id": "REQ-001", "description": "System shall process credit card payments via Stripe and Adyen providers", "priority": "high", "source": "Section 1 - Overview" },
    { "id": "REQ-002", "description": "All transactions must be logged in the immutable ledger with double-entry bookkeeping", "priority": "high", "source": "Section 3 - Ledger Design" },
    { "id": "REQ-003", "description": "Fraud scoring must complete within 200ms p99 to avoid checkout abandonment", "priority": "high", "source": "Section 2 - Fraud Detection" },
    { "id": "REQ-004", "description": "System shall support partial refunds and split payments", "priority": "medium", "source": "Section 4 - Refunds" }
    // ... additional requirements truncated
  ],
  "gapAnalysis": [
    { "requirementId": "REQ-001", "gapType": "missing-error-handling", "severity": "critical", "suggestion": "Define retry policy with exponential backoff and circuit breaker for provider failures" },
    { "requirementId": "REQ-002", "gapType": "missing-nfr", "severity": "major", "suggestion": "Specify ledger data retention policy and archival strategy" },
    { "requirementId": "GENERAL", "gapType": "missing-security", "severity": "critical", "suggestion": "Add PCI-DSS compliance section covering tokenization, encryption at rest, and audit logging" }
    // ... additional gaps truncated
  ]
}`;

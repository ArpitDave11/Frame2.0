/**
 * Few-shot example for Stage 2 — Category Classification.
 * Realistic output for classifying a payment processing document.
 */

export const CLASSIFICATION_EXAMPLE = `{
  "primaryCategory": "technical_design",
  "confidence": 0.88,
  "categoryConfig": {
    "tone": "precise and technical",
    "primarySectionTypes": [
      "Architecture Overview",
      "Component Design",
      "Data Model",
      "API Contracts",
      "Error Handling Strategy",
      "Deployment Architecture"
    ],
    "formatPreferences": [
      "mermaid diagrams for architecture",
      "tables for API contracts",
      "prose for design rationale",
      "code blocks for schema definitions"
    ]
  },
  "reasoning": "The document is primarily focused on system architecture: it describes the PaymentGateway service design, component interactions between FraudEngine, LedgerDB, and SettlementService, and data flow patterns. While it includes some API endpoint details (suggesting api_specification) and references business KPIs like checkout abandonment rates (suggesting business_requirement), the core intent is to define HOW the payment system is built rather than WHAT endpoints it exposes or WHY the business needs it. The presence of architecture diagrams, component-level design decisions, and technology stack choices (Stripe/Adyen abstraction layer, PostgreSQL for ledger) strongly signals technical_design. api_specification was the closest alternative but was rejected because the document covers the full system architecture, not just API contracts."
}`;

/**
 * Few-shot example for Stage 5 — Mandatory Sections.
 * Realistic output for generating architecture diagram, user stories, and epic assembly (truncated).
 */

export const MANDATORY_EXAMPLE = `{
  "architectureDiagram": "graph TD\\n  subgraph Frontend\\n    WebApp[Web Application]\\n    MobileApp[Mobile App]\\n  end\\n  subgraph Backend\\n    APIGateway[API Gateway]\\n    PaymentSvc[Payment Service]\\n    FraudEngine[Fraud Engine]\\n    OrderSvc[Order Service]\\n  end\\n  subgraph DataStores\\n    LedgerDB[(Ledger DB)]\\n    RulesDB[(Rules DB)]\\n  end\\n  subgraph External\\n    Stripe[Stripe API]\\n    Adyen[Adyen API]\\n  end\\n  WebApp --> APIGateway\\n  MobileApp --> APIGateway\\n  APIGateway --> PaymentSvc\\n  APIGateway --> OrderSvc\\n  PaymentSvc --> FraudEngine\\n  PaymentSvc --> LedgerDB\\n  PaymentSvc --> Stripe\\n  PaymentSvc --> Adyen\\n  FraudEngine --> RulesDB\\n  OrderSvc --> PaymentSvc",
  "userStories": [
    {
      "id": "US-001",
      "title": "Process Credit Card Payment",
      "asA": "online shopper",
      "iWant": "to pay for my order using a credit card",
      "soThat": "I can complete my purchase and receive my items",
      "acceptanceCriteria": [
        "Given a valid card, when I submit payment, then the charge is processed within 3 seconds",
        "Given a declined card, when I submit payment, then I see a clear error message with the decline reason",
        "Given a network timeout, when the payment call fails, then the system retries up to 3 times before showing an error"
      ],
      "priority": "high"
    },
    {
      "id": "US-002",
      "title": "Fraud Risk Assessment",
      "asA": "payment operations manager",
      "iWant": "every transaction to be scored for fraud risk before processing",
      "soThat": "fraudulent charges are blocked without impacting legitimate customers",
      "acceptanceCriteria": [
        "Given a transaction, when fraud scoring completes, then the result is returned within 200ms p99",
        "Given a high-risk score (>0.85), when the transaction is flagged, then it is held for manual review",
        "Given a rule update, when new fraud rules are deployed, then they take effect within 5 minutes"
      ],
      "priority": "high"
    }
    // ... additional stories truncated
  ],
  "assembledEpic": {
    "title": "Payment Processing Platform",
    "sections": [
      { "id": "sec-overview", "title": "Overview", "content": "The payment processing platform enables..." },
      { "id": "sec-architecture", "title": "Architecture Overview", "content": "graph TD..." },
      { "id": "sec-user-stories", "title": "User Stories", "content": "US-001 through US-012..." }
      // ... additional sections truncated
    ],
    "metadata": {
      "totalSections": 8,
      "totalStories": 12,
      "diagramType": "graph TD",
      "generatedAt": "2025-01-15T10:30:00Z"
    }
  }
}`;

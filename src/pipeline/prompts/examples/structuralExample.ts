/**
 * Few-shot example for Stage 3 — Structural Assessment.
 * Realistic output for assessing a payment processing technical design.
 */

export const STRUCTURAL_EXAMPLE = `{
  "sectionScores": [
    { "sectionId": "sec-overview", "completeness": 7, "relevance": 9, "placement": 10, "overall": 8 },
    { "sectionId": "sec-gateway-design", "completeness": 8, "relevance": 9, "placement": 9, "overall": 9 },
    { "sectionId": "sec-fraud", "completeness": 5, "relevance": 8, "placement": 8, "overall": 7 },
    { "sectionId": "sec-ledger", "completeness": 6, "relevance": 9, "placement": 7, "overall": 7 },
    { "sectionId": "sec-deployment", "completeness": 3, "relevance": 7, "placement": 6, "overall": 5 }
    // ... additional section scores truncated
  ],
  "transformationPlan": [
    { "sectionId": "sec-overview", "action": "keep", "details": "Section is well-structured with clear scope definition and context. No changes needed." },
    { "sectionId": "sec-gateway-design", "action": "keep", "details": "Thorough component design with provider abstraction. Minor formatting improvements possible but not required." },
    { "sectionId": "sec-fraud", "action": "restructure", "details": "Content mixes rule-based and ML approaches without clear separation. Reorganize into subsections: Rule Engine, ML Scoring, Decision Thresholds, and Feedback Loop." },
    { "sectionId": "sec-ledger", "action": "restructure", "details": "Double-entry bookkeeping design is solid but interleaved with reconciliation logic. Separate into Ledger Schema and Reconciliation Process subsections." },
    { "sectionId": "sec-deployment", "action": "add", "details": "Currently a stub with only 'Deploy to Kubernetes'. Needs container specs, resource limits, health checks, rollout strategy, and environment configuration." }
    // ... additional actions truncated
  ],
  "missingSections": [
    "Security & Compliance",
    "Testing Strategy",
    "Monitoring & Observability",
    "Error Handling & Recovery"
  ]
}`;

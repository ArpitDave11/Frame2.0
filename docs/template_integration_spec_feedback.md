# Template Feedback: integration_spec (10 rounds)

## Critical Issues
- Security & Data Privacy wrongly optional — every integration needs auth/encryption (9/10)
- Integration Flows hint REST-centric, fails for async/event/batch patterns (8/10)
- Error Handling missing idempotency strategy column (7/10)
- Systems & Endpoints missing env scope and non-HTTP protocol support (6/10)
- Data Contract hint REST-only, no guidance for SAML/OIDC/EDI/FHIR (5/10)

## Key Changes
- Security & Data Privacy: promoted optional→required
- Performance & SLAs: "Latency Target"→"Freshness / Latency Target"
- Integration Flows: pattern-specific guidance (sync, async, batch)
- Error Handling: added Idempotency Strategy column
- Systems & Endpoints: added Env Scope column, renamed Base URL
- Data Contract: multi-protocol schema guidance
- User Stories: system personas explicitly encouraged
- Monitoring: B2B/EDI and batch-specific monitoring patterns

## New Optional Sections
- Scheduling & Orchestration, Event Catalog, Data Quality & Validation
- Webhook Contract, Audit & Compliance Logging, Schema Evolution & Compatibility

## 15 Consolidated Changes Applied

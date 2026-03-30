# categoryTemplates.json v6.0.0 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade all template hints to four-part formula, add Goals & Non-Goals to every category, expand expertRole/tone, add globalAntiPatterns, add ADR + RFC templates, add column specs to structured formats.

**Architecture:** Pure JSON + 2-line type change + 2-entry constant addition. No pipeline/UI/loader code changes. The `columns` field already exists in `RichSectionConfig` and `getFormatInstruction` already consumes it.

**Tech Stack:** TypeScript types, JSON template data, Vitest

---

### Task 1: Update EpicCategory type + EPIC_CATEGORIES constant

**Files:**
- Modify: `src/domain/types.ts:17-27`
- Modify: `src/domain/categoryConstants.ts:15-136`

**Step 1: Update the EpicCategory type**

In `src/domain/types.ts`, change the comment and add 2 new union members:

```typescript
/** The 10 epic category templates (BRD FR-4). Underscore convention matches
 *  categoryTemplates.json keys and pipeline Stage 2 classification output. */
export type EpicCategory =
  | 'general'
  | 'business_requirement'
  | 'technical_design'
  | 'feature_specification'
  | 'api_specification'
  | 'infrastructure_design'
  | 'migration_plan'
  | 'integration_spec'
  | 'architecture_decision_record'
  | 'lightweight_rfc';
```

**Step 2: Add 2 entries to EPIC_CATEGORIES**

In `src/domain/categoryConstants.ts`, add before the closing `];`:

```typescript
  {
    id: 'architecture_decision_record',
    label: 'Decision Record',
    icon: '⚖',
    secs: [
      'Context',
      'Decision Drivers',
      'Goals & Non-Goals',
      'Considered Options',
      'Decision Outcome',
      'Consequences',
    ],
  },
  {
    id: 'lightweight_rfc',
    label: 'Lightweight RFC',
    icon: '📄',
    secs: [
      'Problem Statement',
      'Goals & Non-Goals',
      'Proposed Solution',
      'Impact & Scope',
    ],
  },
```

**Step 3: Run type check**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors (there may be pre-existing ones unrelated to this change)

**Step 4: Commit**

```bash
git add src/domain/types.ts src/domain/categoryConstants.ts
git commit -m "feat: add architecture_decision_record + lightweight_rfc to EpicCategory"
```

---

### Task 2: Update tests for 10 categories

**Files:**
- Modify: `src/services/templates/templateLoader.test.ts:14-24,45-53,229-250`

**Step 1: Write the updated test with 10 categories**

Update `ALL_CATEGORIES` array at the top of the file:

```typescript
const ALL_CATEGORIES: EpicCategory[] = [
  'general',
  'technical_design',
  'business_requirement',
  'feature_specification',
  'api_specification',
  'infrastructure_design',
  'migration_plan',
  'integration_spec',
  'architecture_decision_record',
  'lightweight_rfc',
];
```

Update the test description from `'all 7 categories load without error'` to `'all 10 categories load without error'`.

Update `'all 7 categories × 3 complexity levels produce valid templates (21 combinations)'` to `'all 10 categories × 3 complexity levels produce valid templates (30 combinations)'`.

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/services/templates/templateLoader.test.ts 2>&1 | tail -20`
Expected: FAIL — `architecture_decision_record` and `lightweight_rfc` not found in JSON, falling back to technical_design (tests may pass due to fallback, but the validation will confirm once JSON is added)

**Step 3: Commit test changes**

```bash
git add src/services/templates/templateLoader.test.ts
git commit -m "test: update templateLoader tests for 10 categories"
```

---

### Task 3: Update _meta + general category

**Files:**
- Modify: `src/services/templates/categoryTemplates.json`

**Step 1: Update `_meta` block**

Replace the entire `_meta` object:

```json
"_meta": {
  "version": "6.0.0",
  "globalAntiPatterns": "Do not use filler phrases ('It is important to note...'), buzzwords without definitions ('leverage', 'robust', 'seamless'), or restate the problem as the solution. Every claim must include a specific number, system name, or verifiable detail. Do not repeat information from prior sections — reference it, don't restate it.",
  "globalDefaults": {
    "statusEmoji": {
      "draft": "📝",
      "in_progress": "🔄",
      "review": "👀",
      "approved": "✅",
      "archived": "📦"
    },
    "markdownFeatures": {
      "collapsibleSections": true,
      "mermaidDiagrams": true,
      "tables": true,
      "taskLists": true,
      "admonitions": false
    },
    "maxTitleLength": 100,
    "defaultPerPage": 20
  }
}
```

**Step 2: Replace the entire `general` category**

```json
"general": {
  "description": "General-purpose epics — the AI pipeline will classify and structure the content automatically",
  "tone": "Adaptive based on content. Match the formality and vocabulary to the detected domain.",
  "storyStyle": "context-dependent",
  "architectureFocus": "determined by content classification",
  "expertRole": "senior technical writer who adapts depth and vocabulary to match the content domain",
  "totalWordTarget": { "min": 1500, "max": 4000 },
  "diagramConfig": {
    "primary": { "type": "flowchart LR", "purpose": "System context showing main components and connections" },
    "secondary": { "type": "flowchart TD", "purpose": "Primary workflow with decision points and outcomes" }
  },
  "requiredSections": {
    "Overview": {
      "target": 200, "max": 400, "format": "prose",
      "hint": "Summarize the business problem, affected users, and proposed solution in 2-3 paragraphs. Example: 'The payments team processes 12K transactions/day through a batch ETL that introduces 12h data staleness, costing $180K/quarter in reconciliation effort.' Do not restate the title as the summary."
    },
    "Goals & Non-Goals": {
      "target": 200, "max": 400, "format": "bullet-list",
      "hint": "List 3-5 measurable goals with target metrics and owners. Then list 2-3 reasonable goals explicitly excluded and why. Example goal: 'Reduce P99 latency from 800ms to <200ms by Q3.' Example non-goal: 'Multi-region support — deferred to Q4; single-region meets current SLA.' Do not list non-goals that nobody would reasonably expect."
    },
    "Objectives": {
      "target": 200, "max": 400, "format": "bullet-list",
      "hint": "List 3-5 concrete objectives that directly support the goals, each with a measurable outcome. Example: 'Automate invoice reconciliation for EU region — target: zero manual touch for invoices under $10K.' Do not list objectives without specifying how completion will be measured."
    },
    "Requirements": {
      "target": 300, "max": 600, "format": "numbered-list",
      "hint": "List each requirement as a testable statement: 'The system SHALL [verb] [object] [constraint].' Assign a unique ID (REQ-001) and priority (P1/P2/P3) to each. Example: 'REQ-001 (P1): The system SHALL process batch uploads of up to 10K records within 30 seconds.' Do not list requirements without measurable acceptance criteria."
    },
    "Scope": {
      "target": 150, "max": 300, "format": "bullet-list",
      "hint": "Define explicit boundaries: list 3-5 in-scope items and 3-5 out-of-scope items. Example in-scope: 'Real-time dashboard for EU payment transactions.' Example out-of-scope: 'Historical data migration for pre-2024 records — handled by separate migration epic.' Do not leave scope ambiguous by omitting out-of-scope items."
    },
    "Success Metrics": {
      "target": 150, "max": 300, "format": "bullet-list",
      "hint": "Define 3-5 KPIs with baseline, target, measurement method, and measurement window. Example: 'Manual processing time: baseline 4.2h/day → target <30min/day, measured via ServiceNow ticket volume, 30-day rolling average.' Do not define metrics without specifying how they will be measured."
    },
    "Assumptions & Constraints": {
      "target": 100, "max": 200, "format": "bullet-list",
      "hint": "List validated assumptions with their validation method and constraints with their source. Example assumption: 'OAuth 2.0 token refresh is supported — confirmed with IdP team 2026-02-15.' Example constraint: 'Budget capped at $50K — approved by VP Engineering.' Do not list assumptions without stating how they were validated."
    },
    "User Stories": {
      "target": 400, "max": 800, "format": "mixed",
      "hint": "Write each story as 'As a [specific role], I want [concrete action] so that [measurable benefit].' Include 2-3 acceptance criteria per story. Example: 'As a finance analyst, I want to filter transactions by date range and currency so that I can reconcile daily settlement reports in under 10 minutes.' Do not write stories with vague personas like 'as a user'.",
      "count": { "min": 5, "max": 15 },
      "fields": ["title", "description", "acceptance_criteria"]
    }
  },
  "optionalSections": {
    "Architecture Overview": {
      "target": 200, "max": 0, "format": "mermaid", "diagram": "flowchart",
      "hint": "Draw a system context diagram showing the primary system, its data stores, external integrations, and user touchpoints. Label each connection with the protocol and data format. Example: 'API Gateway → Order Service (gRPC, protobuf).' Do not draw diagrams without labeling data flow directions."
    },
    "Risks": {
      "target": 150, "max": 300, "format": "risk-heat-map",
      "columns": ["Risk ID", "Description", "Probability", "Impact", "Risk Score", "Mitigation", "Owner"],
      "hint": "List top 5 risks ranked by probability × impact. Each must name a specific failure scenario and a concrete mitigation. Example: 'RISK-003: Vendor API rate limit exceeded during peak (P: High, I: Medium). Mitigation: Circuit breaker with local cache fallback, 5min TTL.' Do not list risks without naming the specific failure scenario."
    },
    "Dependencies": {
      "target": 100, "max": 200, "format": "bullet-list",
      "hint": "List each dependency with the owning team, expected delivery date, and fallback if delayed. Example: 'Auth service v3 migration (Platform team, ETA 2026-04-15) — fallback: use v2 with shim layer.' Do not list dependencies without naming the owning team."
    },
    "Timeline": {
      "target": 100, "max": 200, "format": "phase-table",
      "columns": ["Phase", "Duration", "Deliverables", "Dependencies", "Exit Criteria"],
      "hint": "Define 3-5 phases with concrete dates, deliverables, and exit criteria. Example: 'Phase 1 (2026-04-01 → 2026-04-15): API contracts finalized, reviewed by consuming teams. Exit: OpenAPI spec approved by 3 consumer teams.' Do not use vague durations like 'a few weeks'."
    }
  }
}
```

**Step 3: Verify JSON is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('src/services/templates/categoryTemplates.json','utf8')); console.log('Valid JSON')"`
Expected: `Valid JSON`

---

### Task 4: Update technical_design category

**Files:**
- Modify: `src/services/templates/categoryTemplates.json`

**Step 1: Replace the entire `technical_design` object**

```json
"technical_design": {
  "description": "Technical design documents for engineering teams — architecture, APIs, data models, and implementation plans",
  "tone": "Precise and technical. Lead with architecture decisions and trade-offs; define acronyms on first use.",
  "storyStyle": "engineering-focused with clear acceptance criteria",
  "architectureFocus": "system architecture and component design",
  "expertRole": "senior software architect with distributed systems expertise — write for tech leads and senior engineers",
  "totalWordTarget": { "min": 2000, "max": 5000 },
  "diagramConfig": {
    "primary": { "type": "flowchart LR", "purpose": "Component architecture showing services, databases, and data flows" },
    "secondary": { "type": "sequenceDiagram", "purpose": "Key interaction flow between the most important components" }
  },
  "requiredSections": {
    "Objective": {
      "target": 150, "max": 300, "format": "prose",
      "hint": "State the specific technical problem and the measurable outcome this design achieves. Example: 'Replace synchronous order processing (P99: 1.2s, 15% timeout rate) with async event-driven pipeline targeting P99 < 200ms and 0% timeouts.' Do not describe the solution here — only the problem and desired outcome."
    },
    "Goals & Non-Goals": {
      "target": 200, "max": 400, "format": "bullet-list",
      "hint": "List 3-5 measurable goals with target metrics. Then list 2-3 reasonable goals explicitly excluded and why. Example goal: 'Support 10K concurrent WebSocket connections with <50ms message delivery.' Example non-goal: 'Mobile push notifications — handled by notification service team in Q3.' Do not list non-goals that nobody would reasonably expect."
    },
    "Architecture Overview": {
      "target": 400, "max": 800, "format": "prose", "diagram": "flowchart",
      "hint": "Describe the system architecture with named components, their responsibilities, communication protocols, and data flows. Include a Mermaid diagram. Example: 'The Order Service (Go) publishes OrderCreated events to Kafka topic orders.created. The Fulfillment Worker (Python) consumes these events, validates inventory via gRPC call to Inventory Service, and writes to PostgreSQL.' Do not describe architecture without naming specific technologies and protocols."
    },
    "Technical Requirements": {
      "target": 300, "max": 600, "format": "bullet-list",
      "hint": "List each requirement as a testable statement: 'The system SHALL [verb] [object] [constraint].' Example: 'The system SHALL handle 500 RPS with P99 latency < 200ms on 2x c5.xlarge instances.' Do not list requirements without measurable thresholds."
    },
    "Data Model": {
      "target": 250, "max": 500, "format": "schema-table",
      "columns": ["Field", "Type", "Required", "Description", "Constraints"],
      "hint": "Define every entity with field names, types, constraints, and relationships. Example: 'orders.status: ENUM(pending, processing, shipped, cancelled) NOT NULL DEFAULT pending — transitions enforced by state machine, no direct UPDATE allowed.' Do not define fields without specifying type, nullability, and constraints."
    },
    "API Design": {
      "target": 300, "max": 600, "format": "endpoint-blocks",
      "hint": "Document each endpoint with method, path, auth, request/response schemas, status codes, and rate limits. Example: 'POST /api/v2/orders — Auth: Bearer JWT (scope: orders.write). Request: { items: OrderItem[], shippingAddress: Address }. Response: 201 { orderId: string, estimatedDelivery: ISO8601 }. Rate limit: 100/min per API key.' Do not document endpoints without request and response schemas."
    },
    "Implementation Plan": {
      "target": 300, "max": 600, "format": "phase-table",
      "columns": ["Phase", "Duration", "Deliverables", "Dependencies", "Exit Criteria"],
      "hint": "Break into 3-5 phases with concrete dates, deliverables, and exit criteria. Each phase must be independently deployable. Example: 'Phase 1 (2w): Event schema + Kafka topic provisioning. Exit: Schema registry updated, 3 consumer teams approved contract.' Do not define phases without exit criteria."
    },
    "Alternatives Considered": {
      "target": 200, "max": 400, "format": "comparison-table-and-prose",
      "columns": ["Option", "Pros", "Cons", "Effort", "Risk"],
      "hint": "List 2-3 alternatives evaluated and rejected. For each: state the approach, why it was considered, and the specific reason it was rejected. Example: 'Option B: DynamoDB — rejected because eventual consistency is unacceptable for financial transactions requiring ACID guarantees. Would require compensating transactions adding 3x code complexity.' Do not dismiss alternatives without specific technical rationale."
    },
    "User Stories": {
      "target": 400, "max": 800, "format": "mixed",
      "hint": "Write engineering-focused stories with clear acceptance criteria and story point estimates. Example: 'As a platform engineer, I want the order service to emit structured logs with trace IDs so that I can correlate requests across services in Datadog within 30 seconds.' Do not write stories without testable acceptance criteria.",
      "count": { "min": 8, "max": 20 },
      "fields": ["title", "description", "acceptance_criteria", "story_points"]
    },
    "Security & Non-Functional Requirements": {
      "target": 200, "max": 400, "format": "table",
      "columns": ["Category", "Requirement", "Target", "Measurement Method"],
      "hint": "Define performance, security, scalability, and reliability targets as testable constraints. Example: 'Availability: 99.95% measured monthly (excludes planned maintenance windows). Auth: All endpoints require JWT with RS256 signature, tokens expire in 15min.' Do not list NFRs without specifying how they will be measured or verified."
    }
  },
  "optionalSections": {
    "Sequence Diagrams": {
      "target": 150, "max": 0, "format": "mermaid-sequence", "diagram": "sequence",
      "hint": "Draw sequence diagrams for the 2-3 most complex interaction flows. Show actors, synchronous calls (solid arrows), async events (dashed arrows), and error paths. Example: 'Client ->> API Gateway: POST /orders; API Gateway ->> Auth Service: Validate JWT; Auth Service -->> API Gateway: 200 OK.' Do not draw sequences without showing error/timeout paths."
    },
    "Open Questions": {
      "target": 100, "max": 200, "format": "bullet-list",
      "hint": "List unresolved decisions with the owner, options under consideration, and target resolution date. Example: 'Q1: Should we use Kafka or SQS for order events? Owner: @platform-team. Options: Kafka (ordering guarantees) vs SQS (lower ops burden). Decision by: 2026-04-10.' Do not list questions without assigning an owner."
    },
    "Operational Impact": {
      "target": 150, "max": 300, "format": "prose",
      "hint": "Describe changes to on-call responsibilities, new runbooks needed, monitoring dashboards, and alert thresholds. Example: 'New PagerDuty service: order-pipeline. Alert: OrderProcessingLatencyP99 > 500ms for 5min → P2. Runbook: docs/runbooks/order-pipeline-recovery.md.' Do not add services without specifying alert thresholds and runbook locations."
    },
    "Error Handling": {
      "target": 200, "max": 400, "format": "error-table",
      "columns": ["HTTP Status", "Error Code", "Description", "Recovery Action", "Retry Strategy"],
      "hint": "Define every error code with HTTP status, structured error body, client recovery action, and retry strategy. Example: '503 SERVICE_UNAVAILABLE — upstream inventory service timeout. Recovery: retry with exponential backoff, max 3 attempts, circuit breaker opens after 5 consecutive failures.' Do not define errors without specifying whether clients should retry."
    },
    "Migration Strategy": {
      "target": 200, "max": 400, "format": "numbered-procedure",
      "hint": "Define step-by-step migration with validation gates and rollback triggers at each step. Example: 'Step 3: Enable dual-write to old and new tables. Validation: row count delta < 0.01% after 1 hour. Rollback trigger: delta > 1% or error rate > 0.5%.' Do not define migration steps without rollback criteria."
    },
    "Testing Strategy": {
      "target": 150, "max": 300, "format": "bullet-list",
      "hint": "Define test types, coverage targets, and specific test scenarios for critical paths. Example: 'Integration tests: order creation → payment → fulfillment flow. Coverage target: 80% line coverage on business logic, 100% on payment paths. Load test: 500 RPS sustained for 30min.' Do not list test types without coverage targets."
    },
    "Deployment Plan": {
      "target": 150, "max": 300, "format": "numbered-procedure",
      "hint": "Define deployment steps with health checks and rollback procedures. Example: 'Step 2: Deploy to canary (5% traffic). Health check: error rate < 0.1% for 15min. Rollback: revert deployment, drain canary connections, verify baseline metrics restored within 5min.' Do not define deployment steps without health check criteria."
    }
  }
}
```

---

### Task 5: Update business_requirement category

**Files:**
- Modify: `src/services/templates/categoryTemplates.json`

**Step 1: Replace the entire `business_requirement` object**

```json
"business_requirement": {
  "description": "Business requirement documents for stakeholders — objectives, KPIs, process flows, and RACI matrices",
  "tone": "Executive-friendly, outcome-focused. Lead with business impact and quantified metrics; minimize jargon.",
  "storyStyle": "business-value focused with measurable outcomes",
  "architectureFocus": "business process and organizational impact",
  "expertRole": "senior business analyst with enterprise process optimization expertise — write for technical leads and product managers",
  "totalWordTarget": { "min": 1500, "max": 4000 },
  "diagramConfig": {
    "primary": { "type": "flowchart TD", "purpose": "Business process flow with decision points, approval gates, and outcomes" },
    "secondary": { "type": "flowchart LR", "purpose": "System context showing business systems involved" }
  },
  "requiredSections": {
    "Executive Summary": {
      "target": 200, "max": 400, "format": "prose",
      "hint": "Summarize the business impact, cost/benefit, and recommended action in 3 paragraphs for executive audience. Example: 'Manual reconciliation costs $180K/quarter affecting 12 FTEs across 3 regions — automation reduces this by 85% with 6-month payback.' Do not use technical jargon without defining it."
    },
    "Goals & Non-Goals": {
      "target": 200, "max": 400, "format": "bullet-list",
      "hint": "List 3-5 measurable business goals with KPI targets and timeline. Then list 2-3 reasonable goals explicitly excluded and why. Example goal: 'Reduce invoice processing time from 5 days to same-day by Q3 2026.' Example non-goal: 'Vendor onboarding automation — separate initiative owned by Procurement.' Do not list non-goals that nobody would reasonably expect."
    },
    "Business Objective": {
      "target": 250, "max": 500, "format": "prose",
      "hint": "Describe the business problem with quantified evidence — affected user counts, error rates, dollar costs. Name the teams and processes involved. Example: '37% of support tickets (1,200/month) stem from manual data entry errors in the order management system, costing ~$180K/quarter in agent time and $45K in refunds.' Do not make business claims without supporting numbers."
    },
    "Scope": {
      "target": 200, "max": 400, "format": "bullet-list",
      "hint": "Define explicit boundaries with in-scope and out-of-scope items. Each out-of-scope item must explain why it's excluded. Example in-scope: 'Automated invoice matching for domestic suppliers (500+ vendors).' Example out-of-scope: 'International supplier onboarding — requires legal review of cross-border compliance, targeted for Phase 2.' Do not leave scope ambiguous."
    },
    "Assumptions & Constraints": {
      "target": 100, "max": 200, "format": "bullet-list",
      "hint": "List each assumption with its validation status and each constraint with its source authority. Example assumption: 'SAP S/4HANA upgrade complete by Q2 — confirmed by IT PMO on 2026-02-20.' Example constraint: 'No new headcount approved — must automate within existing team of 8.' Do not list assumptions without validation dates."
    },
    "Stakeholder Analysis": {
      "target": 200, "max": 400, "format": "raci-table",
      "columns": ["Role", "Responsible", "Accountable", "Consulted", "Informed"],
      "hint": "Build a RACI matrix for every deliverable. Name specific roles, not generic departments. Example: 'Data migration: R=Migration Lead (J. Smith), A=VP Engineering, C=DBA Team Lead + Security Architect, I=Product Owner + Customer Success.' Do not use department names without naming the responsible individual or role."
    },
    "Requirements": {
      "target": 300, "max": 600, "format": "numbered-list",
      "hint": "List prioritized business requirements with unique IDs and MoSCoW priority. Each must be independently testable. Example: 'BR-001 (Must): The system SHALL generate monthly compliance reports within 2 business days of month-end close, matching GL balances within $0.01.' Do not list requirements without specifying priority and acceptance criteria."
    },
    "Process Flow": {
      "target": 200, "max": 0, "format": "mermaid", "diagram": "flowchart",
      "hint": "Draw the proposed business process as a flowchart with decision diamonds, approval gates, and exception paths. Label each path with the business rule that governs it. Example: 'Invoice > $10K? → Yes → Manager Approval Required → Approved? → Yes → Schedule Payment.' Do not draw process flows without showing exception and rejection paths."
    },
    "User Stories": {
      "target": 300, "max": 600, "format": "mixed",
      "hint": "Write business-value focused stories with quantified benefits. Example: 'As a regional finance manager, I want automated daily reconciliation reports so that I can identify discrepancies within 24 hours instead of the current 5-day manual cycle, reducing month-end close by 2 days.' Do not write stories without quantifying the business benefit.",
      "count": { "min": 5, "max": 15 },
      "fields": ["title", "description", "acceptance_criteria"]
    }
  },
  "optionalSections": {
    "Current State (As-Is)": {
      "target": 200, "max": 400, "format": "prose",
      "hint": "Describe the current process with specific pain points, volumes, and costs. Example: 'The AP team manually keys 800 invoices/week into SAP, averaging 4.2 errors per 100 entries. Each error requires 45min to investigate and correct.' Do not describe the current state without quantifying its problems."
    },
    "Acceptance Criteria": {
      "target": 150, "max": 300, "format": "numbered-list",
      "hint": "Define formal conditions for stakeholder sign-off. Each criterion must be independently verifiable. Example: 'AC-001: 95% of invoices processed without manual intervention over a 30-day period.' Do not list criteria that cannot be objectively measured."
    },
    "Risk Assessment": {
      "target": 200, "max": 400, "format": "risk-heat-map",
      "columns": ["Risk ID", "Description", "Probability", "Impact", "Risk Score", "Mitigation", "Owner"],
      "hint": "List top 5 business risks ranked by probability × impact. Each must name a specific failure scenario and mitigation with an owner. Example: 'BR-RISK-02: Vendor API downtime during month-end close (P: Medium, I: High). Mitigation: Manual fallback process documented in runbook. Owner: AP Team Lead.' Do not list risks without naming failure scenarios."
    },
    "Cost-Benefit Analysis": {
      "target": 200, "max": 400, "format": "table",
      "columns": ["Item", "One-Time Cost", "Annual Cost", "Annual Benefit", "Payback Period"],
      "hint": "Quantify all costs (development, licensing, training, ops) and benefits (labor savings, error reduction, revenue impact) with a payback timeline. Example: 'Development: $120K one-time. Annual savings: $720K (12 FTEs × $60K). Payback: 2 months.' Do not present benefits without specifying how they were calculated."
    },
    "Timeline": {
      "target": 150, "max": 300, "format": "phase-table",
      "columns": ["Phase", "Duration", "Deliverables", "Dependencies", "Exit Criteria"],
      "hint": "Define 3-5 phases with concrete dates and business milestones. Example: 'Phase 1 (2026-04-01 → 2026-05-15): Pilot with 50 domestic suppliers. Exit: <2% error rate over 2 weeks.' Do not use vague timelines without specific dates."
    },
    "Success Metrics": {
      "target": 150, "max": 300, "format": "slo-table",
      "columns": ["Metric", "Baseline", "Target", "Measurement Method", "Review Cadence"],
      "hint": "Define KPIs with baseline, target, measurement method, and review cadence. Example: 'Invoice processing time: baseline 5 days → target same-day. Measured: SAP workflow timestamp delta. Review: weekly dashboard, monthly executive report.' Do not define metrics without specifying baseline values."
    },
    "Dependencies": {
      "target": 100, "max": 200, "format": "bullet-list",
      "hint": "List each dependency with the owning team, expected delivery date, and impact if delayed. Example: 'SAP S/4HANA upgrade (IT Infrastructure, ETA 2026-06-01) — if delayed, manual workaround adds 2 FTE for bridge period.' Do not list dependencies without naming the owning team and delivery date."
    }
  }
}
```

---

### Task 6: Update feature_specification category

**Files:**
- Modify: `src/services/templates/categoryTemplates.json`

**Step 1: Replace the entire `feature_specification` object**

```json
"feature_specification": {
  "description": "Feature specification documents — detailed feature design with UX flows, edge cases, and acceptance criteria",
  "tone": "Clear and user-centric. Describe behavior from the user's perspective; name specific screens, actions, and states.",
  "storyStyle": "user-centric with detailed acceptance criteria",
  "architectureFocus": "feature behavior and user experience",
  "expertRole": "senior product manager with UX and data-driven prioritization expertise — write for designers, developers, and QA",
  "totalWordTarget": { "min": 1500, "max": 4000 },
  "diagramConfig": {
    "primary": { "type": "flowchart TD", "purpose": "User journey showing screens, actions, decision points, and error states" },
    "secondary": { "type": "stateDiagram-v2", "purpose": "Feature state transitions (e.g., draft → submitted → approved → active)" }
  },
  "requiredSections": {
    "Feature Overview": {
      "target": 200, "max": 400, "format": "prose",
      "hint": "Describe what the feature does, who uses it, and the key user problem it solves. Include the business metric it impacts. Example: 'The bulk export feature allows finance analysts to download up to 50K transaction records as CSV, reducing the current manual copy-paste workflow from 2 hours to 30 seconds.' Do not describe the feature without naming the target user and the problem it solves."
    },
    "Goals & Non-Goals": {
      "target": 200, "max": 400, "format": "bullet-list",
      "hint": "List 3-5 measurable goals with target metrics. Then list 2-3 reasonable goals explicitly excluded and why. Example goal: 'Support export of up to 50K rows in <10 seconds.' Example non-goal: 'Scheduled/recurring exports — deferred to v2 based on user feedback.' Do not list non-goals that nobody would reasonably expect."
    },
    "User Personas": {
      "target": 150, "max": 300, "format": "bullet-list",
      "hint": "Define 2-3 distinct user personas with their role, technical skill level, and primary use case for this feature. Example: 'Finance Analyst (non-technical): Exports monthly transaction reports for reconciliation. Uses feature 20+ times/month. Needs: simple UI, preset date ranges, CSV format.' Do not define personas without specifying their skill level and frequency of use."
    },
    "Functional Requirements": {
      "target": 300, "max": 600, "format": "numbered-list",
      "hint": "List each requirement with a unique ID, priority, and testable acceptance criterion. Example: 'FR-004 (P1): The export SHALL include a progress indicator showing percentage complete and estimated time remaining for exports > 1000 rows.' Do not list requirements without specifying the trigger condition and expected behavior."
    },
    "Out of Scope": {
      "target": 100, "max": 200, "format": "bullet-list",
      "hint": "List features explicitly excluded from this release with reasoning and target timeline. Example: 'PDF export — user research shows 92% of users need CSV only. Will revisit in v2 if requested by >20% of users.' Do not exclude features without explaining the reasoning."
    },
    "User Flows": {
      "target": 200, "max": 0, "format": "mermaid", "diagram": "flowchart",
      "hint": "Draw primary and secondary user flows as flowcharts. Show every screen, user action, system response, and error state. Label decision points with the condition. Example: 'User clicks Export → Row count > 10K? → Yes → Show progress modal → Download ready → Auto-download CSV.' Do not draw flows without showing error and empty states."
    },
    "Edge Cases": {
      "target": 200, "max": 400, "format": "table",
      "columns": ["Scenario", "Trigger", "Expected Behavior", "Priority"],
      "hint": "List edge cases with specific trigger conditions and expected behavior. Example: 'User exports while another export is in progress → Show toast: \"Export already running. Please wait or cancel current export.\" → Disable export button until complete.' Do not list edge cases without specifying the exact system behavior."
    },
    "User Stories": {
      "target": 400, "max": 800, "format": "mixed",
      "hint": "Write user-centric stories with specific screen names, actions, and measurable outcomes. Example: 'As a finance analyst on the Transactions page, I want to select a custom date range and click Export CSV so that I receive a file within 10 seconds containing all matching transactions with headers.' Do not write stories with vague actions like 'manage data'.",
      "count": { "min": 8, "max": 20 },
      "fields": ["title", "description", "acceptance_criteria", "story_points"]
    }
  },
  "optionalSections": {
    "Release Criteria": {
      "target": 100, "max": 200, "format": "bullet-list",
      "hint": "Define minimum acceptable quality for launch. Example: 'Zero P1 bugs. Export success rate > 99.5% over 48h canary. Page load time < 2s with export button visible. Accessibility: all controls keyboard-navigable.' Do not list release criteria that cannot be objectively measured before launch."
    },
    "UI/UX Guidelines": {
      "target": 200, "max": 400, "format": "prose",
      "hint": "Describe layout, interaction patterns, and visual design constraints. Reference the design system components by name. Example: 'Use the DataTable component with sortable column headers. Export button uses the SecondaryAction variant, positioned in the table toolbar right-aligned with the filter controls.' Do not describe UI without referencing specific design system components."
    },
    "Analytics Requirements": {
      "target": 150, "max": 300, "format": "table",
      "columns": ["Event Name", "Trigger", "Properties", "Dashboard"],
      "hint": "Define every trackable event with trigger, properties, and which dashboard consumes it. Example: 'export_initiated: User clicks Export button. Properties: { format, rowCount, dateRange, userId }. Dashboard: Product → Feature Usage.' Do not define events without specifying which dashboard or report consumes them."
    },
    "Accessibility": {
      "target": 100, "max": 200, "format": "bullet-list",
      "hint": "List specific WCAG 2.1 AA requirements for this feature. Example: 'Export progress modal must be announced to screen readers via aria-live=\"polite\". Export button must have aria-label including current filter context.' Do not list generic accessibility goals without feature-specific implementation details."
    },
    "Internationalization": {
      "target": 100, "max": 200, "format": "bullet-list",
      "hint": "List specific i18n requirements including text, number formatting, and RTL considerations. Example: 'CSV export must use locale-appropriate decimal separators (comma for EU, period for US). Date columns must export in ISO 8601 regardless of display locale.' Do not list i18n requirements without specifying affected data formats."
    }
  }
}
```

---

### Task 7: Update api_specification category

**Files:**
- Modify: `src/services/templates/categoryTemplates.json`

**Step 1: Replace the entire `api_specification` object**

```json
"api_specification": {
  "description": "API specification documents — endpoints, schemas, authentication, rate limits, and versioning",
  "tone": "Specification-driven with developer empathy. Every endpoint must be copy-paste implementable from the doc alone.",
  "storyStyle": "API-consumer focused with contract clarity",
  "architectureFocus": "API contract and integration patterns",
  "expertRole": "senior API architect with RESTful and event-driven design expertise — write for API consumers and integration engineers",
  "totalWordTarget": { "min": 2000, "max": 5000 },
  "diagramConfig": {
    "primary": { "type": "sequenceDiagram", "purpose": "Primary API request/response flow including auth, validation, and error paths" },
    "secondary": { "type": "flowchart LR", "purpose": "API topology showing gateway, services, and data stores" }
  },
  "requiredSections": {
    "API Overview": {
      "target": 200, "max": 400, "format": "prose",
      "hint": "State the API's purpose, base URL, versioning scheme, and supported content types. Example: 'The Orders API (v2) provides CRUD operations for order management. Base URL: https://api.example.com/v2. Content-Type: application/json. Versioning: URL path (/v2/). Rate limit: 1000 req/min per API key.' Do not describe the API without specifying base URL and versioning scheme."
    },
    "Goals & Non-Goals": {
      "target": 150, "max": 300, "format": "bullet-list",
      "hint": "List 3-5 measurable API design goals. Then list 2-3 excluded capabilities. Example goal: 'Support bulk operations of up to 1000 items per request.' Example non-goal: 'GraphQL endpoint — REST covers all current consumer needs.' Do not list non-goals that nobody would reasonably expect."
    },
    "Authentication": {
      "target": 200, "max": 400, "format": "prose",
      "hint": "Document auth methods, token lifecycle, scopes, and error responses for auth failures. Example: 'Bearer token via OAuth 2.0 client_credentials flow. Tokens expire in 3600s. Required scope: orders.read for GET, orders.write for POST/PUT/DELETE. Auth failure returns 401 with WWW-Authenticate header.' Do not document auth without specifying token expiry and required scopes."
    },
    "Endpoints": {
      "target": 500, "max": 1000, "format": "endpoint-blocks",
      "hint": "Document each endpoint with method, path, description, auth scope, request/response schemas (with example values), all status codes, and rate limit. Example: 'GET /v2/orders/{orderId} — Scope: orders.read. Response 200: { id: \"ord_abc123\", status: \"shipped\", items: [...] }. 404: { error: \"ORDER_NOT_FOUND\", message: \"Order {orderId} does not exist\" }.' Do not document endpoints without showing example request and response bodies."
    },
    "Data Models": {
      "target": 300, "max": 600, "format": "schema-table",
      "columns": ["Field", "Type", "Required", "Description", "Constraints"],
      "hint": "Define every request/response model with field types, validation rules, and example values. Example: 'quantity: integer, required, min: 1, max: 9999. Example: 3. Validation error: { field: \"quantity\", message: \"Must be between 1 and 9999\" }.' Do not define models without specifying validation rules and example values."
    },
    "Error Handling": {
      "target": 200, "max": 400, "format": "error-table",
      "columns": ["HTTP Status", "Error Code", "Description", "Recovery Action", "Retry Strategy"],
      "hint": "Define every error code with HTTP status, structured error body, and client recovery action. Example: '429 RATE_LIMITED — retry after Retry-After header value (seconds). Body: { error: \"RATE_LIMITED\", retryAfter: 30, limit: 1000, remaining: 0 }.' Do not list error codes without specifying whether clients should retry and how."
    },
    "Versioning Strategy": {
      "target": 100, "max": 200, "format": "prose",
      "hint": "Define how API versions are managed, deprecated, and sunset. Example: 'URL path versioning (/v2/). Deprecation: 6-month notice via Sunset header (RFC 8594). v1 sunset: 2026-09-01. Breaking changes require new major version; additive changes are backwards-compatible.' Do not describe versioning without specifying the deprecation timeline and sunset process."
    },
    "User Stories": {
      "target": 300, "max": 600, "format": "mixed",
      "hint": "Write API consumer stories that specify the integration pattern. Example: 'As a mobile app developer, I want to poll GET /v2/orders/{id}/status every 30s so that I can update the order tracking UI without WebSocket complexity.' Do not write stories without specifying the HTTP method and endpoint.",
      "count": { "min": 5, "max": 15 },
      "fields": ["title", "description", "acceptance_criteria"]
    }
  },
  "optionalSections": {
    "Idempotency": {
      "target": 100, "max": 200, "format": "prose",
      "hint": "Specify which endpoints support idempotent requests and how. Example: 'POST /orders accepts Idempotency-Key header (UUID v4). Keys are valid for 24h. Duplicate requests return the original response with 200 (not 201).' Do not describe idempotency without specifying key format and TTL."
    },
    "Rate Limiting": {
      "target": 150, "max": 300, "format": "table",
      "columns": ["Endpoint", "Limit", "Window", "Scope", "Burst Allowance"],
      "hint": "Define rate limits per endpoint or tier with burst allowances. Example: 'POST /orders: 100/min per API key, burst: 20/s. Response headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset (Unix epoch).' Do not define rate limits without specifying the response headers clients should read."
    },
    "Pagination": {
      "target": 100, "max": 200, "format": "prose",
      "hint": "Define the pagination strategy with parameters, defaults, and limits. Example: 'Cursor-based pagination. Params: ?cursor={opaque_token}&limit={1-100, default 20}. Response includes: { data: [...], pagination: { nextCursor: \"...\", hasMore: true } }.' Do not describe pagination without specifying max page size and default."
    },
    "Webhooks": {
      "target": 150, "max": 300, "format": "endpoint-blocks",
      "hint": "Document webhook events with payload schema, delivery guarantees, and retry policy. Example: 'Event: order.shipped. Payload: { event: \"order.shipped\", data: { orderId, trackingNumber, carrier } }. Delivery: at-least-once, 3 retries with exponential backoff (1s, 10s, 60s). Signature: HMAC-SHA256 in X-Webhook-Signature header.' Do not document webhooks without specifying retry policy and signature verification."
    },
    "SDK Examples": {
      "target": 200, "max": 400, "format": "code-block",
      "hint": "Show working code examples in 2-3 languages (Python, JavaScript, cURL). Each example must be copy-paste runnable. Example: 'curl -X POST https://api.example.com/v2/orders -H \"Authorization: Bearer $TOKEN\" -H \"Content-Type: application/json\" -d \"{...}\".' Do not show SDK examples that require additional setup not mentioned in the snippet."
    },
    "Migration Guide": {
      "target": 150, "max": 300, "format": "numbered-procedure",
      "hint": "Step-by-step guide for migrating from the previous API version. Example: 'Step 1: Update base URL from /v1/ to /v2/. Step 2: Replace \"customer_id\" with \"customerId\" (camelCase). Step 3: Handle new 429 responses (v1 returned 503).' Do not write migration steps without showing the before/after for each breaking change."
    }
  }
}
```

---

### Task 8: Update infrastructure_design category

**Files:**
- Modify: `src/services/templates/categoryTemplates.json`

**Step 1: Replace the entire `infrastructure_design` object**

```json
"infrastructure_design": {
  "description": "Infrastructure design documents — cloud architecture, networking, CI/CD, monitoring, and disaster recovery",
  "tone": "Operational and infrastructure-focused. Specify exact resource sizes, regions, and configurations; no hand-waving.",
  "storyStyle": "operations-focused with SLO targets",
  "architectureFocus": "infrastructure topology and operations",
  "expertRole": "senior infrastructure architect with cloud-native and SRE expertise — write for platform engineers and DevOps",
  "totalWordTarget": { "min": 2000, "max": 5000 },
  "diagramConfig": {
    "primary": { "type": "flowchart LR", "purpose": "Infrastructure layout showing compute, storage, networking, and external services" },
    "secondary": { "type": "flowchart TD", "purpose": "CI/CD pipeline stages from commit to production" }
  },
  "requiredSections": {
    "Infrastructure Overview": {
      "target": 200, "max": 400, "format": "prose",
      "hint": "Describe the infrastructure goals, target cloud provider, and key architectural decisions. Example: 'Multi-AZ deployment on AWS eu-west-1 targeting 99.95% availability. Primary compute: EKS 1.29 with Karpenter autoscaling. Data: Aurora PostgreSQL 15.4 with read replicas.' Do not describe infrastructure without naming the cloud provider, region, and key service versions."
    },
    "Goals & Non-Goals": {
      "target": 200, "max": 400, "format": "bullet-list",
      "hint": "List 3-5 measurable infrastructure goals with SLO targets. Then list 2-3 excluded capabilities. Example goal: '99.95% availability with <5min RTO for single-AZ failures.' Example non-goal: 'Multi-region active-active — cost prohibitive for current traffic; single-region with cross-region backup meets SLA.' Do not list non-goals that nobody would reasonably expect."
    },
    "Architecture Diagram": {
      "target": 300, "max": 0, "format": "mermaid", "diagram": "flowchart",
      "hint": "Draw the complete infrastructure topology showing compute, storage, networking, load balancers, and external services. Label each component with its service type and size. Example: 'ALB → EKS (3x m5.xlarge) → Aurora PostgreSQL (db.r6g.xlarge, 2 read replicas) → S3 (lifecycle: 90d → Glacier).' Do not draw infrastructure diagrams without specifying instance types and sizes."
    },
    "Compute & Storage": {
      "target": 250, "max": 500, "format": "table",
      "columns": ["Component", "Service", "Size/Type", "Count", "Monthly Cost", "Scaling Policy"],
      "hint": "Specify every compute and storage resource with exact types, sizes, and scaling policies. Example: 'API servers: EKS m5.xlarge (4 vCPU, 16GB), min 3 / max 12 nodes, scale at 70% CPU. Database: Aurora db.r6g.xlarge, 1 writer + 2 readers, storage auto-scaling to 1TB.' Do not list resources without specifying instance type, count, and scaling trigger."
    },
    "Networking": {
      "target": 200, "max": 400, "format": "prose",
      "hint": "Describe VPC design, subnets, security groups, and traffic flow. Example: 'VPC 10.0.0.0/16 with 3 public subnets (10.0.1-3.0/24) and 3 private subnets (10.0.11-13.0/24). ALB in public subnets, EKS nodes in private. NAT Gateway per AZ for outbound. Security groups: ALB→EKS port 8080 only.' Do not describe networking without specifying CIDR ranges and security group rules."
    },
    "CI/CD Pipeline": {
      "target": 200, "max": 0, "format": "mermaid", "diagram": "flowchart",
      "hint": "Draw the full CI/CD pipeline from code commit to production deployment. Label each stage with tool, duration, and pass criteria. Example: 'Push → GitLab CI lint+unit (3min) → Build Docker (2min) → Deploy staging (1min) → Integration tests (5min) → Manual approval → Deploy prod (canary 5% → 15min soak → 100%).' Do not draw pipelines without specifying stage duration and pass/fail criteria."
    },
    "Monitoring & Alerting": {
      "target": 200, "max": 400, "format": "slo-table",
      "columns": ["Service", "SLI", "SLO Target", "Window", "Error Budget", "Alert Threshold"],
      "hint": "Define SLOs for every service with SLI, target, measurement window, and alert thresholds. Example: 'API Gateway: SLI=successful requests/total requests. SLO=99.9% over 30 days. Error budget: 43.2min/month. Alert: burn rate >2x for 1h → P2, >10x for 5min → P1.' Do not define SLOs without specifying error budgets and alert thresholds."
    },
    "Disaster Recovery": {
      "target": 200, "max": 400, "format": "numbered-procedure",
      "hint": "Define RTO and RPO targets per service tier, then step-by-step failover and recovery procedures. Example: 'Tier 1 (payments): RTO 5min, RPO 0 (sync replication). Failover: Route53 health check triggers automatic AZ failover. Recovery: Step 1: Verify health check green. Step 2: Validate data consistency. Step 3: Resume traffic.' Do not define DR without specifying RTO/RPO targets per tier and exact recovery steps."
    },
    "User Stories": {
      "target": 300, "max": 600, "format": "mixed",
      "hint": "Write operations-focused stories with SLO targets. Example: 'As an on-call engineer, I want automated AZ failover with PagerDuty notification so that single-AZ failures recover within 5 minutes without manual intervention.' Do not write stories without specifying the operational scenario and target SLO.",
      "count": { "min": 5, "max": 15 },
      "fields": ["title", "description", "acceptance_criteria"]
    },
    "Security": {
      "target": 200, "max": 400, "format": "bullet-list",
      "hint": "List specific security controls with implementation details. Example: 'Encryption at rest: AES-256 via AWS KMS (customer-managed key, annual rotation). Encryption in transit: TLS 1.3 minimum, HSTS with 1-year max-age. Secrets: AWS Secrets Manager with IAM role-based access, no env vars.' Do not list security controls without specifying the implementation mechanism."
    }
  },
  "optionalSections": {
    "Capacity Planning": {
      "target": 150, "max": 300, "format": "table",
      "columns": ["Resource", "Current Usage", "6-Month Projection", "12-Month Projection", "Scaling Action"],
      "hint": "Project growth for compute, storage, and network over 6 and 12 months. Example: 'API traffic: current 500 RPS → 6mo: 1200 RPS → 12mo: 2500 RPS. Action: Enable Karpenter spot instances at 800 RPS threshold.' Do not project growth without specifying the data source for projections."
    },
    "Cost Estimation": {
      "target": 150, "max": 300, "format": "table",
      "columns": ["Component", "Monthly Cost", "Annual Cost", "Notes"],
      "hint": "Break down monthly and annual costs per component. Example: 'EKS: $1,200/mo (3x m5.xlarge on-demand). Aurora: $800/mo (1 writer + 2 readers). Data transfer: $200/mo (est. 500GB/mo egress).' Do not estimate costs without specifying instance types and usage assumptions."
    },
    "Scaling Strategy": {
      "target": 150, "max": 300, "format": "prose",
      "hint": "Define auto-scaling policies with triggers, cooldowns, and limits. Example: 'Horizontal pod autoscaler: target 70% CPU, min 3 / max 20 pods, scale-up cooldown 60s, scale-down cooldown 300s. Karpenter: spot instances for non-critical workloads, on-demand for stateful services.' Do not define scaling without specifying cooldown periods and instance limits."
    }
  }
}
```

---

### Task 9: Update migration_plan category

**Files:**
- Modify: `src/services/templates/categoryTemplates.json`

**Step 1: Replace the entire `migration_plan` object**

```json
"migration_plan": {
  "description": "Migration plan documents — data migration, system migration, cutover planning, and rollback strategies",
  "tone": "Methodical and risk-aware. Every step must have a validation checkpoint and a rollback trigger.",
  "storyStyle": "migration-step focused with rollback criteria",
  "architectureFocus": "migration process and data integrity",
  "expertRole": "senior migration architect with enterprise data migration expertise — write for DBAs, ops, and project managers",
  "totalWordTarget": { "min": 1500, "max": 4000 },
  "diagramConfig": {
    "primary": { "type": "flowchart TD", "purpose": "Migration process steps with validation gates, rollback points, and go/no-go decisions" },
    "secondary": { "type": "flowchart LR", "purpose": "Current state (left) to target state (right) architecture transition" }
  },
  "requiredSections": {
    "Migration Overview": {
      "target": 200, "max": 400, "format": "prose",
      "hint": "Describe what is being migrated, from where to where, the business driver, and the target completion date. Example: 'Migrate 2.3TB of order data from on-premises Oracle 19c to Aurora PostgreSQL 15.4 in AWS eu-west-1. Driver: Oracle license renewal ($450K/yr) expires 2026-09-01. Target: complete migration by 2026-08-01 with 4-week buffer.' Do not describe migrations without naming source/target systems and the business driver."
    },
    "Goals & Non-Goals": {
      "target": 200, "max": 400, "format": "bullet-list",
      "hint": "List 3-5 measurable migration goals. Then list 2-3 excluded items. Example goal: 'Zero data loss — 100% row count parity verified post-migration.' Example non-goal: 'Application refactoring — app changes limited to connection string swap; no code modernization in scope.' Do not list non-goals that nobody would reasonably expect."
    },
    "Current State": {
      "target": 200, "max": 400, "format": "prose",
      "hint": "Document the source system with version, data volume, schema complexity, and current performance. Example: 'Oracle 19c on Dell PowerEdge R740 (32 cores, 256GB RAM). 2.3TB across 847 tables, 12 schemas. 3 batch jobs (nightly ETL, hourly CDC, weekly aggregation). P99 query latency: 45ms.' Do not describe the source without specifying version, data volume, and table count."
    },
    "Target State": {
      "target": 200, "max": 400, "format": "prose",
      "hint": "Document the destination system with version, architecture, and expected performance improvements. Example: 'Aurora PostgreSQL 15.4 (db.r6g.2xlarge, Multi-AZ). Expected: 30% faster reads via read replicas, automated backups, $280K/yr savings vs Oracle licensing.' Do not describe the target without specifying the expected performance and cost improvements."
    },
    "Data Mapping": {
      "target": 300, "max": 600, "format": "mapping-table",
      "columns": ["Source Field", "Source Type", "Target Field", "Target Type", "Transformation", "Validation"],
      "hint": "Map every source field to its target with transformation rules and validation checks. Example: 'Source: orders.created_date (DATE) → Target: orders.created_at (TIMESTAMPTZ) — Transform: CAST with UTC timezone. Validation: row count match, min/max date range preserved.' Do not list mappings without specifying data type conversions and validation rules."
    },
    "Migration Steps": {
      "target": 300, "max": 600, "format": "numbered-procedure",
      "hint": "Define step-by-step migration with duration, validation gate, and rollback trigger at each step. Example: 'Step 3 (Est: 4h): Enable dual-write to Oracle and Aurora. Validation: row count delta < 0.01% after 1h. Rollback trigger: delta > 1% OR write error rate > 0.5% → disable Aurora writes, investigate.' Do not define steps without estimated duration and rollback trigger."
    },
    "Validation Criteria": {
      "target": 150, "max": 300, "format": "numbered-list",
      "hint": "Define go/no-go criteria with specific thresholds. Example: 'V-001: Row count parity — source vs target delta = 0 for all 847 tables. V-002: Checksum validation — MD5 hash match on 10 randomly sampled tables. V-003: Application smoke test — all 15 critical user flows pass in staging.' Do not define validation without specifying exact thresholds and pass/fail criteria."
    },
    "Rollback Plan": {
      "target": 200, "max": 400, "format": "numbered-procedure",
      "hint": "Define rollback steps with triggers, estimated duration, and data reconciliation procedure. Example: 'Trigger: any V-001 through V-003 criteria fails OR P1 incident within 48h of cutover. Step 1 (5min): Switch DNS back to Oracle endpoint. Step 2 (30min): Replay Aurora WAL to Oracle for writes during cutover window. Step 3: Verify application health.' Do not define rollback without specifying the trigger conditions and estimated time per step."
    },
    "User Stories": {
      "target": 300, "max": 600, "format": "mixed",
      "hint": "Write migration-focused stories with rollback awareness. Example: 'As a DBA, I want automated row count validation after each migration batch so that I can detect data loss within 5 minutes and trigger rollback before the next batch starts.' Do not write stories without specifying the validation or rollback mechanism.",
      "count": { "min": 5, "max": 15 },
      "fields": ["title", "description", "acceptance_criteria"]
    }
  },
  "optionalSections": {
    "Hypercare Plan": {
      "target": 100, "max": 200, "format": "prose",
      "hint": "Define the post-migration monitoring period with staffing, escalation, and exit criteria. Example: 'Hypercare: 2 weeks post-cutover. Staffing: 2 DBAs on-call 24/7. Escalation: any P1/P2 → migration lead within 15min. Exit criteria: zero data-related incidents for 5 consecutive business days.' Do not define hypercare without specifying duration and exit criteria."
    },
    "Dry Run Plan": {
      "target": 100, "max": 200, "format": "numbered-procedure",
      "hint": "Define pre-cutover rehearsal with success criteria. Example: 'Dry run on staging: full data copy (2.3TB) using pg_dump | pg_restore. Success: completes in <8h, all validation criteria pass, application smoke tests green. Schedule: 2 weeks before cutover.' Do not plan dry runs without specifying success criteria and timing."
    },
    "Risk Assessment": {
      "target": 200, "max": 400, "format": "risk-heat-map",
      "columns": ["Risk ID", "Description", "Probability", "Impact", "Risk Score", "Mitigation", "Owner"],
      "hint": "List top 5 migration risks with specific failure scenarios. Example: 'MIG-RISK-03: Oracle CDC lag exceeds 1h during peak (P: Medium, I: High). Mitigation: Pre-scale Oracle redo log buffer to 2GB, schedule cutover for Sunday 02:00 UTC low-traffic window. Owner: DBA Lead.' Do not list risks without naming specific failure scenarios."
    },
    "Testing Strategy": {
      "target": 150, "max": 300, "format": "bullet-list",
      "hint": "Define test types, data subsets, and pass criteria for each migration phase. Example: 'Phase 1 validation: 100% row count match + checksum on orders, customers, products tables. Performance test: replay 24h production query log against Aurora, P99 must be within 20% of Oracle baseline.' Do not list test types without specifying pass/fail thresholds."
    },
    "Communication Plan": {
      "target": 100, "max": 200, "format": "raci-table",
      "columns": ["Milestone", "Audience", "Channel", "Owner", "Timing"],
      "hint": "Define stakeholder communications for each migration milestone. Example: 'Cutover start: All engineering → Slack #migration-updates → Migration Lead → T-2h. Cutover complete: VP Engineering + Product → Email + Slack → Migration Lead → T+1h.' Do not plan communications without specifying channel and timing."
    },
    "Cutover Checklist": {
      "target": 150, "max": 300, "format": "bullet-list",
      "hint": "List pre/during/post cutover tasks with owners and estimated durations. Example: 'Pre-cutover: [ ] Freeze application deploys (DevOps, T-4h). [ ] Final CDC sync (DBA, T-2h, est. 30min). [ ] Verify staging validation green (QA, T-1h).' Do not list checklist items without assigning owners and estimated times."
    }
  }
}
```

---

### Task 10: Update integration_spec category

**Files:**
- Modify: `src/services/templates/categoryTemplates.json`

**Step 1: Replace the entire `integration_spec` object**

```json
"integration_spec": {
  "description": "Integration specification documents — system integration points, data flows, protocols, and SLAs",
  "tone": "Contract-driven and failure-aware. Define happy path and every failure mode at each integration boundary.",
  "storyStyle": "integration-point focused with contract clarity",
  "architectureFocus": "system integration and data exchange",
  "expertRole": "senior integration architect with enterprise middleware and event-driven expertise — write for integration developers and ops",
  "totalWordTarget": { "min": 1500, "max": 4000 },
  "diagramConfig": {
    "primary": { "type": "flowchart LR", "purpose": "System landscape showing all integration points and data flows between systems" },
    "secondary": { "type": "sequenceDiagram", "purpose": "Primary data exchange flow between source and target systems" }
  },
  "requiredSections": {
    "Integration Overview": {
      "target": 200, "max": 400, "format": "prose",
      "hint": "Describe the systems being integrated, the business purpose, and the data exchange pattern. Example: 'Integrate Salesforce CRM with SAP S/4HANA for bi-directional customer and order sync. Pattern: event-driven via Kafka, near-real-time (<30s latency). 50K customer records, 200K orders/month.' Do not describe integrations without naming specific systems and the data exchange pattern."
    },
    "Goals & Non-Goals": {
      "target": 150, "max": 300, "format": "bullet-list",
      "hint": "List 3-5 measurable integration goals. Then list excluded capabilities. Example goal: 'Achieve <30s end-to-end sync latency for customer updates.' Example non-goal: 'Historical data backfill — handled by separate migration project (MIG-2026-Q2).' Do not list non-goals that nobody would reasonably expect."
    },
    "System Landscape": {
      "target": 200, "max": 0, "format": "mermaid", "diagram": "flowchart",
      "hint": "Draw all systems, integration middleware, and data flows. Label each connection with protocol, format, and direction. Example: 'Salesforce →(REST webhook, JSON)→ Integration Hub →(Kafka, Avro)→ SAP Adapter →(IDoc, RFC)→ SAP S/4HANA.' Do not draw system landscapes without labeling protocols and data formats on every connection."
    },
    "Sync Cadence": {
      "target": 100, "max": 200, "format": "prose",
      "hint": "Define whether sync is real-time, near-real-time, or batch. Specify the source of truth and conflict resolution strategy. Example: 'Near-real-time event-driven sync (<30s). Source of truth: Salesforce for customer data, SAP for order data. Conflict: last-write-wins with audit log; manual review for conflicts within 5-second window.' Do not define sync without specifying source of truth and conflict resolution."
    },
    "Data Flows": {
      "target": 300, "max": 0, "format": "mermaid-sequence", "diagram": "sequence",
      "hint": "Draw sequence diagrams for each data exchange flow. Show success path, validation steps, and error handling. Example: 'Salesforce ->> Hub: CustomerUpdated webhook. Hub ->> Hub: Validate schema + transform to Avro. Hub ->> Kafka: Publish to customer.updates topic. SAP Adapter ->> Kafka: Consume. SAP Adapter ->> SAP: RFC call to update KNA1.' Do not draw sequences without showing validation and error paths."
    },
    "Interface Contracts": {
      "target": 300, "max": 600, "format": "endpoint-blocks",
      "hint": "Document every API contract between systems with request/response schemas, auth, timeouts, and retry policy. Example: 'POST /api/customers (Salesforce → Hub): Auth: OAuth 2.0 client_credentials. Timeout: 5s. Retry: 3x exponential backoff. Payload: { sfId, name, email, address }. Response: 202 Accepted { correlationId }.' Do not document contracts without specifying timeout and retry policy."
    },
    "Error Handling": {
      "target": 200, "max": 400, "format": "error-table",
      "columns": ["Error Scenario", "Source System", "Detection", "Recovery Action", "Escalation"],
      "hint": "Define every error scenario with detection method and automated recovery. Example: 'SAP RFC timeout: detected via 5s timeout in adapter. Recovery: retry 3x with 1s/5s/30s backoff. Dead-letter queue after 3 failures. Escalation: PagerDuty alert to integration-oncall after 10 DLQ messages in 1h.' Do not list errors without specifying detection method and recovery action."
    },
    "User Stories": {
      "target": 300, "max": 600, "format": "mixed",
      "hint": "Write integration-focused stories specifying the systems and data flow. Example: 'As an order fulfillment agent, I want SAP to receive Salesforce order updates within 30 seconds so that I can confirm shipping dates without manually checking two systems.' Do not write stories without naming the specific systems involved.",
      "count": { "min": 5, "max": 15 },
      "fields": ["title", "description", "acceptance_criteria"]
    }
  },
  "optionalSections": {
    "Field Mapping": {
      "target": 200, "max": 400, "format": "mapping-table",
      "columns": ["Source Field", "Source Type", "Target Field", "Target Type", "Transformation", "Validation"],
      "hint": "Map every source field to target with transformation rules. Example: 'Salesforce Account.BillingCountry (picklist) → SAP KNA1.LAND1 (CHAR 3) — Transform: ISO 3166-1 alpha-2 to alpha-3 lookup. Validation: reject unmapped country codes to DLQ.' Do not list mappings without specifying transformation logic and validation rules."
    },
    "SLA Definition": {
      "target": 150, "max": 300, "format": "slo-table",
      "columns": ["Service", "SLI", "SLO Target", "Window", "Error Budget", "Alert Threshold"],
      "hint": "Define SLAs for each integration point with measurement and escalation. Example: 'Customer sync: SLI=messages delivered within 30s / total messages. SLO=99.9% over 7 days. Error budget: 1.44min/day. Alert: >5 failed messages in 15min → P2.' Do not define SLAs without specifying error budgets and alert thresholds."
    },
    "Security": {
      "target": 150, "max": 300, "format": "bullet-list",
      "hint": "Define auth, encryption, and data handling for each integration boundary. Example: 'Salesforce→Hub: OAuth 2.0 with client_credentials, token refresh 1h. All payloads encrypted in transit (TLS 1.3). PII fields (email, phone) encrypted at rest in Kafka (AWS KMS, topic-level key).' Do not list security controls without specifying the auth mechanism per integration point."
    },
    "Monitoring": {
      "target": 150, "max": 300, "format": "bullet-list",
      "hint": "Define monitoring dashboards, key metrics, and alerting for integration health. Example: 'Dashboard: Grafana integration-health. Metrics: message throughput (msg/s), end-to-end latency (P50/P99), DLQ depth, consumer lag. Alert: consumer lag > 1000 messages for 5min → P2.' Do not list monitoring without specifying metric names and alert thresholds."
    },
    "Comparison of Approaches": {
      "target": 200, "max": 400, "format": "comparison-table-and-prose",
      "columns": ["Option", "Pros", "Cons", "Effort", "Risk"],
      "hint": "Compare 2-3 integration patterns considered and explain the selection. Example: 'Option A: Point-to-point REST — low complexity but O(n²) connections. Option B: Event-driven via Kafka — higher initial setup but decoupled, replayable. Selected B: 6 systems planned for integration by Q4 makes hub pattern essential.' Do not compare approaches without explaining the selection rationale."
    }
  }
}
```

---

### Task 11: Add architecture_decision_record template

**Files:**
- Modify: `src/services/templates/categoryTemplates.json`

**Step 1: Add the `architecture_decision_record` object** after the `integration_spec` closing brace

```json
"architecture_decision_record": {
  "description": "Architecture Decision Records — captures WHY a technical decision was made, not just what was decided",
  "tone": "Concise, factual, decision-focused. Present tense for active decisions, past tense for superseded ones.",
  "storyStyle": "decision-outcome focused with explicit trade-off acknowledgment",
  "architectureFocus": "single architectural decision and its ripple effects",
  "expertRole": "senior architect documenting a technical decision for future engineers who will ask 'why was this done this way?'",
  "totalWordTarget": { "min": 500, "max": 1500 },
  "diagramConfig": {
    "primary": { "type": "flowchart TD", "purpose": "Decision tree or component affected by this decision" },
    "secondary": { "type": "flowchart LR", "purpose": "System context showing components affected by this decision" }
  },
  "requiredSections": {
    "Context": {
      "target": 150, "max": 300, "format": "prose",
      "hint": "Describe the technical and business context that necessitates this decision. State objective facts, not opinions. Example: 'The order service handles 2K RPS. The current monolithic codebase requires full redeployment for any change, averaging 45min deploy cycles with 3% rollback rate.' Do not include opinions or recommendations in the context — save those for Decision Outcome."
    },
    "Decision Drivers": {
      "target": 100, "max": 200, "format": "bullet-list",
      "hint": "List the specific constraints, requirements, or principles that drive this decision. Example: 'Must support zero-downtime deployments. Team has 2 engineers with Go experience, 5 with Python. Budget: no new infrastructure costs beyond current AWS spend.' Do not list drivers without specifying the constraint source (team, budget, SLA, compliance)."
    },
    "Goals & Non-Goals": {
      "target": 100, "max": 200, "format": "bullet-list",
      "hint": "List 2-3 goals this decision must achieve and 1-2 reasonable goals explicitly excluded. Example goal: 'Reduce deploy time from 45min to <5min.' Example non-goal: 'Microservice decomposition — this ADR only addresses the deployment pipeline, not service architecture.' Do not list non-goals that nobody would reasonably expect."
    },
    "Considered Options": {
      "target": 200, "max": 400, "format": "comparison-table-and-prose",
      "columns": ["Option", "Pros", "Cons", "Effort", "Risk"],
      "hint": "List 2-4 options with specific pros, cons, effort estimate, and risk level. Example: 'Option A: Docker + ECS Fargate — Pro: zero server management. Con: cold start 8-12s unacceptable for sync API. Effort: 2 sprints. Risk: Medium (new to team).' Do not dismiss options without specific technical rationale."
    },
    "Decision Outcome": {
      "target": 100, "max": 200, "format": "prose",
      "hint": "State the chosen option and the specific reasons it was selected over alternatives. Example: 'Chosen: Option B (EKS with Karpenter). Reason: eliminates cold start issue, team has Kubernetes experience from Platform team rotation, and Karpenter handles spot instance management automatically.' Do not state the decision without explaining why alternatives were rejected."
    },
    "Consequences": {
      "target": 100, "max": 200, "format": "bullet-list",
      "hint": "List positive and negative consequences of this decision, including technical debt introduced. Example: 'Positive: deploy time drops to <3min. Negative: adds Kubernetes operational complexity — requires on-call training for 3 engineers (2-day course, $2K/person).' Do not list consequences without distinguishing positive from negative."
    }
  },
  "optionalSections": {
    "Related Decisions": {
      "target": 50, "max": 100, "format": "bullet-list",
      "hint": "Link to related ADRs that this decision depends on or supersedes. Example: 'Depends on: ADR-007 (AWS as primary cloud provider). Supersedes: ADR-003 (ECS deployment — no longer viable due to cold start requirements).' Do not list related decisions without specifying the relationship type."
    },
    "Notes": {
      "target": 50, "max": 100, "format": "prose",
      "hint": "Record additional context that doesn't fit elsewhere — meeting notes, external references, or time-sensitive constraints. Example: 'Decision must be finalized by 2026-04-15 to meet Q2 infrastructure budget cycle. AWS SA confirmed Karpenter pricing model in meeting 2026-03-20.' Do not add notes that duplicate information from other sections."
    }
  }
}
```

---

### Task 12: Add lightweight_rfc template

**Files:**
- Modify: `src/services/templates/categoryTemplates.json`

**Step 1: Add the `lightweight_rfc` object** after `architecture_decision_record`

```json
"lightweight_rfc": {
  "description": "Lightweight RFC / One-Pager — minimal proposal for small-scope changes that would otherwise go undocumented",
  "tone": "Direct and minimal. Every sentence must justify its existence. No preamble, no filler.",
  "storyStyle": "change-proposal focused with clear accept/reject criteria",
  "architectureFocus": "single component or process change",
  "expertRole": "pragmatic engineer proposing a focused change — write only what a reviewer needs to approve or reject",
  "totalWordTarget": { "min": 500, "max": 1500 },
  "diagramConfig": {
    "primary": { "type": "flowchart LR", "purpose": "Before/after showing the component or process being changed" },
    "secondary": { "type": "flowchart TD", "purpose": "Impact scope showing affected components" }
  },
  "requiredSections": {
    "Problem Statement": {
      "target": 100, "max": 200, "format": "prose",
      "hint": "State the specific problem in 2-3 sentences with quantified evidence. Example: 'The nightly ETL job fails 3x/week due to upstream schema changes, requiring 2h manual recovery each time. This costs 6h/week of on-call engineer time.' Do not describe problems without quantifying their impact."
    },
    "Goals & Non-Goals": {
      "target": 100, "max": 200, "format": "bullet-list",
      "hint": "List 2-3 goals this RFC achieves and 1-2 things it explicitly does not address. Example goal: 'Eliminate manual recovery for schema-change failures.' Example non-goal: 'Replacing the ETL framework — only adding schema validation at ingestion.' Do not list non-goals that nobody would reasonably expect."
    },
    "Proposed Solution": {
      "target": 200, "max": 400, "format": "prose",
      "hint": "Describe HOW the solution works mechanically — name the specific technology, code path, and behavior change. Example: 'Add a JSON Schema validation step in the ETL ingestion handler (src/etl/ingest.py:L45). On schema mismatch: log diff, skip record to DLQ, continue processing. Requires: jsonschema library (already in requirements.txt).' Do not describe solutions without naming the specific files, functions, or components being changed."
    },
    "Impact & Scope": {
      "target": 100, "max": 200, "format": "bullet-list",
      "hint": "List affected systems, teams, and rollback strategy. Example: 'Affected: ETL pipeline only (no API changes). Teams: Data Engineering (implements), Data Science (consumers — no action needed). Rollback: revert single commit, no data migration.' Do not list impact without specifying the rollback strategy."
    }
  },
  "optionalSections": {
    "Alternatives": {
      "target": 100, "max": 200, "format": "bullet-list",
      "hint": "List 1-2 alternatives considered and why they were rejected. Example: 'Alternative: Full schema evolution framework (Apache Avro + Schema Registry). Rejected: over-engineered for current scale (3 upstream sources). Revisit if sources exceed 10.' Do not list alternatives without explaining the rejection rationale."
    },
    "Open Questions": {
      "target": 50, "max": 100, "format": "bullet-list",
      "hint": "List unresolved questions with owners and decision deadlines. Example: 'Q1: Should DLQ records auto-retry after 24h? Owner: @data-eng-lead. Decide by: 2026-04-05.' Do not list questions without assigning an owner and deadline."
    }
  }
}
```

---

### Task 13: Run all tests and verify

**Files:**
- None (verification only)

**Step 1: Validate JSON syntax**

Run: `node -e "JSON.parse(require('fs').readFileSync('src/services/templates/categoryTemplates.json','utf8')); console.log('Valid JSON')"`
Expected: `Valid JSON`

**Step 2: Run templateLoader tests**

Run: `npx vitest run src/services/templates/templateLoader.test.ts 2>&1 | tail -30`
Expected: All tests PASS, including `all 10 categories load without error` and `all 10 categories × 3 complexity levels produce valid templates (30 combinations)`

**Step 3: Run full test suite to check for regressions**

Run: `npx vitest run 2>&1 | tail -10`
Expected: No new failures (pre-existing failures in WelcomeSidebar/App.test.tsx/helpers.test.ts are expected)

**Step 4: Type check**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No new type errors

**Step 5: Commit**

```bash
git add src/services/templates/categoryTemplates.json src/services/templates/templateLoader.test.ts
git commit -m "feat: categoryTemplates v6.0.0 — four-part hints, Goals & Non-Goals, ADR + RFC templates"
```

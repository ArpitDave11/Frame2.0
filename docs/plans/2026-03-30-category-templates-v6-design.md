# categoryTemplates.json v6.0.0 Upgrade Design

**Goal:** Upgrade template intelligence — rewrite all hints with four-part formula, add Goals & Non-Goals everywhere, expand expertRole/tone, add globalAntiPatterns, add ADR + RFC templates, add column specs to structured formats.

**Approach:** Hint-centric (Approach A + columns field). All intelligence goes into hint text. JSON schema unchanged except one optional `columns` field on structured formats. Zero pipeline/UI code changes beyond types + constants.

**Based on:** Enterprise template research comparing Google, Amazon, Stripe, Uber, Spotify patterns + v2.1.0 comparison analysis.

---

## 1. `_meta` Changes

Add `globalAntiPatterns` string to `_meta`. Prompt builder prepends this to every section hint.

```json
"globalAntiPatterns": "Do not use filler phrases ('It is important to note...'), buzzwords without definitions ('leverage', 'robust', 'seamless'), or restate the problem as the solution. Every claim must include a specific number, system name, or verifiable detail. Do not repeat information from prior sections — reference it, don't restate it."
```

Version bump: `"version": "6.0.0"`

## 2. Four-Part Hint Formula

Every hint across all categories rewritten to: **Imperative + Specifics + Micro-example + Anti-pattern warning** (~30-60 words).

Pattern: `"[Action verb] [what to write] [specific content requirements]. Example: '[concrete example sentence].' Do not [most common failure for this section type]."`

### Sample transformations (representative, not exhaustive):

| Category | Section | Current | v6.0.0 |
|----------|---------|---------|--------|
| general | Overview | "High-level summary of the epic" | "Summarize the business problem, affected users, and proposed solution in 2-3 paragraphs. Example: 'The payments team processes 12K transactions/day through a batch ETL that introduces 12h data staleness.' Do not restate the title as the summary." |
| technical_design | Technical Requirements | "Specific technical constraints and requirements" | "List each requirement as a testable statement: 'The system SHALL [verb] [object] [constraint].' Example: 'The system SHALL process payments within 200ms at P99 under 500 RPS.' Do not list requirements without measurable thresholds." |
| business_requirement | Executive Summary | "High-level overview for leadership" | "Summarize the business impact, cost/benefit, and recommended action in 3 paragraphs for executive audience. Example: 'Manual reconciliation costs $180K/quarter affecting 12 FTEs — automation reduces this by 85%.' Do not use technical jargon without defining it." |
| api_specification | Error Handling | "Error codes and messages" | "Define every error code with HTTP status, error body schema, and recovery guidance. Example: '429 Too Many Requests — retry after Retry-After header value; include rate limit headers in all responses.' Do not list error codes without client recovery steps." |
| migration_plan | Data Mapping | "Source-to-target field mapping" | "Map every source field to its target with transformation rules and validation. Example: 'Source: users.created_at (Unix epoch) → Target: accounts.created_date (ISO 8601) — transform: new Date(val * 1000).toISOString().' Do not list mappings without specifying data type conversions." |
| infrastructure_design | Disaster Recovery | "RTO/RPO targets, failover approach, recovery procedures" | "Define RTO and RPO targets per service tier, then step-by-step failover procedures. Example: 'Tier 1 (payments): RTO 5min, RPO 0 (sync replication). Failover: Route53 health check triggers automatic AZ failover.' Do not define DR targets without specifying the recovery mechanism." |

## 3. "Goals & Non-Goals" Section

Added as required section to ALL 10 categories (8 existing + 2 new). Positioned 2nd (after Overview/Objective, before Requirements/Scope).

```json
"Goals & Non-Goals": {
  "target": 200,
  "max": 400,
  "format": "bullet-list",
  "hint": "List 3-5 measurable goals with target metrics and owners. Then list 2-3 reasonable goals explicitly excluded and why. Example goal: 'Reduce P99 latency from 800ms to <200ms by Q3.' Example non-goal: 'Multi-region support — deferred to Q4; single-region meets current SLA.' Do not list non-goals that nobody would reasonably expect."
}
```

## 4. Expanded expertRole and tone

### expertRole expansions:

| Category | Current | v6.0.0 |
|----------|---------|--------|
| general | "senior technical writer" | "senior technical writer who adapts depth and vocabulary to match the content domain" |
| technical_design | "senior software architect" | "senior software architect with distributed systems expertise — write for tech leads and senior engineers" |
| business_requirement | "senior business analyst" | "senior business analyst with enterprise process optimization expertise — write for technical leads and product managers" |
| feature_specification | "senior product manager" | "senior product manager with UX and data-driven prioritization expertise — write for designers, developers, and QA" |
| api_specification | "senior API architect" | "senior API architect with RESTful and event-driven design expertise — write for API consumers and integration engineers" |
| infrastructure_design | "senior infrastructure architect" | "senior infrastructure architect with cloud-native and SRE expertise — write for platform engineers and DevOps" |
| migration_plan | "senior migration architect" | "senior migration architect with enterprise data migration expertise — write for DBAs, ops, and project managers" |
| integration_spec | "senior integration architect" | "senior integration architect with enterprise middleware and event-driven expertise — write for integration developers and ops" |
| architecture_decision_record (NEW) | — | "senior architect documenting a technical decision for future engineers who will ask 'why was this done this way?'" |
| lightweight_rfc (NEW) | — | "pragmatic engineer proposing a focused change — write only what a reviewer needs to approve or reject" |

### tone expansions:

| Category | Current | v6.0.0 |
|----------|---------|--------|
| general | "adaptive based on content" | "Adaptive based on content. Match the formality and vocabulary to the detected domain." |
| technical_design | "precise and technical" | "Precise and technical. Lead with architecture decisions and trade-offs; define acronyms on first use." |
| business_requirement | "professional and business-oriented" | "Executive-friendly, outcome-focused. Lead with business impact and quantified metrics; minimize jargon." |
| feature_specification | "clear and detail-oriented" | "Clear and user-centric. Describe behavior from the user's perspective; name specific screens, actions, and states." |
| api_specification | "precise and specification-driven" | "Specification-driven with developer empathy. Every endpoint must be copy-paste implementable from the doc alone." |
| infrastructure_design | "operational and infrastructure-focused" | "Operational and infrastructure-focused. Specify exact resource sizes, regions, and configurations; no hand-waving." |
| migration_plan | "methodical and risk-aware" | "Methodical and risk-aware. Every step must have a validation checkpoint and a rollback trigger." |
| integration_spec | "integration-focused and contract-driven" | "Contract-driven and failure-aware. Define happy path and every failure mode at each integration boundary." |
| architecture_decision_record (NEW) | — | "Concise, factual, decision-focused. Present tense for active decisions, past tense for superseded ones." |
| lightweight_rfc (NEW) | — | "Direct and minimal. Every sentence must justify its existence. No preamble, no filler." |

## 5. `columns` Field on Structured Formats

New optional field `columns: string[]` on sections using structured table formats:

```json
// raci-table sections
"columns": ["Role", "Responsible", "Accountable", "Consulted", "Informed"]

// risk-heat-map sections
"columns": ["Risk ID", "Description", "Probability", "Impact", "Risk Score", "Mitigation", "Owner"]

// slo-table sections
"columns": ["Service", "SLI", "SLO Target", "Window", "Error Budget", "Alert Threshold"]

// error-table sections
"columns": ["HTTP Status", "Error Code", "Description", "Recovery Action", "Retry Strategy"]

// mapping-table sections
"columns": ["Source Field", "Source Type", "Target Field", "Target Type", "Transformation", "Validation"]

// schema-table sections
"columns": ["Field", "Type", "Required", "Description", "Constraints"]

// phase-table sections
"columns": ["Phase", "Duration", "Deliverables", "Dependencies", "Exit Criteria"]
```

## 6. New Templates

### architecture_decision_record

```json
"architecture_decision_record": {
  "description": "Architecture Decision Records — captures WHY a technical decision was made, not just what was decided",
  "tone": "Concise, factual, decision-focused. Present tense for active decisions, past tense for superseded ones.",
  "storyStyle": "decision-outcome focused with explicit trade-off acknowledgment",
  "architectureFocus": "single architectural decision and its ripple effects",
  "expertRole": "senior architect documenting a technical decision for future engineers who will ask 'why was this done this way?'",
  "totalWordTarget": { "min": 500, "max": 1500 },
  "diagramConfig": {
    "primary": { "type": "flowchart TD", "purpose": "Decision tree or component affected by this decision" }
  },
  "requiredSections": {
    "Context": { "target": 150, "max": 300, "format": "prose", "hint": "..." },
    "Decision Drivers": { "target": 100, "max": 200, "format": "bullet-list", "hint": "..." },
    "Goals & Non-Goals": { "target": 100, "max": 200, "format": "bullet-list", "hint": "..." },
    "Considered Options": { "target": 200, "max": 400, "format": "comparison-table-and-prose", "hint": "...", "columns": ["Option", "Pros", "Cons", "Effort", "Risk"] },
    "Decision Outcome": { "target": 100, "max": 200, "format": "prose", "hint": "..." },
    "Consequences": { "target": 100, "max": 200, "format": "bullet-list", "hint": "..." }
  },
  "optionalSections": {
    "Related Decisions": { "target": 50, "max": 100, "format": "bullet-list", "hint": "..." },
    "Notes": { "target": 50, "max": 100, "format": "prose", "hint": "..." }
  }
}
```

### lightweight_rfc

```json
"lightweight_rfc": {
  "description": "Lightweight RFC / One-Pager — minimal proposal for small-scope changes that would otherwise go undocumented",
  "tone": "Direct and minimal. Every sentence must justify its existence. No preamble, no filler.",
  "storyStyle": "change-proposal focused with clear accept/reject criteria",
  "architectureFocus": "single component or process change",
  "expertRole": "pragmatic engineer proposing a focused change — write only what a reviewer needs to approve or reject",
  "totalWordTarget": { "min": 500, "max": 1500 },
  "requiredSections": {
    "Problem Statement": { "target": 100, "max": 200, "format": "prose", "hint": "..." },
    "Goals & Non-Goals": { "target": 100, "max": 200, "format": "bullet-list", "hint": "..." },
    "Proposed Solution": { "target": 200, "max": 400, "format": "prose", "hint": "..." },
    "Impact & Scope": { "target": 100, "max": 200, "format": "bullet-list", "hint": "..." }
  },
  "optionalSections": {
    "Alternatives": { "target": 100, "max": 200, "format": "bullet-list", "hint": "..." },
    "Open Questions": { "target": 50, "max": 100, "format": "bullet-list", "hint": "..." }
  }
}
```

## 7. Code Changes (Minimal)

| File | Change | Impact |
|------|--------|--------|
| `src/domain/types.ts` | Add `'architecture_decision_record' \| 'lightweight_rfc'` to EpicCategory. Add `columns?: string[]` to SectionConfig. | Type-only |
| `src/domain/categoryConstants.ts` | Add 2 entries to EPIC_CATEGORIES array | UI dropdown |
| `categoryTemplates.json` | All hint rewrites, new sections, new templates, expanded roles/tones | Core change |
| `templateLoader.test.ts` | Update test that validates all categories (count 8 → 10) | Test fix |

No changes to: templateLoader.ts, pipeline stages, prompt builders, UI components.

## 8. What's NOT Included

- Progressive disclosure tiers
- qualityGates per category
- reviewChecklist arrays
- validationRules arrays (baked into hints instead)
- antiPatternWarnings arrays (baked into hints instead)
- Section dependency graphs
- Reviewer guidance fields
- Confidence level metadata
- Post-Mortem, Runbook, Spike, PRD, Security Review templates

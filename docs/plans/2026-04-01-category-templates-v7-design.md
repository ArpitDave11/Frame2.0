# Category Templates v7.0.0 — Design

## Approach

Full JSON replacement (Option A). Drop-in swap of `categoryTemplates.json` with the v7 spec. No incremental merge.

## What Changes

### 1. JSON Replacement (`categoryTemplates.json`)

**_meta additions:**
- `version` → `7.0.0`
- `changelog` — full version history (7.0.0, 6.0.0, 2.1.0)
- `reviewStates` — approval emoji map (approved/pending/reviewing/changes_requested/rejected)
- `priorityLevels` — priority emoji map (critical/high/medium/low)
- `statusEmoji.archived` — new state

**Structural changes across all 10 categories:**
- **Epic Status** — governance table added as first required section on every category
- **Hint compression** — all hints rewritten to 30-50 words using `imperative + example + anti-pattern` formula
- **`totalWordTarget.excludes`** — added to all categories (inert data, see Known Limitations)
- **`count`/`fields` removed** from all User Stories sections
- **⭐ emphasis** on critical sections (Non-Goals in tech_design, Alternatives in tech_design, Architecture in infra, Rollback in migration, Integration Flows in integration)

**Section merges:**
- Auth + Overview → "Overview & Authentication" (api_specification)
- Networking + Security → "Networking & Security" (infrastructure_design)
- Rate Limiting + Pagination → "Pagination & Rate Limiting" required section (api_specification)

**Promotions (optional → required):**
- Success Metrics (business_requirement)
- Risk Assessment (migration_plan)
- Cost Analysis (infrastructure_design)

**Demotions (required → optional):**
- Data Model (technical_design)
- API Design (technical_design)
- Security & Non-Functional Requirements (technical_design)
- Versioning Strategy → "Versioning & Deprecation" (api_specification)

**New required sections:**
- Context & Motivation (technical_design)
- Proposed Design (technical_design)
- Cross-Cutting Concerns (technical_design)
- SLA/SLO Requirements (infrastructure_design)
- RACI Matrix (migration_plan)
- Migration Strategy (migration_plan)
- Scope & Non-Scope (migration_plan)
- Integration Flows (integration_spec)
- Systems & Endpoints (integration_spec)
- Data Contract & Mappings (integration_spec)
- Performance & SLAs (integration_spec)
- Monitoring & Alerting (integration_spec)
- Non-Functional Requirements (feature_specification)
- Analytics & Success Metrics (feature_specification)

**Removals:**
- Objectives (general) — redundant with Goals & Non-Goals
- Assumptions & Constraints (business_requirement)
- Acceptance Criteria (business_requirement)
- Dependencies (business_requirement)
- Release Criteria (feature_specification)
- Accessibility (feature_specification)
- Internationalization (feature_specification)
- Sync Cadence (integration_spec)
- Interface Contracts (integration_spec)
- Operational Impact, Error Handling, Migration Strategy, Deployment Plan optionals (technical_design)
- Cutover Checklist (migration_plan)

**Renames (~15 sections):**
- "Scope" → "Scope & Non-Scope" (general, business_requirement)
- "Business Objective" → "Business Context & Problem Statement"
- "Stakeholder Analysis" → "Stakeholders & RACI"
- "Feature Overview" → "Problem Statement"
- "Out of Scope" → "Scope & Non-Scope"
- "Edge Cases" → "Edge Cases & Error Handling"
- "Migration Overview" → "Objective"
- "Infrastructure Overview" → "Objective"
- "Integration Overview" → "Objective"
- "Migration Steps" → "Cutover Plan"
- "UI/UX Guidelines" → "UX/Design"
- "Timeline" → "Timeline & Milestones" (business_requirement)

### 2. Type Update (`types.ts`)

No change needed. `EpicCategory` already includes all 10 categories from v6. The `totalWordTarget` type is `{ min: number; max: number }` — TypeScript silently ignores the extra `excludes` field when parsing JSON.

### 3. `categoryConstants.ts`

No change expected. All 10 categories already registered with labels and icons from v6.

### 4. `templateLoader.ts`

No code changes. Reads sections dynamically from JSON. `columns` field already consumed. `globalAntiPatterns` already prepended.

### 5. Prompt Builders

No code changes. ⭐ markers are inside hint text strings. `globalAntiPatterns` prepend is already wired.

### 6. Tests

Update assertions for:
- Section names (renames)
- Section counts per category (additions/removals change totals)
- `_meta` structure (new fields)
- Any hint text snapshots

## What Does NOT Change

- Pipeline stages 1-6
- `pipelineOrchestrator.ts`
- `epicScorer.ts`
- `refinePipelineAction.ts`
- UI components
- Store layer
- `templateLoader.ts` logic

## Known Limitations

`totalWordTarget.excludes` is forward-compatible data only. The field exists in JSON but is not read by any code path. The `totalWordTarget` object is only used in `templateLoader.ts` for complexity scaling (`min`/`max` only).

**Impact:** Tables and diagrams still count toward per-section word limits.
**Mitigation:** All pure-table sections use `max: 0` which bypasses `enforceWordLimit`.
**Future:** ~5-line PR to add `excludes?: string[]` to the type and strip table markup before word counting.

## Risk

**Low.** This is a data file replacement. The template loader reads sections dynamically from JSON — no structural code changes required. The only test breakage will be assertion mismatches on renamed sections and updated counts.

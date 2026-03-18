# Business Requirements Document
## Epic Generator v5 — Editor-First Rebuild

**Version**: 1.0  
**Date**: 2026-03-15  
**Status**: Draft — Awaiting Stakeholder Review  
**Author**: Architecture Review  
**Classification**: UBS Internal

---

## 1. Executive Summary

Epic Generator v5 replaces the wizard-driven flow of v4 with an editor-first approach. Users write or paste rough content into a markdown editor, click Refine, and an AI pipeline transforms it into a fully structured epic document conforming to one of 7 category templates. The output can be published directly to GitLab Enterprise and decomposed into trackable issues.

**What changes**: The 6-stage wizard is removed. The editor is the entry point. A new complexity selector (Simple/Moderate/Complex) scales output depth.  
**What stays**: The AI pipeline, quality scoring, GitLab integration, and template system.  
**Why**: The wizard forced users through 17 fields across 6 stages before they saw any output. The new model lets users start with whatever they have — even a single paragraph — choose their desired level of detail, and iteratively refine.

---

## 2. Stakeholders

| Role | Interest |
|------|----------|
| Epic Authors (Engineers, PMs, Architects) | Primary users — write and refine epics |
| Engineering Leads | Review epic quality, approve for execution |
| Program Managers | Track epics in GitLab, create issues for planning |
| DevOps/Platform Team | Maintain deployment, Azure AD integration |

---

## 3. User Personas

**Persona 1: The Drafter** — Has a rough idea, writes 2-3 paragraphs, needs AI to structure it into a full epic with all required sections. Typically uses **Simple** or **Moderate** complexity.

**Persona 2: The Importer** — Has an existing epic in GitLab that needs improvement. Loads it, runs refine, reviews quality score, publishes the updated version. Uses **Moderate** complexity by default; may switch to **Complex** for critical initiatives.

**Persona 3: The Reviewer** — Receives a refined epic, wants to see quality scores per section, check requirement coverage, and verify user stories before approving. Expects **Complex** epics for high-stakes projects.

**Persona 4: The Quick Proposer** — Needs to draft a lightweight proposal fast — a one-pager to get alignment before investing in full detail. Uses **Simple** complexity to produce a concise, scannable document.

---

## 4. Feature Requirements

### FR-1: Epic Editor (CORE — Must Have)

**Description**: A split-pane markdown editor with live preview. The editor is the primary interface — users land here on launch.

**Capabilities**:
- FR-1.1: Markdown textarea (left pane) with syntax highlighting placeholder behavior
- FR-1.2: Live rendered preview (right pane) using react-markdown + remark-gfm
- FR-1.3: Mermaid diagram rendering inline in preview (architecture diagrams render visually, not as code blocks)
- FR-1.4: Line count display
- FR-1.5: Empty state with onboarding — "Start writing, paste content, pick a template, or load from GitLab"
- FR-1.6: Quick-start templates — user selects a category (e.g., "Technical Design") and editor pre-populates with section headers skeleton
- FR-1.7: Undo support for AI-applied changes (revert to pre-refine state)

**Acceptance Criteria**:
- Editor loads in under 500ms
- Preview updates in real-time as user types
- Mermaid diagrams render without page reload
- Empty state provides clear path to first action

---

### FR-2: AI Refine Pipeline (CORE — Must Have)

**Description**: A 6-stage AI pipeline that transforms rough content into a structured epic. Triggered by a single "Refine" button click.

**Pipeline Stages**:
- FR-2.1: Stage 1 — Deep Comprehension (extract entities, requirements, gaps, risks from source content)
- FR-2.2: Stage 2 — Category Classification (classify into 1 of 7 categories with confidence score; determines template, tone, section formats)
- FR-2.3: Stage 3 — Structural Assessment (score each section 1-10 on completeness/relevance/placement; plan transformations: keep/restructure/merge/split/add)
- FR-2.4: Stage 4 — Content Refinement (rewrite sections using category-specific tone, format, and word targets; section-by-section with progress callback)
- FR-2.5: Stage 5 — Mandatory Generation (generate architecture diagram as Mermaid + generate 15-20 user stories with acceptance criteria and story points)
- FR-2.6: Stage 6 — Validation Gate (requirements traceability check, self-audit checklist, failure pattern detection; if failed, loop back to Stage 4, max 5 iterations)
- FR-2.7: Auto-apply — refined epic replaces editor content automatically; previous version stored for undo

**Pipeline Progress UI**:
- FR-2.8: Visual progress panel showing all 6 stages with status (pending/running/complete/error)
- FR-2.9: Per-stage detail messages (e.g., "Refining section 4/17: Architecture Overview")
- FR-2.10: Pipeline summary on completion (category detected, section count, story count, word count, validation score)

**Acceptance Criteria**:
- Pipeline runs on any input from 1 sentence to a full draft
- Progress is visible throughout (no frozen UI)
- User can see what changed after pipeline completes
- Validation score displayed after completion

---

### FR-3: Quality Scoring & Critique (CORE — Must Have)

**Description**: Automated quality assessment of the epic using multiple scoring dimensions. Runs after pipeline completion and available on-demand.

**Capabilities**:
- FR-3.1: Overall score (0-10) with 5 weighted dimensions: requirements coverage (30%), content quality (20%), user stories (20%), architecture diagrams (15%), document structure (15%)
- FR-3.2: Per-section feedback — each of the epic's sections scored with status (strong/adequate/weak/missing), specific issues, and improvement suggestions
- FR-3.3: Critical issues list — must-fix problems surfaced prominently
- FR-3.4: BM25 saturation term coverage scoring
- FR-3.5: AI filler/slop detection (3-tier weighted pattern matching)
- FR-3.6: Category-aware critique — scoring adjusts based on detected category (e.g., API spec scored differently than business requirement)
- FR-3.7: Suggestion approval flow — user reviews AI-suggested improvements per section, accepts/rejects individually, applies selected changes

**Acceptance Criteria**:
- Score badge visible in editor toolbar after any refinement
- Clicking score opens full quality report
- User can apply suggested improvements selectively

---

### FR-4: Category Template System (CORE — Must Have)

**Description**: 7 pre-defined epic category templates that guide the AI pipeline's output structure, tone, and section formats.

**Categories**:
- FR-4.1: Business Requirement — ROI focus, RACI matrices, risk heat maps, SMART objectives
- FR-4.2: Technical Design — Google design doc style, goals/non-goals, trade-off analysis
- FR-4.3: Feature Specification — User stories with acceptance criteria, edge cases, launch/rollback plans
- FR-4.4: API Specification — Stripe-style, endpoint examples, error envelopes, rate limits, versioning
- FR-4.5: Infrastructure Design — SLA/SLO targets, cost analysis, disaster recovery, observability
- FR-4.6: Migration Plan — Operational playbook, RACI, cutover/rollback procedures, dry run plans
- FR-4.7: Integration Spec — Data mappings, sequence diagrams, retry/circuit-breaker policies, SLA contracts

**Each template defines**:
- Required and optional sections with word targets
- Section format hints (table, bullet-list, code-blocks, RACI table, risk heat map, etc.)
- Tone (executive-friendly, precise-technical, user-focused, ops-focused, procedural)
- Architecture diagram focus type
- User story style
- Progressive disclosure levels (10-second scan, 2-minute read, full read)

**Acceptance Criteria**:
- Auto-detected by pipeline Stage 2 with confidence score
- User can override detected category
- Template drives section structure in pipeline Stage 4

---

### FR-5: Epic Complexity Level (CORE — Must Have)

**Description**: A tri-level complexity selector that controls the depth, breadth, and detail of the generated epic. Works as a scaling multiplier on top of the category template — the category decides *what* structure to use, the complexity level decides *how deep* to go.

**Complexity Levels**:

- **Simple** — For early-stage ideas, quick proposals, or lightweight initiatives. Produces a concise document that covers the essentials without exhaustive detail.
- **Moderate** — For standard project epics that need enough detail for planning and estimation. The default level. Balances thoroughness with readability.
- **Complex** — For mission-critical, high-stakes, or cross-team initiatives that require full rigor. Produces comprehensive documentation with all optional sections, maximum detail, and strict validation.

**Scaling Matrix** (how complexity multiplies template settings):

| Dimension | Simple | Moderate | Complex |
|-----------|--------|----------|---------|
| FR-5.1: Sections included | Required sections only | Required + key optional | All required + all optional |
| FR-5.2: Word targets per section | ~50% of template target | 100% of template target | Template max (upper bound) |
| FR-5.3: Total word target | ~40-50% of category range | Category min–mid range | Category mid–max range |
| FR-5.4: User stories generated | 5–8 stories | 10–15 stories | 15–25 stories |
| FR-5.5: Acceptance criteria per story | 1–2 criteria | 2–3 criteria | 3–5 measurable criteria |
| FR-5.6: Story point estimation | Omitted | Fibonacci (1,2,3,5) | Fibonacci with justification |
| FR-5.7: Architecture diagram | Single flowchart | Category-appropriate type | Multiple diagrams if warranted |
| FR-5.8: Section formats | Simplified (bullets, prose) | Standard (tables, formatted) | Full complexity (RACI, heat maps, SLO tables) |
| FR-5.9: Validation threshold | Audit score ≥ 70 | Audit score ≥ 80 | Audit score ≥ 85 |
| FR-5.10: Pipeline iterations (max) | 2 | 3 | 5 |
| FR-5.11: Progressive disclosure | 10-second scan sections only | 10-sec + 2-minute read | Full read (all sections) |
| FR-5.12: Cross-references | Minimal | Standard | Extensive (traceability matrix) |

**Interaction with Category Templates (FR-4)**:
The 7 categories define *what* sections exist, their formats, tone, and structure. Complexity scales *how much* of that template is activated and to what depth. Example:

| | Simple + Technical Design | Moderate + Technical Design | Complex + Technical Design |
|-|--------------------------|----------------------------|---------------------------|
| Sections | Objective, Context, Proposed Design, Alternatives, Implementation Plan (5 required) | + Cross-Cutting Concerns, Security, Team & Roles (8 sections) | + Decision Log (ADRs), Appendix, Definition of Done (all 14 sections) |
| Word count | ~1,000–1,500 | ~2,000–3,000 | ~3,000–4,000+ |
| Alternatives Considered | Brief prose comparison | Comparison table with pros/cons | Full comparison table + prose analysis + decision rationale |
| Stories | 5–8 technical stories | 10–15 with acceptance criteria | 15–25 with AC, story points, req tags |

**Integration with Pipeline Stages (FR-2)**:
- **Stage 2 (Classification)**: Detects category; complexity is user-selected (not auto-detected)
- **Stage 3 (Structural)**: Uses complexity to decide which optional sections to include and which transformations to plan
- **Stage 4 (Refinement)**: Scales word targets and format instructions per section based on complexity × category template
- **Stage 5 (Mandatory)**: Scales user story count and diagram complexity
- **Stage 6 (Validation)**: Adjusts audit pass threshold and max iteration count

**UI Placement**:
- FR-5.13: Complexity selector visible in editor toolbar, next to the Refine button
- FR-5.14: Three-way toggle or segmented control: Simple | Moderate | Complex
- FR-5.15: Default to Moderate for new epics
- FR-5.16: When loading from GitLab, attempt to detect complexity from existing content length/structure; default to Moderate if ambiguous
- FR-5.17: Changing complexity and re-running Refine produces a new output scaled accordingly (with undo)

**Implementation in Skills Layer**:
- FR-5.18: New `ComplexityLevel` type: `'simple' | 'moderate' | 'complex'`
- FR-5.19: `ComplexityConfig` interface mapping each level to scaling factors (section inclusion rules, word target multipliers, story count ranges, validation thresholds, max iterations)
- FR-5.20: `getScaledTemplate(category, complexity)` function that takes a category template and returns a complexity-adjusted version with modified word targets, section lists, and format instructions
- FR-5.21: Pipeline functions receive complexity as a parameter alongside epic content and category

**Acceptance Criteria**:
- Selecting Simple produces a document roughly half the length of Moderate for the same input
- Selecting Complex produces a document with all optional sections and maximum detail
- Complexity is independent of category — all 7 categories work with all 3 levels (7 × 3 = 21 combinations)
- The Refine button respects the current complexity selection
- Changing complexity does not lose the user's editor content — it only affects the next Refine run

---

### FR-6: Chat Feedback Panel (SHOULD Have)

**Description**: A conversational AI sidebar within the editor for targeted epic improvements. User describes what they want changed; AI applies it to specific sections or the entire epic.

**Capabilities**:
- FR-7.1: Per-section feedback — user asks AI to improve a specific section (AI asks which section via dropdown)
- FR-7.2: Global feedback — user describes a cross-cutting improvement; AI applies to all relevant sections with progress indicator
- FR-7.3: Undo support — revert to pre-feedback state if unsatisfied
- FR-7.4: Conversation history preserved during session
- FR-7.5: Scope selection — AI asks whether feedback applies to one section or entire epic

**Acceptance Criteria**:
- Chat panel slides in alongside editor without replacing it
- Changes applied by chat are reflected immediately in editor
- User can undo any chat-applied change

---

### FR-7: GitLab Integration (SHOULD Have)

**Description**: Load existing epics from GitLab Enterprise, publish new/updated epics, and navigate group hierarchies.

**Capabilities**:
- FR-7.1: Load epic — browse GitLab groups/subgroups, search epics, filter by state (open/closed/all) and labels
- FR-7.2: Create new epic — publish editor content as new GitLab epic with title extraction, crew/pod level selection, parent epic selection
- FR-7.3: Update existing epic — when editing a loaded epic, publish updates back to the same epic
- FR-7.4: Group hierarchy navigation with breadcrumb
- FR-7.5: Label management — fetch and display available labels for filtering
- FR-7.6: Epic children display — show child epics and linked issues for loaded epics
- FR-7.7: Mock mode — full mock GitLab API for local development and testing (20+ mock epics, 28 labels, simulated delays)

**Authentication**:
- FR-7.8: Personal Access Token (PAT) — PRIVATE-TOKEN header
- FR-7.9: GitLab OAuth 2.0 — Bearer token via sessionStorage, token refresh

**Acceptance Criteria**:
- Load and publish work with both PAT and OAuth
- Group navigation supports arbitrary depth
- Mock mode is indistinguishable from real mode in UI

---

### FR-8: Issue Creation from User Stories (SHOULD Have)

**Description**: Parse user stories generated by the pipeline into individual GitLab issues, with AI-powered deduplication against existing issues.

**Capabilities**:
- FR-7.1: Parse user stories from epic markdown (extract title, persona, goal, benefit, acceptance criteria)
- FR-7.2: AI-powered duplicate detection — compare parsed stories against existing epic issues, show similarity scores
- FR-7.3: Bulk creation — select stories to create, bulk create as GitLab issues
- FR-7.4: Auto-link created issues to the parent epic
- FR-7.5: AI-generated issue descriptions — expand story into full issue body with context from epic
- FR-7.6: Progress tracking during bulk creation (current/total, current title)

**Acceptance Criteria**:
- Stories parsed correctly from pipeline-generated user stories section
- Duplicates flagged with similarity score before creation
- Created issues linked to epic automatically

---

### FR-9: Blueprint/Architecture Diagram (SHOULD Have)

**Description**: Dedicated viewer for the architecture diagram generated by the pipeline, with enhanced interaction beyond what the inline preview provides.

**Capabilities**:
- FR-8.1: Mermaid diagram rendering with zoom controls (slider, percentage display)
- FR-8.2: Fullscreen mode for large diagrams
- FR-8.3: Export as SVG file
- FR-8.4: Export as PNG image
- FR-8.5: Copy Mermaid source code to clipboard
- FR-8.6: AI-powered diagram regeneration — regenerate diagram from current epic content
- FR-8.7: AI feedback loop — describe desired changes, AI modifies the Mermaid code
- FR-8.8: Auto-fix — if Mermaid syntax is invalid, AI attempts to repair (up to 5 retries)
- FR-8.9: Diagram type support — flowchart, sequence, class, state, gantt, git, block diagrams
- FR-8.10: Colorblind-safe Okabe-Ito palette

**Decision Point**: The inline preview (FR-1.3) already renders Mermaid diagrams. The blueprint tab adds zoom, export, and AI feedback. Assess whether these justify a separate tab or can be integrated as a diagram overlay/modal within the editor.

**Acceptance Criteria**:
- Diagram renders correctly for all 7 supported types
- SVG and PNG exports produce clean output
- AI regeneration uses current epic content, not stale data

---

### FR-10: Settings & Configuration (Must Have)

**Description**: Configuration panel for AI provider and GitLab connection settings.

**AI Provider Configuration**:
- FR-9.1: Azure OpenAI — endpoint URL, deployment name, API key, API version, model selection (GPT-4/GPT-5)
- FR-9.2: OpenAI Direct — API key, model selection, optional custom base URL
- FR-9.3: Mock mode — no API calls, returns input as-is with simulated delay
- FR-9.4: Connection test — verify AI provider is reachable and responding
- FR-9.5: Model family detection with safe parameter limits (max tokens, temperature)

**GitLab Configuration**:
- FR-9.6: GitLab enablement toggle
- FR-9.7: Root group ID configuration
- FR-9.8: Access token (PAT) input
- FR-9.9: GitLab OAuth configuration
- FR-9.10: Connection test — verify GitLab is reachable

**Persistence**:
- FR-9.11: Settings stored in localStorage under single key (epic-generator-config)
- FR-9.12: Settings loaded on app start

**Acceptance Criteria**:
- Switching between AI providers takes effect immediately
- Connection tests provide clear success/failure feedback
- Invalid configurations don't crash the app

---

### FR-11: Toast Notification System (Must Have)

**Description**: Non-blocking notification system for operation feedback.

**Capabilities**:
- FR-10.1: 4 notification types — success, error, info, warning
- FR-10.2: Auto-dismiss with configurable duration
- FR-10.3: Progress bar showing time until auto-dismiss
- FR-10.4: Multiple toasts stack vertically
- FR-10.5: Manual dismiss

**Acceptance Criteria**:
- Toasts appear without blocking user interaction
- Error toasts are visually distinct from success

---

### FR-12: Authentication (Must Have)

**Description**: Dual authentication supporting UBS corporate environment.

**Capabilities**:
- FR-11.1: Azure AD via MSAL v5 — SSO, token refresh, session management
- FR-11.2: GitLab OAuth 2.0 — separate from Azure AD, for GitLab API access
- FR-11.3: Mock auth mode — bypasses all auth for local development
- FR-11.4: Auth guard — protected routes require authentication
- FR-11.5: User menu — avatar, user info display, logout

**Acceptance Criteria**:
- App is inaccessible without valid Azure AD session (when auth enabled)
- GitLab OAuth token refresh is transparent to user
- Mock mode requires zero configuration

---

## 5. Non-Functional Requirements

### NFR-1: Performance
- Editor must load in under 500ms
- Pipeline progress must update UI within 100ms of stage change
- Preview pane must render markdown changes within 200ms

### NFR-2: Reliability
- Pipeline failure at any stage must not crash the app
- Rate limiting uses AIMD (TCP Reno) adaptive throttling: initial 3 concurrent, 300ms delay; on 429: window halved, delay doubled; max 10 concurrent, 3 retries
- Retry-After header parsing for Azure and OpenAI

### NFR-3: Testability
- Every feature module must be independently unit-testable
- Changing one feature's code must not require modifying another feature's tests
- Mock providers for AI and GitLab APIs

### NFR-4: Branding
- UBS brand palette: #E60000 (red), #BD000C (bordeaux), #000000 (black), #CCCABC/#8E8D83/#5A5D5C (grays), #ECEBE4/#F5F0E1 (pastels)
- Single source of truth for colors (no duplicates)
- Swiss 8px grid system
- Font weight 300 for body, 400 for emphasis (not bold-heavy)

### NFR-5: Security
- Azure AD auth for app access
- GitLab tokens stored in sessionStorage (not localStorage)
- App config in localStorage (no secrets)
- All API calls proxied through /gitlab-api/* to devcloud.ubs.net

### NFR-6: Accessibility
- Keyboard navigation for all interactive elements
- ARIA labels on buttons and controls
- Escape key closes modals and panels
- Focus management on modal open/close

---

## 6. Features Removed from v4

| Feature | Reason for Removal |
|---------|-------------------|
| 6-Stage Wizard (6 stages, 17 fields, per-field AI refinement) | Replaced by editor-first flow; wizard was friction before value delivery |
| Wizard progress stepper UI | No wizard stages to track |
| Per-field AI suggestion buttons (Refine/Auto) | Pipeline handles refinement holistically |
| Stage-to-section mapping (populatesSections) | Pipeline discovers sections dynamically |
| formData state and RefinedData type | No structured form input |
| runSkill() orchestrator | Replaced by runPremiumPipeline() |
| generateEpic() from wizard data | Pipeline assembles epic from content directly |

---

## 7. Data Flow Summary

```
User Input (rough markdown in editor)
  → Select Complexity Level (Simple | Moderate | Complex — default: Moderate)
  → Click "Refine"
  → AI Pipeline (6 stages, complexity-scaled iterations and thresholds)
      Stage 2: Auto-detect category
      Stage 3: Include sections based on complexity level
      Stage 4: Scale word targets and formats by complexity × category
      Stage 5: Generate stories (count scaled by complexity) + diagram
      Stage 6: Validate against complexity-adjusted threshold
  → Structured Epic (markdown, scaled to selected complexity)
  → Back in Editor (auto-applied, previous version saved for undo)
  → Optional: Chat feedback for targeted improvements
  → Optional: Quality review (score badge → full report → apply suggestions)
  → Export: Download .md | Copy clipboard | Publish to GitLab
  → Optional: Create GitLab issues from user stories
```

---

## 8. Open Decision Points

| # | Decision | Options | Impact |
|---|----------|---------|--------|
| 1 | Blueprint as separate tab vs. integrated in editor | Tab (current) vs. Modal/overlay vs. Inline expanded view | Affects navigation, component count, and UX complexity |
| 2 | Chat panel position | Right sidebar (current) vs. Bottom panel vs. Floating widget | Affects editor space allocation and mobile consideration |
| 3 | Category selection | Auto-detect only vs. Auto-detect + manual override dropdown | Affects user control over output structure |
| 4 | Settings access | Separate tab (current) vs. Modal/dialog vs. Gear icon dropdown | Affects navigation simplicity |
| 5 | Complexity level persistence | Per-session only vs. Saved with epic in GitLab (e.g., as label or metadata) | Affects re-refine behavior on loaded epics |
| 6 | Complexity + category combinations | All 21 combos supported at launch vs. Phase selected combos | Affects testing scope and template work |

---

## 9. Success Metrics

| Metric | Target |
|--------|--------|
| Time from app open to first refined epic | Under 3 minutes |
| Pipeline completion rate (no errors) | 95%+ |
| Quality score on first refine pass | 7.0+ average |
| User can refine → review → publish without switching context | Single screen flow |
| Simple output length vs. Complex output length | Complex ≥ 2× Simple for same input |
| All 21 category × complexity combinations produce valid output | 100% pass rate |

---

## 10. Document Approval

| Role | Name | Date | Status |
|------|------|------|--------|
| Product Owner | | | Pending |
| Tech Lead | | | Pending |
| UX Lead | | | Pending |

# Template Audit: categoryTemplates.json vs Industry Standards

**Date:** 2026-03-27
**Sources:** SAFe 6.0, AWS Well-Architected, GitLab Epic Best Practices, TOGAF

---

## Executive Summary

V5 has 7 category templates (+ 1 General). They are **structurally solid** — each template has required/optional sections, word targets, format hints, and complexity metadata. But they are **missing critical enterprise sections** that SAFe, AWS, and GitLab's own best practices consider essential.

**Overall grade: B-** — Good foundation, missing strategic/governance sections.

---

## Per-Template Audit

### 1. `technical_design` — Grade: B+

**What's good:**
- Has Architecture Overview, Data Model, API Design, Implementation Plan
- Word targets are reasonable (2000-5000 total)
- Optional sections cover NFRs, testing, deployment

**What's missing vs AWS Well-Architected / industry:**
| Missing Section | Why It Matters | Source |
|----------------|----------------|--------|
| **Security Considerations** | AWS Well-Architected Pillar #2. Currently only in optional sections. Should be REQUIRED for enterprise. | AWS Well-Architected |
| **Operational Excellence** | How will this be monitored, debugged, maintained? | AWS Well-Architected |
| **Decision Log / ADRs** | Why was this design chosen over alternatives? Critical for onboarding and audits. | TOGAF, ThoughtWorks |
| **Constraints & Assumptions** | What are the hard constraints? What are we assuming is true? | IEEE 1016 |
| **Glossary / Definitions** | Domain-specific terms that stakeholders need defined. | Every enterprise standard |

**What's outdated:**
- No mention of observability (logging, tracing, metrics) — only "Monitoring" in infra template
- No cloud-native patterns (serverless, containers, service mesh)

---

### 2. `business_requirement` — Grade: B

**What's good:**
- Executive Summary, Business Objective, Scope, Stakeholder Analysis (RACI), Process Flow
- RACI matrix format is excellent

**What's missing vs SAFe Lean Business Case:**
| Missing Section | Why It Matters | Source |
|----------------|----------------|--------|
| **Hypothesis Statement** | SAFe core: "We believe [this capability] will result in [this benefit] as measured by [this metric]" | SAFe 6.0 Lean Business Case |
| **Success Metrics / KPIs** | Currently optional. SAFe makes this REQUIRED — how do you know the epic succeeded? | SAFe, OKR frameworks |
| **Leading Indicators** | Early signals to validate/invalidate the hypothesis DURING implementation | SAFe 6.0 |
| **MVP Definition** | What's the minimum viable version? Critical for incremental delivery | SAFe, Lean Startup |
| **Go/No-Go Criteria** | What evidence triggers continue vs cancel? | SAFe Lean Business Case |
| **Compliance & Regulatory** | UBS is a regulated bank — every BRD should address compliance | Financial services standard |

---

### 3. `feature_specification` — Grade: B

**What's good:**
- User Personas, Functional Requirements, User Flows, Edge Cases
- Edge Cases section is unusual and excellent

**What's missing:**
| Missing Section | Why It Matters | Source |
|----------------|----------------|--------|
| **Non-Functional Requirements** | Performance, security, accessibility targets. Not even optional here. | IEEE 830, BABOK |
| **Out of Scope** | Explicitly stating what this feature does NOT do prevents scope creep | Every PM framework |
| **Dependencies** | What other features/systems does this depend on? | SAFe, JIRA best practices |
| **Release Strategy** | Feature flags, canary, gradual rollout? | Modern SaaS practice |

---

### 4. `api_specification` — Grade: A-

**What's good:**
- Most complete template. Endpoints, schemas, error handling, auth.
- Optional: rate limiting, pagination, webhooks, SDK examples, migration guide

**What's missing:**
| Missing Section | Why It Matters | Source |
|----------------|----------------|--------|
| **Versioning Strategy** | How will breaking changes be handled? Header vs URL versioning? | OpenAPI, REST best practices |
| **SLA / Uptime Guarantees** | What availability and latency does this API promise? | Enterprise API governance |
| **Deprecation Policy** | How long until old versions are sunset? | Google API guidelines |

---

### 5. `infrastructure_design` — Grade: B+

**What's good:**
- Architecture Diagram, Compute/Storage, Networking, CI/CD, Monitoring, DR (optional)
- SLO table format for monitoring section

**What's missing:**
| Missing Section | Why It Matters | Source |
|----------------|----------------|--------|
| **Security & Compliance** | Currently optional. For a bank, this MUST be required. | AWS Well-Architected Security Pillar |
| **Backup & Recovery** | RPO/RTO definitions. Currently buried in DR optional section. | AWS Reliability Pillar |
| **Capacity Planning** | Growth projections and scaling thresholds | AWS Performance Pillar |
| **Cost Optimization** | Currently optional. Budget constraints are always required for enterprise. | AWS Cost Pillar |

---

### 6. `migration_plan` — Grade: A-

**What's good:**
- Best structured template. Current State → Target State → Data Mapping → Steps → Rollback
- Communication Plan and Cutover Checklist in optional sections

**What's missing:**
| Missing Section | Why It Matters | Source |
|----------------|----------------|--------|
| **Validation & Reconciliation** | How do you verify data integrity post-migration? | Data migration best practices |
| **Performance Baseline** | Before/after performance comparison criteria | AWS migration guide |

---

### 7. `integration_spec` — Grade: B+

**What's good:**
- System Landscape, Data Flows, Interface Contracts, Error Handling
- Comparison of Approaches section is excellent

**What's missing:**
| Missing Section | Why It Matters | Source |
|----------------|----------------|--------|
| **Data Privacy & Compliance** | GDPR, data residency, PII handling in cross-system flows | EU regulations, UBS compliance |
| **Retry & Circuit Breaker Strategy** | How do integrations handle transient failures? | Microservices patterns |
| **Idempotency** | Are operations safe to retry? Critical for reliability. | REST/event best practices |

---

## Cross-Cutting Gaps (ALL templates)

These sections are missing from ALL or most templates:

| Gap | Impact | Recommendation |
|-----|--------|----------------|
| **No `general` template definition** | `general` category has `secs: []` in categoryConstants but NO entry in categoryTemplates.json. The pipeline falls back to `technical_design` which may be wrong. | Add a `general` template with a minimal set: Overview, Objectives, Requirements, Scope, User Stories |
| **No Hypothesis/Success Metrics** | No template has a required "how will we measure success" section. SAFe makes this non-negotiable. | Add `Success Metrics` as required to business_requirement, feature_specification |
| **No Compliance section** | UBS is a regulated financial institution. Every document should address compliance. | Add `Compliance & Regulatory` as optional to ALL templates, required for business_requirement and infrastructure_design |
| **No Decision Log** | No template captures WHY decisions were made. Critical for audit trails. | Add `Decision Log` as optional to technical_design, infrastructure_design, migration_plan |
| **Security always optional** | For a bank, security should be a REQUIRED section in technical_design and infrastructure_design | Promote `Security` from optional to required in those two templates |
| **No template versioning** | `_meta.version` is `5.0.0` but there's no changelog or migration path | Add `_meta.changelog` array with version history |
| **Word targets may be too high** | `enforceWordLimit` caps at 500/section, but templates allow up to 1000. The cap and template don't agree. | Align `enforceWordLimit` default with template `max` values, or reduce template maxes to 500 |

---

## Comparison with Industry Standards

| Standard | V5 Coverage | Gap |
|----------|------------|-----|
| **SAFe Lean Business Case** | ~40% — has scope and stakeholders but no hypothesis, no MVP, no go/no-go | HIGH |
| **AWS Well-Architected** | ~50% — has architecture overview but security/reliability/cost as optional only | MEDIUM |
| **IEEE 830 (SRS)** | ~60% — has functional requirements but no constraints/assumptions/glossary | LOW |
| **TOGAF ADM** | ~30% — no architecture vision, no stakeholder concerns mapping, no governance | MEDIUM |
| **OpenAPI Spec** | ~70% — API template is the strongest, missing only versioning/SLA/deprecation | LOW |

---

## Priority Recommendations

### Must-Fix (before production):
1. **Add `general` template** to categoryTemplates.json — currently pipeline falls back incorrectly
2. **Promote Security to required** in technical_design and infrastructure_design
3. **Align word limits** — enforceWordLimit vs template maxes disagree

### Should-Fix (next sprint):
4. **Add Success Metrics** as required to business_requirement and feature_specification
5. **Add Compliance & Regulatory** as optional to all templates
6. **Add Hypothesis Statement** to business_requirement (SAFe parity)

### Nice-to-Have:
7. Add Decision Log section to technical templates
8. Add Constraints & Assumptions to technical_design
9. Add Versioning Strategy to api_specification
10. Template changelog in `_meta`

---

Sources:
- [SAFe Lean Business Case Template | Confluence](https://www.atlassian.com/software/confluence/templates/safe-lean-business-case)
- [SAFe Epic - Scaled Agile Framework](https://scaledagileframework.com/epic/)
- [How to Write Effective SAFe Epics | Agile Seekers](https://agileseekers.com/blog/how-to-write-effective-safe-epics-format-criteria-best-practices)
- [AWS Well-Architected Framework](https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html)
- [GitLab Epic Description Templates](https://docs.gitlab.com/user/project/description_templates/)
- [Enterprise Architecture with TOGAF and Well-Architected Frameworks](https://blog.devgenius.io/enterprise-architecture-with-togaf-and-well-architected-frameworks-aws-azure-and-google-4cb16875a33b)
- [GitLab Epic Templates Feature Request](https://gitlab.com/gitlab-org/gitlab/-/issues/344886)

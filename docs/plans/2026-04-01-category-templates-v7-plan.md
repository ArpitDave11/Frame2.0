# Category Templates v7.0.0 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace categoryTemplates.json with v7.0.0 spec — compressed hints, Epic Status on all categories, section merges/renames/promotions, new _meta fields.

**Architecture:** Pure data file replacement. The template loader reads sections dynamically from JSON — no structural code changes. Update the JSON, update `categoryConstants.ts` section lists to match, fix test assertions.

**Tech Stack:** JSON, TypeScript, Vitest

---

### Task 1: Replace categoryTemplates.json with v7.0.0

**Files:**
- Modify: `src/services/templates/categoryTemplates.json` (full replacement)

**Step 1: Replace the entire JSON file**

Replace `src/services/templates/categoryTemplates.json` with the v7.0.0 spec provided by the user. The full JSON was provided in the brainstorming conversation. Key structural markers to verify after replacement:

```json
{
  "_meta": {
    "version": "7.0.0",
    "changelog": { "7.0.0": "...", "6.0.0": "...", "2.1.0": "..." },
    "globalAntiPatterns": "...",
    "globalDefaults": {
      "statusEmoji": { "draft": "📝", "in_progress": "🔄", "review": "👀", "approved": "✅", "archived": "📦" },
      "reviewStates": { ... },
      "priorityLevels": { ... },
      "markdownFeatures": { ... },
      "maxTitleLength": 100,
      "defaultPerPage": 20
    }
  }
}
```

Verify:
- 10 top-level category keys (general, technical_design, business_requirement, feature_specification, api_specification, infrastructure_design, migration_plan, integration_spec, architecture_decision_record, lightweight_rfc)
- Every category has `requiredSections` with `Epic Status` as first key
- Every category has `totalWordTarget` with `excludes` array
- Every category has `diagramConfig` with `primary` and `secondary`

**Step 2: Run tests to see what breaks**

Run: `npx vitest run src/services/templates/templateLoader.test.ts`

Expected: Some failures on section name assertions (renames) and `getGlobalDefaults` (new fields). Note which tests fail.

**Step 3: Commit**

```bash
git add src/services/templates/categoryTemplates.json
git commit -m "feat: upgrade categoryTemplates.json to v7.0.0"
```

---

### Task 2: Update categoryConstants.ts section lists

**Files:**
- Modify: `src/domain/categoryConstants.ts:15-160`

**Step 1: Update each category's `secs` array to match v7 required section names**

The `secs` array in `categoryConstants.ts` is used for Welcome Screen scaffolding. Update each to match v7 required section names exactly.

```typescript
export const EPIC_CATEGORIES: EpicCategory[] = [
  {
    id: 'general',
    label: 'General',
    icon: '✦',
    secs: [],
  },
  {
    id: 'business_requirement',
    label: 'Business Requirement',
    icon: 'B',
    secs: [
      'Epic Status',
      'Executive Summary',
      'Goals & Non-Goals',
      'Business Context & Problem Statement',
      'Scope & Non-Scope',
      'Stakeholders & RACI',
      'Requirements',
      'Process Flow',
      'Success Metrics',
      'User Stories',
    ],
  },
  {
    id: 'technical_design',
    label: 'Technical Design',
    icon: 'T',
    secs: [
      'Epic Status',
      'Objective',
      'Context & Motivation',
      'Goals & Non-Goals',
      'Architecture Overview',
      'Technical Requirements',
      'Proposed Design',
      'Alternatives Considered',
      'Cross-Cutting Concerns',
      'Implementation Plan',
      'User Stories',
    ],
  },
  {
    id: 'feature_specification',
    label: 'Feature Spec',
    icon: 'F',
    secs: [
      'Epic Status',
      'Problem Statement',
      'Goals & Non-Goals',
      'User Personas',
      'Functional Requirements',
      'Scope & Non-Scope',
      'User Flows',
      'Edge Cases & Error Handling',
      'Non-Functional Requirements',
      'Analytics & Success Metrics',
      'User Stories',
    ],
  },
  {
    id: 'api_specification',
    label: 'API Specification',
    icon: 'A',
    secs: [
      'Epic Status',
      'Objective',
      'Overview & Authentication',
      'Goals & Non-Goals',
      'Endpoints',
      'Data Models',
      'Error Handling',
      'Pagination & Rate Limiting',
      'User Stories',
    ],
  },
  {
    id: 'infrastructure_design',
    label: 'Infrastructure',
    icon: 'I',
    secs: [
      'Epic Status',
      'Objective',
      'Goals & Non-Goals',
      'SLA/SLO Requirements',
      'Architecture Diagram',
      'Compute & Storage',
      'Networking & Security',
      'CI/CD Pipeline',
      'Monitoring & Alerting',
      'Disaster Recovery',
      'Cost Analysis',
      'User Stories',
    ],
  },
  {
    id: 'migration_plan',
    label: 'Migration Plan',
    icon: 'M',
    secs: [
      'Epic Status',
      'Objective',
      'Goals & Non-Goals',
      'Current State',
      'Target State',
      'Migration Strategy',
      'Scope & Non-Scope',
      'Data Mapping',
      'RACI Matrix',
      'Risk Assessment',
      'Cutover Plan',
      'Rollback Plan',
      'Validation Criteria',
      'User Stories',
    ],
  },
  {
    id: 'integration_spec',
    label: 'Integration Spec',
    icon: '\u222B',
    secs: [
      'Epic Status',
      'Objective',
      'Goals & Non-Goals',
      'Integration Overview',
      'Systems & Endpoints',
      'Data Contract & Mappings',
      'Integration Flows',
      'Error Handling & Recovery',
      'Monitoring & Alerting',
      'Performance & SLAs',
      'User Stories',
    ],
  },
  {
    id: 'architecture_decision_record',
    label: 'Decision Record',
    icon: '⚖',
    secs: [
      'Epic Status',
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
      'Epic Status',
      'Problem Statement',
      'Goals & Non-Goals',
      'Proposed Solution',
      'Impact & Scope',
    ],
  },
];
```

**Step 2: Run tests**

Run: `npx vitest run src/domain/`

Expected: types.test.ts should still pass (category IDs unchanged, just section lists).

**Step 3: Commit**

```bash
git add src/domain/categoryConstants.ts
git commit -m "feat: update categoryConstants.ts section lists for v7.0.0"
```

---

### Task 3: Fix templateLoader.test.ts assertions

**Files:**
- Modify: `src/services/templates/templateLoader.test.ts`

**Step 1: Fix `getSectionFormat` test (line 116)**

v7 renames `Stakeholder Analysis` → `Stakeholders & RACI`. Update:

```typescript
// Before:
expect(getSectionFormat('Stakeholder Analysis', template)).toBe('raci-table');

// After:
expect(getSectionFormat('Stakeholders & RACI', template)).toBe('raci-table');
```

**Step 2: Fix `findSectionConfig` test for optional section (line 86-89)**

v7 removes `Testing Strategy` from `technical_design` optionals. Use a section that still exists as optional in v7. `Risks & Mitigations` is optional in v7 tech_design:

```typescript
// Before:
it('finds optional sections too', () => {
  const config = findSectionConfig('Testing Strategy', template);
  expect(config).toBeDefined();
});

// After:
it('finds optional sections too', () => {
  const config = findSectionConfig('Risks & Mitigations', template);
  expect(config).toBeDefined();
});
```

**Step 3: Update `getGlobalDefaults` test (line 166-173)**

Add assertions for new v7 global defaults:

```typescript
describe('getGlobalDefaults', () => {
  it('returns object with statusEmoji and markdownFeatures', () => {
    const defaults = getGlobalDefaults();
    expect(defaults.statusEmoji).toBeDefined();
    expect(defaults.markdownFeatures).toBeDefined();
    expect(defaults.statusEmoji.draft).toBeDefined();
    expect(defaults.statusEmoji.archived).toBeDefined();
    expect(defaults.markdownFeatures.mermaidDiagrams).toBe(true);
    expect(defaults.reviewStates).toBeDefined();
    expect(defaults.priorityLevels).toBeDefined();
  });
});
```

Note: `getGlobalDefaults()` returns the raw `globalDefaults` object from `_meta`. Check if the function signature/return type needs updating in `templateLoader.ts`. If `getGlobalDefaults` is typed to `{ statusEmoji: ..., markdownFeatures: ... }`, the new fields (`reviewStates`, `priorityLevels`) will be silently available but not typed. The test assertions above verify they exist at runtime. If the return type is `Record<string, any>` or untyped, no change needed.

**Step 4: Run all template tests**

Run: `npx vitest run src/services/templates/templateLoader.test.ts`

Expected: All 21 tests pass. The 30-combination test (line 232-253) should pass automatically since it only checks for `requiredSections`, `optionalSections`, `tone`, and positive word targets.

**Step 5: Commit**

```bash
git add src/services/templates/templateLoader.test.ts
git commit -m "test: update templateLoader assertions for v7.0.0 section renames"
```

---

### Task 4: Run full test suite and fix any remaining breakage

**Files:**
- Potentially any file that references section names from v6

**Step 1: Run the full test suite**

Run: `npx vitest run`

Expected: 1245+ tests pass. Watch for failures in:
- Pipeline prompt builders (if any hardcode section names from v6)
- Pipeline stages (if any reference specific section titles)
- Component tests (if any render section names)

**Step 2: Search for hardcoded v6 section names across the codebase**

Grep for renamed sections to find any remaining references:

```bash
# Search for old section names that were renamed in v7
grep -rn "Stakeholder Analysis" src/ --include="*.ts" --include="*.tsx"
grep -rn "Business Objective" src/ --include="*.ts" --include="*.tsx"
grep -rn "Feature Overview" src/ --include="*.ts" --include="*.tsx"
grep -rn "Out of Scope" src/ --include="*.ts" --include="*.tsx"
grep -rn "Migration Overview" src/ --include="*.ts" --include="*.tsx"
grep -rn "Infrastructure Overview" src/ --include="*.ts" --include="*.tsx"
grep -rn "Integration Overview" src/ --include="*.ts" --include="*.tsx"
grep -rn "Migration Steps" src/ --include="*.ts" --include="*.tsx"
grep -rn "Sync Cadence" src/ --include="*.ts" --include="*.tsx"
grep -rn "Interface Contracts" src/ --include="*.ts" --include="*.tsx"
```

Fix any matches found. These are likely in:
- Prompt builders (`src/pipeline/prompts/`)
- Section discovery (`src/domain/sectionDiscovery.ts`)
- UI components that render section headers

**Step 3: Run full suite again**

Run: `npx vitest run`

Expected: All tests pass (1245+).

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: update remaining v6 section name references for v7.0.0"
```

---

### Task 5: Verify build and final sanity check

**Files:** None (verification only)

**Step 1: Run TypeScript compiler**

Run: `npx tsc --noEmit`

Expected: No errors. The `totalWordTarget.excludes` field is extra JSON data not in the TS type — TypeScript ignores it.

**Step 2: Run build**

Run: `npm run build`

Expected: Build succeeds.

**Step 3: Spot-check in browser**

Run: `npm run dev`

Verify:
- Welcome Screen shows all 10 template cards
- Clicking each template scaffolds sections matching v7 names
- Settings page still works
- No console errors

**Step 4: Final commit (if any fixes from spot-check)**

```bash
git add -A
git commit -m "chore: v7.0.0 category templates upgrade complete"
```

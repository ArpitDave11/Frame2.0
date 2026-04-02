# Findings — Mermaid Diagram Root Cause Analysis (2026-04-02)

## Test: 30 diagrams (15 pairs) across all 10 categories

### Issue Frequency (sorted by occurrence)

| # | Issue | Caught? | Count | Severity |
|---|-------|---------|-------|----------|
| 1 | Unicode arrows (→←↔) in free text | ✅ Fix 3 | 25x | Low — auto-fixed |
| 2 | Colon-style edge labels (A-->B: text) | ✅ Fix 1 | 33x | Low — auto-fixed |
| 3 | Unicode arrows INSIDE pipe labels \|"text→"\| | ❌ | 11x | **HIGH — renders but semantically wrong** |
| 4 | Unicode arrows INSIDE node labels ["text→"] | ❌ | 5x | **HIGH — may break rendering** |
| 5 | Subgraph ID with space + quoted name ("subgraph foo bar["Name"]") | ❌ | 6x | **CRITICAL — breaks Mermaid parser** |
| 6 | --"text"--> dash-label syntax (not colon, not pipe) | ❌ | 2x | **HIGH — breaks Mermaid parser** |
| 7 | Unquoted special chars in node labels (A[SOC 2 / ISO]) | ✅ AI fix | 2x | Medium — AI fix attempted |
| 8 | %%{init:} block in AI output (conflicts with applyDiagramTheme) | ❌ | 2x | **CRITICAL — double theme or theme skipped** |
| 9 | Emoji/Unicode symbols in labels (✅ ✓ ≤) | ❌ | 3x | Medium — may break some renderers |
| 10 | Em-dash (—) in labels | ❌ | 1x | Low — usually renders OK |
| 11 | classDef in stateDiagram-v2 (not supported) | ❌ | 1x | Medium — ignored by renderer |

### Diagrams with ZERO issues: 5/30 (17%)
### Diagrams with at least one UNCAUGHT issue: 25/30 (83%)
### Diagrams with CRITICAL uncaught issues: 8/30 (27%)

## Root Cause Categories

### RC-1: Unicode arrows survive inside pipe labels and node labels (16x)
Fix 3 replaces →←↔ globally, but ONLY in free-standing text. When the AI puts unicode arrows inside:
- Pipe labels: `-->|"data → target"|` — the `→` is inside quotes inside pipes
- Node labels: `["PostgreSQL → User DB"]` — the `→` is inside quotes inside brackets

The global replace `trimmed.replace(/→/g, ' to ')` DOES catch these (since it's a global replace on the full string). **However**, the test revealed Fix 3 runs AFTER Fix 1 (colon→pipe conversion), and the converted text may re-introduce issues.

**Actual impact**: Fix 3's global replace DOES catch most, but the timing with other fixes can leave residual unicode in edge cases.

### RC-2: Subgraph IDs with spaces but WITHOUT special chars (6x)
Fix 2 regex: `/^\s*subgraph\s+[^\n"[\]]+[&/():][\w &/():]+$/gm`
This ONLY matches subgraph IDs that contain `&`, `/`, `(`, `)`, or `:`.
A subgraph like `subgraph approval flow["Approval Workflow"]` has a space but NO special chars — so Fix 2 **does not catch it**.

This is the **#1 root cause of rendering failures** — Mermaid requires subgraph IDs to be single tokens.

### RC-3: `--"text"-->` dash-label syntax (2x)
LLMs sometimes use `--"Yes"-->` instead of `-->|"Yes"|`. Fix 1 only catches colon-style labels (`A --> B: text`), not this dash-text-arrow variant. It breaks Mermaid parsing completely.

### RC-4: AI generates %%{init:} blocks (2x)
When the AI includes its own `%%{init:}` theme block, `applyDiagramTheme()` skips injection (line 41: `if (diagramCode.includes('%%{init:')) return diagramCode`). This means:
- The AI's theme overrides the Paul Tol Light palette
- OR the first line is `%%{init:...}%%` instead of a directive, causing `validateMermaidSyntax` to mark it INVALID_DIRECTIVE and fall back to skeleton

### RC-5: classDef in non-flowchart diagrams (1x)
stateDiagram-v2 and sequenceDiagram don't support classDef. The AI copies the styling pattern from the prompt (which explicitly mentions classDef) even for non-flowchart diagram types.

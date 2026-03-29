# Settings Persistence + Tooltips — Root Cause Analysis & Fix Plan

**Date:** 2026-03-28
**Status:** Ready for review — NO code changes made

---

## Bug A: Settings Lost on Page Refresh

### Root Cause

**Two missing calls in the app lifecycle:**

1. **`saveToStorage()` is never called.** The settings UI components (`AIProviderConfig.tsx`, `GitLabConfig.tsx`) call `updateConfig()` on every field change, but `updateConfig()` only updates in-memory Zustand state — it does NOT persist to localStorage. The `saveToStorage()` method exists in the store but is never invoked from any non-test code.

2. **`loadFromStorage()` is never called on startup.** The store initializes with `DEFAULT_CONFIG` every time. There is no `useEffect` or initialization hook in `main.tsx`, `AuthProvider`, or any root component that calls `loadFromStorage()`.

**Evidence:**
- `configStore.ts:106-110` — `updateConfig` does deep merge but no `saveToStorage()`
- Grepping `loadFromStorage|saveToStorage` across non-test `src/` files returns only the store definition itself — zero call sites

### Fix Plan (2 changes)

| # | Change | File | Description |
|---|--------|------|-------------|
| A1 | Auto-save on every config change | `configStore.ts` | Add `saveToStorage()` call at end of `updateConfig()` (line ~110) |
| A2 | Auto-load on app startup | `src/main.tsx` or root provider | Call `useConfigStore.getState().loadFromStorage()` before `ReactDOM.createRoot()` |

**Alternative to A1:** Instead of saving on every keystroke, add a debounced save (e.g., 500ms) or save on settings panel close. Keystroke-level saves are fine for localStorage but could be noisy.

---

## Bug B: Blueprint Toolbar — No Visible Tooltips

### Root Cause

The `CtrlButton` component in `DiagramControls.tsx` sets `aria-label` on every button (good for screen readers) but does **not** set the `title` attribute. The `title` attribute is what produces native browser tooltips on hover.

**Evidence:**
- `DiagramControls.tsx` — `CtrlButton` renders `<button aria-label={label} ...>` with no `title` prop
- Grepping `title=` in `DiagramControls.tsx` returns zero matches
- Other components in the project (e.g., `WelcomeSidebar.tsx:148`, `BlueprintView.tsx:165`) already use `title=` for native tooltips

### Fix Plan (1 change)

| # | Change | File | Description |
|---|--------|------|-------------|
| B1 | Add `title={label}` to CtrlButton | `DiagramControls.tsx` | Add `title={label}` alongside existing `aria-label={label}` in the `<button>` element |

This reuses the existing `label` strings ("Regenerate diagram", "Simplify diagram", "Zoom in", etc.) which are already descriptive. No new strings needed.

---

## Bug C: Settings Fields — No Tooltips/Guidance

### Root Cause

The settings components use labels and placeholders but provide **no tooltip or helper text** explaining:
- Where to find the value (e.g., "Find your PAT in GitLab → Preferences → Access Tokens")
- What format is expected beyond the placeholder
- Why a field matters

**Current state:**
- Labels: present (e.g., "Personal Access Token", "Endpoint", "Root Group ID")
- Placeholders: present (e.g., `glpat-...`, `https://your-resource.openai.azure.com`)
- Tooltips/help icons: absent
- Helper text: only present for GitLab Base URL ("Configure via environment variables")

### Fix Plan (1 change per component)

| # | Change | File | Description |
|---|--------|------|-------------|
| C1 | Add helper text below key fields | `AIProviderConfig.tsx` | Add small gray text under: Endpoint ("Azure portal → your resource → Keys and Endpoint"), API Key ("Azure portal → Keys and Endpoint → Key 1 or Key 2"), Deployment Name ("Azure portal → Model deployments"), Base URL for OpenAI ("Default: api.openai.com/v1. Change only for proxies or compatible APIs") |
| C2 | Add helper text below key fields | `GitLabConfig.tsx` | Add small gray text under: PAT ("GitLab → Preferences → Access Tokens. Requires `api` scope"), Root Group ID ("GitLab → Your group → Settings → General → Group ID") |

**Approach:** Use inline helper text (small, muted) rather than hover tooltips — helper text is always visible and more accessible. This matches the existing pattern used for the GitLab Base URL field.

---

## Implementation Order

1. **Bug A** first (highest impact — settings literally don't work)
2. **Bug B** second (one-line fix)
3. **Bug C** third (UX improvement)

**Estimated scope:** ~30 lines of code across 4 files. No new dependencies.

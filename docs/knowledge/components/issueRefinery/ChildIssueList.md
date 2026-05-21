# ChildIssueList

[src/components/issueRefinery/ChildIssueList.tsx](../../../../src/components/issueRefinery/ChildIssueList.tsx)

Left-pane component listing the direct child issues of the currently-loaded epic. Renders one of three states:

1. **Empty** (`selectedEpic === null`) — "Load an epic to refine its child issues" hint, optional `[Load epic]` button when `onRequestLoadEpic` callback is provided.
2. **Loaded, no children** — "This epic has no child issues" hint.
3. **Populated** — epic title + iid header + radio-group list.

## Selection
The list uses the WAI-ARIA radio pattern (B-I1):
- `role="radiogroup"` on the `<ul>`; `role="radio"` on each `<button>`.
- Arrow Up/Down/Left/Right move selection with wrap-around.
- Home / End jump to first / last.
- Only the selected item carries `tabIndex={0}`; others are `-1`.
- Selection state is mirrored via `aria-checked`.

Clicking or arrow-selecting calls `issueRefineryStore.setSelectedChild(iid)`, which populates `originalBody` + `originalProjectId` from the matching child and clears any prior pipeline outputs.

## Props
- `onRequestLoadEpic?: () => void` — fires when the "Load epic" / "Change" button is clicked. The parent view typically maps this to `uiStore.openModal('loadEpic')`.

## Gotchas
- The list uses `c.id` (global GitLab id) as the React key, not `c.iid` (per-project) — safer if a future change ever spans projects.

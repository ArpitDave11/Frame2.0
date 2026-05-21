# IssueRefineryView

[src/components/issueRefinery/IssueRefineryView.tsx](../../../../src/components/issueRefinery/IssueRefineryView.tsx)

Top-level Issue Refinery tab view. Composes the 5 sub-components into a two-pane layout and bridges `gitlabStore` epic-loaded events into `issueRefineryStore`.

## Layout
- Left pane: `ChildIssueList` (or "Loading child issues…" skeleton during the bridge).
- Right pane:
  - Empty-state hint until a child is selected.
  - Once selected: `ComprehensionCard` → `RefinedIssueCard` → `ValidationCard` → optional error banner → `[Refine]` + `[Publish]` button row.

## Gitlab bridge
A `useEffect` keyed on `loadedEpicIid` calls `bridgeLoadedEpicAction(groupId, epicIid, epic)` (from the action layer) whenever the gitlab store reports a new loaded epic. The view stays presentational — it does **not** import `fetchEpicIssues` directly (B-I4).

A component-local `bridgedIidRef` short-circuits re-bridging the same epic on subsequent renders. **Important (B-C1):** the ref is only assigned on a successful bridge so a failed fetch does not lock the user out of retrying the same epic.

## State subscriptions
Granular selectors on `gitlabStore` (`loadedEpicIid`, `loadedGroupId`, `selectedEpic`) and `issueRefineryStore` (`selectedEpic`, `phase`, `selectedChildIid`, `error`). The "Refine" button label + disabled state are derived from `phase`.

## Tab wiring
Registered in [`uiStore.TabId`](../../stores/uiStore.md) as `'issueRefinery'`; rendered by `ViewRouter` inside an `ErrorBoundary`; sidebar entry uses the `Wrench` Phosphor icon.

## Gotchas
- Tab switch while a refine is in flight: the in-flight pipeline keeps running in the background; on remount, the bridge fires again (effect-ref resets on unmount). Cheap network re-issue, acceptable for v1.
- The view does NOT subscribe to `originalBody` directly — that lives in `RefinedIssueCard` to keep re-renders focused.

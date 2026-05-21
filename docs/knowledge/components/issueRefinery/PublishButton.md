# PublishButton

[src/components/issueRefinery/PublishButton.tsx](../../../../src/components/issueRefinery/PublishButton.tsx)

Wraps `publishRefinedIssue()` from the action layer with the right enabling rules and a user-edit confirm dialog.

## Gating
- **Disabled** unless `phase === 'ready'` AND `refinedDraft` is non-empty (whitespace-only treated as empty).
- **Loading** state when `phase === 'publishing'`; label becomes "Publishing…".
- Disabled during `publishing` so a double-click doesn't fire a second PUT.

## User-edit confirmation
If `userEditedDraft === true`, clicking Publish first triggers `confirmFn(...)`. Default is `window.confirm`; tests inject a mock via the `confirmFn` prop. The confirm message reads: "Publish your edited version of the refined issue body to GitLab?". If the user cancels, the action is not called.

## Locked design decision (D7)
Always-overwrite. There is no `updated_at` concurrency check in v1 — a teammate's edit between load and publish will be silently clobbered. Acknowledged for v2.

## Notes
- The button reads three store slices granularly: `phase`, `refinedDraft`, `userEditedDraft`. Each subscription is independent so unrelated store changes do not trigger re-renders.
- `window.confirm` is a synchronous blocking dialog — a future polish task can replace it with an in-component `<dialog>` for better a11y and styling.

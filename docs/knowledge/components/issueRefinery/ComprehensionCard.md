# ComprehensionCard

[src/components/issueRefinery/ComprehensionCard.tsx](../../../../src/components/issueRefinery/ComprehensionCard.tsx)

Renders the Comprehension stage's structured output. Hidden (`return null`) when `issueRefineryStore.comprehension` is null.

## Rendered sections
- **Intents** — `<dl>` of `epicIntent` / `issueIntent` (1–2 sentences each).
- **Gaps** — bulleted list (max 8 per schema).
- **Ambiguities** — bulleted list (max 8 per schema).
- **Alignment notes** — bulleted list (max 6 per schema).

Each list category shows an empty-state message ("No gaps identified.") when the array is empty.

## Notes
- All items are plain text strings; React escapes by default (security review: clean).
- Headings inside the card use `<h3>`/`<h4>` — never `<h1>` (per the locked design's "no H1" rule the schemas enforce upstream).
- The `FindingList` sub-component is local — kept un-extracted because the only other similar list (ValidationCard's findings) has different styling and severity tagging.

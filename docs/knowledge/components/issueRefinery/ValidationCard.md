# ValidationCard

[src/components/issueRefinery/ValidationCard.tsx](../../../../src/components/issueRefinery/ValidationCard.tsx)

Renders the Validation stage's score + findings. Hidden when `issueRefineryStore.validation` is null.

## Score badge
- Numeric score 0–100, paired with a tier word (B-I2):
  - **Good** — score ≥ 80 (green class)
  - **Fair** — 60–79 (amber class)
  - **Poor** — < 60 (red class)
- Tier word appears both visually and inside `aria-label` so screen-reader users get the same signal sighted users do — not color-only.
- `data-tier` attribute exposes the tier for tests and CSS targeting.

## Findings list
- Each finding is expected to be prefixed with `[critical]`, `[important]`, or `[nit]` (the system prompt + Validation schema description tells the model to do this).
- The component parses the prefix into a severity word, stored on `data-severity` and used for CSS color-coding.
- Findings missing a recognized prefix render with `data-severity="unknown"` and a default style.
- Empty findings list → "No findings — looks clean." message.

## Advisory only
Per locked design decision D6, the Publish button is **never** gated on the validation score. Validation is purely advisory; the user decides.

## Notes
- Regex-based prefix parsing is brittle if the model drifts off the conventions — flagged in the Phase B review as future work to lift into the schema as a structured `{severity, text}` shape.

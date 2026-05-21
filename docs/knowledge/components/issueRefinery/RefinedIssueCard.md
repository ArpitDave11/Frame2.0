# RefinedIssueCard

[src/components/issueRefinery/RefinedIssueCard.tsx](../../../../src/components/issueRefinery/RefinedIssueCard.tsx)

Side-by-side display of the original GitLab issue body (left, `<pre>`, read-only) and the refined draft (right, `<textarea>`). Hidden when `refinedDraft === null`.

## Edit semantics
- The textarea is fully controlled; every keystroke calls `setRefinedDraft(value, /* userEdited */ true)`.
- Once `userEditedDraft === true`, an `[edited]` badge appears in the header. The `PublishButton` reads this flag to decide whether to show a confirm dialog.

## ReadOnly gating (B-C2)
The textarea is `readOnly` whenever `phase ∈ {comprehending, refining, validating, publishing}`. This prevents the pipeline from silently clobbering user keystrokes if they type during a re-run. The `aria-label` updates to mention the read-only state for screen readers. Editable phases: `idle`, `ready`, `error`.

## Notes
- The original body is rendered in `<pre>` to preserve whitespace; the refined draft is a `<textarea>` to allow editing.
- No inline diff highlighting in v1 — side-by-side panes only. A diff library can be added in a polish task if dogfood shows users want it.
- The textarea has `spellCheck={false}` because issue bodies often contain identifiers and acronyms that browser spellcheck flags noisily.

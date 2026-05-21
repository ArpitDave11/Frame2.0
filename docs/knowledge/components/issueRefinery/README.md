# Issue Refinery — components

The Issue Refinery tab lets the user refine a single GitLab issue using a 3-stage AI pipeline grounded in its parent epic. Composition:

| Component | File | Purpose |
|---|---|---|
| [`IssueRefineryView`](IssueRefineryView.md) | [src/components/issueRefinery/IssueRefineryView.tsx](../../../../src/components/issueRefinery/IssueRefineryView.tsx) | Top-level tab view; split-pane layout; gitlab-epic bridge |
| [`ChildIssueList`](ChildIssueList.md) | [src/components/issueRefinery/ChildIssueList.tsx](../../../../src/components/issueRefinery/ChildIssueList.tsx) | Left pane: epic header + radiogroup of child issues |
| [`ComprehensionCard`](ComprehensionCard.md) | [src/components/issueRefinery/ComprehensionCard.tsx](../../../../src/components/issueRefinery/ComprehensionCard.tsx) | Renders Comprehension-stage result |
| [`RefinedIssueCard`](RefinedIssueCard.md) | [src/components/issueRefinery/RefinedIssueCard.tsx](../../../../src/components/issueRefinery/RefinedIssueCard.tsx) | Side-by-side Original / Refined draft (editable textarea) |
| [`ValidationCard`](ValidationCard.md) | [src/components/issueRefinery/ValidationCard.tsx](../../../../src/components/issueRefinery/ValidationCard.tsx) | Color-tiered score badge + findings list |
| [`PublishButton`](PublishButton.md) | [src/components/issueRefinery/PublishButton.tsx](../../../../src/components/issueRefinery/PublishButton.tsx) | "Publish to GitLab" with edit-confirm dialog |

All components read from [`issueRefineryStore`](../../stores/issueRefineryStore.md). UI actions are routed through [`refineIssueAction`](../../actions/refineIssueAction.md) — `refineSelectedIssue`, `publishRefinedIssue`, `bridgeLoadedEpicAction`.

See also: [HLD](../../../plans/2026-05-18-issue-refinery-hld.md), [Design](../../../plans/2026-05-18-issue-refinery-design.md), [Phase B review](../../../reviews/2026-05-22-issue-refinery-phase-B-review.md).

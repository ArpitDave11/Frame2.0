# Template Feedback: general (10 rounds)

## Consolidated Changes (from 10 generate→review→improve cycles)

1. **Overview.hint**: Too generic, allows filler intros → Add: "Summarize the problem, affected users, and proposed approach in 3 paragraphs. Example: '1,200 monthly support tickets stem from manual data entry.' Paragraph 1: quantified problem. Paragraph 2: affected users and current workaround. Paragraph 3: proposed approach and expected outcome. Do not write generic introductions."

2. **Goals & Non-Goals.hint**: Missing guidance on compliance goals and binary goals → Add: "At least 3 of 5 goals must be quantified (baseline → target). Binary capability goals acceptable: 'X team can do Y without Z — verified by UAT.' Compliance objectives labeled [Compliance]. Goals describe outcomes; if a goal reads like a SHALL statement, it belongs in Requirements."

3. **Epic Status.hint**: Confidence field undefined → Add: "level: High|Medium|Low + rationale. High = well-understood scope and vetted tech; Medium = some unknowns; Low = significant unknowns or pending design decisions."

4. **User Stories.hint**: ACs lack quality criteria; no machine-actor guidance; word max too low → max: 800→1200. Add machine-actor guidance and minimum 3 stories requirement.

5. **Scope & Non-Scope.hint**: No cross-reference convention → Add: "Format: '- [description] (→ Req N)' to trace to requirements. Typically 4–8 items."

6. **Architecture Overview**: Optional with no trigger → Make conditionally required when epic has ≥3 external integrations or ≥2 workflow decision points.

7. **Assumptions & Constraints.hint**: Unvalidated assumptions lack escalation → Add: "Each must state 'validated: [evidence]' or 'unvalidated: [plan + date].' If ≥3 unvalidated on same critical path, add HIGH RISK PATH callout."

8. **Dependencies.hint**: No trigger → Make conditionally required if ≥2 external dependencies.

9. **tone**: "Adaptive" too vague → Domain-keyed guidance for infrastructure/product/data/compliance.

10. **expertRole**: Single generic role → Domain-keyed examples.

11. **totalWordTarget.max**: 4000 unreachable with all sections → 6000.

12. **storyStyle**: "context-dependent" not actionable → Enumerate options: user-story+AC, BDD-gherkin, job-story.

13. **Missing section: Open Questions** → "List unresolved questions with owner, deadline, and impact if unresolved."

14. **Success Metrics.hint**: Baseline quality not enforced → Add steady-state vs incident-based baseline distinction.

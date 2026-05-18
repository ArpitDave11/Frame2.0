# Issue Refinery — High-Level Design (HLD)

**Date**: 2026-05-18
**Author**: FRAME team
**Status**: HLD locked, detailed design in [2026-05-18-issue-refinery-design.md](./2026-05-18-issue-refinery-design.md)
**Companion docs**:
- Implementation plan: [2026-05-18-issue-refinery-implementation-plan.md](./2026-05-18-issue-refinery-implementation-plan.md)
- Taskmaster PRD: [.taskmaster/docs/issue-refinery-prd.txt](../../.taskmaster/docs/issue-refinery-prd.txt)

---

## 1. One-paragraph summary

Issue Refinery is a new top-level FRAME tab that operates at the **child-issue level** of the GitLab hierarchy, complementing the existing epic-level Requirement Design tab. The user loads an epic, picks one of its child issues, and runs a focused 3-stage AI pipeline (Comprehension → Refinement → Validation) that rewrites the issue body grounded in the parent epic's intent. The refined draft is staged as a diff; an explicit "Publish to GitLab" button writes it back via `PUT /projects/:id/issues/:iid`. The feature reuses the existing GitLab data layer and Azure OpenAI client wholesale, adds one new gitlab method, and runs entirely client-side. No backend changes; no edits to the existing epic pipeline; coexists with the existing `issues` tab without merging.

---

## 2. System context

```mermaid
flowchart LR
    User([User])
    Browser["FRAME SPA<br/>(React 19 + Vite)"]
    AzureOAI["Azure OpenAI<br/>(gpt-4.1 / gpt-5)"]
    GitLab[("GitLab REST API<br/>(via /gitlab-api proxy)")]

    User -->|interacts| Browser
    Browser -->|3 sequential calls per refine<br/>strict json_schema| AzureOAI
    Browser -->|fetch epic, list children,<br/>get issue, PUT issue| GitLab

    classDef external fill:#f4f4f4,stroke:#888,stroke-dasharray: 4 2;
    class AzureOAI,GitLab external;
```

**Boundaries:**
- All AI inference runs against existing Azure OpenAI deployments (no new model deployments).
- All GitLab traffic flows through the existing Vite proxy (`/gitlab-api`) in dev and the existing same-origin ingress in prod.
- **No new backend services**, no DocMining involvement, no Export involvement.

---

## 3. Component view

```mermaid
flowchart TB
    subgraph Tab["Issue Refinery Tab (new)"]
        View["IssueRefineryView<br/>(split pane container)"]
        List["ChildIssueList<br/>(left pane)"]
        CC["ComprehensionCard"]
        RC["RefinedIssueCard<br/>(diff view)"]
        VC["ValidationCard<br/>(score + findings)"]
        PB["PublishButton"]
        View --> List
        View --> CC
        View --> RC
        View --> VC
        View --> PB
    end

    subgraph Action["Action layer (new)"]
        RIA["refineIssueAction<br/>(boundary)"]
    end

    subgraph Pipeline["src/pipeline/issue/ (new — isolated)"]
        Orch["runIssuePipeline<br/>(pure)"]
        Comp["comprehension/<br/>prompt + runner + schema"]
        Ref["refinement/<br/>prompt + runner + schema"]
        Val["validation/<br/>prompt + runner + schema"]
        Orch --> Comp
        Orch --> Ref
        Orch --> Val
    end

    subgraph Stores["Zustand stores"]
        IRS["issueRefineryStore<br/>(new)"]
        GLS["gitlabStore<br/>(reused)"]
        UIS["uiStore<br/>(adds 'issueRefinery' TabId)"]
    end

    subgraph Services["Services (mostly reused)"]
        AIC["aiClient.ts<br/>(reused)"]
        GLC["gitlabClient.ts<br/>(+ updateIssue method)"]
    end

    View -.reads.-> IRS
    View -.reads.-> GLS
    List -.reads.-> GLS
    PB -->|on click| RIA
    RIA --> Orch
    RIA -->|reads| GLS
    RIA -->|writes| IRS
    RIA -->|on publish| GLC
    Comp --> AIC
    Ref --> AIC
    Val --> AIC
    GLC -->|PUT /projects/:id/issues/:iid| GitLab[(GitLab)]
    AIC -->|3 calls with cached prefix| Azure[(Azure OpenAI)]

    classDef new fill:#dff4dd,stroke:#2a8;
    classDef reused fill:#eaf2ff,stroke:#48a;
    class View,List,CC,RC,VC,PB,RIA,Orch,Comp,Ref,Val,IRS new;
    class GLS,UIS,AIC reused;
```

**Color legend:**
- 🟢 Green = net-new code
- 🔵 Blue = reused, untouched

`gitlabClient.ts` is the only existing file that gains a new method (`updateIssue`); everything else is additive.

---

## 4. User journey

```mermaid
flowchart TD
    Start([User opens Workspace])
    ClickTab[Clicks 'Issue Refinery' tab]
    LoadEpic[Searches & loads an Epic<br/>via existing LoadEpicModal]
    ChildList[Left pane shows child issues<br/>fetched via gitlabClient.fetchEpicDetails]
    SelectChild[User clicks a child issue]
    OriginalShown[Right pane shows<br/>original issue body]
    Refine[User clicks 'Refine']
    P1[Comprehension runs<br/>~3s, low temp]
    CompShown[ComprehensionCard renders<br/>gaps, ambiguities, alignmentNotes]
    P2[Refinement runs<br/>~5s, moderate temp]
    DiffShown[RefinedIssueCard renders<br/>side-by-side diff]
    P3[Validation runs<br/>~2s, low temp]
    ValShown[ValidationCard renders<br/>score + findings]
    Decision{User accepts?}
    Edit[User edits draft inline]
    Publish[Clicks 'Publish to GitLab']
    Put[gitlabClient.updateIssue<br/>PUT /projects/:id/issues/:iid]
    Done([Issue updated on GitLab])

    Start --> ClickTab --> LoadEpic --> ChildList --> SelectChild --> OriginalShown --> Refine
    Refine --> P1 --> CompShown --> P2 --> DiffShown --> P3 --> ValShown --> Decision
    Decision -->|Yes, as-is| Publish
    Decision -->|Edit first| Edit --> Publish
    Decision -->|Refine again| Refine
    Publish --> Put --> Done
```

**Latency budget** (rough, gpt-4.1 default): 8-12 s total for the 3 stages, dominated by Refinement.
**Cost note**: stages 2 & 3 hit the prompt cache on the static document block; re-running Refine on the same issue is ~75% cheaper than the first run.

---

## 5. Pipeline sequence (the AI bit)

```mermaid
sequenceDiagram
    autonumber
    participant UI as IssueRefineryView
    participant Action as refineIssueAction
    participant Store as issueRefineryStore
    participant Pipe as runIssuePipeline
    participant AI as aiClient
    participant Azure as Azure OpenAI

    UI->>Action: refineIssue(epic, issue)
    Action->>Store: phase='comprehending'

    Note over Pipe: Static prefix (cacheable):<br/>system rules + <epic>...</epic> + <issue>...</issue>

    Action->>Pipe: runIssuePipeline(epic, issue)
    Pipe->>AI: call(comprehensionPrompt, temp=0.2,<br/>strict json_schema)
    AI->>Azure: POST /chat/completions
    Azure-->>AI: { gaps, ambiguities, alignmentNotes,<br/>epicIntent, issueIntent }
    AI-->>Pipe: Comprehension result
    Pipe->>Store: phase='refining', comprehension=...

    Pipe->>AI: call(refinementPrompt, temp=0.4,<br/>strict json_schema)
    AI->>Azure: POST /chat/completions<br/>(static prefix cache-hit ✓)
    Azure-->>AI: { refinedBody }
    AI-->>Pipe: Refinement result
    Pipe->>Store: phase='validating', refinedDraft=...

    Pipe->>AI: call(validationPrompt, temp=0.2,<br/>strict json_schema)
    AI->>Azure: POST /chat/completions<br/>(static prefix cache-hit ✓)
    Azure-->>AI: { score, findings }
    AI-->>Pipe: Validation result
    Pipe-->>Action: { comp, refined, val }
    Action->>Store: phase='ready', validation=...

    UI-->>UI: render 3 cards + Publish button

    Note over UI,Azure: User reviews, optionally edits draft

    UI->>Action: publish(refinedDraft)
    Action->>Store: phase='publishing'
    Action->>AI: (no AI call — direct gitlab)
    Note over Action: gitlabClient.updateIssue(<br/>projectId, issueIid,<br/>{description: refinedDraft})
    Action-->>Store: phase='idle' (success) or 'error'
```

**Cache discipline:** the bytes of the static prefix must be **identical** across the three calls. Any interpolated timestamp, request ID, or stray whitespace busts the cache. A dev-only HUD will log `usage.prompt_tokens_details.cached_tokens` per call to verify.

**Retry policy:** on JSON schema validation failure, one retry per stage using the Instructor pattern (append the validation error to messages, re-call). Beyond that, the stage fails and `phase='error'` with details surfaced in the UI.

---

## 6. Data model (HLD-level)

```mermaid
classDiagram
    class IssueRefineryStore {
        +selectedEpicGid: string|null
        +selectedEpicBody: string|null
        +children: GitLabIssue[]
        +selectedChildIid: number|null
        +originalBody: string|null
        +comprehension: ComprehensionResult|null
        +refinedDraft: string|null
        +validation: ValidationResult|null
        +phase: Phase
        +error: string|null
        +setSelectedChild(iid)
        +reset()
    }

    class ComprehensionResult {
        +epicIntent: string
        +issueIntent: string
        +gaps: string[]
        +ambiguities: string[]
        +alignmentNotes: string[]
    }

    class ValidationResult {
        +score: number  (0-100)
        +findings: string[]
    }

    class Phase {
        <<enumeration>>
        idle
        comprehending
        refining
        validating
        ready
        publishing
        error
    }

    IssueRefineryStore --> ComprehensionResult
    IssueRefineryStore --> ValidationResult
    IssueRefineryStore --> Phase
```

---

## 7. Deployment view (no change)

```mermaid
flowchart LR
    Browser["Browser<br/>(SPA bundle)"]
    Ingress["Existing ingress<br/>(nginx local / Istio prod)"]
    SPA["frame-spa pod<br/>nginx static"]
    GitLabSvc["GitLab (external)"]
    AzureSvc["Azure OpenAI (external)"]

    Browser --> Ingress
    Ingress -->|/frame/*| SPA
    Browser -->|/gitlab-api/*<br/>same-origin proxy| GitLabSvc
    Browser -->|HTTPS direct| AzureSvc
```

**Net-new infra: zero.** The feature is purely client-side; the existing `frame-spa` deployment serves it; existing proxies route GitLab traffic; Azure OpenAI calls go direct from browser using configured credentials in [configStore.ts](../../src/stores/configStore.ts).

---

## 8. Key non-functional properties

| Property | Target | Notes |
|---|---|---|
| Refinement latency (P50) | ≤ 10 s end-to-end | 3 sequential calls, sandwich-cached prefix |
| Cost per refinement (P50) | ≤ $0.02 | gpt-4.1 default; ~$0.005 on re-runs due to cache |
| Schema compliance | 100% strict (single retry on failure) | json_schema strict mode |
| Failure isolation | Per-stage; partial state never committed | Zod validate before store write |
| Coexistence with existing pipeline | Zero shared state | Separate store, separate pipeline dir |
| Scope-guard compliance | 100% | No edits to welcome/, pipeline/orchestrator*, pipeline/stages/** |
| GitLab write safety | Idempotent PUT; always-overwrite per locked decision | No concurrency check in v1 |

---

## 9. Scope boundaries

**In scope (v1):**
- New tab + view; epic picker (reusing existing modal); child issue list; 3-stage pipeline; diff UI; advisory validation; stage-and-publish PUT.

**Out of scope (v1, may be future work):**
- Refining tasks/subtasks nested under issues.
- Optimistic concurrency / merge-conflict UX on publish.
- Iterative refinement loop (Validation → Refinement feedback).
- Category templates for issues (bug / feature / spike).
- Batch refinement (refining multiple issues at once).
- Refining issues that don't belong to an epic (orphan issues).
- Streaming partial results to the UI.
- New backend services or stages.

---

## 10. Risks & mitigations (HLD-level)

| Risk | Mitigation |
|---|---|
| Prompt cache busts silently → cost explodes | Dev-only HUD logs `cached_tokens` per call; CI assertion would be excessive but a single dev verification gate per PR is added |
| Always-overwrite on publish clobbers a teammate's edit | Documented decision; v2 may add optimistic concurrency |
| Schema-strict mode unsupported by some Azure deployments | Existing `aiClient.ts` already handles fallback; we'll reuse its retry path |
| Coupling drift: someone calls epic-pipeline functions from issue pipeline | Scope-guard hook + lint rule restricting `src/pipeline/issue/` imports from `src/pipeline/stages/` |
| Tab proliferation / sidebar clutter | Limit to one new tab; explicit naming "Issue Refinery" disambiguates from "Issues" |
| GitLab pagination silently truncates child list | Always request `per_page=100`, follow Link headers; integration test with mocked paginated response |

---

## 11. Open items (resolved before detailed design)

All resolved via prior alignment turns:

| # | Decision | Resolution |
|---|---|---|
| Q1 | Hierarchy depth | Direct epic→issue only |
| Q2 | Iteration loop | Single pass |
| Q3 | Templates | Freeform, no template |
| Q4 | Validation shape | Score + findings, advisory only |
| Q5 | Concurrency | Always overwrite |
| Q6 | Source quotes in Comprehension | Findings only, no quotes |

---

**Next**: see [2026-05-18-issue-refinery-design.md](./2026-05-18-issue-refinery-design.md) for detailed contracts, schemas, file inventory, and prompt designs.

# Deep-Review Protocol (A-10 and B-10)

Replicates the `cc-spex:deep-review` trait using Claude Code's built-in
`Agent` tool. Five specialized reviewers dispatched in parallel, findings
aggregated, autonomous fix loop up to 3 rounds.

## When to Run

- **A-10**: after Phase A commit, before starting Phase B.
- **B-10**: after Phase B commit, before declaring MVP done.
- Optionally: before any merge to main.

## Prerequisites

- All changes staged or committed (reviewers read the diff).
- `git diff main...HEAD` shows only DocMining-scoped changes.
- No uncommitted unrelated changes.

## The 5 Reviewers

Each runs in its own fresh Agent context (no shared state). Copy each prompt
into an `Agent` tool call with `subagent_type: "general-purpose"`.

### 1. Correctness

```
You are a Correctness Reviewer. Target: the diff of the current branch
against main (run: git diff main...HEAD).

Review for:
- Mutation safety (shared mutable state, race conditions)
- Shared references (aliasing bugs, defensive copy needs)
- Logic errors (off-by-one, wrong operator, inverted conditions)
- Resource cleanup (file handles, subprocesses, async context managers)
- Null/None/undefined safety (missing guards, optional access)

Output: numbered list of findings. For each, cite file:line and severity
(critical/important/nice-to-have). Be terse. Skip compliments.
```

### 2. Architecture & Idioms

```
You are an Architecture Reviewer. Target: git diff main...HEAD.

Review for:
- Dead code (unreachable branches, unused exports)
- Unnecessary complexity (premature abstraction, speculative generality)
- Duplication (copy-paste that should be extracted)
- Misleading naming (function does not match its name)
- YAGNI violations (flags/params added for imagined future needs)
- Language/framework idiom violations (Python: non-Pythonic patterns;
  TS/React: hook rules, render-side effects, key correctness)

Output: numbered findings with file:line and severity.
```

### 3. Security

```
You are a Security Reviewer. Target: git diff main...HEAD.

Review for:
- Input validation (file size, content-type, path traversal, zip bombs)
- Injection risks (SQL, command, HTML, path)
- Secret handling (env vars logged, tokens in URLs, PAT exposure)
- Authentication / authorization bypasses
- RBAC scope (endpoints that should require auth but don't)
- Deserialization risks (pickle, yaml.load without SafeLoader)
- SSRF (user-controlled URLs fetched server-side — note Docling's
  enable_remote_services guardrail)

Output: numbered findings with file:line and severity. CVE-style
descriptions where applicable.
```

### 4. Production Readiness

```
You are a Production Readiness Reviewer. Target: git diff main...HEAD.

Review for:
- Resource leaks (unbounded queues, leaked processes, zombie threads)
- Memory patterns (accumulating buffers, missing streaming for large files)
- Observability gaps (missing structured logs, no request ID, no metrics)
- Graceful shutdown (signal handling, in-flight request drain)
- Timeouts (missing timeouts, timeouts too short/long)
- Error propagation (swallowed exceptions, wrong HTTP status codes)
- Concurrency model (Docling thread-safety: workers=1 must be enforced)

Output: numbered findings with file:line and severity.
```

### 5. Test Quality

```
You are a Test Quality Reviewer. Target: git diff main...HEAD.

Review for:
- Coverage gaps (new code with no tests, error paths untested)
- Weak assertions (asserting truthy when specific value is known)
- Wrong-reason passes (test passes for coincidental reason, not behavior)
- Missing edge cases (empty input, max size, malformed input)
- Test isolation (tests that depend on ordering, shared fixtures,
  real network or filesystem)
- Flakiness (timing-dependent, uses sleep, hits real API)

Output: numbered findings with file:line and severity. Suggest specific
test cases to add.
```

## Aggregation

After all 5 agents return:

1. Combine all findings into `docs/reviews/YYYY-MM-DD-phase-{A,B}-review.md`
   grouped by severity: **Critical → Important → Nice-to-have**.
2. Write a one-page summary appended to `REVIEWERS.md` at repo root:
   - Reviewer count (5)
   - Total findings by severity
   - Top 3 critical findings
   - Fix loop iterations (0 if clean)

## Autonomous Fix Loop (optional, up to 3 rounds)

For each **critical** or **important** finding:
1. Apply the fix.
2. Re-run the one reviewer that flagged it.
3. If re-flagged: apply again (max 3 rounds).
4. If still flagged after round 3: escalate — write to
   `docs/reviews/escalations.md` and request human decision.

Nice-to-have findings are logged but NOT auto-fixed.

## Exit Criteria

- Zero critical findings unresolved.
- Every important finding either fixed or explicitly acknowledged in
  `docs/reviews/acknowledged.md` with justification.
- Tests green after any fixes (`npm run test:run` + `pytest`).

## Dispatch Tip (efficiency)

Send all 5 Agent calls in a **single message** with parallel tool calls.
Each gets its own 200k-token context — no cross-contamination, main
context stays clean. Total wall time ≈ one reviewer's time, not 5x.

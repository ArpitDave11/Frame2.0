# ADR 0004 — BRP audit log

**Status:** Accepted · **Date:** 2026-05-27 · **Applies to:** B-35

## Context

BRP mutates planner-visible state across several flows (capacity edits,
epic additions, human-estimate changes, analysis runs). Compliance and
debugging both benefit from a tamper-evident trail of "who did what
when" — but BRP has no backend in v1, so the trail has to live in the
browser.

## Decision

Introduce a standalone `src/services/brp/auditLog.ts` module: an
in-memory ring buffer (cap 200) with `localStorage` persistence.
Entries are appended synchronously by the action layer; the log
exposes `recordAudit`, `getAuditEntries`, `subscribeAuditLog`, and
`clearAuditLog`. Each entry is `{ id, timestamp, kind, summary,
details? }` with `kind` a closed union of nine event types covering
the load/capacity/epic/estimate/analysis flows.

The audit log is intentionally **not** part of `brpStore`:

- It's not domain state — it's observability that should survive
  `reset()` (e.g., a fresh GitLab load shouldn't wipe the history of
  what the planner did in the last session).
- Keeping it standalone lets the action layer call it without
  expanding the brpStore surface area, and avoids React re-render
  pressure from the audit append path.

## Consequences

+ Audit is decoupled from BRP domain state; resetting crews does not
  drop history.
+ Persistence survives page reloads but caps at 200 entries to bound
  storage growth.
+ Subscribers can stream changes (no UI consumes this in v1; a
  future SettingsModal panel can plug in via `subscribeAuditLog`).
- localStorage quota / private-mode failures are silently dropped —
  the in-memory copy stays authoritative for the session. Acceptable
  trade-off for a debugging aid.
- 200-entry cap means very heavy days can lose history. A future
  enhancement could rotate to IndexedDB for unbounded retention.

## Notes

- The action layer (`brpActions`) is the single audit emitter today.
  Adding a new mutating flow means adding ONE `recordAudit(...)` call
  there — the test for that flow should assert the audit fires.
- The module is SSR-safe (guards on `typeof window`) so it doesn't
  break a future SSR shell.

# BRP audit log

Standalone module at `src/services/brp/auditLog.ts`. In-memory ring
buffer (cap 200) with `localStorage` persistence. Records significant
planner actions so the team has a trail when something goes sideways.

## API

```ts
recordAudit(kind, summary, details?)   → AuditEntry
getAuditEntries()                      → readonly AuditEntry[] (frozen)
subscribeAuditLog(listener)            → () => void  // unsubscribe
clearAuditLog()                        → void
```

`AuditKind` is a closed union — adding a new event type means adding a
case to the type AND the action layer call. See ADR 0004 for the
rationale.

## Storage

- Key: `brp-audit-log-v1`
- Format: JSON array of AuditEntry
- Quota / private-mode failures: silently dropped
- SSR-safe: guards on `typeof window`

## Where it's wired

`brpActions.ts` is the sole emitter today. Every mutating action calls
`recordAudit` with a one-line summary plus a `details` map.

## Why not in brpStore?

Audit is observability, not domain state. Keeping it standalone:

- Survives `brpStore.reset()` (cross-session debugging)
- Doesn't expand the store surface
- Audit append doesn't trigger React re-renders for state subscribers
- Future telemetry hooks (POST to a backend) can plug in without
  touching state

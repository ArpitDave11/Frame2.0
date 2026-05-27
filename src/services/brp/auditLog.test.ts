import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  recordAudit,
  getAuditEntries,
  subscribeAuditLog,
  clearAuditLog,
} from './auditLog';
import type { AuditEntry } from './auditLog';

beforeEach(() => {
  clearAuditLog();
});

describe('recordAudit', () => {
  it('appends an entry and returns it with id + timestamp', () => {
    const entry = recordAudit('capacity-updated', 'Pod Alpha capacity changed');
    expect(entry.kind).toBe('capacity-updated');
    expect(entry.summary).toBe('Pod Alpha capacity changed');
    expect(entry.id).toMatch(/^\d+$/);
    expect(() => new Date(entry.timestamp)).not.toThrow();
    expect(getAuditEntries()).toHaveLength(1);
  });

  it('attaches details when supplied', () => {
    const entry = recordAudit('epics-added', '2 epics added', {
      podId: 'p1',
      count: 2,
    });
    expect(entry.details).toEqual({ podId: 'p1', count: 2 });
  });

  it('omits the details field when not supplied (no empty object pollution)', () => {
    const entry = recordAudit('crews-loaded', 'Loaded 3 crews');
    expect(entry).not.toHaveProperty('details');
  });

  it('assigns monotonically increasing ids across calls', () => {
    const a = recordAudit('crews-loaded', 'a');
    const b = recordAudit('crews-loaded', 'b');
    const c = recordAudit('crews-loaded', 'c');
    expect(Number(b.id)).toBeGreaterThan(Number(a.id));
    expect(Number(c.id)).toBeGreaterThan(Number(b.id));
  });
});

describe('getAuditEntries', () => {
  it('returns a frozen snapshot — caller cannot mutate the internal buffer', () => {
    recordAudit('crews-loaded', 'a');
    const snapshot = getAuditEntries() as AuditEntry[];
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(() => snapshot.push({} as AuditEntry)).toThrow();
  });
});

describe('ring-buffer cap', () => {
  it('caps the buffer at 200 entries (oldest evicted FIFO)', () => {
    for (let i = 0; i < 205; i++) {
      recordAudit('crews-loaded', `entry-${i}`);
    }
    const snap = getAuditEntries();
    expect(snap).toHaveLength(200);
    expect(snap[0]?.summary).toBe('entry-5');
    expect(snap[snap.length - 1]?.summary).toBe('entry-204');
  });
});

describe('subscribeAuditLog', () => {
  it('invokes the listener immediately with the current snapshot', () => {
    recordAudit('crews-loaded', 'first');
    const listener = vi.fn();
    subscribeAuditLog(listener);
    expect(listener).toHaveBeenCalledTimes(1);
    const arg = listener.mock.calls[0]?.[0] as readonly AuditEntry[];
    expect(arg[0]?.summary).toBe('first');
  });

  it('invokes the listener again on every append', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeAuditLog(listener);
    listener.mockClear();
    recordAudit('crews-loaded', 'a');
    recordAudit('crews-loaded', 'b');
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it('stops receiving updates after unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeAuditLog(listener);
    listener.mockClear();
    unsubscribe();
    recordAudit('crews-loaded', 'x');
    expect(listener).not.toHaveBeenCalled();
  });

  it('isolates errors from a single listener — others still receive events', () => {
    const bad = vi.fn(() => {
      throw new Error('boom');
    });
    const good = vi.fn();
    subscribeAuditLog(bad);
    subscribeAuditLog(good);
    bad.mockClear();
    good.mockClear();
    recordAudit('crews-loaded', 'x');
    expect(bad).toHaveBeenCalled();
    expect(good).toHaveBeenCalled();
  });
});

describe('persistence', () => {
  it('persists entries to localStorage', () => {
    recordAudit('capacity-updated', 'persisted entry');
    const raw = window.localStorage.getItem('brp-audit-log-v1');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!) as { summary: string }[];
    expect(parsed[0]?.summary).toBe('persisted entry');
  });

  it('clearAuditLog wipes both memory and storage', () => {
    recordAudit('crews-loaded', 'x');
    clearAuditLog();
    expect(getAuditEntries()).toEqual([]);
    expect(window.localStorage.getItem('brp-audit-log-v1')).toBeNull();
  });
});

import { describe, it, expect } from 'vitest';
import { parseUserStories } from './parseUserStories';

// ─── Format: ### heading (pipeline output) ─────────────────

const HEADING_EPIC = `# My Epic

## User Stories

### US-001: Subscribe to ESL Kafka notification topic
**Story Points:** 3
**As a** backend developer, **I want** to subscribe to the ESL Kafka topic, **So that** I receive real-time notifications.

**Acceptance Criteria:**
- Kafka consumer is configured
- Messages are parsed correctly

**Priority:** high

**Test Cases:**
1. Valid message is consumed
2. Invalid message is rejected

### US-002: Build notification dashboard
**As a** product manager, **I want** a dashboard showing notifications, **So that** I can track system activity.

**Acceptance Criteria:**
- Dashboard renders list of notifications
- Filters by date range

**Priority:** medium
`;

describe('parseUserStories — ### heading format', () => {
  it('parses two stories with full details', () => {
    const stories = parseUserStories(HEADING_EPIC);
    expect(stories).toHaveLength(2);
    expect(stories[0]!.id).toBe('US-001');
    expect(stories[0]!.title).toBe('Subscribe to ESL Kafka notification topic');
    expect(stories[0]!.storyPoints).toBe(3);
    expect(stories[0]!.asA).toBe('backend developer');
    expect(stories[0]!.iWant).toContain('subscribe to the ESL Kafka topic');
    expect(stories[0]!.soThat).toContain('real-time notifications');
    expect(stories[0]!.acceptanceCriteria).toHaveLength(2);
    expect(stories[0]!.priority).toBe('high');
    expect(stories[0]!.testCases).toHaveLength(2);
  });

  it('parses second story correctly', () => {
    const stories = parseUserStories(HEADING_EPIC);
    expect(stories[1]!.id).toBe('US-002');
    expect(stories[1]!.title).toBe('Build notification dashboard');
    expect(stories[1]!.priority).toBe('medium');
    expect(stories[1]!.storyPoints).toBeUndefined();
  });
});

// ─── Format: **bold** at line start (hand-edited) ──────────

const BOLD_EPIC = `# My Epic

## User Stories

**US-001: Subscribe to ESL Kafka notification topic** [2pt]
**As a** backend developer, **I want** to subscribe to the ESL Kafka topic, **So that** I receive real-time notifications.

**Acceptance Criteria:**
- Kafka consumer is configured
- Messages are parsed correctly

**Priority:** high

**US-002: Build notification dashboard**
**As a** product manager, **I want** a dashboard showing notifications, **So that** I can track system activity.

**Acceptance Criteria:**
- Dashboard renders list
- Filters work

**Priority:** low
`;

describe('parseUserStories — **bold** format (no bullet)', () => {
  it('parses bold-format stories', () => {
    const stories = parseUserStories(BOLD_EPIC);
    expect(stories).toHaveLength(2);
    expect(stories[0]!.id).toBe('US-001');
    expect(stories[0]!.title).toBe('Subscribe to ESL Kafka notification topic');
    expect(stories[0]!.asA).toBe('backend developer');
    expect(stories[0]!.priority).toBe('high');
  });

  it('parses second bold story', () => {
    const stories = parseUserStories(BOLD_EPIC);
    expect(stories[1]!.id).toBe('US-002');
    expect(stories[1]!.priority).toBe('low');
  });
});

// ─── Format: bullet + bold (imported) ──────────────────────

const BULLET_BOLD_EPIC = `# Imported Epic

## User Stories

- **US-001:** Configure API gateway
**As a** developer, **I want** an API gateway, **So that** traffic is routed.

**Acceptance Criteria:**
- Gateway routes requests
- Auth middleware is applied

**Priority:** high

* **US-002:** Implement rate limiting
**As a** security engineer, **I want** rate limiting, **So that** abuse is prevented.

**Acceptance Criteria:**
- Rate limits are enforced

**Priority:** medium
`;

describe('parseUserStories — bullet + **bold** format', () => {
  it('parses bullet-prefixed bold stories', () => {
    const stories = parseUserStories(BULLET_BOLD_EPIC);
    expect(stories).toHaveLength(2);
    expect(stories[0]!.id).toBe('US-001');
    expect(stories[0]!.title).toBe('Configure API gateway');
    expect(stories[1]!.id).toBe('US-002');
    expect(stories[1]!.title).toBe('Implement rate limiting');
  });
});

// ─── Flexible digit counts ─────────────────────────────────

describe('parseUserStories — flexible digit counts', () => {
  it('normalizes US-1 to US-001', () => {
    const md = '### US-1: Short ID story\n**As a** user, **I want** something, **So that** it works.\n';
    const stories = parseUserStories(md);
    expect(stories).toHaveLength(1);
    expect(stories[0]!.id).toBe('US-001');
  });

  it('normalizes US-0001 to US-001 (strips leading zeros then re-pads)', () => {
    const md = '### US-0001: Four-digit story\n**As a** user, **I want** something, **So that** it works.\n';
    const stories = parseUserStories(md);
    expect(stories[0]!.id).toBe('US-001');
  });

  it('preserves US-100 (already >3 digits worth)', () => {
    const md = '### US-100: Centennial story\n**Priority:** low\n';
    const stories = parseUserStories(md);
    expect(stories[0]!.id).toBe('US-100');
  });

  it('handles US-1234 (>3 digits, no truncation)', () => {
    const md = '**US-1234:** Large ID story\n**Priority:** medium\n';
    const stories = parseUserStories(md);
    expect(stories[0]!.id).toBe('US-1234');
  });
});

// ─── Mixed formats in one epic ─────────────────────────────

const MIXED_EPIC = `# Mixed Format Epic

### US-001: Heading format story
**As a** user, **I want** to log in, **So that** I access my account.

**Acceptance Criteria:**
- Login form works

**Priority:** high

**US-002:** Bold format story
**As a** admin, **I want** to manage users, **So that** the system stays secure.

**Acceptance Criteria:**
- Admin panel renders

**Priority:** medium

- **US-003:** Bullet bold story
**As a** developer, **I want** API docs, **So that** I can integrate.

**Acceptance Criteria:**
- Docs are generated

**Priority:** low
`;

describe('parseUserStories — mixed formats', () => {
  it('parses all three formats in one epic', () => {
    const stories = parseUserStories(MIXED_EPIC);
    expect(stories).toHaveLength(3);
    expect(stories[0]!.id).toBe('US-001');
    expect(stories[1]!.id).toBe('US-002');
    expect(stories[2]!.id).toBe('US-003');
    expect(stories[0]!.title).toBe('Heading format story');
    expect(stories[1]!.title).toBe('Bold format story');
    expect(stories[2]!.title).toBe('Bullet bold story');
  });
});

// ─── Edge cases ────────────────────────────────────────────

describe('parseUserStories — edge cases', () => {
  it('returns empty array for empty input', () => {
    expect(parseUserStories('')).toEqual([]);
  });

  it('returns empty array when no stories found', () => {
    expect(parseUserStories('# Epic\n\n## Overview\nSome content.')).toEqual([]);
  });

  it('calling twice in sequence returns correct results (no stale lastIndex)', () => {
    const md = '### US-001: First story\n**Priority:** high\n';
    const first = parseUserStories(md);
    const second = parseUserStories(md);
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect(second[0]!.id).toBe('US-001');
  });

  it('provides defaults for missing fields', () => {
    const md = '### US-005: Minimal story\n';
    const stories = parseUserStories(md);
    expect(stories).toHaveLength(1);
    expect(stories[0]!.asA).toBe('user');
    expect(stories[0]!.iWant).toBe('Minimal story');
    expect(stories[0]!.soThat).toBe('achieve the goal');
    expect(stories[0]!.acceptanceCriteria).toEqual(['Functionality works as described']);
    expect(stories[0]!.priority).toBe('medium');
    expect(stories[0]!.storyPoints).toBeUndefined();
    expect(stories[0]!.testCases).toBeUndefined();
  });
});

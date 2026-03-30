# Sidebar Restructure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure workspace sidebar from flat 5-item nav to nested hierarchy with "Requirement Design" parent, lift Issue Manager sub-tab to uiStore, and rename labels to match FRAME branding.

**Architecture:** Add `issueSubTab` state to Zustand uiStore. Replace flat NAV_ITEMS with nested structure (`children` array). Sidebar click handler sets both `activeTab` and `issueSubTab`. IssueManagerView reads sub-tab from store. ViewRouter unchanged.

**Tech Stack:** React 18, Zustand, Phosphor Icons, Vitest + RTL

---

### Task 1: Add `issueSubTab` to uiStore

**Files:**
- Modify: `src/stores/uiStore.ts`

**Step 1: Add the type, state, and action**

In `src/stores/uiStore.ts`, add the `IssueSubTab` type after `TabId` (line 12):

```typescript
export type IssueSubTab = 'sprint' | 'epic';
```

Add to `UiState` interface (after line 31 `sidebarCollapsed`):

```typescript
issueSubTab: IssueSubTab;
```

Add to `UiActions` interface (after line 40 `setSidebarCollapsed`):

```typescript
setIssueSubTab: (tab: IssueSubTab) => void;
```

Add to `INITIAL_STATE` (after line 55 `sidebarCollapsed: false`):

```typescript
issueSubTab: 'sprint',
```

Add to store implementation (after line 82 `setSidebarCollapsed` block):

```typescript
setIssueSubTab: (tab) => {
  set({ issueSubTab: tab });
},
```

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: PASS (additive change only)

**Step 3: Commit**

```bash
git add src/stores/uiStore.ts
git commit -m "feat: add issueSubTab state to uiStore"
```

---

### Task 2: IssueManagerView — read sub-tab from store

**Files:**
- Modify: `src/components/issues/IssueManagerView.tsx`

**Step 1: Replace local activeTab with store**

Add import at top of file (line 14, after `useConfigStore`):

```typescript
import { useUiStore } from '@/stores/uiStore';
```

Find (line 63):
```typescript
const [activeTab, setActiveTab] = useState<ViewTab>('sprint');
```

Replace with:
```typescript
const activeTab = useUiStore((s) => s.issueSubTab);
const setActiveTab = useUiStore((s) => s.setIssueSubTab);
```

The `ViewTab` type (line 57) can stay — it's the same `'sprint' | 'epic'` union. The rest of the component already uses `activeTab` and `setActiveTab` by name, so everything wires up automatically.

**Step 2: Rename "Epic Issues" tab label to "Linked Issues"**

Search for the string `Epic Issues` in this file. There are two places:

1. The tab button label text — change to `Linked Issues`
2. Any references in empty state text — update to match

**Step 3: Run existing tests**

Run: `npx vitest run src/components/issues/IssueManagerView.test.tsx`
Expected: Some tests may need store setup — see Task 3.

**Step 4: Commit**

```bash
git add src/components/issues/IssueManagerView.tsx
git commit -m "feat: read issueSubTab from uiStore instead of local state"
```

---

### Task 3: Update IssueManagerView tests for store-driven tab

**Files:**
- Modify: `src/components/issues/IssueManagerView.test.tsx`

**Step 1: Add uiStore import and reset**

Add import:
```typescript
import { useUiStore } from '@/stores/uiStore';
```

In the `beforeEach` block (line 45), add store reset:
```typescript
useUiStore.setState(useUiStore.getInitialState());
```

**Step 2: Fix tab-switching tests**

Any test that clicks `tab-epic` to switch tabs should still work (the component's onClick calls `setActiveTab` which now writes to store). But verify:

- The test at line 77 (`switching to Epic Issues tab hides user search`) — should still pass since clicking the tab button calls `setActiveTab('epic')` which writes to store.
- The test at line 83 (`shows empty state on epic tab`) — same, still works.

If the component's tab buttons call `setActiveTab('epic')` (they do), clicking them sets `uiStore.issueSubTab = 'epic'`, which the component reads. No test changes needed for tab-switching — the click handler already works.

**Step 3: Update text assertions**

Change any assertion looking for `"Epic Issues"` to `"Linked Issues"`.

**Step 4: Run tests**

Run: `npx vitest run src/components/issues/IssueManagerView.test.tsx`
Expected: 13/13 PASS

**Step 5: Commit**

```bash
git add src/components/issues/IssueManagerView.test.tsx
git commit -m "test: update IssueManagerView tests for store-driven sub-tab"
```

---

### Task 4: Restructure WorkspaceSidebar nav items

**Files:**
- Modify: `src/components/layout/WorkspaceSidebar.tsx`

**Step 1: Add new icon import**

Add `LinkSimple` to the Phosphor imports (line 12-18):

```typescript
import {
  ClipboardText,
  Kanban,
  SquaresFour,
  ChartBar,
  GearSix,
  List,
  LinkSimple,
} from '@phosphor-icons/react';
```

Add `IssueSubTab` to the uiStore import:

```typescript
import { useUiStore } from '@/stores/uiStore';
import type { TabId, IssueSubTab } from '@/stores/uiStore';
```

**Step 2: Update NavItem interface and NAV_ITEMS**

Replace the `NavItem` interface and `NAV_ITEMS` array (lines 28-41):

```typescript
interface NavItem {
  id: string;
  icon: Icon;
  label: string;
  isModal?: boolean;
  tabOverride?: TabId;
  issueSubTab?: IssueSubTab;
  children?: NavItem[];
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'planner',
    icon: ClipboardText,
    label: 'Requirement Design',
    children: [
      { id: 'linked-issues', icon: LinkSimple, label: 'Linked Issues', tabOverride: 'issues', issueSubTab: 'epic' },
      { id: 'blueprints', icon: SquaresFour, label: 'Blueprints', tabOverride: 'blueprint' },
    ],
  },
  { id: 'sprint', icon: Kanban, label: 'Performa - Sprint', tabOverride: 'issues', issueSubTab: 'sprint' },
  { id: 'analytics', icon: ChartBar, label: 'Analytics' },
  { id: 'settings', icon: GearSix, label: 'Settings', isModal: true },
];
```

**Step 3: Add `setIssueSubTab` to component**

Inside `WorkspaceSidebar()`, add after existing store selectors (line 53):

```typescript
const setIssueSubTab = useUiStore((s) => s.setIssueSubTab);
```

**Step 4: Update `handleNav` function**

Replace the `handleNav` function (lines 58-64):

```typescript
const handleNav = (item: NavItem) => {
  if (item.isModal) {
    openModal('settings');
  } else {
    const tabId = (item.tabOverride ?? item.id) as TabId;
    setActiveTab(tabId);
    if (item.issueSubTab) {
      setIssueSubTab(item.issueSubTab);
    }
  }
};
```

**Step 5: Compute `isActive` helper**

Add a helper function before the return statement:

```typescript
const isItemActive = (item: NavItem): boolean => {
  if (item.isModal) return false;
  const tabId = (item.tabOverride ?? item.id) as TabId;
  return activeTab === tabId && (item.issueSubTab == null || item.issueSubTab === issueSubTab);
};
```

Also add to store selectors:
```typescript
const issueSubTab = useUiStore((s) => s.issueSubTab);
```

**Step 6: Update rendering — replace the nav items `map` block**

Replace the `{/* Nav Items */}` section (lines 156-190) with:

```typescript
{/* Nav Items */}
{NAV_ITEMS.map((item) => {
  const IconComponent = item.icon;
  const isActive = isItemActive(item);

  return (
    <React.Fragment key={item.id}>
      {/* Parent / top-level item */}
      <button
        onClick={() => handleNav(item)}
        data-testid={`nav-${item.id}`}
        title={open ? undefined : item.label}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: open ? '8px 12px' : '8px 0',
          justifyContent: open ? 'flex-start' : 'center',
          width: '100%',
          height: 38,
          border: 'none',
          borderRadius: '0.375rem',
          background: isActive ? 'var(--input-background)' : 'transparent',
          color: isActive ? 'var(--col-text-primary)' : 'var(--col-text-subtle)',
          cursor: 'pointer',
          fontSize: 13,
          fontFamily: FONT,
          fontWeight: isActive ? 400 : 300,
          transition: 'all .12s',
        }}
      >
        <IconComponent size={16} />
        {open && <span>{item.label}</span>}
      </button>

      {/* Children — indented when expanded, flat icons when collapsed */}
      {item.children?.map((child) => {
        const ChildIcon = child.icon;
        const childActive = isItemActive(child);

        return (
          <button
            key={child.id}
            onClick={() => handleNav(child)}
            data-testid={`nav-${child.id}`}
            title={open ? undefined : child.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: open ? '6px 12px 6px 36px' : '6px 0',
              justifyContent: open ? 'flex-start' : 'center',
              width: '100%',
              height: 34,
              border: 'none',
              borderRadius: '0.375rem',
              background: childActive ? 'var(--input-background)' : 'transparent',
              color: childActive ? 'var(--col-text-primary)' : 'var(--col-text-subtle)',
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: FONT,
              fontWeight: childActive ? 400 : 300,
              transition: 'all .12s',
            }}
          >
            <ChildIcon size={14} />
            {open && <span>{child.label}</span>}
          </button>
        );
      })}
    </React.Fragment>
  );
})}
```

Add `React` import at top if not already present:
```typescript
import React from 'react';
```

**Step 7: Run type check + dev server**

Run: `npx tsc --noEmit`
Expected: PASS

**Step 8: Commit**

```bash
git add src/components/layout/WorkspaceSidebar.tsx
git commit -m "feat: restructure sidebar — nested nav with Requirement Design parent"
```

---

### Task 5: Update WorkspaceSidebar tests

**Files:**
- Modify: `src/components/layout/WorkspaceSidebar.test.tsx`

**Step 1: Update test IDs and label assertions**

The test IDs changed:
- `nav-planner` → `nav-planner` (same — parent "Requirement Design")
- `nav-issues` → `nav-sprint` (top-level "Performa - Sprint")
- `nav-blueprint` → `nav-blueprints` (child of Requirement Design)
- `nav-analytics` → `nav-analytics` (same)
- `nav-settings` → `nav-settings` (same)

New test IDs added:
- `nav-linked-issues` (child — Linked Issues)

Update each test:

**Test: "renders navigation items"** — update testIds:
```typescript
it('renders all navigation items + collapse + logo', () => {
  renderSidebar();
  expect(screen.getByTestId('nav-planner')).toBeDefined();
  expect(screen.getByTestId('nav-linked-issues')).toBeDefined();
  expect(screen.getByTestId('nav-blueprints')).toBeDefined();
  expect(screen.getByTestId('nav-sprint')).toBeDefined();
  expect(screen.getByTestId('nav-analytics')).toBeDefined();
  expect(screen.getByTestId('nav-settings')).toBeDefined();
  expect(screen.getByTestId('workspace-collapse')).toBeDefined();
  expect(screen.getByTestId('workspace-ubs-logo')).toBeDefined();
});
```

**Test: "click Epic Planner"** — rename and update:
```typescript
it('click Requirement Design → activeTab becomes planner', () => {
  renderSidebar();
  fireEvent.click(screen.getByTestId('nav-planner'));
  expect(useUiStore.getState().activeTab).toBe('planner');
});
```

**Test: "click Issue Manager"** — becomes "click Performa - Sprint":
```typescript
it('click Performa - Sprint → activeTab=issues, issueSubTab=sprint', () => {
  renderSidebar();
  fireEvent.click(screen.getByTestId('nav-sprint'));
  expect(useUiStore.getState().activeTab).toBe('issues');
  expect(useUiStore.getState().issueSubTab).toBe('sprint');
});
```

**Test: "click Blueprints"** — update testId:
```typescript
it('click Blueprints → activeTab becomes blueprint', () => {
  renderSidebar();
  fireEvent.click(screen.getByTestId('nav-blueprints'));
  expect(useUiStore.getState().activeTab).toBe('blueprint');
});
```

**Add new test: "click Linked Issues"**:
```typescript
it('click Linked Issues → activeTab=issues, issueSubTab=epic', () => {
  renderSidebar();
  fireEvent.click(screen.getByTestId('nav-linked-issues'));
  expect(useUiStore.getState().activeTab).toBe('issues');
  expect(useUiStore.getState().issueSubTab).toBe('epic');
});
```

**Test: "collapsed state"** — update label assertions:
```typescript
it('collapsed state: labels hidden, width 56px', () => {
  useUiStore.setState({ sidebarCollapsed: true });
  renderSidebar();
  const sidebar = screen.getByTestId('workspace-sidebar');
  expect(sidebar.style.width).toBe('56px');
  expect(screen.queryByText('Requirement Design')).toBeNull();
  expect(screen.queryByText('Performa - Sprint')).toBeNull();
  expect(screen.queryByText('Collapse')).toBeNull();
});
```

**Test: "expanded state"** — update label assertions:
```typescript
it('expanded state: labels visible, width 220px', () => {
  useUiStore.setState({ sidebarCollapsed: false });
  renderSidebar();
  const sidebar = screen.getByTestId('workspace-sidebar');
  expect(sidebar.style.width).toBe('220px');
  expect(screen.getByText('Requirement Design')).toBeDefined();
  expect(screen.getByText('Performa - Sprint')).toBeDefined();
  expect(screen.getByText('Collapse')).toBeDefined();
});
```

**Test: "active item"** — update testId:
```typescript
it('active item has highlighted background', () => {
  useUiStore.setState({ activeTab: 'issues', issueSubTab: 'sprint' });
  renderSidebar();
  const sprintBtn = screen.getByTestId('nav-sprint');
  expect(sprintBtn.style.background).toContain('var(--input-background)');
  const plannerBtn = screen.getByTestId('nav-planner');
  expect(plannerBtn.style.background).toBe('transparent');
});
```

**Step 2: Run tests**

Run: `npx vitest run src/components/layout/WorkspaceSidebar.test.tsx`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add src/components/layout/WorkspaceSidebar.test.tsx
git commit -m "test: update sidebar tests for nested nav structure"
```

---

### Task 6: Full test suite + build check

**Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass (minus any pre-existing failures)

**Step 2: Run build**

Run: `npx tsc --noEmit && npx vite build`
Expected: Build succeeds

**Step 3: Commit any remaining fixes**

If any tests needed adjustment, commit fixes.

**Step 4: Push to remote**

```bash
git push
```

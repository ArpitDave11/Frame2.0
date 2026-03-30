# Sidebar Restructure — Design Document

**Goal:** Restructure workspace sidebar from flat 5-item nav to nested hierarchy with "Requirement Design" as parent grouping, rename items to match FRAME branding, and lift Issue Manager sub-tab state to uiStore so sidebar can control which tab opens.

**Architecture:** Add `issueSubTab` to Zustand uiStore. Replace flat NAV_ITEMS with nested structure supporting `children`. IssueManagerView reads sub-tab from store instead of local state. ViewRouter unchanged.

**Tech Stack:** React, Zustand, Phosphor Icons, inline styles (existing conventions)

---

## Navigation Map

| Sidebar Item | Click Action | View |
|---|---|---|
| Requirement Design | `setActiveTab('planner')` | Editor + Preview |
| -- Linked Issues | `setActiveTab('issues')` + `setIssueSubTab('epic')` | Issue Manager (Epic tab) |
| -- Blueprints | `setActiveTab('blueprint')` | Blueprint view |
| Performa - Sprint | `setActiveTab('issues')` + `setIssueSubTab('sprint')` | Issue Manager (Sprint tab) |
| Analytics | `setActiveTab('analytics')` | Analytics view |
| Settings | `openModal('settings')` | Settings modal |

## Behavior

- **Expanded sidebar (220px):** Children indented under parent with smaller styling
- **Collapsed sidebar (56px):** All items flat as individual icon buttons
- **Parent click:** Navigates to planner (not toggle)
- **ViewRouter.tsx:** Unchanged — both "Linked Issues" and "Performa - Sprint" route to `'issues'` TabId

## Changes

### 1. uiStore.ts — Add issueSubTab

- New type: `IssueSubTab = 'sprint' | 'epic'`
- New state: `issueSubTab: IssueSubTab` (default: `'sprint'`)
- New action: `setIssueSubTab: (tab: IssueSubTab) => void`

### 2. WorkspaceSidebar.tsx — Nested nav items

- Replace flat `NavItem[]` with nested structure supporting `children`, `tabOverride`, `issueSubTab`
- Update `handleNav` to set both `activeTab` and `issueSubTab` when applicable
- Render children indented (paddingLeft: 36) when expanded, flat icons when collapsed

### 3. IssueManagerView.tsx — Read from store

- Replace `useState<ViewTab>('sprint')` with `useUiStore(s => s.issueSubTab)` + `useUiStore(s => s.setIssueSubTab)`
- Rename "Epic Issues" tab label to "Linked Issues"

### 4. IssueManagerView.test.tsx — Update for store-driven tab

- Mock or set uiStore state instead of relying on local useState
- Verify tab switching works via store

## Files NOT Changed

- `ViewRouter.tsx` — routing logic unchanged
- `WelcomeSidebar.tsx` — welcome screen nav is separate

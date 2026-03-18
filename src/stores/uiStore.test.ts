import { describe, it, expect, beforeEach } from 'vitest';
import { useUiStore } from './uiStore';

beforeEach(() => {
  useUiStore.setState(useUiStore.getInitialState());
});

// ─── Initial State ──────────────────────────────────────────

describe('initial state', () => {
  it('activeTab is editor', () => {
    expect(useUiStore.getState().activeTab).toBe('editor');
  });

  it('sidebarCollapsed is false', () => {
    expect(useUiStore.getState().sidebarCollapsed).toBe(false);
  });

  it('activeModal is null', () => {
    expect(useUiStore.getState().activeModal).toBeNull();
  });

  it('toasts is empty', () => {
    expect(useUiStore.getState().toasts).toEqual([]);
  });
});

// ─── setActiveTab ───────────────────────────────────────────

describe('setActiveTab', () => {
  it('switches to blueprint', () => {
    useUiStore.getState().setActiveTab('blueprint');
    expect(useUiStore.getState().activeTab).toBe('blueprint');
  });

  it('switches to settings', () => {
    useUiStore.getState().setActiveTab('settings');
    expect(useUiStore.getState().activeTab).toBe('settings');
  });
});

// ─── sidebar ────────────────────────────────────────────────

describe('sidebar', () => {
  it('toggleSidebar flips collapsed state', () => {
    expect(useUiStore.getState().sidebarCollapsed).toBe(false);
    useUiStore.getState().toggleSidebar();
    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
    useUiStore.getState().toggleSidebar();
    expect(useUiStore.getState().sidebarCollapsed).toBe(false);
  });

  it('setSidebarCollapsed sets explicit value', () => {
    useUiStore.getState().setSidebarCollapsed(true);
    expect(useUiStore.getState().sidebarCollapsed).toBe(true);
    useUiStore.getState().setSidebarCollapsed(false);
    expect(useUiStore.getState().sidebarCollapsed).toBe(false);
  });
});

// ─── modals ─────────────────────────────────────────────────

describe('modals', () => {
  it('openModal sets activeModal', () => {
    useUiStore.getState().openModal('publish');
    expect(useUiStore.getState().activeModal).toBe('publish');
  });

  it('openModal replaces current modal', () => {
    useUiStore.getState().openModal('publish');
    useUiStore.getState().openModal('loadEpic');
    expect(useUiStore.getState().activeModal).toBe('loadEpic');
  });

  it('closeModal sets activeModal to null', () => {
    useUiStore.getState().openModal('critique');
    useUiStore.getState().closeModal();
    expect(useUiStore.getState().activeModal).toBeNull();
  });
});

// ─── toasts ─────────────────────────────────────────────────

describe('toasts', () => {
  it('addToast generates a uuid id', () => {
    useUiStore.getState().addToast({ type: 'success', title: 'Done' });
    const toasts = useUiStore.getState().toasts;
    expect(toasts).toHaveLength(1);
    expect(toasts[0].id).toBeDefined();
    expect(typeof toasts[0].id).toBe('string');
    expect(toasts[0].id.length).toBeGreaterThan(0);
    expect(toasts[0].type).toBe('success');
    expect(toasts[0].title).toBe('Done');
  });

  it('removeToast removes toast by id', () => {
    useUiStore.getState().addToast({ type: 'error', title: 'Oops' });
    const id = useUiStore.getState().toasts[0].id;
    useUiStore.getState().removeToast(id);
    expect(useUiStore.getState().toasts).toEqual([]);
  });

  it('multiple toasts accumulate', () => {
    useUiStore.getState().addToast({ type: 'success', title: 'A' });
    useUiStore.getState().addToast({ type: 'info', title: 'B' });
    expect(useUiStore.getState().toasts).toHaveLength(2);
  });

  it('removeToast only removes the targeted toast', () => {
    useUiStore.getState().addToast({ type: 'success', title: 'Keep' });
    useUiStore.getState().addToast({ type: 'error', title: 'Remove' });
    const toasts = useUiStore.getState().toasts;
    const removeId = toasts[1].id;
    useUiStore.getState().removeToast(removeId);
    const remaining = useUiStore.getState().toasts;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].title).toBe('Keep');
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore } from './chatStore';

beforeEach(() => {
  useChatStore.setState(useChatStore.getInitialState());
});

// ─── Initial State ──────────────────────────────────────────

describe('initial state', () => {
  it('isOpen is false', () => {
    expect(useChatStore.getState().isOpen).toBe(false);
  });

  it('messages is empty', () => {
    expect(useChatStore.getState().messages).toEqual([]);
  });

  it('isProcessing is false', () => {
    expect(useChatStore.getState().isProcessing).toBe(false);
  });

  it('input is empty', () => {
    expect(useChatStore.getState().input).toBe('');
  });

  it('pendingSection is undefined', () => {
    expect(useChatStore.getState().pendingSection).toBeUndefined();
  });

  it('pendingFeedback is undefined', () => {
    expect(useChatStore.getState().pendingFeedback).toBeUndefined();
  });
});

// ─── toggleOpen / setOpen ───────────────────────────────────

describe('open state', () => {
  it('toggleOpen flips isOpen', () => {
    useChatStore.getState().toggleOpen();
    expect(useChatStore.getState().isOpen).toBe(true);
    useChatStore.getState().toggleOpen();
    expect(useChatStore.getState().isOpen).toBe(false);
  });

  it('setOpen sets explicit value', () => {
    useChatStore.getState().setOpen(true);
    expect(useChatStore.getState().isOpen).toBe(true);
    useChatStore.getState().setOpen(false);
    expect(useChatStore.getState().isOpen).toBe(false);
  });
});

// ─── setInput ───────────────────────────────────────────────

describe('setInput', () => {
  it('updates input string', () => {
    useChatStore.getState().setInput('Fix section 3');
    expect(useChatStore.getState().input).toBe('Fix section 3');
  });
});

// ─── addMessage ─────────────────────────────────────────────

describe('addMessage', () => {
  it('adds message with auto-generated id and timestamp', () => {
    useChatStore.getState().addMessage({ role: 'user', content: 'Fix section 3' });
    const messages = useChatStore.getState().messages;
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe('user');
    expect(messages[0].content).toBe('Fix section 3');
    expect(typeof messages[0].id).toBe('string');
    expect(messages[0].id.length).toBeGreaterThan(0);
    expect(typeof messages[0].timestamp).toBe('number');
    expect(messages[0].timestamp).toBeGreaterThan(0);
  });

  it('accumulates multiple messages', () => {
    useChatStore.getState().addMessage({ role: 'user', content: 'Hello' });
    useChatStore.getState().addMessage({ role: 'assistant', content: 'Hi there' });
    expect(useChatStore.getState().messages).toHaveLength(2);
    expect(useChatStore.getState().messages[0].role).toBe('user');
    expect(useChatStore.getState().messages[1].role).toBe('assistant');
  });

  it('each message gets a unique id', () => {
    useChatStore.getState().addMessage({ role: 'user', content: 'A' });
    useChatStore.getState().addMessage({ role: 'user', content: 'B' });
    const [a, b] = useChatStore.getState().messages;
    expect(a.id).not.toBe(b.id);
  });
});

// ─── setProcessing ──────────────────────────────────────────

describe('setProcessing', () => {
  it('sets isProcessing', () => {
    useChatStore.getState().setProcessing(true);
    expect(useChatStore.getState().isProcessing).toBe(true);
    useChatStore.getState().setProcessing(false);
    expect(useChatStore.getState().isProcessing).toBe(false);
  });
});

// ─── setPending / clearPending ──────────────────────────────

describe('pending state', () => {
  it('setPending sets section and feedback', () => {
    useChatStore.getState().setPending(3, 'Fix the scope');
    const state = useChatStore.getState();
    expect(state.pendingSection).toBe(3);
    expect(state.pendingFeedback).toBe('Fix the scope');
  });

  it('setPending with only section', () => {
    useChatStore.getState().setPending(5);
    expect(useChatStore.getState().pendingSection).toBe(5);
    expect(useChatStore.getState().pendingFeedback).toBeUndefined();
  });

  it('clearPending resets both to undefined', () => {
    useChatStore.getState().setPending(3, 'Fix the scope');
    useChatStore.getState().clearPending();
    expect(useChatStore.getState().pendingSection).toBeUndefined();
    expect(useChatStore.getState().pendingFeedback).toBeUndefined();
  });
});

// ─── clearMessages ──────────────────────────────────────────

describe('clearMessages', () => {
  it('empties the messages array', () => {
    useChatStore.getState().addMessage({ role: 'user', content: 'Hello' });
    useChatStore.getState().addMessage({ role: 'assistant', content: 'Hi' });
    useChatStore.getState().clearMessages();
    expect(useChatStore.getState().messages).toEqual([]);
  });
});

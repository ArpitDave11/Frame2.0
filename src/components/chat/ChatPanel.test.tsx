/**
 * Tests for ChatPanel — Phase 11 (T-11.1).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatPanel } from './ChatPanel';
import { useChatStore } from '@/stores/chatStore';

// Mock chatAction to avoid AI calls
vi.mock('@/chat/chatAction', () => ({
  chatAction: vi.fn(),
}));

beforeEach(() => {
  useChatStore.setState({
    messages: [],
    isOpen: false,
    isProcessing: false,
    input: '',
  });
});

describe('ChatPanel', () => {
  it('closed state: floating button visible, panel hidden', () => {
    render(<ChatPanel />);
    expect(screen.getByTestId('chat-fab')).toBeDefined();
    expect(screen.queryByTestId('chat-panel')).toBeNull();
  });

  it('click button opens panel', () => {
    render(<ChatPanel />);
    fireEvent.click(screen.getByTestId('chat-fab'));
    expect(screen.getByTestId('chat-panel')).toBeDefined();
    expect(screen.queryByTestId('chat-fab')).toBeNull();
  });

  it('panel shows header with "Chat" text', () => {
    useChatStore.setState({ isOpen: true });
    render(<ChatPanel />);
    expect(screen.getByText('Chat')).toBeDefined();
  });

  it('quick actions (Expand, Add examples, Simplify) visible', () => {
    useChatStore.setState({ isOpen: true });
    render(<ChatPanel />);
    expect(screen.getByText('Expand')).toBeDefined();
    expect(screen.getByText('Add examples')).toBeDefined();
    expect(screen.getByText('Simplify')).toBeDefined();
  });

  it('messages render correctly', () => {
    useChatStore.setState({
      isOpen: true,
      messages: [
        { id: 'msg-1', role: 'user', content: 'Hello', timestamp: Date.now() },
        { id: 'msg-2', role: 'assistant', content: 'Hi there', timestamp: Date.now() },
      ],
    });
    render(<ChatPanel />);
    expect(screen.getByTestId('chat-message-msg-1')).toBeDefined();
    expect(screen.getByTestId('chat-message-msg-2')).toBeDefined();
    expect(screen.getByText('Hello')).toBeDefined();
    expect(screen.getByText('Hi there')).toBeDefined();
  });

  it('click X closes panel', () => {
    useChatStore.setState({ isOpen: true });
    render(<ChatPanel />);
    fireEvent.click(screen.getByTestId('chat-close-btn'));
    expect(screen.queryByTestId('chat-panel')).toBeNull();
    expect(screen.getByTestId('chat-fab')).toBeDefined();
  });

  it('quick action click calls chatAction', async () => {
    const { chatAction } = await import('@/chat/chatAction');
    useChatStore.setState({ isOpen: true });
    render(<ChatPanel />);
    fireEvent.click(screen.getByText('Expand'));
    expect(chatAction).toHaveBeenCalledWith('Expand');
  });
});

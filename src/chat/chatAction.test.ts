/**
 * Tests for chatAction — Phase 11 (T-11.4).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useChatStore } from '@/stores/chatStore';
import { useConfigStore } from '@/stores/configStore';

// Mock the AI client
vi.mock('@/services/ai/aiClient', () => ({
  callAI: vi.fn(),
  isAIEnabled: vi.fn(),
}));

import { callAI, isAIEnabled } from '@/services/ai/aiClient';
import { chatAction } from './chatAction';

const mockedCallAI = vi.mocked(callAI);
const mockedIsAIEnabled = vi.mocked(isAIEnabled);

beforeEach(() => {
  useChatStore.setState({
    messages: [],
    isOpen: true,
    isProcessing: false,
    input: 'test input',
  });
  vi.clearAllMocks();
});

describe('chatAction', () => {
  it('adds user message to chatStore', async () => {
    mockedIsAIEnabled.mockReturnValue(false);
    await chatAction('Hello');
    const messages = useChatStore.getState().messages;
    expect(messages[0]!.role).toBe('user');
    expect(messages[0]!.content).toBe('Hello');
  });

  it('clears input and sets processing', async () => {
    mockedIsAIEnabled.mockReturnValue(false);

    // Check processing is set during execution
    const processingStates: boolean[] = [];
    const unsub = useChatStore.subscribe((s) => {
      processingStates.push(s.isProcessing);
    });

    await chatAction('Hello');
    unsub();

    expect(useChatStore.getState().input).toBe('');
    // Processing should be false after completion
    expect(useChatStore.getState().isProcessing).toBe(false);
    // Processing was set to true during execution
    expect(processingStates).toContain(true);
  });

  it('adds "no provider" message when AI is not enabled', async () => {
    mockedIsAIEnabled.mockReturnValue(false);
    await chatAction('Hello');
    const messages = useChatStore.getState().messages;
    const aiMessage = messages.find((m) => m.role === 'assistant');
    expect(aiMessage).toBeDefined();
    expect(aiMessage!.content).toContain('No AI provider configured');
  });

  it('adds AI response to chatStore', async () => {
    mockedIsAIEnabled.mockReturnValue(true);
    mockedCallAI.mockResolvedValue({
      content: 'AI response here',
      model: 'gpt-4',
    });

    // Set a valid config so the action can build aiConfig
    const configStore = useConfigStore.getState();
    configStore.updateConfig({
      ai: { provider: 'openai' },
    });

    await chatAction('Help me');
    const messages = useChatStore.getState().messages;
    const aiMessage = messages.find((m) => m.role === 'assistant');
    expect(aiMessage).toBeDefined();
    expect(aiMessage!.content).toBe('AI response here');
  });

  it('handles error gracefully', async () => {
    mockedIsAIEnabled.mockReturnValue(true);
    mockedCallAI.mockRejectedValue(new Error('Network fail'));

    const configStore = useConfigStore.getState();
    configStore.updateConfig({
      ai: { provider: 'openai' },
    });

    await chatAction('Help me');
    const messages = useChatStore.getState().messages;
    const aiMessage = messages.find((m) => m.role === 'assistant');
    expect(aiMessage).toBeDefined();
    expect(aiMessage!.content).toContain('Network fail');
  });

  it('sets processing to false after completion', async () => {
    mockedIsAIEnabled.mockReturnValue(true);
    mockedCallAI.mockResolvedValue({
      content: 'Done',
      model: 'gpt-4',
    });

    const configStore = useConfigStore.getState();
    configStore.updateConfig({
      ai: { provider: 'openai' },
    });

    await chatAction('Test');
    expect(useChatStore.getState().isProcessing).toBe(false);
  });
});

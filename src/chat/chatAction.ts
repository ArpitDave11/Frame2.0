/**
 * Chat Action — Phase 11 (T-11.4).
 *
 * Async action that sends user messages to AI with epic context,
 * then stores the response in chatStore.
 */

import { useChatStore } from '@/stores/chatStore';
import { useEpicStore } from '@/stores/epicStore';
import { useConfigStore } from '@/stores/configStore';
import { callAI, isAIEnabled } from '@/services/ai/aiClient';
import type { AIClientConfig } from '@/services/ai/types';

// ─── Action ─────────────────────────────────────────────────

export async function chatAction(userMessage: string): Promise<void> {
  const chatStore = useChatStore.getState();
  const epicStore = useEpicStore.getState();
  const configStore = useConfigStore.getState();

  // Add user message
  chatStore.addMessage({ role: 'user', content: userMessage });
  chatStore.setInput('');
  chatStore.setProcessing(true);

  try {
    // Check AI config
    if (!isAIEnabled(configStore.config)) {
      chatStore.addMessage({
        role: 'assistant',
        content: 'No AI provider configured. Please open Settings to connect.',
      });
      return;
    }

    // Build AI config
    const aiConfig: AIClientConfig = {
      provider: configStore.config.ai.provider,
      azure: configStore.config.ai.azure,
      openai: configStore.config.ai.openai,
      endpoints: configStore.config.endpoints,
    };

    // Call AI with epic context + user request
    const response = await callAI(aiConfig, {
      systemPrompt: `You are a helpful AI assistant for improving epic documents. The user's current epic:\n\n${epicStore.markdown}\n\nHelp them improve their epic based on their request. If they ask to modify a section, describe what changes you'd make. Be concise and actionable.`,
      userPrompt: userMessage,
      temperature: 0.5,
    });

    chatStore.addMessage({ role: 'assistant', content: response.content });
  } catch (err) {
    chatStore.addMessage({
      role: 'assistant',
      content: `Error: ${err instanceof Error ? err.message : String(err)}`,
    });
  } finally {
    chatStore.setProcessing(false);
  }
}

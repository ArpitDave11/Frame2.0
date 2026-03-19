/**
 * Chat Action — Phase 11 (T-11.4).
 *
 * Sends user messages to AI with epic context, stores responses,
 * and auto-applies section updates when the AI suggests changes.
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

  chatStore.addMessage({ role: 'user', content: userMessage });
  chatStore.setInput('');
  chatStore.setProcessing(true);

  try {
    if (!isAIEnabled(configStore.config)) {
      chatStore.addMessage({
        role: 'assistant',
        content: 'No AI provider configured. Please open Settings to connect.',
      });
      return;
    }

    const aiConfig: AIClientConfig = {
      provider: configStore.config.ai.provider,
      azure: configStore.config.ai.azure,
      openai: configStore.config.ai.openai,
      endpoints: configStore.config.endpoints,
    };

    const response = await callAI(aiConfig, {
      systemPrompt: buildChatSystemPrompt(epicStore.markdown),
      userPrompt: userMessage,
      temperature: 0.5,
    });

    // Try to parse structured response with section update
    const parsed = tryParseStructuredResponse(response.content);

    if (parsed) {
      chatStore.addMessage({ role: 'assistant', content: parsed.message });
      if (parsed.sectionUpdate) {
        useEpicStore.getState().updateSection(
          parsed.sectionUpdate.title,
          parsed.sectionUpdate.content,
        );
        chatStore.addMessage({
          role: 'system',
          content: `Updated section "${parsed.sectionUpdate.title}"`,
        });
      }
    } else {
      // Plain text response (no structured JSON)
      chatStore.addMessage({ role: 'assistant', content: response.content });
    }
  } catch (err) {
    chatStore.addMessage({
      role: 'assistant',
      content: `Error: ${err instanceof Error ? err.message : String(err)}`,
    });
  } finally {
    chatStore.setProcessing(false);
  }
}

// ─── Prompt ─────────────────────────────────────────────────

function buildChatSystemPrompt(markdown: string): string {
  return `You are a helpful AI assistant for improving epic documents.

The user's current epic:

${markdown}

Help them improve their epic based on their request. Be concise and actionable.

If the user asks to modify, expand, simplify, or rewrite a specific section, respond with JSON:
{"message": "Your conversational response explaining what you changed", "sectionUpdate": {"title": "Exact Section Title", "content": "The full new section content"}}

If the user asks a question or doesn't request a section change, respond with plain text (no JSON).`;
}

// ─── Response Parsing ───────────────────────────────────────

interface StructuredResponse {
  message: string;
  sectionUpdate: { title: string; content: string } | null;
}

function tryParseStructuredResponse(text: string): StructuredResponse | null {
  const trimmed = text.trim();

  // Try direct JSON parse
  try {
    const obj = JSON.parse(trimmed);
    if (typeof obj === 'object' && obj !== null && typeof obj.message === 'string') {
      return {
        message: obj.message,
        sectionUpdate: obj.sectionUpdate && typeof obj.sectionUpdate.title === 'string'
          ? { title: obj.sectionUpdate.title, content: String(obj.sectionUpdate.content ?? '') }
          : null,
      };
    }
  } catch { /* not JSON */ }

  // Try extracting JSON from code block
  const match = /```(?:json)?\s*\n?([\s\S]*?)```/.exec(trimmed);
  if (match?.[1]) {
    try {
      const obj = JSON.parse(match[1].trim());
      if (typeof obj === 'object' && obj !== null && typeof obj.message === 'string') {
        return {
          message: obj.message,
          sectionUpdate: obj.sectionUpdate && typeof obj.sectionUpdate.title === 'string'
            ? { title: obj.sectionUpdate.title, content: String(obj.sectionUpdate.content ?? '') }
            : null,
        };
      }
    } catch { /* not valid JSON in code block */ }
  }

  return null;
}

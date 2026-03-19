/**
 * ChatMessage — Phase 11 (T-11.2).
 *
 * Individual message bubble. User messages right-aligned, AI messages left-aligned.
 * Pixel-matched to prototype ChatPanel.tsx message rendering.
 */

import type { ChatMessage as ChatMessageType } from '@/stores/chatStore';

// ─── Props ──────────────────────────────────────────────────

export interface ChatMessageProps {
  message: ChatMessageType;
}

// ─── Component ──────────────────────────────────────────────

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div
      data-testid={`chat-message-${message.id}`}
      style={{
        padding: '8px 12px',
        borderRadius: isUser ? '10px 10px 4px 10px' : '10px 10px 10px 4px',
        background: isUser ? 'var(--input-background)' : 'var(--col-muted)',
        color: 'var(--col-text-subtle)',
        fontSize: 12,
        lineHeight: 1.5,
        fontWeight: 300,
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '88%',
        animation: 'ubsFade .2s',
      }}
    >
      {message.content}
    </div>
  );
}

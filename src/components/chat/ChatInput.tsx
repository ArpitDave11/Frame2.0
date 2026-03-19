/**
 * ChatInput — Phase 11 (T-11.3).
 *
 * Message composer with rounded input and send button.
 * Reads input/processing state from chatStore directly.
 * Pixel-matched to prototype ChatPanel.tsx input area.
 */

import { PaperPlaneTilt } from '@phosphor-icons/react';
import { useChatStore } from '@/stores/chatStore';

// ─── Props ──────────────────────────────────────────────────

export interface ChatInputProps {
  onSend: (text: string) => void;
}

// ─── Component ──────────────────────────────────────────────

export function ChatInput({ onSend }: ChatInputProps) {
  const input = useChatStore((s) => s.input);
  const setInput = useChatStore((s) => s.setInput);
  const isProcessing = useChatStore((s) => s.isProcessing);

  const hasText = input.trim().length > 0;

  const handleSend = () => {
    if (!hasText || isProcessing) return;
    onSend(input.trim());
  };

  return (
    <div
      style={{
        padding: 10,
        borderTop: '1px solid var(--col-border-illustrative)',
        display: 'flex',
        gap: 6,
        flexShrink: 0,
      }}
    >
      <input
        data-testid="chat-input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        placeholder="Improve a section..."
        disabled={isProcessing}
        style={{
          flex: 1,
          padding: '7px 14px',
          borderRadius: 20,
          border: '1px solid var(--col-border-illustrative)',
          fontSize: 12,
          fontFamily: "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif",
          fontWeight: 300,
          outline: 'none',
          color: 'var(--col-text-primary)',
          background: 'var(--input-background)',
        }}
      />
      <button
        data-testid="chat-send-btn"
        onClick={handleSend}
        disabled={isProcessing}
        style={{
          width: 30,
          height: 30,
          borderRadius: '50%',
          border: 'none',
          background: hasText
            ? 'var(--col-background-brand)'
            : 'var(--col-switch-background)',
          color: 'var(--col-text-inverted)',
          cursor: hasText && !isProcessing ? 'pointer' : 'default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background .15s',
        }}
      >
        <PaperPlaneTilt size={12} weight="fill" color="var(--col-text-inverted)" />
      </button>
    </div>
  );
}

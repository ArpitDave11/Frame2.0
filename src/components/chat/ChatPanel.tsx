/**
 * ChatPanel — Phase 11 (T-11.1).
 *
 * Floating chat panel pixel-matched to prototype.
 * Closed: red circle FAB. Open: 340x480 floating panel with header,
 * quick actions, messages, and input.
 */

import { ChatCircle, X } from '@phosphor-icons/react';
import { useChatStore } from '@/stores/chatStore';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { chatAction } from '@/chat/chatAction';
import { useRef, useEffect } from 'react';

// ─── Constants ──────────────────────────────────────────────

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";
const QUICK_ACTIONS = ['Expand', 'Add examples', 'Simplify'] as const;

// ─── Component ──────────────────────────────────────────────

export function ChatPanel() {
  const isOpen = useChatStore((s) => s.isOpen);
  const messages = useChatStore((s) => s.messages);
  const toggleOpen = useChatStore((s) => s.toggleOpen);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current && typeof messagesEndRef.current.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = (text: string) => {
    chatAction(text);
  };

  const handleQuickAction = (action: string) => {
    chatAction(action);
  };

  return (
    <>
      {/* Floating chat button */}
      {!isOpen && (
        <div
          data-testid="chat-fab"
          onClick={toggleOpen}
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 150,
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '75%',
              background: 'var(--col-background-brand)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--col-text-inverted)',
              transition: 'all .15s ease',
              boxShadow: '0 4px 20px rgba(0,0,0,.18), 0 1px 4px rgba(0,0,0,.1)',
            }}
          >
            <ChatCircle size={22} weight="fill" />
          </div>
        </div>
      )}

      {/* Floating chat panel */}
      {isOpen && (
        <div
          data-testid="chat-panel"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 150,
            width: 340,
            height: 480,
            maxHeight: 'calc(100vh - 100px)',
            display: 'flex',
            flexDirection: 'column',
            background: 'var(--col-background-ui-10)',
            border: '1px solid var(--col-border-illustrative)',
            borderRadius: 12,
            boxShadow: '0 12px 48px rgba(0,0,0,.15), 0 2px 8px rgba(0,0,0,.08)',
            overflow: 'hidden',
            fontFamily: F,
            animation: 'ubsChatOpen .2s ease',
          }}
        >
          <style>{`
            @keyframes ubsChatOpen {
              from { opacity: 0; transform: translateY(12px) scale(0.96); }
              to { opacity: 1; transform: translateY(0) scale(1); }
            }
          `}</style>

          {/* Chat header */}
          <div
            style={{
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid var(--col-border-illustrative)',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ChatCircle size={14} weight="fill" color="var(--col-background-brand)" />
              <span style={{ fontSize: 13, fontWeight: 400 }}>Chat</span>
            </div>
            <button
              data-testid="chat-close-btn"
              onClick={toggleOpen}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--col-text-subtle)',
                padding: 4,
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={14} weight="regular" />
            </button>
          </div>

          {/* Quick actions */}
          <div
            style={{
              display: 'flex',
              gap: 4,
              padding: '8px 12px',
              flexWrap: 'wrap',
              borderBottom: '1px solid var(--col-border-illustrative)',
            }}
          >
            {QUICK_ACTIONS.map((a) => (
              <button
                key={a}
                data-testid={`chat-quick-${a.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => handleQuickAction(a)}
                style={{
                  padding: '3px 10px',
                  borderRadius: 4,
                  border: '1px solid var(--col-border-illustrative)',
                  background: 'var(--col-background-ui-10)',
                  color: 'var(--col-text-subtle)',
                  fontSize: 10,
                  cursor: 'pointer',
                  fontFamily: F,
                  fontWeight: 300,
                }}
              >
                {a}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div
            data-testid="chat-messages"
            style={{
              flex: 1,
              overflow: 'auto',
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {messages.map((m) => (
              <ChatMessage key={m.id} message={m} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <ChatInput onSend={handleSend} />
        </div>
      )}
    </>
  );
}

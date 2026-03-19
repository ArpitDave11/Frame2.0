import { useState } from "react";
import {
  ChatCircle,
  X,
  PaperPlaneTilt,
} from "@phosphor-icons/react";

interface Message {
  r: "user" | "ai";
  t: string;
}

interface ChatPanelProps {
  open: boolean;
  onToggle: () => void;
  messages: Message[];
  onSendMessage: (msg: string) => void;
}

export function ChatPanel({
  open,
  onToggle,
  messages,
  onSendMessage,
}: ChatPanelProps) {
  const [chatIn, setChatIn] = useState("");
  const F =
    "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

  const sendChat = () => {
    if (!chatIn.trim()) return;
    onSendMessage(chatIn);
    setChatIn("");
  };

  return (
    <>
      {/* Floating chat button */}
      {!open && (
        <div
          onClick={onToggle}
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 150,
            cursor: "pointer",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "75%",
              background: "var(--col-background-brand)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--col-text-inverted)",
              transition: "all .15s ease",
              boxShadow:
                "0 4px 20px rgba(0,0,0,.18), 0 1px 4px rgba(0,0,0,.1)",
            }}
          >
            <ChatCircle size={22} weight="fill" />
          </div>
        </div>
      )}

      {/* Floating chat panel overlay */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 150,
            width: 340,
            height: 480,
            maxHeight: "calc(100vh - 100px)",
            display: "flex",
            flexDirection: "column",
            background: "var(--col-background-ui-10)",
            border: "1px solid var(--col-border-illustrative)",
            borderRadius: 12,
            boxShadow:
              "0 12px 48px rgba(0,0,0,.15), 0 2px 8px rgba(0,0,0,.08)",
            overflow: "hidden",
            fontFamily: F,
            animation: "ubsChatOpen .2s ease",
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
              padding: "12px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom:
                "1px solid var(--col-border-illustrative)",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <ChatCircle
                size={14}
                weight="fill"
                color="var(--col-background-brand)"
              />
              <span style={{ fontSize: 13, fontWeight: 400 }}>
                Chat
              </span>
            </div>
            <button
              onClick={onToggle}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--col-text-subtle)",
                padding: 4,
                borderRadius: 4,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={14} weight="regular" />
            </button>
          </div>

          {/* Quick actions */}
          <div
            style={{
              display: "flex",
              gap: 4,
              padding: "8px 12px",
              flexWrap: "wrap",
              borderBottom:
                "1px solid var(--col-border-illustrative)",
            }}
          >
            {["Expand", "Add examples", "Simplify"].map((a) => (
              <button
                key={a}
                style={{
                  padding: "3px 10px",
                  borderRadius: 4,
                  border:
                    "1px solid var(--col-border-illustrative)",
                  background: "var(--col-background-ui-10)",
                  color: "var(--col-text-subtle)",
                  fontSize: 10,
                  cursor: "pointer",
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
            style={{
              flex: 1,
              overflow: "auto",
              padding: 12,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  padding: "8px 12px",
                  borderRadius:
                    m.r === "user"
                      ? "10px 10px 4px 10px"
                      : "10px 10px 10px 4px",
                  background:
                    m.r === "user"
                      ? "var(--input-background)"
                      : "var(--muted)",
                  color: "var(--col-text-subtle)",
                  fontSize: 12,
                  lineHeight: 1.5,
                  fontWeight: 300,
                  alignSelf:
                    m.r === "user" ? "flex-end" : "flex-start",
                  maxWidth: "88%",
                  animation: "ubsFade .2s",
                }}
              >
                {m.t}
              </div>
            ))}
          </div>

          {/* Input */}
          <div
            style={{
              padding: 10,
              borderTop:
                "1px solid var(--col-border-illustrative)",
              display: "flex",
              gap: 6,
              flexShrink: 0,
            }}
          >
            <input
              value={chatIn}
              onChange={(e) => setChatIn(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
              placeholder="Improve a section..."
              style={{
                flex: 1,
                padding: "7px 14px",
                borderRadius: 20,
                border:
                  "1px solid var(--col-border-illustrative)",
                fontSize: 12,
                fontFamily: F,
                fontWeight: 300,
                outline: "none",
                color: "var(--col-text-primary)",
                background: "var(--input-background)",
              }}
            />
            <button
              onClick={sendChat}
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                border: "none",
                background: chatIn.trim()
                  ? "var(--col-background-brand)"
                  : "var(--switch-background)",
                color: "var(--col-text-inverted)",
                cursor: chatIn.trim() ? "pointer" : "default",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "background .15s",
              }}
            >
              <PaperPlaneTilt
                size={12}
                weight="fill"
                color="var(--col-text-inverted)"
              />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
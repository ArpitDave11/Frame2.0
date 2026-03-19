import { PencilSimple } from "@phosphor-icons/react";
import { ImpulseLine, Keyline } from "./ImpulseLine";

interface Category {
  id: string;
  label: string;
  icon: string;
}

interface EditorPaneProps {
  epic: string;
  onEpicChange: (value: string) => void;
  categories: Category[];
  onPickCategory: (id: string) => void;
  chatOpen: boolean;
}

export function EditorPane({
  epic,
  onEpicChange,
  categories,
  onPickCategory,
  chatOpen,
}: EditorPaneProps) {
  const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";
  const MONO = "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace";
  const lines = epic ? epic.split("\n").length : 0;

  return (
    <div
      style={{
        flex: chatOpen ? 5 : 6,
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        transition: "flex .25s ease",
      }}
    >
      {/* Editor pane header */}
      <div
        style={{
          padding: "8px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--col-border-illustrative)",
          background: "#1a1a1a",
          color: "#888",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <PencilSimple size={13} weight="regular" color="#666" />
          <span style={{ fontSize: 12, fontWeight: 300, color: "#aaa", fontFamily: F }}>
            Editor
          </span>
          <span
            style={{
              padding: "2px 8px",
              background: "#2a2a2a",
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 500,
              color: "#666",
              textTransform: "uppercase" as const,
              letterSpacing: ".5px",
              fontFamily: F,
            }}
          >
            Markdown
          </span>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 300,
            color: "#555",
            fontVariantNumeric: "tabular-nums",
            fontFamily: F,
          }}
        >
          {lines} lines
        </span>
      </div>

      {/* Editor content */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          background: epic.trim() ? "#1a1a1a" : "var(--col-background-ui-10)",
        }}
      >
        {!epic.trim() ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              textAlign: "center",
              padding: 48,
              animation: "ubsFade .4s ease",
              fontFamily: F,
            }}
          >
            <ImpulseLine>
              <div
                style={{
                  fontSize: "1.75rem",
                  fontWeight: 300,
                  color: "var(--col-text-primary)",
                  lineHeight: 1.3,
                  marginBottom: 8,
                }}
              >
                Create your epic
              </div>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--col-text-subtle)",
                  fontWeight: 300,
                  lineHeight: 1.6,
                  maxWidth: 340,
                  marginBottom: 24,
                }}
              >
                Select a category, write your rough content, then click{" "}
                <span style={{ color: "var(--col-background-brand)", fontWeight: 500 }}>
                  Refine
                </span>{" "}
                for AI-powered structuring.
              </p>
            </ImpulseLine>
            <Keyline />
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                justifyContent: "center",
                marginTop: 28,
              }}
            >
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onPickCategory(c.id)}
                  style={{
                    padding: "8px 18px",
                    borderRadius: 4,
                    border: "1px solid var(--col-border-illustrative)",
                    background: "var(--col-background-ui-10)",
                    color: "var(--col-text-subtle)",
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: F,
                    fontWeight: 300,
                    transition: "all .12s",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 4,
                      background: "var(--input-background)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 500,
                      color: "var(--col-text-subtle)",
                    }}
                  >
                    {c.icon}
                  </span>
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <textarea
            value={epic}
            onChange={(e) => onEpicChange(e.target.value)}
            spellCheck={false}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              outline: "none",
              resize: "none",
              padding: "20px 24px",
              fontSize: 13,
              fontFamily: MONO,
              fontWeight: 300,
              lineHeight: 1.8,
              color: "#d4d4d4",
              background: "#1a1a1a",
              letterSpacing: ".01em",
            }}
          />
        )}
      </div>
    </div>
  );
}
import { Eye, SquaresFour } from "@phosphor-icons/react";

interface PreviewPaneProps {
  epic: string;
  rightTab: string;
  onTabChange: (tab: string) => void;
  diagramReady: boolean;
}

export function PreviewPane({
  epic,
  rightTab,
  onTabChange,
  diagramReady,
}: PreviewPaneProps) {
  const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";
  const MONO = "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace";

  const renderPreview = () => {
    if (!epic)
      return (
        <div
          style={{
            color: "var(--col-text-subtle)",
            fontSize: 13,
            textAlign: "center",
            paddingTop: 80,
            fontFamily: F,
          }}
        >
          Preview renders here
        </div>
      );

    return epic.split("\n").map((l, i) => {
      if (l.startsWith("## "))
        return (
          <h2
            key={i}
            style={{
              fontSize: "1.125rem",
              fontWeight: 300,
              color: "var(--col-text-primary)",
              margin: "24px 0 6px",
              fontFamily: F,
            }}
          >
            {l.slice(3)}
          </h2>
        );
      if (l.startsWith("_") && l.endsWith("_"))
        return (
          <p
            key={i}
            style={{
              color: "var(--col-text-subtle)",
              fontStyle: "italic",
              fontSize: 13,
              margin: "4px 0",
              fontWeight: 300,
              fontFamily: F,
            }}
          >
            {l.slice(1, -1)}
          </p>
        );
      if (l.trim())
        return (
          <p
            key={i}
            style={{
              fontSize: 13,
              color: "var(--col-text-subtle)",
              margin: "3px 0",
              lineHeight: 1.6,
              fontWeight: 300,
              fontFamily: F,
            }}
          >
            {l}
          </p>
        );
      return <br key={i} />;
    });
  };

  const tabs = [
    { id: "preview", label: "Preview", Icon: Eye },
    { id: "blueprint", label: "Blueprint", Icon: SquaresFour },
  ];

  return (
    <div
      style={{
        flex: 2.5,
        display: "flex",
        flexDirection: "column",
        background: "var(--col-background-ui-10)",
        borderLeft: "1px solid var(--col-border-illustrative)",
        minWidth: 0,
        height: "100%",
        minHeight: 0,
      }}
    >
      {/* Tabs */}
      <div
        style={{
          padding: "8px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--col-border-illustrative)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", gap: 0 }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              style={{
                padding: "6px 16px",
                border: "none",
                borderBottom:
                  rightTab === tab.id
                    ? "2px solid var(--col-background-brand)"
                    : "2px solid transparent",
                background: "transparent",
                color:
                  rightTab === tab.id
                    ? "var(--col-text-primary)"
                    : "var(--col-text-subtle)",
                fontSize: 12,
                fontWeight: rightTab === tab.id ? 400 : 300,
                cursor: "pointer",
                fontFamily: F,
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "all .12s",
              }}
            >
              <tab.Icon size={13} weight="regular" />
              {tab.label}
              {tab.id === "blueprint" && diagramReady && (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#22c55e",
                  }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
        {rightTab === "preview" ? (
          renderPreview()
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "var(--col-text-subtle)",
              fontSize: 12,
              gap: 12,
              fontWeight: 300,
              fontFamily: F,
            }}
          >
            {diagramReady ? (
              <div
                style={{
                  width: "100%",
                  padding: 20,
                  background: "var(--input-background)",
                  borderRadius: "var(--radius)",
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 11,
                    color: "var(--col-text-subtle)",
                    lineHeight: 2,
                  }}
                >
                  graph TD
                  <br />
                  &nbsp;&nbsp;A[Client] --&gt; B[API Gateway]
                  <br />
                  &nbsp;&nbsp;B --&gt; C[Auth Service]
                  <br />
                  &nbsp;&nbsp;B --&gt; D[Core Service]
                  <br />
                  &nbsp;&nbsp;D --&gt; E[(Database)]
                </div>
              </div>
            ) : (
              <>
                <SquaresFour size={28} weight="regular" />
                <span>Diagram appears after Refine</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
import { useState, useCallback, useEffect } from "react";
import { WorkspaceHeader } from "./components/WorkspaceHeader";
import { Sidebar } from "./components/Sidebar";
import { EditorPane } from "./components/EditorPane";
import { PreviewPane } from "./components/PreviewPane";
import { ChatPanel } from "./components/ChatPanel";
import { PipelineModal } from "./components/PipelineModal";
import { Modal } from "./components/Modal";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { IssueManager } from "./components/IssueManager";
import { AnalyticsPanel } from "./components/AnalyticsPanel";
import { ClipboardText, SquaresFour, GearSix, Kanban, ChartBar } from "@phosphor-icons/react";

/* ═══════════════════════════════════════════════════
   UBS FRAME — Epic Generator Workspace
   ═══════════════════════════════════════════════════ */

const CATS = [
  { id: "business_requirement", label: "Business Requirement", icon: "B", secs: ["Executive Summary","Business Context","Objectives","Scope","User Stories","Acceptance Criteria","Dependencies & Risks","Timeline","Approvals"] },
  { id: "technical_design", label: "Technical Design", icon: "T", secs: ["Objective","Context & Motivation","Goals & Non-Goals","Architecture Overview","Component Design","Data Model","API Contracts","Security","Testing Strategy","Rollout Plan"] },
  { id: "feature_specification", label: "Feature Spec", icon: "F", secs: ["Objective","Problem Statement","User Stories","Acceptance Criteria","UX Requirements","Technical Requirements","Dependencies","Success Metrics"] },
  { id: "api_specification", label: "API Specification", icon: "A", secs: ["Objective","Authentication","Resource Definitions","Endpoints","Error Handling","Rate Limits","Schema","Versioning"] },
  { id: "infrastructure_design", label: "Infrastructure", icon: "I", secs: ["Objective","Business Context","SLA/SLO","Architecture","Compute","Networking","Monitoring","DR","Security","Cost"] },
  { id: "migration_plan", label: "Migration Plan", icon: "M", secs: ["Objective","Current State","Target State","Gap Analysis","Strategy","Phases","Rollback","Testing","Data Migration","Cutover","Timeline"] },
  { id: "integration_spec", label: "Integration Spec", icon: "\u222B", secs: ["Objective","Overview","Systems & Endpoints","Data Mapping","Auth","Error Handling","Testing","Monitoring","SLA"] },
];

const STAGES = [
  { id: 1, name: "Comprehension", sub: "Building mental model" },
  { id: 2, name: "Classification", sub: "Detecting document type" },
  { id: 3, name: "Structural", sub: "Assessing structure" },
  { id: 4, name: "Refinement", sub: "Rewriting sections" },
  { id: 5, name: "Mandatory", sub: "Diagram + stories" },
  { id: 6, name: "Validation", sub: "Quality gate" },
];

const SIDEBAR_ITEMS = [
  { id: "planner", icon: ClipboardText, label: "Epic Planner" },
  { id: "issues", icon: Kanban, label: "Issue Manager" },
  { id: "blueprint", icon: SquaresFour, label: "Blueprints" },
  { id: "analytics", icon: ChartBar, label: "Analytics" },
  { id: "settings", icon: GearSix, label: "Settings" },
];

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [nav, setNav] = useState("planner");
  const [cat, setCat] = useState("");
  const [epic, setEpic] = useState("");
  const [rightTab, setRightTab] = useState("preview");
  const [chatOpen, setChatOpen] = useState(false);
  const [msgs, setMsgs] = useState<Array<{ r: "user" | "ai"; t: string }>>([
    { r: "ai", t: "How can I help improve your epic?" },
  ]);
  const [modal, setModal] = useState<string | null>(null);
  const [pStage, setPStage] = useState(0);
  const [pRun, setPRun] = useState(false);
  const [diagramOk, setDiagramOk] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [editorWidth, setEditorWidth] = useState(50); // percentage
  const [isResizing, setIsResizing] = useState(false);
  const [showWorkspace, setShowWorkspace] = useState(false); // Track if workspace should be shown
  const [mode, setMode] = useState<"epic" | "issue">("epic"); // Mode: Epic Planner or Issue Manager

  const pickCat = (id: string) => {
    setCat(id);
    const c = CATS.find((x) => x.id === id);
    if (c) {
      setEpic(c.secs.map((s) => `## ${s}\n\n_Your content here..._\n`).join("\n"));
      setDiagramOk(false);
      setScore(null);
    }
  };

  const runPipeline = useCallback(() => {
    if (!epic.trim()) return;
    setModal("pipeline");
    setPRun(true);
    setPStage(0);
    const go = (s: number) => {
      if (s > 6) {
        setPRun(false);
        setDiagramOk(true);
        setScore(8.2);
        setTimeout(() => setModal(null), 600);
        return;
      }
      setPStage(s);
      setTimeout(() => go(s + 1), 600 + Math.random() * 500);
    };
    setTimeout(() => go(1), 300);
  }, [epic]);

  const sendChat = (msg: string) => {
    setMsgs((m) => [
      ...m,
      { r: "user", t: msg },
      { r: "ai", t: "Applied improvements to the section." },
    ]);
  };

  const handleNav = (id: string) => {
    setNav(id);
    if (id === "blueprint") setRightTab("blueprint");
    if (id === "settings") setModal("settings");
  };

  const handleCreateEpic = (categoryId?: string) => {
    if (categoryId) {
      pickCat(categoryId);
    } else {
      // No category specified, transition to workspace with category picker
      setShowWorkspace(true);
      setCat("");
      setEpic("");
      setDiagramOk(false);
      setScore(null);
    }
  };

  const handleLoadFromGitLab = () => {
    setShowWorkspace(true);
    setModal("loader");
  };

  const handleGoHome = () => {
    setShowWorkspace(false);
    setEpic("");
    setCat("");
    setDiagramOk(false);
    setScore(null);
    setNav("planner");
  };

  // Resize handlers
  const handleMouseDown = () => {
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      const windowWidth = window.innerWidth;
      const sidebarWidth = sidebarOpen ? 56 : 56; // Adjust based on your sidebar width
      const availableWidth = windowWidth - sidebarWidth;
      const newWidth = ((e.clientX - sidebarWidth) / availableWidth) * 100;
      
      // Constrain between 20% and 80%
      const constrainedWidth = Math.min(Math.max(newWidth, 20), 80);
      setEditorWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, sidebarOpen]);

  // Show welcome screen if workspace hasn't been activated
  const showWelcome = !showWorkspace && !epic.trim();

  return (
    <div
      style={{
        fontFamily: F,
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "#f7f7f5",
        overflow: showWelcome ? "auto" : "hidden",
        position: "relative",
        color: "var(--col-text-primary)",
      }}
    >
      <style>{`
        @keyframes ubsFade { from { opacity:0 } to { opacity:1 } }
        @keyframes ubsSlide { from { transform:translateX(16px);opacity:0 } to { transform:translateX(0);opacity:1 } }
        @keyframes ubsPulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        ::-webkit-scrollbar { width:4px }
        ::-webkit-scrollbar-track { background:transparent }
        ::-webkit-scrollbar-thumb { background:var(--switch-background); border-radius:2px }
      `}</style>

      {showWelcome ? (
        /* ══ WELCOME SCREEN ══ */
        <WelcomeScreen
          onCreateEpic={handleCreateEpic}
          onLoadFromGitLab={handleLoadFromGitLab}
          categories={CATS}
        />
      ) : (
        <>
          {/* Unified layout: Sidebar + Content */}
          <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
            {/* Shared Sidebar */}
            <Sidebar
              open={sidebarOpen}
              onToggle={() => setSidebarOpen(!sidebarOpen)}
              activeNav={nav}
              onNavigate={handleNav}
              items={SIDEBAR_ITEMS}
              onLogoClick={handleGoHome}
            />

            {/* Content area — toggles based on nav */}
            {nav === "issues" ? (
              /* ══ ISSUE MANAGER MODE ══ */
              <IssueManager />
            ) : nav === "analytics" ? (
              /* ══ ANALYTICS MODE ══ */
              <AnalyticsPanel />
            ) : (
              /* ══ EPIC PLANNER MODE ══ */
              <div style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
                {/* Epic Planner Toolbar */}
                <WorkspaceHeader
                  categories={CATS}
                  selectedCategory={cat}
                  onSelectCategory={pickCat}
                  onLoad={() => setModal("loader")}
                  onRefine={runPipeline}
                  onPublish={() => setModal("publish")}
                  onSettings={() => setModal("settings")}
                  canRefine={!!epic.trim()}
                  canPublish={!!epic.trim()}
                  diagramReady={diagramOk}
                  score={score}
                />
                <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
                  {/* Editor */}
                  <div style={{ width: `${editorWidth}%`, overflow: "hidden", display: "flex", height: "100%" }}>
                    <EditorPane
                      epic={epic}
                      onEpicChange={setEpic}
                      categories={CATS}
                      onPickCategory={pickCat}
                      chatOpen={chatOpen}
                    />
                  </div>

                  {/* Resizer */}
                  <div
                    onMouseDown={handleMouseDown}
                    style={{
                      width: 4,
                      cursor: "col-resize",
                      background: isResizing ? "var(--col-background-brand)" : "var(--col-border-illustrative)",
                      transition: isResizing ? "none" : "background 0.2s",
                      flexShrink: 0,
                      position: "relative",
                      zIndex: 10,
                    }}
                    onMouseEnter={(e) => {
                      if (!isResizing) {
                        e.currentTarget.style.background = "var(--col-background-brand)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isResizing) {
                        e.currentTarget.style.background = "var(--col-border-illustrative)";
                      }
                    }}
                  />

                  {/* Preview */}
                  <div style={{ flex: 1, overflow: "hidden", display: "flex", height: "100%" }}>
                    <PreviewPane
                      epic={epic}
                      rightTab={rightTab}
                      onTabChange={setRightTab}
                      diagramReady={diagramOk}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Floating Chat */}
          <ChatPanel
            open={chatOpen}
            onToggle={() => setChatOpen(!chatOpen)}
            messages={msgs}
            onSendMessage={sendChat}
          />
        </>
      )}

      {/* ══ MODALS ══ */}

      {/* Pipeline Modal */}
      <PipelineModal
        open={modal === "pipeline"}
        onClose={() => setModal(null)}
        stages={STAGES}
        currentStage={pStage}
        isRunning={pRun}
      />

      {/* Settings Modal */}
      <Modal
        open={modal === "settings"}
        onClose={() => setModal(null)}
        title="Settings"
      >
        <div
          style={{
            display: "flex",
            gap: 0,
            marginBottom: 20,
            borderBottom: "1px solid var(--col-border-illustrative)",
          }}
        >
          {["AI Provider", "GitLab"].map((t, i) => (
            <button
              key={t}
              style={{
                padding: "8px 20px",
                border: "none",
                borderBottom:
                  i === 0
                    ? "2px solid var(--col-background-brand)"
                    : "2px solid transparent",
                background: "transparent",
                color:
                  i === 0
                    ? "var(--col-text-primary)"
                    : "var(--col-text-subtle)",
                fontSize: 13,
                fontWeight: i === 0 ? 400 : 300,
                cursor: "pointer",
                fontFamily: F,
              }}
            >
              {t}
            </button>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            fontSize: 13,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label
              style={{
                fontSize: 12,
                fontWeight: 400,
                color: "var(--col-text-subtle)",
              }}
            >
              Provider
            </label>
            <select
              style={{
                padding: "8px 12px",
                borderRadius: "0.375rem",
                border: "1px solid var(--col-border-illustrative)",
                fontSize: 13,
                fontFamily: F,
                fontWeight: 300,
              }}
            >
              <option>Azure OpenAI</option>
              <option>OpenAI Direct</option>
              <option>Mock</option>
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label
              style={{
                fontSize: 12,
                fontWeight: 400,
                color: "var(--col-text-subtle)",
              }}
            >
              Endpoint
            </label>
            <input
              defaultValue="https://ubs-openai.azure.com"
              style={{
                padding: "8px 12px",
                borderRadius: "0.375rem",
                border: "1px solid var(--col-border-illustrative)",
                fontSize: 13,
                fontFamily: F,
                fontWeight: 300,
                outline: "none",
              }}
            />
          </div>
          <button
            style={{
              alignSelf: "flex-start",
              padding: "7px 18px",
              border: "1px solid var(--col-border-illustrative)",
              borderRadius: "0.375rem",
              background: "var(--col-background-ui-10)",
              color: "var(--col-text-primary)",
              fontSize: 13,
              fontWeight: 400,
              cursor: "pointer",
              fontFamily: F,
            }}
          >
            Test connection
          </button>
        </div>
      </Modal>

      {/* Loader Modal */}
      <Modal
        open={modal === "loader"}
        onClose={() => setModal(null)}
        title="Load from GitLab"
      >
        <input
          placeholder="Search epics..."
          style={{
            width: "100%",
            padding: "9px 14px",
            borderRadius: "0.375rem",
            border: "1px solid var(--col-border-illustrative)",
            fontSize: 13,
            fontFamily: F,
            fontWeight: 300,
            marginBottom: 16,
            outline: "none",
          }}
        />
        {[
          "API Gateway Migration \u2014 #142",
          "Auth Service Redesign \u2014 #98",
          "Data Pipeline v3 \u2014 #201",
          "Mobile App Feature Set \u2014 #167",
        ].map((e) => (
          <div
            key={e}
            onClick={() => {
              setEpic(
                `## Loaded Epic\n\n_Loaded from GitLab..._\n\n## Architecture\n\n## Requirements`
              );
              setModal(null);
            }}
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--col-border-illustrative)",
              cursor: "pointer",
              fontSize: 13,
              color: "var(--col-text-subtle)",
              fontWeight: 300,
              display: "flex",
              justifyContent: "space-between",
              transition: "background .1s",
              fontFamily: F,
            }}
          >
            <span style={{ color: "var(--col-text-primary)" }}>{e}</span>
            <span
              style={{
                fontSize: 11,
                color: "var(--muted-foreground)",
              }}
            >
              opened
            </span>
          </div>
        ))}
      </Modal>

      {/* Publish Modal */}
      <Modal
        open={modal === "publish"}
        onClose={() => setModal(null)}
        title="Publish to GitLab"
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            fontSize: 13,
            fontFamily: F,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label
              style={{
                fontSize: 12,
                fontWeight: 400,
                color: "var(--col-text-subtle)",
              }}
            >
              Title
            </label>
            <input
              defaultValue={
                cat ? CATS.find((c) => c.id === cat)?.label : "Epic"
              }
              style={{
                padding: "8px 12px",
                borderRadius: "0.375rem",
                border: "1px solid var(--col-border-illustrative)",
                fontSize: 13,
                fontFamily: F,
                fontWeight: 300,
                outline: "none",
              }}
            />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label
              style={{
                fontSize: 12,
                fontWeight: 400,
                color: "var(--col-text-subtle)",
              }}
            >
              Target group
            </label>
            <select
              style={{
                padding: "8px 12px",
                borderRadius: "0.375rem",
                border: "1px solid var(--col-border-illustrative)",
                fontSize: 13,
                fontFamily: F,
                fontWeight: 300,
              }}
            >
              <option>pod-alpha</option>
              <option>crew-platform</option>
            </select>
          </div>
          {score !== null && (
            <div
              style={{
                padding: "10px 16px",
                borderRadius: "0.375rem",
                borderLeft: `4px solid ${score >= 7 ? "#22c55e" : "var(--col-background-brand)"}`,
                background:
                  score >= 7
                    ? "#f0fdf4"
                    : "var(--input-background)",
                fontSize: 12,
                fontWeight: 300,
                color:
                  score >= 7
                    ? "#166534"
                    : "var(--col-text-subtle)",
              }}
            >
              Quality score: <strong>{score.toFixed(1)}/10</strong>{" "}
              {"\u2014"}{" "}
              {score >= 7
                ? "Ready to publish"
                : "Consider refining"}
            </div>
          )}
          <div
            style={{
              display: "flex",
              gap: 8,
              justifyContent: "flex-end",
              marginTop: 4,
            }}
          >
            <button
              onClick={() => setModal(null)}
              style={{
                padding: "7px 18px",
                border: "1px solid var(--col-border-illustrative)",
                borderRadius: "0.375rem",
                background: "var(--col-background-ui-10)",
                fontSize: 13,
                fontWeight: 400,
                cursor: "pointer",
                fontFamily: F,
              }}
            >
              Cancel
            </button>
            <button
              style={{
                padding: "7px 18px",
                border: "none",
                borderRadius: "0.375rem",
                background: "var(--col-background-brand)",
                color: "var(--col-text-inverted)",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: F,
              }}
            >
              Publish
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
import { useState, useCallback, useRef } from "react";

/* ═══════════════════════════════════════════════════
   UBS FRAME Design System Tokens
   Source: Business_Expense_Management_Tool/theme.css
   ═══════════════════════════════════════════════════ */
const T = {
  // Core UBS palette
  brand: "#e60000",
  brandHover: "#cc0000",
  brandVisited: "#b30000",
  textPrimary: "#000000",
  textSubtle: "#666666",
  textInverted: "#ffffff",
  bgUI10: "#ffffff",
  bgPrimary: "#000000",
  borderIllustrative: "#e0e0e0",
  // Extended tokens
  muted: "#ececf0",
  mutedFg: "#717182",
  accent: "#e9ebef",
  inputBg: "#f3f3f5",
  switchBg: "#cbced4",
  destructive: "#d4183d",
  // Radius
  radius: "0.625rem",
  radiusSm: "0.375rem",
  radiusLg: "0.625rem",
  // Font
  font: "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
};

const CATS = [
  { id: "business_requirement", label: "Business Requirement", icon: "B", secs: ["Executive Summary","Business Context","Objectives","Scope","User Stories","Acceptance Criteria","Dependencies & Risks","Timeline","Approvals"] },
  { id: "technical_design", label: "Technical Design", icon: "T", secs: ["Objective","Context & Motivation","Goals & Non-Goals","Architecture Overview","Component Design","Data Model","API Contracts","Security","Testing Strategy","Rollout Plan"] },
  { id: "feature_specification", label: "Feature Spec", icon: "F", secs: ["Objective","Problem Statement","User Stories","Acceptance Criteria","UX Requirements","Technical Requirements","Dependencies","Success Metrics"] },
  { id: "api_specification", label: "API Specification", icon: "A", secs: ["Objective","Authentication","Resource Definitions","Endpoints","Error Handling","Rate Limits","Schema","Versioning"] },
  { id: "infrastructure_design", label: "Infrastructure", icon: "I", secs: ["Objective","Business Context","SLA/SLO","Architecture","Compute","Networking","Monitoring","DR","Security","Cost"] },
  { id: "migration_plan", label: "Migration Plan", icon: "M", secs: ["Objective","Current State","Target State","Gap Analysis","Strategy","Phases","Rollback","Testing","Data Migration","Cutover","Timeline"] },
  { id: "integration_spec", label: "Integration Spec", icon: "∫", secs: ["Objective","Overview","Systems & Endpoints","Data Mapping","Auth","Error Handling","Testing","Monitoring","SLA"] },
];

const STAGES = [
  { id: 1, name: "Comprehension", sub: "Building mental model" },
  { id: 2, name: "Classification", sub: "Detecting document type" },
  { id: 3, name: "Structural", sub: "Assessing structure" },
  { id: 4, name: "Refinement", sub: "Rewriting sections" },
  { id: 5, name: "Mandatory", sub: "Diagram + stories" },
  { id: 6, name: "Validation", sub: "Quality gate" },
];

function Ico({ d, size = 16, stroke = "currentColor", fill = "none" }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
}

const icons = {
  folder: "M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z",
  save: "M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2zM17 21v-8H7v8M7 3v5h8",
  zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  upload: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.6V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9c.26.65.86 1.08 1.51 1H21a2 2 0 010 4h-.09c-.65.02-1.25.42-1.51 1z",
  chat: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  x: "M18 6L6 18M6 6l12 12",
  check: "M20 6L9 17l-5-5",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z",
  edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  doc: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z",
  star: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z",
  send: "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  menu: "M3 12h18M3 6h18M3 18h18",
  undo: "M3 7v6h6M3 13a9 9 0 0118 0",
  clipboard: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
};

function Modal({ open, onClose, title, children, w = 480 }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, animation: "ubsFade .2s ease" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: T.bgUI10, borderRadius: T.radius, width: w, maxHeight: "85vh", overflow: "auto", boxShadow: "0 32px 64px rgba(0,0,0,.12)" }}>
        <div style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${T.borderIllustrative}` }}>
          <span style={{ fontSize: "1.0625rem", fontWeight: 300, color: T.textPrimary, fontFamily: T.font }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: T.textSubtle, padding: 4 }}><Ico d={icons.x} size={16} /></button>
        </div>
        <div style={{ padding: "20px 24px 28px" }}>{children}</div>
      </div>
    </div>
  );
}

function ImpulseLine({ children }) {
  return (
    <div style={{ position: "relative", paddingLeft: 20, borderLeft: `4px solid ${T.brand}` }}>
      {children}
    </div>
  );
}

function Keyline() {
  return <span style={{ display: "block", height: 4, width: 60, marginTop: 8, background: T.brand }} />;
}

export default function EpicGeneratorV5() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [nav, setNav] = useState("planner");
  const [cat, setCat] = useState("");
  const [epic, setEpic] = useState("");
  const [rightTab, setRightTab] = useState("preview");
  const [chatOpen, setChatOpen] = useState(false);
  const [msgs, setMsgs] = useState([{ r: "ai", t: "How can I help improve your epic?" }]);
  const [chatIn, setChatIn] = useState("");
  const [modal, setModal] = useState(null);
  const [pStage, setPStage] = useState(0);
  const [pRun, setPRun] = useState(false);
  const [diagramOk, setDiagramOk] = useState(false);
  const [score, setScore] = useState(null);

  const pickCat = (id) => {
    setCat(id);
    const c = CATS.find(x => x.id === id);
    if (c) { setEpic(c.secs.map(s => `## ${s}\n\n_Your content here..._\n`).join("\n")); setDiagramOk(false); setScore(null); }
  };

  const runPipeline = useCallback(() => {
    if (!epic.trim()) return;
    setModal("pipeline"); setPRun(true); setPStage(0);
    const go = (s) => {
      if (s > 6) { setPRun(false); setDiagramOk(true); setScore(8.2); setTimeout(() => setModal(null), 600); return; }
      setPStage(s); setTimeout(() => go(s + 1), 600 + Math.random() * 500);
    };
    setTimeout(() => go(1), 300);
  }, [epic]);

  const sendChat = () => {
    if (!chatIn.trim()) return;
    setMsgs(m => [...m, { r: "user", t: chatIn }, { r: "ai", t: "Applied improvements to the section." }]);
    setChatIn("");
  };

  const lines = epic ? epic.split("\n").length : 0;

  const preview = () => {
    if (!epic) return <div style={{ color: T.textSubtle, fontSize: 13, textAlign: "center", paddingTop: 80 }}>Preview renders here</div>;
    return epic.split("\n").map((l, i) => {
      if (l.startsWith("## ")) return <h2 key={i} style={{ fontSize: "1.125rem", fontWeight: 300, color: T.textPrimary, margin: "24px 0 6px", fontFamily: T.font }}>{l.slice(3)}</h2>;
      if (l.startsWith("_") && l.endsWith("_")) return <p key={i} style={{ color: T.textSubtle, fontStyle: "italic", fontSize: 13, margin: "4px 0", fontWeight: 300 }}>{l.slice(1, -1)}</p>;
      if (l.trim()) return <p key={i} style={{ fontSize: 13, color: T.textSubtle, margin: "3px 0", lineHeight: 1.6, fontWeight: 300 }}>{l}</p>;
      return <br key={i} />;
    });
  };

  const sW = sidebarOpen ? 220 : 56;

  return (
    <div style={{ fontFamily: T.font, display: "flex", flexDirection: "column", height: "92vh", background: "#f7f7f5", borderRadius: T.radius, overflow: "hidden", position: "relative", color: T.textPrimary }}>
      <style>{`
        @keyframes ubsFade { from { opacity:0 } to { opacity:1 } }
        @keyframes ubsSlide { from { transform:translateX(16px);opacity:0 } to { transform:translateX(0);opacity:1 } }
        @keyframes ubsPulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        * { box-sizing:border-box; margin:0; padding:0 }
        ::-webkit-scrollbar { width:4px }
        ::-webkit-scrollbar-track { background:transparent }
        ::-webkit-scrollbar-thumb { background:${T.switchBg}; border-radius:2px }
      `}</style>

      {/* ══ HEADER ══ */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", height: 56, background: T.bgUI10, borderBottom: `1px solid ${T.borderIllustrative}`, flexShrink: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* UBS Logo area */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginRight: 8 }}>
            <span style={{ fontSize: 20, fontWeight: 700, color: T.textPrimary, letterSpacing: "-0.04em" }}>UBS</span>
            <span style={{ fontSize: "0.8125rem", fontWeight: 300, color: T.textSubtle, letterSpacing: "0.02em" }}>FRAME</span>
          </div>

          <div style={{ width: 1, height: 24, background: T.borderIllustrative }} />

          <button onClick={() => setModal("loader")} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", border: `1px solid ${T.borderIllustrative}`, borderRadius: T.radiusSm, background: T.bgUI10, color: T.textPrimary, fontSize: 13, fontWeight: 400, cursor: "pointer", fontFamily: T.font }}>
            <Ico d={icons.folder} size={14} /> Load
          </button>

          <select value={cat} onChange={e => pickCat(e.target.value)} style={{ padding: "6px 28px 6px 12px", border: `1px solid ${T.borderIllustrative}`, borderRadius: T.radiusSm, background: T.bgUI10, color: cat ? T.textPrimary : T.textSubtle, fontSize: 13, fontFamily: T.font, fontWeight: 300, cursor: "pointer", minWidth: 170, appearance: "none", backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23666' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}>
            <option value="">Select category...</option>
            {CATS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>

          <button style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", border: `1px solid ${T.borderIllustrative}`, borderRadius: T.radiusSm, background: T.bgUI10, color: T.textPrimary, fontSize: 13, fontWeight: 400, cursor: "pointer", fontFamily: T.font }}>
            <Ico d={icons.save} size={14} /> Save
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={runPipeline} disabled={!epic.trim()} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 20px", border: "none", borderRadius: T.radiusSm, background: !epic.trim() ? T.muted : T.brand, color: !epic.trim() ? T.mutedFg : T.textInverted, fontSize: 13, fontWeight: 500, cursor: !epic.trim() ? "not-allowed" : "pointer", fontFamily: T.font, transition: "background .15s" }}>
            <Ico d={icons.zap} size={14} stroke={!epic.trim() ? T.mutedFg : T.textInverted} /> Refine
          </button>

          <div style={{ width: 1, height: 24, background: T.borderIllustrative }} />

          <button disabled={!diagramOk} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", border: `1px solid ${T.borderIllustrative}`, borderRadius: T.radiusSm, background: T.bgUI10, color: diagramOk ? T.textPrimary : T.mutedFg, fontSize: 13, fontWeight: 400, cursor: diagramOk ? "pointer" : "not-allowed", fontFamily: T.font, opacity: diagramOk ? 1 : .4 }}>
            <Ico d={icons.list} size={14} /> Issues
          </button>

          <button onClick={() => setModal("publish")} disabled={!epic.trim()} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", border: `1px solid ${epic.trim() ? T.brand : T.borderIllustrative}`, borderRadius: T.radiusSm, background: T.bgUI10, color: epic.trim() ? T.brand : T.mutedFg, fontSize: 13, fontWeight: 500, cursor: epic.trim() ? "pointer" : "not-allowed", fontFamily: T.font, opacity: epic.trim() ? 1 : .4 }}>
            <Ico d={icons.upload} size={14} stroke={epic.trim() ? T.brand : T.mutedFg} /> Publish
          </button>

          <div style={{ width: 1, height: 24, background: T.borderIllustrative }} />

          {score && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 12px", fontSize: 12, fontWeight: 400, color: T.textSubtle }}>
              <Ico d={icons.star} size={12} stroke={T.brand} fill={T.brand} /> <span style={{ color: T.textPrimary, fontWeight: 500 }}>{score.toFixed(1)}</span>
            </div>
          )}

          <button onClick={() => setModal("settings")} style={{ width: 34, height: 34, borderRadius: T.radiusSm, border: `1px solid ${T.borderIllustrative}`, background: T.bgUI10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: T.textSubtle }}>
            <Ico d={icons.settings} size={15} />
          </button>
        </div>
      </header>

      {/* ══ BODY ══ */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* SIDEBAR */}
        <nav style={{ width: sW, background: T.bgUI10, borderRight: `1px solid ${T.borderIllustrative}`, display: "flex", flexDirection: "column", padding: "12px 8px", gap: 2, flexShrink: 0, transition: "width .2s ease" }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ width: "100%", height: 36, borderRadius: T.radiusSm, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: sidebarOpen ? "flex-start" : "center", padding: sidebarOpen ? "0 12px" : 0, gap: 10, color: T.textSubtle, marginBottom: 8, fontFamily: T.font, fontSize: 12 }}>
            <Ico d={icons.menu} size={16} />
            {sidebarOpen && <span style={{ fontWeight: 300 }}>Collapse</span>}
          </button>
          {[
            { id: "planner", icon: icons.clipboard, label: "Epic Planner" },
            { id: "blueprint", icon: icons.grid, label: "Blueprints" },
            { id: "settings", icon: icons.settings, label: "Settings" },
          ].map(item => (
            <button key={item.id} onClick={() => { setNav(item.id); if (item.id === "blueprint") setRightTab("blueprint"); if (item.id === "settings") setModal("settings"); }}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: sidebarOpen ? "8px 12px" : "8px 0", justifyContent: sidebarOpen ? "flex-start" : "center", width: "100%", height: 38, border: "none", borderRadius: T.radiusSm, background: nav === item.id ? T.inputBg : "transparent", color: nav === item.id ? T.textPrimary : T.textSubtle, cursor: "pointer", fontSize: 13, fontFamily: T.font, fontWeight: nav === item.id ? 400 : 300, transition: "all .12s" }}>
              <Ico d={item.icon} size={16} />
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* EDITOR */}
        <div style={{ flex: chatOpen ? 5 : 6, display: "flex", flexDirection: "column", minWidth: 0, transition: "flex .25s ease" }}>
          {/* Editor pane header */}
          <div style={{ padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${T.borderIllustrative}`, background: "#1a1a1a", color: "#888", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Ico d={icons.edit} size={13} stroke="#666" />
              <span style={{ fontSize: 12, fontWeight: 400, color: "#aaa" }}>Editor</span>
              <span style={{ padding: "2px 8px", background: "#2a2a2a", borderRadius: 4, fontSize: 9, fontWeight: 400, color: "#666", textTransform: "uppercase", letterSpacing: ".5px" }}>Markdown</span>
            </div>
            <span style={{ fontSize: 10, color: "#555", fontVariantNumeric: "tabular-nums" }}>{lines} lines</span>
          </div>

          {/* Editor content */}
          <div style={{ flex: 1, overflow: "auto", background: epic ? "#1a1a1a" : T.bgUI10 }}>
            {!epic ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", padding: 48, animation: "ubsFade .4s ease" }}>
                <ImpulseLine>
                  <div style={{ fontSize: "1.75rem", fontWeight: 300, color: T.textPrimary, lineHeight: 1.3, marginBottom: 8 }}>Create your epic</div>
                  <p style={{ fontSize: 14, color: T.textSubtle, fontWeight: 300, lineHeight: 1.6, maxWidth: 340, marginBottom: 24 }}>
                    Select a category, write your rough content, then click <span style={{ color: T.brand, fontWeight: 500 }}>Refine</span> for AI-powered structuring.
                  </p>
                </ImpulseLine>
                <Keyline />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 28 }}>
                  {CATS.slice(0, 5).map(c => (
                    <button key={c.id} onClick={() => pickCat(c.id)} style={{ padding: "8px 18px", borderRadius: 4, border: `1px solid ${T.borderIllustrative}`, background: T.bgUI10, color: T.textSubtle, fontSize: 12, cursor: "pointer", fontFamily: T.font, fontWeight: 300, transition: "all .12s", display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 22, height: 22, borderRadius: 4, background: T.inputBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 500, color: T.textSubtle }}>{c.icon}</span>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <textarea value={epic} onChange={e => setEpic(e.target.value)} spellCheck={false} style={{ width: "100%", height: "100%", border: "none", outline: "none", resize: "none", padding: "20px 24px", fontSize: 13, fontFamily: T.mono, fontWeight: 300, lineHeight: 1.8, color: "#d4d4d4", background: "#1a1a1a", letterSpacing: ".01em" }} />
            )}
          </div>
        </div>

        {/* RIGHT PANE */}
        <div style={{ flex: 2.5, display: "flex", flexDirection: "column", background: T.bgUI10, borderLeft: `1px solid ${T.borderIllustrative}`, minWidth: 0 }}>
          <div style={{ padding: "8px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${T.borderIllustrative}`, flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 0 }}>
              {[
                { id: "preview", label: "Preview", icon: icons.eye },
                { id: "blueprint", label: "Blueprint", icon: icons.grid },
              ].map(tab => (
                <button key={tab.id} onClick={() => setRightTab(tab.id)} style={{ padding: "6px 16px", border: "none", borderBottom: rightTab === tab.id ? `2px solid ${T.brand}` : "2px solid transparent", background: "transparent", color: rightTab === tab.id ? T.textPrimary : T.textSubtle, fontSize: 12, fontWeight: rightTab === tab.id ? 400 : 300, cursor: "pointer", fontFamily: T.font, display: "flex", alignItems: "center", gap: 6, transition: "all .12s" }}>
                  <Ico d={tab.icon} size={13} />
                  {tab.label}
                  {tab.id === "blueprint" && diagramOk && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e" }} />}
                </button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
            {rightTab === "preview" ? preview() : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: T.textSubtle, fontSize: 12, gap: 12, fontWeight: 300 }}>
                {diagramOk ? (
                  <div style={{ width: "100%", padding: 20, background: T.inputBg, borderRadius: T.radius }}>
                    <div style={{ fontFamily: T.mono, fontSize: 11, color: T.textSubtle, lineHeight: 2 }}>
                      graph TD<br />
                      &nbsp;&nbsp;A[Client] --&gt; B[API Gateway]<br />
                      &nbsp;&nbsp;B --&gt; C[Auth Service]<br />
                      &nbsp;&nbsp;B --&gt; D[Core Service]<br />
                      &nbsp;&nbsp;D --&gt; E[(Database)]
                    </div>
                  </div>
                ) : (
                  <><Ico d={icons.grid} size={28} /><span>Diagram appears after Refine</span></>
                )}
              </div>
            )}
          </div>
        </div>

        {/* CHAT */}
        <div style={{ width: chatOpen ? "20%" : 44, minWidth: chatOpen ? 220 : 44, maxWidth: chatOpen ? 320 : 44, display: "flex", flexDirection: "column", background: T.bgUI10, borderLeft: `1px solid ${T.borderIllustrative}`, transition: "all .25s ease", overflow: "hidden", flexShrink: 0 }}>
          {!chatOpen ? (
            <div onClick={() => setChatOpen(true)} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0", gap: 12, cursor: "pointer" }}>
              <div style={{ width: 32, height: 32, borderRadius: T.radiusSm, background: T.inputBg, display: "flex", alignItems: "center", justifyContent: "center", color: T.textSubtle, transition: "all .12s" }}>
                <Ico d={icons.chat} size={15} />
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", animation: "ubsSlide .2s ease" }}>
              <div style={{ padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${T.borderIllustrative}`, flexShrink: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 400 }}>Chat</span>
                <button onClick={() => setChatOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: T.textSubtle, padding: 2 }}><Ico d={icons.x} size={14} /></button>
              </div>
              <div style={{ display: "flex", gap: 4, padding: "8px 10px", flexWrap: "wrap", borderBottom: `1px solid ${T.borderIllustrative}` }}>
                {["Expand", "Add examples", "Simplify"].map(a => (
                  <button key={a} style={{ padding: "3px 10px", borderRadius: 4, border: `1px solid ${T.borderIllustrative}`, background: T.bgUI10, color: T.textSubtle, fontSize: 10, cursor: "pointer", fontFamily: T.font, fontWeight: 300 }}>{a}</button>
                ))}
              </div>
              <div style={{ flex: 1, overflow: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                {msgs.map((m, i) => (
                  <div key={i} style={{ padding: "8px 12px", borderRadius: m.r === "user" ? "10px 10px 4px 10px" : "10px 10px 10px 4px", background: m.r === "user" ? T.inputBg : T.muted, color: T.textSubtle, fontSize: 12, lineHeight: 1.5, fontWeight: 300, alignSelf: m.r === "user" ? "flex-end" : "flex-start", maxWidth: "88%", animation: "ubsFade .2s" }}>
                    {m.t}
                  </div>
                ))}
              </div>
              <div style={{ padding: 8, borderTop: `1px solid ${T.borderIllustrative}`, display: "flex", gap: 6, flexShrink: 0 }}>
                <input value={chatIn} onChange={e => setChatIn(e.target.value)} onKeyDown={e => e.key === "Enter" && sendChat()} placeholder="Improve a section..." style={{ flex: 1, padding: "7px 14px", borderRadius: 20, border: `1px solid ${T.borderIllustrative}`, fontSize: 12, fontFamily: T.font, fontWeight: 300, outline: "none", color: T.textPrimary, background: T.inputBg }} />
                <button onClick={sendChat} style={{ width: 30, height: 30, borderRadius: "50%", border: "none", background: chatIn.trim() ? T.brand : T.switchBg, color: T.textInverted, cursor: chatIn.trim() ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", transition: "background .15s" }}>
                  <Ico d={icons.send} size={12} stroke={T.textInverted} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══ MODALS ══ */}

      <Modal open={modal === "pipeline"} onClose={() => !pRun && setModal(null)} title="Refining your epic">
        {STAGES.map(s => {
          const done = pStage > s.id, active = pStage === s.id;
          return (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 0" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 500, flexShrink: 0, background: done ? "#dcfce7" : active ? T.brand : T.inputBg, color: done ? "#166534" : active ? T.textInverted : T.mutedFg, transition: "all .3s", ...(active ? { animation: "ubsPulse 1.5s ease infinite" } : {}) }}>
                {done ? <Ico d={icons.check} size={13} stroke="#166534" /> : s.id}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: active || done ? 400 : 300, color: active || done ? T.textPrimary : T.mutedFg }}>{s.name}</div>
                {active && <div style={{ fontSize: 11, color: T.textSubtle, fontWeight: 300, marginTop: 2 }}>{s.sub}</div>}
              </div>
            </div>
          );
        })}
        <div style={{ marginTop: 16, height: 3, background: T.muted, borderRadius: 2, overflow: "hidden" }}>
          <div style={{ width: `${(pStage / 6) * 100}%`, height: "100%", background: T.brand, transition: "width .5s ease" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 10, color: T.textSubtle, fontWeight: 300 }}>
          <span>Iteration 1/5</span><span>{pRun ? "Processing..." : "Complete"}</span>
        </div>
      </Modal>

      <Modal open={modal === "settings"} onClose={() => setModal(null)} title="Settings">
        <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: `1px solid ${T.borderIllustrative}` }}>
          {["AI Provider", "GitLab"].map((t, i) => (
            <button key={t} style={{ padding: "8px 20px", border: "none", borderBottom: i === 0 ? `2px solid ${T.brand}` : "2px solid transparent", background: "transparent", color: i === 0 ? T.textPrimary : T.textSubtle, fontSize: 13, fontWeight: i === 0 ? 400 : 300, cursor: "pointer", fontFamily: T.font }}>{t}</button>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, fontSize: 13 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 400, color: T.textSubtle }}>Provider</label>
            <select style={{ padding: "8px 12px", borderRadius: T.radiusSm, border: `1px solid ${T.borderIllustrative}`, fontSize: 13, fontFamily: T.font, fontWeight: 300 }}>
              <option>Azure OpenAI</option><option>OpenAI Direct</option><option>Mock</option>
            </select>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 400, color: T.textSubtle }}>Endpoint</label>
            <input defaultValue="https://ubs-openai.azure.com" style={{ padding: "8px 12px", borderRadius: T.radiusSm, border: `1px solid ${T.borderIllustrative}`, fontSize: 13, fontFamily: T.font, fontWeight: 300, outline: "none" }} />
          </div>
          <button style={{ alignSelf: "flex-start", padding: "7px 18px", border: `1px solid ${T.borderIllustrative}`, borderRadius: T.radiusSm, background: T.bgUI10, color: T.textPrimary, fontSize: 13, fontWeight: 400, cursor: "pointer", fontFamily: T.font }}>Test connection</button>
        </div>
      </Modal>

      <Modal open={modal === "loader"} onClose={() => setModal(null)} title="Load from GitLab">
        <input placeholder="Search epics..." style={{ width: "100%", padding: "9px 14px", borderRadius: T.radiusSm, border: `1px solid ${T.borderIllustrative}`, fontSize: 13, fontFamily: T.font, fontWeight: 300, marginBottom: 16, outline: "none" }} />
        {["API Gateway Migration — #142", "Auth Service Redesign — #98", "Data Pipeline v3 — #201", "Mobile App Feature Set — #167"].map(e => (
          <div key={e} onClick={() => { setEpic(`## Loaded Epic\n\n_Loaded from GitLab..._\n\n## Architecture\n\n## Requirements`); setModal(null); }} style={{ padding: "12px 16px", borderBottom: `1px solid ${T.borderIllustrative}`, cursor: "pointer", fontSize: 13, color: T.textSubtle, fontWeight: 300, display: "flex", justifyContent: "space-between", transition: "background .1s" }}>
            <span style={{ color: T.textPrimary }}>{e}</span>
            <span style={{ fontSize: 11, color: T.mutedFg }}>opened</span>
          </div>
        ))}
      </Modal>

      <Modal open={modal === "publish"} onClose={() => setModal(null)} title="Publish to GitLab">
        <div style={{ display: "flex", flexDirection: "column", gap: 16, fontSize: 13 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 400, color: T.textSubtle }}>Title</label>
            <input defaultValue={cat ? CATS.find(c => c.id === cat)?.label : "Epic"} style={{ padding: "8px 12px", borderRadius: T.radiusSm, border: `1px solid ${T.borderIllustrative}`, fontSize: 13, fontFamily: T.font, fontWeight: 300, outline: "none" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <label style={{ fontSize: 12, fontWeight: 400, color: T.textSubtle }}>Target group</label>
            <select style={{ padding: "8px 12px", borderRadius: T.radiusSm, border: `1px solid ${T.borderIllustrative}`, fontSize: 13, fontFamily: T.font, fontWeight: 300 }}>
              <option>pod-alpha</option><option>crew-platform</option>
            </select>
          </div>
          {score && (
            <div style={{ padding: "10px 16px", borderRadius: T.radiusSm, borderLeft: `4px solid ${score >= 7 ? "#22c55e" : T.brand}`, background: score >= 7 ? "#f0fdf4" : T.inputBg, fontSize: 12, fontWeight: 300, color: score >= 7 ? "#166534" : T.textSubtle }}>
              Quality score: <strong>{score.toFixed(1)}/10</strong> — {score >= 7 ? "Ready to publish" : "Consider refining"}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button onClick={() => setModal(null)} style={{ padding: "7px 18px", border: `1px solid ${T.borderIllustrative}`, borderRadius: T.radiusSm, background: T.bgUI10, fontSize: 13, fontWeight: 400, cursor: "pointer", fontFamily: T.font }}>Cancel</button>
            <button style={{ padding: "7px 18px", border: "none", borderRadius: T.radiusSm, background: T.brand, color: T.textInverted, fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: T.font }}>Publish</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
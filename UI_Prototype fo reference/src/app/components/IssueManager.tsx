import { useState } from "react";
import {
  Sparkle,
  Clock,
  Circle,
  CheckCircle,
  Warning,
  ArrowRight,
  User,
  ChatText,
  CaretRight,
  MagnifyingGlass,
  Pulse,
  Tag,
} from "@phosphor-icons/react";

/* ═══════════════════════════════════════════════════
   FRAME — Issue Manager
   ═══════════════════════════════════════════════════ */

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

interface Issue {
  id: string;
  title: string;
  status: "todo" | "in-progress" | "review" | "blocked" | "done";
  priority: "high" | "medium" | "low";
  updated: string;
  assignee: string;
  description?: string;
  timeline?: Array<{
    type: "status" | "comment" | "ai";
    author: string;
    action: string;
    time: string;
    content?: string;
  }>;
}

const MOCK_ISSUES: Issue[] = [
  {
    id: "AUTH-101",
    title: "Implement OAuth2 PKCE flow for mobile clients",
    status: "in-progress",
    priority: "high",
    updated: "2h ago",
    assignee: "Sarah Kim",
    description: "Implement OAuth2 with PKCE extension for enhanced security in mobile applications. The implementation must support both iOS and Android native clients with proper token storage and refresh mechanisms.",
    timeline: [
      {
        type: "ai",
        author: "AI Assistant",
        action: "generated update",
        time: "2h ago",
        content: "Completed PKCE token exchange implementation. Updated auth flow to use SHA256 code challenge method.",
      },
      {
        type: "status",
        author: "Sarah Kim",
        action: "changed status to In Progress",
        time: "4h ago",
      },
      {
        type: "comment",
        author: "Alex Chen",
        action: "commented",
        time: "1d ago",
        content: "Make sure to test with both iOS and Android clients.",
      },
    ],
  },
  {
    id: "AUTH-102",
    title: "Add refresh token rotation mechanism",
    status: "review",
    priority: "high",
    updated: "5h ago",
    assignee: "Alex Chen",
  },
  {
    id: "AUTH-103",
    title: "Implement session timeout handling",
    status: "blocked",
    priority: "medium",
    updated: "1d ago",
    assignee: "Maria Rodriguez",
  },
  {
    id: "AUTH-104",
    title: "Add biometric authentication support",
    status: "in-progress",
    priority: "medium",
    updated: "6h ago",
    assignee: "Sarah Kim",
  },
  {
    id: "AUTH-105",
    title: "Create auth documentation and examples",
    status: "done",
    priority: "low",
    updated: "2d ago",
    assignee: "John Doe",
  },
  {
    id: "AUTH-106",
    title: "Setup authentication monitoring alerts",
    status: "todo",
    priority: "low",
    updated: "3d ago",
    assignee: "Maria Rodriguez",
  },
];

const STATUS_CONFIG: Record<Issue["status"], { icon: typeof CheckCircle; color: string; bg: string; label: string; weight: "fill" | "duotone" | "regular" }> = {
  done: { icon: CheckCircle, color: "#059669", bg: "#ecfdf5", label: "Done", weight: "fill" },
  "in-progress": { icon: Pulse, color: "var(--col-background-brand)", bg: "#fef2f2", label: "In Progress", weight: "duotone" },
  blocked: { icon: Warning, color: "#f59e0b", bg: "#fffbeb", label: "Blocked", weight: "fill" },
  review: { icon: Clock, color: "#6366f1", bg: "#eef2ff", label: "In Review", weight: "regular" },
  todo: { icon: Circle, color: "var(--col-text-subtle)", bg: "#f9fafb", label: "To Do", weight: "regular" },
};

const getStatusIcon = (status: Issue["status"], size = 14) => {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return <Icon size={size} weight={cfg.weight} color={cfg.color} />;
};

const getPriorityColor = (priority: Issue["priority"]) => {
  switch (priority) {
    case "high":
      return "var(--col-background-brand)";
    case "medium":
      return "#f59e0b";
    case "low":
      return "var(--col-text-subtle)";
  }
};

const getPriorityLabel = (priority: Issue["priority"]) => {
  switch (priority) {
    case "high": return "High";
    case "medium": return "Medium";
    case "low": return "Low";
  }
};

export function IssueManager() {
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(MOCK_ISSUES[0]);
  const [aiInput, setAiInput] = useState("");
  const [showAiPreview, setShowAiPreview] = useState(false);
  const [aiPreviewText, setAiPreviewText] = useState("");
  const [hoveredIssue, setHoveredIssue] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleGenerateAI = () => {
    if (!aiInput.trim()) return;
    setAiPreviewText(
      `Completed ${aiInput}. Implementation follows best practices. All tests passing and ready for review.`
    );
    setShowAiPreview(true);
  };

  const handlePostAI = () => {
    setShowAiPreview(false);
    setAiInput("");
  };

  const filteredIssues = MOCK_ISSUES.filter(
    (issue) =>
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      style={{
        display: "flex",
        flex: 1,
        overflow: "hidden",
        background: "#f7f7f5",
        animation: "ubsFade 0.3s ease-out",
      }}
    >
      {/* ═══ ISSUE LIST PANEL ═══ */}
      <div
        style={{
          width: 340,
          background: "#ffffff",
          borderRight: "1px solid var(--col-border-illustrative)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* List Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--col-border-illustrative)",
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: "var(--col-text-subtle)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 10,
              fontFamily: F,
            }}
          >
            Epic
          </div>
          <select
            style={{
              width: "100%",
              padding: "9px 12px",
              background: "#ffffff",
              border: "1px solid var(--col-border-illustrative)",
              borderRadius: 6,
              fontFamily: F,
              fontSize: 13,
              fontWeight: 300,
              color: "var(--col-text-primary)",
              cursor: "pointer",
              outline: "none",
              marginBottom: 12,
            }}
          >
            <option>EPIC-2048 · User Auth Overhaul</option>
            <option>EPIC-2031 · Payment Gateway v2</option>
            <option>EPIC-2019 · Dashboard Redesign</option>
          </select>

          {/* Search */}
          <div style={{ position: "relative" }}>
            <MagnifyingGlass
              size={14}
              color="var(--col-text-subtle)"
              style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search issues..."
              style={{
                width: "100%",
                padding: "8px 12px 8px 32px",
                border: "1px solid var(--col-border-illustrative)",
                borderRadius: 6,
                fontFamily: F,
                fontSize: 12,
                fontWeight: 300,
                color: "var(--col-text-primary)",
                background: "var(--input-background)",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* Issue Count */}
        <div
          style={{
            padding: "10px 24px",
            fontSize: 12,
            fontWeight: 300,
            color: "var(--col-text-subtle)",
            fontFamily: F,
            borderBottom: "1px solid var(--col-border-illustrative)",
            letterSpacing: "0.02em",
          }}
        >
          {filteredIssues.length} issues
        </div>

        {/* Issue List */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "4px 0",
          }}
        >
          {filteredIssues.map((issue) => {
            const isActive = selectedIssue?.id === issue.id;
            const isHovered = hoveredIssue === issue.id;
            const statusCfg = STATUS_CONFIG[issue.status];
            return (
              <div
                key={issue.id}
                onClick={() => setSelectedIssue(issue)}
                onMouseEnter={() => setHoveredIssue(issue.id)}
                onMouseLeave={() => setHoveredIssue(null)}
                style={{
                  padding: "14px 24px",
                  cursor: "pointer",
                  borderLeft: isActive
                    ? "3px solid var(--col-background-brand)"
                    : "3px solid transparent",
                  background: isActive ? "#fafafa" : isHovered ? "#fafafa" : "transparent",
                  transition: "all 0.15s ease",
                  position: "relative",
                }}
              >
                {/* Top row: ID + Status dot + Priority */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 6,
                  }}
                >
                  {getStatusIcon(issue.status)}
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: "var(--col-text-subtle)",
                      fontFamily: F,
                      letterSpacing: "0.02em",
                    }}
                  >
                    {issue.id}
                  </span>
                  {/* Priority pill */}
                  <div
                    style={{
                      marginLeft: "auto",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "2px 8px",
                      borderRadius: 4,
                      background: issue.priority === "high" ? "#fef2f2" : issue.priority === "medium" ? "#fffbeb" : "#f9fafb",
                    }}
                  >
                    <div
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: getPriorityColor(issue.priority),
                      }}
                    />
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 300,
                        color: getPriorityColor(issue.priority),
                        fontFamily: F,
                      }}
                    >
                      {getPriorityLabel(issue.priority)}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: isActive ? 400 : 300,
                    color: "var(--col-text-primary)",
                    lineHeight: 1.45,
                    marginBottom: 8,
                    fontFamily: F,
                  }}
                >
                  {issue.title}
                </div>

                {/* Bottom row: assignee + time */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: 12,
                    color: "var(--col-text-subtle)",
                    fontWeight: 300,
                    fontFamily: F,
                  }}
                >
                  <span>{issue.assignee}</span>
                  <span>{issue.updated}</span>
                </div>

                {/* Active indicator arrow */}
                {isActive && (
                  <CaretRight
                    size={12}
                    color="var(--col-background-brand)"
                    weight="bold"
                    style={{
                      position: "absolute",
                      right: 10,
                      top: "50%",
                      transform: "translateY(-50%)",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ DETAIL PANEL ═══ */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {selectedIssue ? (
          <>
            {/* Issue Header */}
            <div
              style={{
                padding: "28px 40px",
                borderBottom: "1px solid var(--col-border-illustrative)",
                background: "#ffffff",
                position: "relative",
              }}
            >
              {/* UBS Impulse Line */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: 20,
                  width: 4,
                  height: 56,
                  background: "var(--col-background-brand)",
                  borderRadius: "0 2px 2px 0",
                }}
              />

              {/* Status + ID row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 14,
                }}
              >
                {getStatusIcon(selectedIssue.status, 16)}
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 400,
                    color: "var(--col-text-subtle)",
                    fontFamily: F,
                    letterSpacing: "0.02em",
                  }}
                >
                  {selectedIssue.id}
                </span>

                {/* Color-coded status badge */}
                <div
                  style={{
                    padding: "4px 12px",
                    borderRadius: 6,
                    background: STATUS_CONFIG[selectedIssue.status].bg,
                    fontSize: 11,
                    fontWeight: 500,
                    color: STATUS_CONFIG[selectedIssue.status].color,
                    fontFamily: F,
                  }}
                >
                  {STATUS_CONFIG[selectedIssue.status].label}
                </div>

                {/* Priority badge */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "4px 10px",
                    borderRadius: 6,
                    border: "1px solid var(--col-border-illustrative)",
                    fontSize: 11,
                    fontWeight: 300,
                    fontFamily: F,
                    color: getPriorityColor(selectedIssue.priority),
                  }}
                >
                  <Tag size={12} weight="regular" />
                  {getPriorityLabel(selectedIssue.priority)}
                </div>
              </div>

              {/* Title */}
              <h1
                style={{
                  fontSize: 27,
                  fontWeight: 400,
                  lineHeight: 1.3,
                  color: "var(--col-text-primary)",
                  marginBottom: 20,
                  fontFamily: F,
                  letterSpacing: "-0.2px",
                }}
              >
                {selectedIssue.title}
              </h1>

              {/* Meta row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  fontSize: 13,
                  color: "var(--col-text-subtle)",
                  fontFamily: F,
                  fontWeight: 300,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <User size={14} color="var(--col-text-subtle)" />
                  {selectedIssue.assignee}
                </div>
                <div
                  style={{
                    width: 1,
                    height: 12,
                    background: "var(--col-border-illustrative)",
                  }}
                />
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Clock size={14} color="var(--col-text-subtle)" />
                  Updated {selectedIssue.updated}
                </div>
              </div>
            </div>

            {/* AI Input Section — styled like Welcome lifecycle detail panel */}
            <div
              style={{
                padding: "24px 40px",
                borderBottom: "1px solid var(--col-border-illustrative)",
                background: "linear-gradient(135deg, #fffbf7 0%, #fff5f0 100%)",
                borderLeft: "6px solid var(--col-background-brand)",
              }}
            >
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: "var(--col-background-brand)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    boxShadow: "0 4px 12px rgba(225,43,30,0.25)",
                  }}
                >
                  <Sparkle size={20} color="#ffffff" weight="fill" />
                </div>
                <input
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder="Type a quick update — AI will structure it..."
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    border: "1px solid #ffe5e0",
                    borderRadius: 6,
                    fontFamily: F,
                    fontSize: 13,
                    fontWeight: 300,
                    color: "var(--col-text-primary)",
                    background: "#ffffff",
                    outline: "none",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "var(--col-background-brand)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#ffe5e0";
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleGenerateAI();
                  }}
                />
                <button
                  onClick={handleGenerateAI}
                  disabled={!aiInput.trim()}
                  style={{
                    padding: "10px 20px",
                    background: aiInput.trim() ? "var(--col-background-brand)" : "#e5e7eb",
                    color: aiInput.trim() ? "#ffffff" : "var(--col-text-subtle)",
                    fontFamily: F,
                    fontSize: 12,
                    fontWeight: 500,
                    border: "none",
                    borderRadius: 6,
                    cursor: aiInput.trim() ? "pointer" : "not-allowed",
                    whiteSpace: "nowrap",
                    transition: "all 0.2s ease",
                    boxShadow: aiInput.trim() ? "0 2px 8px rgba(225,43,30,0.2)" : "none",
                  }}
                  onMouseEnter={(e) => {
                    if (aiInput.trim()) {
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.boxShadow = "0 4px 12px rgba(225,43,30,0.3)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    if (aiInput.trim()) {
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(225,43,30,0.2)";
                    }
                  }}
                >
                  Generate
                </button>
              </div>

              {/* AI Preview */}
              {showAiPreview && (
                <div
                  style={{
                    marginTop: 16,
                    padding: "18px 20px",
                    background: "#ffffff",
                    border: "1px solid #ffe5e0",
                    borderLeft: "4px solid var(--col-background-brand)",
                    borderRadius: 8,
                    animation: "ubsFade 0.3s ease-out",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "var(--col-background-brand)",
                      marginBottom: 10,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontFamily: F,
                    }}
                  >
                    <Sparkle size={12} weight="fill" />
                    AI Generated
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      lineHeight: 1.6,
                      fontWeight: 300,
                      color: "var(--col-text-primary)",
                      marginBottom: 14,
                      fontFamily: F,
                    }}
                  >
                    {aiPreviewText}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={handlePostAI}
                      style={{
                        padding: "8px 18px",
                        fontFamily: F,
                        fontSize: 12,
                        fontWeight: 500,
                        borderRadius: 6,
                        cursor: "pointer",
                        border: "none",
                        background: "var(--col-background-brand)",
                        color: "#ffffff",
                        transition: "all 0.2s ease",
                        boxShadow: "0 2px 8px rgba(225,43,30,0.2)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(225,43,30,0.3)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 2px 8px rgba(225,43,30,0.2)";
                      }}
                    >
                      Post Update
                    </button>
                    <button
                      onClick={() => setShowAiPreview(false)}
                      style={{
                        padding: "8px 18px",
                        fontFamily: F,
                        fontSize: 12,
                        fontWeight: 400,
                        borderRadius: 6,
                        cursor: "pointer",
                        background: "#ffffff",
                        color: "var(--col-text-subtle)",
                        border: "1px solid var(--col-border-illustrative)",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "var(--col-background-brand)";
                        e.currentTarget.style.color = "var(--col-text-primary)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--col-border-illustrative)";
                        e.currentTarget.style.color = "var(--col-text-subtle)";
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Content Area */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "32px 40px",
                background: "#f7f7f5",
              }}
            >
              {/* Description */}
              {selectedIssue.description && (
                <div style={{ marginBottom: 36 }}>
                  {/* Section divider — matching Welcome screen pattern */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      marginBottom: 18,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: "var(--col-text-subtle)",
                        fontFamily: F,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Description
                    </div>
                    <div
                      style={{
                        flex: 1,
                        height: 1,
                        background: "var(--col-border-illustrative)",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      padding: "20px 24px",
                      background: "#ffffff",
                      borderRadius: 8,
                      border: "1px solid var(--col-border-illustrative)",
                      fontSize: 14,
                      lineHeight: 1.7,
                      fontWeight: 300,
                      color: "var(--col-text-primary)",
                      fontFamily: F,
                      transition: "all 0.25s ease",
                      cursor: "default",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.04)";
                      e.currentTarget.style.borderColor = "var(--col-background-brand)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.borderColor = "var(--col-border-illustrative)";
                    }}
                  >
                    {selectedIssue.description}
                  </div>
                </div>
              )}

              {/* Timeline */}
              {selectedIssue.timeline && selectedIssue.timeline.length > 0 && (
                <div>
                  {/* Section divider — matching Welcome screen pattern */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      marginBottom: 20,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: "var(--col-text-subtle)",
                        fontFamily: F,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Activity
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 300,
                        color: "var(--col-text-subtle)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {selectedIssue.timeline.length} events
                    </span>
                    <div
                      style={{
                        flex: 1,
                        height: 1,
                        background: "var(--col-border-illustrative)",
                      }}
                    />
                  </div>

                  <div
                    style={{
                      position: "relative",
                      paddingLeft: 32,
                    }}
                  >
                    {/* Timeline line */}
                    <div
                      style={{
                        position: "absolute",
                        left: 9,
                        top: 12,
                        bottom: 12,
                        width: 2,
                        background: "var(--col-border-illustrative)",
                        borderRadius: 1,
                      }}
                    />

                    {selectedIssue.timeline.map((event, idx) => {
                      const isAI = event.type === "ai";
                      const dotColor = isAI ? "var(--col-background-brand)" : "var(--col-text-subtle)";

                      return (
                        <div
                          key={idx}
                          style={{
                            position: "relative",
                            marginBottom: 16,
                            animation: `ubsFade 0.3s ease-out ${idx * 0.1}s both`,
                          }}
                        >
                          {/* Dot — larger and more prominent */}
                          <div
                            style={{
                              position: "absolute",
                              left: -23,
                              top: 16,
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              background: dotColor,
                              border: "2px solid #ffffff",
                              boxShadow: isAI ? "0 0 0 3px rgba(230,0,0,0.1)" : "0 0 0 2px rgba(0,0,0,0.04)",
                            }}
                          />

                          <div
                            style={{
                              padding: "16px 20px",
                              background: "#ffffff",
                              borderRadius: 8,
                              border: `1px solid ${isAI ? "#ffe5e0" : "var(--col-border-illustrative)"}`,
                              borderLeft: isAI ? "4px solid var(--col-background-brand)" : undefined,
                              transition: "all 0.25s ease",
                              cursor: "default",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.04)";
                              e.currentTarget.style.transform = "translateX(2px)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.boxShadow = "none";
                              e.currentTarget.style.transform = "translateX(0)";
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                marginBottom: event.content ? 10 : 0,
                              }}
                            >
                              {event.type === "ai" && <Sparkle size={14} color={dotColor} weight="fill" />}
                              {event.type === "comment" && <ChatText size={14} color={dotColor} />}
                              {event.type === "status" && <ArrowRight size={14} color={dotColor} />}
                              <span
                                style={{
                                  fontSize: 13,
                                  fontWeight: 400,
                                  color: "var(--col-text-primary)",
                                  fontFamily: F,
                                }}
                              >
                                {event.author}
                              </span>
                              <span
                                style={{
                                  fontSize: 12,
                                  fontWeight: 300,
                                  color: "var(--col-text-subtle)",
                                  fontFamily: F,
                                }}
                              >
                                {event.action}
                              </span>
                              <span
                                style={{
                                  fontSize: 12,
                                  fontWeight: 300,
                                  color: "var(--col-text-subtle)",
                                  marginLeft: "auto",
                                  fontFamily: F,
                                }}
                              >
                                {event.time}
                              </span>
                            </div>
                            {event.content && (
                              <div
                                style={{
                                  fontSize: 13,
                                  lineHeight: 1.6,
                                  fontWeight: 300,
                                  color: "var(--col-text-subtle)",
                                  fontFamily: F,
                                }}
                              >
                                {event.content}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          /* ═══ EMPTY STATE — elevated to match Welcome Screen quality ═══ */
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 48,
            }}
          >
            <div
              style={{
                textAlign: "center",
                maxWidth: 400,
                animation: "ubsFade 0.4s ease-out",
              }}
            >
              {/* Icon badge — matching Welcome screen 40×40 badges */}
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 14,
                  background: "linear-gradient(135deg, #fffbf7 0%, #fff5f0 100%)",
                  border: "1px solid #ffe5e0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 20px",
                }}
              >
                <Pulse size={24} color="var(--col-background-brand)" weight="duotone" />
              </div>
              <div
                style={{
                  fontSize: 20,
                  fontWeight: 300,
                  color: "var(--col-text-primary)",
                  marginBottom: 8,
                  fontFamily: F,
                  letterSpacing: "-0.2px",
                }}
              >
                Select an issue
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 300,
                  color: "var(--col-text-subtle)",
                  fontFamily: F,
                  lineHeight: 1.6,
                }}
              >
                Choose an issue from the list to view details, track activity, and generate AI updates.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
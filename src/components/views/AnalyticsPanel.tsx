import { useState, useEffect } from "react";
import {
  TrendUp,
  TrendDown,
  Warning,
  ShieldWarning,
  Info,
  Lightning,
  User,
  CheckCircle,
  Clock,
  ChartBar,
  Sparkle,
  ArrowRight,
} from "@phosphor-icons/react";

/* ═══════════════════════════════════════════════════
   FRAME — Epic Analytics Panel
   ═══════════════════════════════════════════════════ */

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

/* ── Mock Data ───────────────────────────────── */

const HEALTH_SCORE = 8.2;

const METRICS = [
  { label: "Avg Cycle Time", value: "3.2d", trend: -18, good: true },
  { label: "Active Blockers", value: "2", trend: 1, good: false },
  { label: "Closed / Week", value: "7.4", trend: 22, good: true },
  { label: "On-Track %", value: "84%", trend: 5, good: true },
];

const STATUS_DATA = [
  { label: "Done", count: 14, color: "#22c55e", total: 32 },
  { label: "In Progress", count: 8, color: "#3b82f6", total: 32 },
  { label: "In Review", count: 4, color: "#a855f7", total: 32 },
  { label: "To Do", count: 4, color: "#94a3b8", total: 32 },
  { label: "Blocked", count: 2, color: "#ef4444", total: 32 },
];

const WEEKLY_VELOCITY = [3, 5, 4, 7, 6, 8, 7, 9];
const WEEK_LABELS = ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"];

const BURNDOWN_IDEAL = [32, 28, 24, 20, 16, 12, 8, 4, 0];
const BURNDOWN_ACTUAL = [32, 30, 27, 24, 21, 18, 15, 11, 8];

const TEAM = [
  { name: "Sarah Kim", role: "Developer", updates: 18, initials: "SK", color: "#3b82f6" },
  { name: "Marco Rossi", role: "Architect", updates: 14, initials: "MR", color: "#a855f7" },
  { name: "James Liu", role: "Developer", updates: 12, initials: "JL", color: "#22c55e" },
  { name: "Anna Weber", role: "PM", updates: 9, initials: "AW", color: "#f59e0b" },
  { name: "Tom Harris", role: "Developer", updates: 6, initials: "TH", color: "#64748b" },
];

const AI_STATS = [
  { label: "Summaries generated", value: "34" },
  { label: "Accepted as-is", value: "76%" },
  { label: "Edited before posting", value: "24%" },
  { label: "Avg time saved / update", value: "4.2 min" },
];

const RISK_FLAGS: Array<{ severity: "critical" | "warning" | "info"; text: string; issueId: string }> = [
  { severity: "critical", text: "AUTH-104 blocked 4 days — Redis access dependency unresolved", issueId: "AUTH-104" },
  { severity: "warning", text: "AUTH-118 in To Do 5 days with no activity — may need re-prioritization", issueId: "AUTH-118" },
  { severity: "info", text: "3 issues have no description yet", issueId: "" },
  { severity: "info", text: "Sprint ends in 2 days with 3 issues remaining", issueId: "" },
];

/* ── Animated Ring Gauge ─────────────────────── */

function RingGauge({ score, size = 140 }: { score: number; size?: number }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = animatedScore / 10;
  const strokeDashoffset = circumference * (1 - pct);

  const color = score >= 7 ? "#22c55e" : score >= 5 ? "#f59e0b" : "#ef4444";
  const bgRing = score >= 7 ? "rgba(34,197,94,0.10)" : score >= 5 ? "rgba(245,158,11,0.10)" : "rgba(239,68,68,0.10)";

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 200);
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={bgRing} strokeWidth={10}
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={color} strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: 28, fontWeight: 500, fontFamily: F, color }}>{score.toFixed(1)}</span>
        <span style={{ fontSize: 11, fontWeight: 300, color: "var(--col-text-subtle)", fontFamily: F }}>/10</span>
      </div>
    </div>
  );
}

/* ── Mini Sparkline Bar Chart ────────────────── */

function SparklineBars({ data, labels }: { data: number[]; labels: string[] }) {
  const max = Math.max(...data);
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 64, position: "relative" }}>
      {data.map((v, i) => (
        <div
          key={i}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, position: "relative" }}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
        >
          {hovered === i && (
            <div style={{
              position: "absolute", top: -24,
              background: "#1a1a2e", color: "#fff",
              padding: "2px 6px", borderRadius: 4,
              fontSize: 10, fontWeight: 400, fontFamily: F,
              whiteSpace: "nowrap", zIndex: 10,
            }}>
              {v} issues
            </div>
          )}
          <div
            style={{
              width: "100%", maxWidth: 24,
              height: `${(v / max) * 100}%`,
              minHeight: 4,
              background: hovered === i
                ? "var(--col-background-brand)"
                : "rgba(59,130,246,0.5)",
              borderRadius: "3px 3px 0 0",
              transition: "height 0.6s cubic-bezier(0.4,0,0.2,1), background 0.15s ease",
              transitionDelay: `${i * 60}ms`,
              cursor: "pointer",
            }}
          />
          <span style={{ fontSize: 9, color: "var(--col-text-subtle)", fontFamily: F, marginTop: 3, fontWeight: 300 }}>
            {labels[i]}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Mini Area Chart (Burndown) ──────────────── */

function BurndownChart({ ideal, actual }: { ideal: number[]; actual: number[] }) {
  const w = 280;
  const h = 80;
  const pad = { t: 8, b: 4, l: 4, r: 4 };
  const cw = w - pad.l - pad.r;
  const ch = h - pad.t - pad.b;
  const max = Math.max(...ideal, ...actual);

  const toPoint = (arr: number[]) =>
    arr.map((v, i) => ({
      x: pad.l + (i / (arr.length - 1)) * cw,
      y: pad.t + ch - (v / max) * ch,
    }));

  const idealPts = toPoint(ideal);
  const actualPts = toPoint(actual);

  const toPath = (pts: { x: number; y: number }[]) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");

  const toArea = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return "";
    const last = pts[pts.length - 1]!;
    const first = pts[0]!;
    return toPath(pts) + ` L${last.x},${pad.t + ch} L${first.x},${pad.t + ch} Z`;
  };

  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
      {/* ideal area */}
      <path d={toArea(idealPts)} fill="rgba(148,163,184,0.08)" />
      <path d={toPath(idealPts)} fill="none" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 3" />
      {/* actual area */}
      <path d={toArea(actualPts)} fill="rgba(230,0,0,0.06)" />
      <path d={toPath(actualPts)} fill="none" stroke="var(--col-background-brand)" strokeWidth={2} />
      {/* end dots */}
      {actualPts.length > 0 && (() => {
        const last = actualPts[actualPts.length - 1]!;
        return (
        <circle
          cx={last.x}
          cy={last.y}
          r={3} fill="var(--col-background-brand)"
        />
      );})()}
    </svg>
  );
}

/* ── Section wrapper ─────────────────────────── */

function Section({
  title,
  icon,
  badge,
  children,
  delay = 0,
}: {
  title: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <div
      style={{
        background: "var(--col-background-ui-10)",
        borderRadius: 10,
        border: "1px solid var(--col-border-illustrative)",
        padding: "16px 18px",
        animation: `analyticsFadeUp 0.45s ease ${delay}ms both`,
      }}
    >
      <div style={{
        display: "flex", alignItems: "center", gap: 6, marginBottom: 14,
      }}>
        {icon}
        <span style={{ fontSize: 12, fontWeight: 500, color: "var(--col-text-primary)", fontFamily: F }}>
          {title}
        </span>
        {badge && <div style={{ marginLeft: "auto" }}>{badge}</div>}
      </div>
      {children}
    </div>
  );
}

/* ── Severity badge helper ───────────────────── */

const SEVERITY_MAP = {
  critical: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", color: "#dc2626", icon: ShieldWarning, label: "Critical" },
  warning: { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.25)", color: "#d97706", icon: Warning, label: "Warning" },
  info: { bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.25)", color: "#2563eb", icon: Info, label: "Info" },
};

/* ══════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════ */

export function AnalyticsPanel() {
  return (
    <div
      style={{
        flex: 1,
        overflow: "auto",
        background: "#f7f7f5",
        fontFamily: F,
      }}
    >
      <style>{`
        @keyframes analyticsFadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div style={{
        padding: "24px 32px 0",
        animation: "analyticsFadeUp 0.35s ease both",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <ChartBar size={20} weight="duotone" color="var(--col-background-brand)" />
          <h1 style={{ fontSize: 18, fontWeight: 500, color: "var(--col-text-primary)", fontFamily: F, margin: 0 }}>
            Epic Analytics
          </h1>
        </div>
        <p style={{ fontSize: 12, fontWeight: 300, color: "var(--col-text-subtle)", margin: "4px 0 0", fontFamily: F }}>
          Auth Service Redesign — Sprint 4 of 6
        </p>
        {/* UBS Impulse Line */}
        <div style={{
          height: 2, marginTop: 16,
          background: "linear-gradient(90deg, var(--col-background-brand) 0%, var(--col-background-brand) 32%, transparent 32%)",
          borderRadius: 1,
        }} />
      </div>

      {/* Scrollable content */}
      <div style={{ padding: "20px 32px 40px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── 1. HEALTH SCORE ──────────────────── */}
        <Section title="Epic Health Score" icon={<Lightning size={14} weight="fill" color="var(--col-background-brand)" />} delay={50}>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <RingGauge score={HEALTH_SCORE} size={120} />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 300, color: "var(--col-text-subtle)", fontFamily: F, lineHeight: 1.5 }}>
                Epic is <span style={{ fontWeight: 500, color: "#22c55e" }}>healthy</span>. Descriptions are clear, velocity is strong, and only 2 blockers remain.
              </div>
              <div style={{
                display: "flex", gap: 6, flexWrap: "wrap",
              }}>
                {["Velocity ↑", "Clarity A+", "2 Blockers"].map((tag) => (
                  <span key={tag} style={{
                    fontSize: 10, fontWeight: 400, fontFamily: F,
                    padding: "3px 8px", borderRadius: 99,
                    background: tag.includes("Blocker") ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)",
                    color: tag.includes("Blocker") ? "#dc2626" : "#16a34a",
                    border: `1px solid ${tag.includes("Blocker") ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)"}`,
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ── 2. KEY METRIC TILES ──────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {METRICS.map((m, i) => {
            const isUp = m.trend > 0;
            const trendColor = m.good ? "#16a34a" : "#dc2626";
            return (
              <div
                key={m.label}
                style={{
                  background: "var(--col-background-ui-10)",
                  borderRadius: 10,
                  border: "1px solid var(--col-border-illustrative)",
                  padding: "14px 16px",
                  animation: `analyticsFadeUp 0.4s ease ${100 + i * 60}ms both`,
                  transition: "box-shadow 0.2s ease, transform 0.2s ease",
                  cursor: "default",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.06)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.transform = "none";
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 300, color: "var(--col-text-subtle)", fontFamily: F, marginBottom: 6 }}>
                  {m.label}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: 22, fontWeight: 500, fontFamily: F, color: "var(--col-text-primary)" }}>
                    {m.value}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 11, fontWeight: 400, color: trendColor, fontFamily: F }}>
                    {isUp ? <TrendUp size={12} weight="bold" /> : <TrendDown size={12} weight="bold" />}
                    {Math.abs(m.trend)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── 3. STATUS BREAKDOWN ──────────────── */}
        <Section title="Status Breakdown" icon={<CheckCircle size={14} weight="duotone" color="#22c55e" />} delay={200}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {STATUS_DATA.map((s) => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 300, color: "var(--col-text-subtle)", fontFamily: F, width: 72, flexShrink: 0 }}>
                  {s.label}
                </span>
                <div style={{ flex: 1, height: 8, background: "#f0f0f0", borderRadius: 4, overflow: "hidden" }}>
                  <div
                    style={{
                      height: "100%",
                      width: `${(s.count / s.total) * 100}%`,
                      background: s.color,
                      borderRadius: 4,
                      transition: "width 0.8s cubic-bezier(0.4,0,0.2,1)",
                    }}
                  />
                </div>
                <span style={{ fontSize: 11, fontWeight: 500, fontFamily: F, color: "var(--col-text-primary)", width: 20, textAlign: "right" }}>
                  {s.count}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* ── 4. WEEKLY VELOCITY ───────────────── */}
        <Section
          title="Weekly Velocity"
          icon={<ChartBar size={14} weight="duotone" color="#3b82f6" />}
          badge={
            <span style={{
              fontSize: 10, fontWeight: 500, fontFamily: F,
              color: "#16a34a", display: "flex", alignItems: "center", gap: 3,
              background: "rgba(34,197,94,0.08)", padding: "2px 8px", borderRadius: 99,
            }}>
              <TrendUp size={10} weight="bold" /> Trending up
            </span>
          }
          delay={300}
        >
          <SparklineBars data={WEEKLY_VELOCITY} labels={WEEK_LABELS} />
        </Section>

        {/* ── 5. SPRINT BURNDOWN ──────────────── */}
        <Section title="Sprint Burndown" icon={<Clock size={14} weight="duotone" color="#f59e0b" />} delay={350}>
          <BurndownChart ideal={BURNDOWN_IDEAL} actual={BURNDOWN_ACTUAL} />
          <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 300, fontFamily: F, color: "var(--col-text-subtle)" }}>
              <span style={{ width: 12, height: 2, background: "#94a3b8", display: "inline-block", borderRadius: 1 }} />
              Ideal
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 300, fontFamily: F, color: "var(--col-text-subtle)" }}>
              <span style={{ width: 12, height: 2, background: "var(--col-background-brand)", display: "inline-block", borderRadius: 1 }} />
              Actual
            </span>
          </div>
        </Section>

        {/* ── 6. TEAM CONTRIBUTIONS ───────────── */}
        <Section title="Team Contributions" icon={<User size={14} weight="duotone" color="#a855f7" />} delay={400}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {TEAM.map((t) => {
              const maxUpdates = TEAM[0]!.updates;
              return (
                <div
                  key={t.name}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "6px 8px", borderRadius: 8,
                    transition: "background 0.15s ease",
                    cursor: "default",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#f5f5f5"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  {/* Avatar */}
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: t.color, display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 500, fontFamily: F, color: "#fff", flexShrink: 0,
                  }}>
                    {t.initials}
                  </div>
                  {/* Name + role */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 400, fontFamily: F, color: "var(--col-text-primary)" }}>
                      {t.name}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 300, fontFamily: F, color: "var(--col-text-subtle)" }}>
                      {t.role}
                    </div>
                  </div>
                  {/* Bar */}
                  <div style={{ width: 80, height: 6, background: "#f0f0f0", borderRadius: 3, overflow: "hidden", flexShrink: 0 }}>
                    <div style={{
                      height: "100%", borderRadius: 3,
                      width: `${(t.updates / maxUpdates) * 100}%`,
                      background: t.color,
                      transition: "width 0.6s ease",
                    }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 500, fontFamily: F, color: "var(--col-text-primary)", width: 50, textAlign: "right", flexShrink: 0 }}>
                    {t.updates}
                  </span>
                </div>
              );
            })}
          </div>
        </Section>

        {/* ── 7. AI ASSIST USAGE ──────────────── */}
        <Section
          title="AI Assist Usage"
          icon={<Sparkle size={14} weight="fill" color="var(--col-background-brand)" />}
          delay={450}
        >
          <div style={{
            background: "linear-gradient(135deg, rgba(230,0,0,0.03), rgba(59,130,246,0.03))",
            borderRadius: 8, padding: "12px 14px",
            display: "flex", flexDirection: "column", gap: 10,
          }}>
            {AI_STATS.map((s) => (
              <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 300, fontFamily: F, color: "var(--col-text-subtle)" }}>
                  {s.label}
                </span>
                <span style={{ fontSize: 12, fontWeight: 500, fontFamily: F, color: "var(--col-text-primary)" }}>
                  {s.value}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* ── 8. RISK FLAGS ───────────────────── */}
        <Section
          title="Risk Flags"
          icon={<Warning size={14} weight="fill" color="#f59e0b" />}
          badge={
            <span style={{
              fontSize: 10, fontWeight: 500, fontFamily: F,
              color: "#dc2626",
              background: "rgba(239,68,68,0.08)", padding: "2px 8px", borderRadius: 99,
            }}>
              1 critical
            </span>
          }
          delay={500}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {RISK_FLAGS.map((r, i) => {
              const sev = SEVERITY_MAP[r.severity];
              const Icon = sev.icon;
              return (
                <div
                  key={i}
                  style={{
                    display: "flex", gap: 10, alignItems: "flex-start",
                    padding: "10px 12px", borderRadius: 8,
                    background: sev.bg,
                    border: `1px solid ${sev.border}`,
                    cursor: r.issueId ? "pointer" : "default",
                    transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (r.issueId) {
                      e.currentTarget.style.transform = "translateX(2px)";
                      e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "none";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <Icon size={14} weight="fill" color={sev.color} style={{ marginTop: 1, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <span style={{
                        fontSize: 9, fontWeight: 500, fontFamily: F,
                        textTransform: "uppercase", letterSpacing: "0.05em",
                        color: sev.color,
                      }}>
                        {sev.label}
                      </span>
                      {r.issueId && (
                        <span style={{
                          fontSize: 10, fontWeight: 400, fontFamily: F,
                          color: sev.color, opacity: 0.7,
                        }}>
                          {r.issueId}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 300, fontFamily: F, color: "var(--col-text-primary)", lineHeight: 1.45 }}>
                      {r.text}
                    </div>
                  </div>
                  {r.issueId && (
                    <ArrowRight size={12} color={sev.color} style={{ marginTop: 2, flexShrink: 0, opacity: 0.5 }} />
                  )}
                </div>
              );
            })}
          </div>
        </Section>

      </div>
    </div>
  );
}

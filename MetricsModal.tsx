import { useState } from "react";
import { X } from "@phosphor-icons/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { WorkItemType, TeamMetrics } from "../../types/brp";

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

interface MetricsModalProps {
  open: boolean;
  onClose: () => void;
  teamName: string;
  teamMetrics: TeamMetrics;
}

const getWorkItemTypeConfig = (type: WorkItemType) => {
  const configs = {
    [WorkItemType.UserStory]: {
      color: "#1976D2",
      label: "User Story",
    },
    [WorkItemType.EnablerStory]: {
      color: "#7B1FA2",
      label: "Enabler",
    },
    [WorkItemType.TechDebt]: {
      color: "#E65100",
      label: "Tech Debt",
    },
    [WorkItemType.Task]: {
      color: "#616161",
      label: "Task",
    },
    [WorkItemType.Defect]: {
      color: "#C62828",
      label: "Defect",
    },
  };
  return configs[type];
};

export const MetricsModal = ({
  open,
  onClose,
  teamName,
  teamMetrics,
}: MetricsModalProps) => {
  const [activeTab, setActiveTab] = useState<"load" | "allocation">("load");

  if (!open) return null;

  // Prepare data for Load vs. Capacity chart
  const loadVsCapacityData = teamMetrics.iterations.map((iter, index) => ({
    name: `Sprint ${index + 1}`,
    Capacity: iter.capacity,
    Load: iter.load,
    status: iter.status,
  }));

  // Prepare data for Capacity Allocation pie chart
  const allocationData = Object.entries(teamMetrics.loadByType)
    .filter(([_, sp]) => sp > 0)
    .map(([type, sp]) => {
      const config = getWorkItemTypeConfig(type as WorkItemType);
      return {
        name: config.label,
        value: sp,
        color: config.color,
      };
    });

  const totalPlanned = teamMetrics.totalLoad;

  // Custom tooltip for bar chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const utilization =
        data.Capacity === 0
          ? 0
          : ((data.Load / data.Capacity) * 100).toFixed(0);
      return (
        <div
          style={{
            background: "var(--surface-primary, #ffffff)",
            border: "1px solid var(--border-default, #E0E0E0)",
            borderRadius: 6,
            padding: "8px 12px",
            fontSize: 12,
            fontFamily: F,
            boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{data.name}</div>
          <div style={{ color: "var(--text-secondary, #757575)" }}>
            Load: <strong>{data.Load} SP</strong>
          </div>
          <div style={{ color: "var(--text-secondary, #757575)" }}>
            Capacity: <strong>{data.Capacity} SP</strong>
          </div>
          <div style={{ color: "var(--text-secondary, #757575)" }}>
            Utilization: <strong>{utilization}%</strong>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.5)",
          zIndex: 999,
          animation: "fadeIn 0.2s ease-out",
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 720,
          maxHeight: "90vh",
          background: "var(--surface-primary, #ffffff)",
          borderRadius: 12,
          boxShadow: "0 8px 24px rgba(0,0,0,0.16)",
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          fontFamily: F,
          animation: "scaleIn 0.2s ease-out",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--border-default, #E0E0E0)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: "var(--text-primary, #212121)",
              margin: 0,
            }}
          >
            Team Metrics — {teamName}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 6,
              display: "flex",
              alignItems: "center",
              borderRadius: 4,
              color: "var(--text-secondary, #757575)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background =
                "var(--border-default, #E0E0E0)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid var(--border-default, #E0E0E0)",
            padding: "0 24px",
          }}
        >
          <button
            onClick={() => setActiveTab("load")}
            style={{
              padding: "12px 20px",
              border: "none",
              borderBottom:
                activeTab === "load"
                  ? "2px solid var(--accent-primary, #1976D2)"
                  : "2px solid transparent",
              background: "transparent",
              color:
                activeTab === "load"
                  ? "var(--text-primary, #212121)"
                  : "var(--text-secondary, #757575)",
              fontSize: 13,
              fontWeight: activeTab === "load" ? 600 : 400,
              cursor: "pointer",
              fontFamily: F,
              transition: "all 0.15s",
            }}
          >
            Load vs. Capacity
          </button>
          <button
            onClick={() => setActiveTab("allocation")}
            style={{
              padding: "12px 20px",
              border: "none",
              borderBottom:
                activeTab === "allocation"
                  ? "2px solid var(--accent-primary, #1976D2)"
                  : "2px solid transparent",
              background: "transparent",
              color:
                activeTab === "allocation"
                  ? "var(--text-primary, #212121)"
                  : "var(--text-secondary, #757575)",
              fontSize: 13,
              fontWeight: activeTab === "allocation" ? 600 : 400,
              cursor: "pointer",
              fontFamily: F,
              transition: "all 0.15s",
            }}
          >
            Capacity Allocation
          </button>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            padding: 24,
            overflowY: "auto",
          }}
        >
          {activeTab === "load" ? (
            /* Load vs. Capacity Chart */
            <div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={loadVsCapacityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 12, fill: "#757575" }}
                    axisLine={{ stroke: "#E0E0E0" }}
                  />
                  <YAxis
                    label={{
                      value: "Story Points",
                      angle: -90,
                      position: "insideLeft",
                      style: { fontSize: 12, fill: "#757575" },
                    }}
                    tick={{ fontSize: 12, fill: "#757575" }}
                    axisLine={{ stroke: "#E0E0E0" }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 12, fontFamily: F }}
                    iconType="square"
                  />
                  <Bar dataKey="Capacity" fill="#B0BEC5" />
                  <Bar dataKey="Load" fill="#1976D2" />
                </BarChart>
              </ResponsiveContainer>
              <div
                style={{
                  marginTop: 16,
                  padding: "12px 16px",
                  background: "var(--surface-secondary, #FAFAFA)",
                  borderRadius: 6,
                  fontSize: 12,
                  color: "var(--text-secondary, #757575)",
                }}
              >
                <strong>Total:</strong> {teamMetrics.totalLoad} SP planned /{" "}
                {teamMetrics.totalCapacity} SP capacity (
                {teamMetrics.overallUtilization.toFixed(1)}% utilization)
              </div>
            </div>
          ) : (
            /* Capacity Allocation Chart */
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 40,
                justifyContent: "center",
              }}
            >
              <ResponsiveContainer width={280} height={280}>
                <PieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        const data = payload[0];
                        const percentage = (
                          (data.value / totalPlanned) *
                          100
                        ).toFixed(1);
                        return (
                          <div
                            style={{
                              background: "var(--surface-primary, #ffffff)",
                              border: "1px solid var(--border-default, #E0E0E0)",
                              borderRadius: 6,
                              padding: "8px 12px",
                              fontSize: 12,
                              fontFamily: F,
                              boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                            }}
                          >
                            <div style={{ fontWeight: 600, marginBottom: 4 }}>
                              {data.name}
                            </div>
                            <div
                              style={{
                                color: "var(--text-secondary, #757575)",
                              }}
                            >
                              {data.value} SP ({percentage}%)
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Legend */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 600,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: "var(--text-primary, #212121)",
                    textAlign: "center",
                    marginBottom: 8,
                  }}
                >
                  {totalPlanned} SP
                </div>
                {allocationData.map((entry) => {
                  const percentage = ((entry.value / totalPlanned) * 100).toFixed(
                    1
                  );
                  return (
                    <div
                      key={entry.name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        fontSize: 13,
                      }}
                    >
                      <div
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 2,
                          background: entry.color,
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ flex: 1, color: "var(--text-primary, #212121)" }}>
                        {entry.name}
                      </div>
                      <div
                        style={{
                          fontWeight: 600,
                          fontFamily: "'JetBrains Mono', monospace",
                          color: "var(--text-primary, #212121)",
                          minWidth: 80,
                          textAlign: "right",
                        }}
                      >
                        {entry.value} SP
                      </div>
                      <div
                        style={{
                          color: "var(--text-secondary, #757575)",
                          fontSize: 12,
                          minWidth: 50,
                          textAlign: "right",
                        }}
                      >
                        {percentage}%
                      </div>
                    </div>
                  );
                })}
                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: "1px solid var(--border-default, #E0E0E0)",
                    fontSize: 11,
                    color: "var(--text-secondary, #757575)",
                    fontStyle: "italic",
                    lineHeight: "16px",
                  }}
                >
                  SAFe recommends ~80% new features, ~20% enablers/tech debt
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
      `}</style>
    </>
  );
};

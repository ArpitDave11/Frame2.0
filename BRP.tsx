import { useState } from "react";
import {
  DotsSixVertical,
  Check,
  Eye,
  Warning,
  ChartPie,
  GearSix,
  MagnifyingGlass,
  PencilSimple,
  Stack,
} from "@phosphor-icons/react";
import {
  WorkItem,
  WorkItemType,
  Iteration,
  Team,
  IterationStatus,
  ThresholdConfig,
  computeTeamMetrics,
} from "../../types/brp";
import { MetricsModal } from "./MetricsModal";

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

// ═══════════════════════════════════════════════════════
// Mock Data
// ═══════════════════════════════════════════════════════

const defaultConfig: ThresholdConfig = {
  warningThreshold: 80,
  capacityLimitThreshold: 100,
};

const mockIterations: Iteration[] = [
  {
    id: "iter-1",
    name: "Sprint 1",
    startDate: "2026-06-01",
    endDate: "2026-06-14",
    capacity: 40,
    isIP: false,
  },
  {
    id: "iter-2",
    name: "Sprint 2",
    startDate: "2026-06-15",
    endDate: "2026-06-28",
    capacity: 40,
    isIP: false,
  },
  {
    id: "iter-3",
    name: "Sprint 3",
    startDate: "2026-06-29",
    endDate: "2026-07-12",
    capacity: 40,
    isIP: false,
  },
  {
    id: "iter-4",
    name: "Sprint 4",
    startDate: "2026-07-13",
    endDate: "2026-07-26",
    capacity: 40,
    isIP: false,
  },
  {
    id: "iter-ip",
    name: "IP (5)",
    startDate: "2026-07-27",
    endDate: "2026-08-09",
    capacity: 0,
    isIP: true,
  },
];

const mockWorkItems: WorkItem[] = [
  // Sprint 1 (OK - 24/40 = 60%)
  {
    id: "US-101",
    title: "Implement user authentication",
    storyPoints: 8,
    workItemType: WorkItemType.UserStory,
    iterationId: "iter-1",
  },
  {
    id: "US-102",
    title: "Create dashboard layout",
    storyPoints: 5,
    workItemType: WorkItemType.UserStory,
    iterationId: "iter-1",
  },
  {
    id: "EN-201",
    title: "Setup CI/CD pipeline",
    storyPoints: 8,
    workItemType: WorkItemType.EnablerStory,
    iterationId: "iter-1",
  },
  {
    id: "TK-301",
    title: "Database migration script",
    storyPoints: 3,
    workItemType: WorkItemType.Task,
    iterationId: "iter-1",
  },

  // Sprint 2 (WARNING - 38/40 = 95%)
  {
    id: "US-103",
    title: "API integration layer",
    storyPoints: 13,
    workItemType: WorkItemType.UserStory,
    iterationId: "iter-2",
  },
  {
    id: "US-104",
    title: "User profile page",
    storyPoints: 8,
    workItemType: WorkItemType.UserStory,
    iterationId: "iter-2",
  },
  {
    id: "TD-401",
    title: "Refactor legacy auth module",
    storyPoints: 8,
    workItemType: WorkItemType.TechDebt,
    iterationId: "iter-2",
  },
  {
    id: "TK-302",
    title: "Update dependencies",
    storyPoints: 5,
    workItemType: WorkItemType.Task,
    iterationId: "iter-2",
  },
  {
    id: "DF-501",
    title: "Fix login redirect bug",
    storyPoints: 2,
    workItemType: WorkItemType.Defect,
    iterationId: "iter-2",
  },
  {
    id: "TK-303",
    title: "Performance monitoring setup",
    storyPoints: 2,
    workItemType: WorkItemType.Task,
    iterationId: "iter-2",
  },

  // Sprint 3 (OVER - 44/40 = 110%)
  {
    id: "US-105",
    title: "Real-time notifications",
    storyPoints: 13,
    workItemType: WorkItemType.UserStory,
    iterationId: "iter-3",
  },
  {
    id: "US-106",
    title: "Advanced search filters",
    storyPoints: 8,
    workItemType: WorkItemType.UserStory,
    iterationId: "iter-3",
  },
  {
    id: "EN-202",
    title: "Security hardening",
    storyPoints: 8,
    workItemType: WorkItemType.EnablerStory,
    iterationId: "iter-3",
  },
  {
    id: "TD-402",
    title: "Code quality improvements",
    storyPoints: 5,
    workItemType: WorkItemType.TechDebt,
    iterationId: "iter-3",
  },
  {
    id: "US-107",
    title: "Export functionality",
    storyPoints: 5,
    workItemType: WorkItemType.UserStory,
    iterationId: "iter-3",
  },
  {
    id: "TK-304",
    title: "Documentation update",
    storyPoints: 3,
    workItemType: WorkItemType.Task,
    iterationId: "iter-3",
  },
  {
    id: "DF-502",
    title: "Fix data validation",
    storyPoints: 2,
    workItemType: WorkItemType.Defect,
    iterationId: "iter-3",
  },

  // Sprint 4 (OK - 12/40 = 30%)
  {
    id: "US-108",
    title: "Mobile responsive design",
    storyPoints: 8,
    workItemType: WorkItemType.UserStory,
    iterationId: "iter-4",
  },
  {
    id: "TK-305",
    title: "Analytics integration",
    storyPoints: 2,
    workItemType: WorkItemType.Task,
    iterationId: "iter-4",
  },
  {
    id: "DF-503",
    title: "Fix table sorting",
    storyPoints: 2,
    workItemType: WorkItemType.Defect,
    iterationId: "iter-4",
  },

  // Backlog
  {
    id: "US-109",
    title: "Two-factor authentication",
    storyPoints: 13,
    workItemType: WorkItemType.UserStory,
    iterationId: null,
  },
  {
    id: "US-110",
    title: "Admin panel",
    storyPoints: 13,
    workItemType: WorkItemType.UserStory,
    iterationId: null,
  },
  {
    id: "EN-203",
    title: "API versioning strategy",
    storyPoints: 5,
    workItemType: WorkItemType.EnablerStory,
    iterationId: null,
  },
  {
    id: "TD-403",
    title: "Remove deprecated endpoints",
    storyPoints: 5,
    workItemType: WorkItemType.TechDebt,
    iterationId: null,
  },
  {
    id: "US-111",
    title: "Bulk operations",
    storyPoints: 8,
    workItemType: WorkItemType.UserStory,
    iterationId: null,
  },
];

// ═══════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════

const getWorkItemTypeConfig = (type: WorkItemType) => {
  const configs = {
    [WorkItemType.UserStory]: {
      color: "#1976D2",
      badge: "US",
      bgColor: "#1976D2",
    },
    [WorkItemType.EnablerStory]: {
      color: "#7B1FA2",
      badge: "EN",
      bgColor: "#7B1FA2",
    },
    [WorkItemType.TechDebt]: {
      color: "#E65100",
      badge: "TD",
      bgColor: "#E65100",
    },
    [WorkItemType.Task]: { color: "#616161", badge: "TK", bgColor: "#616161" },
    [WorkItemType.Defect]: {
      color: "#C62828",
      badge: "DF",
      bgColor: "#C62828",
    },
  };
  return configs[type];
};

const getStatusStyles = (status: IterationStatus) => {
  const styles = {
    [IterationStatus.OK]: {
      bg: "var(--state-ok-bg)",
      border: "var(--state-ok-border)",
      iconColor: "var(--state-ok-icon)",
      icon: Check,
      textColor: "var(--state-ok-icon)",
    },
    [IterationStatus.WARNING]: {
      bg: "var(--state-warn-bg)",
      border: "var(--state-warn-border)",
      iconColor: "var(--state-warn-icon)",
      icon: Eye,
      textColor: "var(--state-warn-icon)",
    },
    [IterationStatus.OVER]: {
      bg: "var(--state-over-bg)",
      border: "var(--state-over-border)",
      iconColor: "var(--state-over-icon)",
      icon: Warning,
      textColor: "var(--state-over-icon)",
    },
  };
  return styles[status];
};

// ═══════════════════════════════════════════════════════
// Components
// ═══════════════════════════════════════════════════════

interface WorkItemCardProps {
  item: WorkItem;
  onDragStart?: (item: WorkItem) => void;
}

const WorkItemCard = ({ item, onDragStart }: WorkItemCardProps) => {
  const config = getWorkItemTypeConfig(item.workItemType);

  return (
    <div
      draggable
      onDragStart={() => onDragStart?.(item)}
      style={{
        background: "var(--surface-primary, #ffffff)",
        borderLeft: `4px solid ${config.color}`,
        borderRight: "1px solid var(--border-default, #E0E0E0)",
        borderTop: "1px solid var(--border-default, #E0E0E0)",
        borderBottom: "1px solid var(--border-default, #E0E0E0)",
        borderRadius: 0,
        padding: "8px 10px",
        marginBottom: 8,
        cursor: "grab",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        transition: "all 0.15s",
        fontFamily: F,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.08)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <DotsSixVertical size={14} color="#9E9E9E" weight="bold" />
          <span
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: "#ffffff",
              background: config.bgColor,
              padding: "2px 6px",
              borderRadius: 3,
              letterSpacing: "0.5px",
            }}
          >
            {config.badge}
          </span>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-secondary, #757575)",
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {item.storyPoints} SP
        </span>
      </div>
      <div
        style={{
          fontSize: 11,
          color: "var(--text-secondary, #424242)",
          fontWeight: 400,
          lineHeight: "16px",
        }}
      >
        {item.id}
      </div>
      <div
        style={{
          fontSize: 12,
          color: "var(--text-primary, #212121)",
          fontWeight: 400,
          lineHeight: "16px",
          marginTop: 2,
        }}
      >
        {item.title}
      </div>
    </div>
  );
};

interface IterationColumnProps {
  iteration: Iteration;
  workItems: WorkItem[];
  config: ThresholdConfig;
  onCapacityChange: (iterationId: string, capacity: number) => void;
  onDrop?: (iterationId: string) => void;
  onDragStart?: (item: WorkItem) => void;
}

const IterationColumn = ({
  iteration,
  workItems,
  config,
  onCapacityChange,
  onDrop,
  onDragStart,
}: IterationColumnProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [capacityInput, setCapacityInput] = useState(
    iteration.capacity.toString()
  );
  const [isDragOver, setIsDragOver] = useState(false);

  const iterationWorkItems = workItems.filter(
    (item) => item.iterationId === iteration.id
  );
  const load = iterationWorkItems.reduce(
    (sum, item) => sum + item.storyPoints,
    0
  );
  const utilizationPercent =
    iteration.capacity === 0 ? 0 : (load / iteration.capacity) * 100;

  // Compute status
  let status: IterationStatus;
  if (iteration.capacity === 0) {
    status = load > 0 ? IterationStatus.OVER : IterationStatus.OK;
  } else {
    if (utilizationPercent < config.warningThreshold) {
      status = IterationStatus.OK;
    } else if (utilizationPercent < config.capacityLimitThreshold) {
      status = IterationStatus.WARNING;
    } else {
      status = IterationStatus.OVER;
    }
  }

  const statusStyles = iteration.isIP
    ? {
        bg: "#ECEFF1",
        border: "#B0BEC5",
        iconColor: "#607D8B",
        icon: null,
        textColor: "#607D8B",
      }
    : getStatusStyles(status);

  const StatusIcon = statusStyles.icon;

  const handleCapacitySubmit = () => {
    const newCapacity = parseInt(capacityInput, 10);
    if (!isNaN(newCapacity) && newCapacity >= 0) {
      onCapacityChange(iteration.id, newCapacity);
    } else {
      setCapacityInput(iteration.capacity.toString());
    }
    setIsEditing(false);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={() => {
        setIsDragOver(false);
        onDrop?.(iteration.id);
      }}
      style={{
        minWidth: 200,
        flex: 1,
        display: "flex",
        flexDirection: "column",
        background: statusStyles.bg,
        border: isDragOver
          ? "2px dashed var(--accent-primary, #1976D2)"
          : iteration.isIP
            ? `2px dashed ${statusStyles.border}`
            : `1px solid ${statusStyles.border}`,
        borderRadius: 8,
        overflow: "hidden",
        boxShadow: isDragOver
          ? "0 0 0 3px rgba(25, 118, 210, 0.3)"
          : "0 1px 3px rgba(0,0,0,0.08)",
        transition: "border 0.2s, box-shadow 0.2s",
        position: "relative",
      }}
    >
      {/* Header */}
      <div style={{ padding: "12px 14px", background: "var(--iteration-header-bg, rgba(255,255,255,0.7))" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 8,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--text-primary, #212121)",
                marginBottom: 2,
              }}
            >
              {iteration.name}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-secondary, #757575)", fontWeight: 400 }}>
              {new Date(iteration.startDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}{" "}
              –{" "}
              {new Date(iteration.endDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </div>
          </div>
          {StatusIcon && (
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                background: "var(--surface-primary, #ffffff)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
              }}
              title={`Load: ${load} / Capacity: ${iteration.capacity} (${utilizationPercent.toFixed(0)}%)`}
            >
              <StatusIcon size={16} color={statusStyles.iconColor} weight="bold" />
            </div>
          )}
        </div>

        {iteration.isIP && (
          <div
            style={{
              fontSize: 10,
              color: "#607D8B",
              background: "rgba(96, 125, 139, 0.1)",
              padding: "4px 8px",
              borderRadius: 4,
              marginBottom: 8,
              fontWeight: 400,
            }}
          >
            Buffer — typically no planned work
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: "var(--text-secondary, #757575)", fontWeight: 400 }}>
              Cap:
            </span>
            {isEditing ? (
              <input
                type="number"
                value={capacityInput}
                onChange={(e) => setCapacityInput(e.target.value)}
                onBlur={handleCapacitySubmit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCapacitySubmit();
                  if (e.key === "Escape") {
                    setIsEditing(false);
                    setCapacityInput(iteration.capacity.toString());
                  }
                }}
                autoFocus
                style={{
                  width: 50,
                  padding: "2px 6px",
                  fontSize: 13,
                  fontWeight: 500,
                  fontFamily: "'JetBrains Mono', monospace",
                  border: "2px solid var(--accent-primary, #1976D2)",
                  borderRadius: 3,
                  outline: "none",
                  background: "var(--surface-primary, #ffffff)",
                  color: "var(--text-primary, #212121)",
                }}
              />
            ) : (
              <div
                onClick={() => setIsEditing(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  cursor: "pointer",
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: iteration.capacity === 0 ? "var(--text-secondary, #9E9E9E)" : "var(--text-primary, #212121)",
                  }}
                >
                  {iteration.capacity}
                </span>
                <PencilSimple size={11} color="var(--text-secondary, #9E9E9E)" />
              </div>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: "var(--text-secondary, #757575)", fontWeight: 400 }}>
              Load:
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace",
                color: statusStyles.textColor,
              }}
            >
              {load}
            </span>
          </div>
        </div>

        {/* Mini capacity bar */}
        <div
          style={{
            marginTop: 10,
            height: 4,
            background: "var(--border-default, #E0E0E0)",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.min((load / Math.max(iteration.capacity, 1)) * 100, 150)}%`,
              background: statusStyles.textColor,
              transition: "width 0.3s, background 0.3s",
            }}
          />
        </div>
      </div>

      {/* Work Items */}
      <div
        style={{
          flex: 1,
          padding: "8px 10px",
          overflowY: "auto",
          minHeight: 200,
        }}
      >
        {iterationWorkItems.map((item) => (
          <WorkItemCard key={item.id} item={item} onDragStart={onDragStart} />
        ))}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════
// Main BRP Component
// ═══════════════════════════════════════════════════════

export const BRP = () => {
  const [team] = useState<Team>({
    id: "team-alpha",
    name: "Alpha Squad",
    iterations: mockIterations,
    workItems: mockWorkItems,
  });
  const [workItems, setWorkItems] = useState<WorkItem[]>(mockWorkItems);
  const [iterations, setIterations] = useState<Iteration[]>(mockIterations);
  const [draggedItem, setDraggedItem] = useState<WorkItem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [metricsModalOpen, setMetricsModalOpen] = useState(false);

  const teamMetrics = computeTeamMetrics(
    { ...team, workItems, iterations },
    defaultConfig
  );

  const backlogItems = workItems.filter((item) => item.iterationId === null);
  const filteredBacklogItems = backlogItems.filter(
    (item) =>
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDragStart = (item: WorkItem) => {
    setDraggedItem(item);
  };

  const handleDrop = (targetIterationId: string | null) => {
    if (!draggedItem) return;

    // Calculate new load for target iteration
    const targetIteration = iterations.find((i) => i.id === targetIterationId);
    const currentTargetLoad = workItems
      .filter((w) => w.iterationId === targetIterationId)
      .reduce((s, w) => s + w.storyPoints, 0);
    const newTargetLoad = currentTargetLoad + draggedItem.storyPoints;

    setWorkItems((items) =>
      items.map((item) =>
        item.id === draggedItem.id
          ? { ...item, iterationId: targetIterationId }
          : item
      )
    );

    // Check if we just crossed the capacity limit threshold
    if (
      targetIteration &&
      targetIteration.capacity > 0 &&
      (newTargetLoad / targetIteration.capacity) * 100 >=
        defaultConfig.capacityLimitThreshold
    ) {
      const utilizationPercent = (
        (newTargetLoad / targetIteration.capacity) *
        100
      ).toFixed(0);
      setToast(
        `${targetIteration.name} is now at ${utilizationPercent}% capacity`
      );
      setTimeout(() => setToast(null), 4000);
    }

    setDraggedItem(null);
  };

  const handleCapacityChange = (iterationId: string, newCapacity: number) => {
    setIterations((iters) =>
      iters.map((iter) =>
        iter.id === iterationId ? { ...iter, capacity: newCapacity } : iter
      )
    );
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--surface-secondary, #FAFAFA)",
        fontFamily: F,
        position: "relative",
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          height: 56,
          background: "#212121",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          borderBottom: "1px solid #424242",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={() => setMetricsModalOpen(true)}
            style={{
              background: "transparent",
              border: "none",
              color: "#ffffff",
              cursor: "pointer",
              padding: 6,
              display: "flex",
              alignItems: "center",
              borderRadius: 4,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <ChartPie size={20} weight="fill" />
          </button>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>
              Team: {team.name}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              fontSize: 12,
              color: "#B0BEC5",
              background: "rgba(255,255,255,0.1)",
              padding: "4px 12px",
              borderRadius: 4,
              fontWeight: 500,
            }}
          >
            PI: 2026.2
          </div>
          <button
            style={{
              background: "transparent",
              border: "none",
              color: "#ffffff",
              cursor: "pointer",
              padding: 6,
              display: "flex",
              alignItems: "center",
              borderRadius: 4,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <GearSix size={20} />
          </button>
        </div>
      </div>

      {/* Main Board */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Backlog Sidebar */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
          }}
          onDrop={() => handleDrop(null)}
          style={{
            width: 220,
            background: "var(--surface-sidebar, #F0F4F8)",
            borderRight: "1px solid var(--border-default, #E0E0E0)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px 14px",
              borderBottom: "1px solid var(--border-default, #E0E0E0)",
              background: "var(--surface-primary, #ffffff)",
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "var(--text-primary, #212121)",
                marginBottom: 10,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Stack size={16} weight="fill" />
              Backlog ({backlogItems.length})
            </div>
            <div style={{ position: "relative" }}>
              <MagnifyingGlass
                size={14}
                color="#9E9E9E"
                style={{
                  position: "absolute",
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: "100%",
                  padding: "6px 10px 6px 30px",
                  fontSize: 12,
                  border: "1px solid var(--border-default, #E0E0E0)",
                  borderRadius: 4,
                  outline: "none",
                  fontFamily: F,
                  background: "var(--surface-primary, #ffffff)",
                  color: "var(--text-primary, #212121)",
                }}
              />
            </div>
          </div>
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "10px",
            }}
          >
            {filteredBacklogItems.map((item) => (
              <WorkItemCard key={item.id} item={item} onDragStart={handleDragStart} />
            ))}
          </div>
          <div
            style={{
              padding: "10px 14px",
              borderTop: "1px solid var(--border-default, #E0E0E0)",
              background: "var(--surface-primary, #ffffff)",
              fontSize: 11,
              color: "var(--text-secondary, #757575)",
              fontWeight: 400,
            }}
          >
            {backlogItems.length} items ·{" "}
            {backlogItems.reduce((sum, item) => sum + item.storyPoints, 0)} SP
          </div>
        </div>

        {/* Iterations Grid */}
        <div
          style={{
            flex: 1,
            display: "flex",
            gap: 16,
            padding: 24,
            overflowX: "auto",
          }}
        >
          {iterations.map((iteration) => (
            <IterationColumn
              key={iteration.id}
              iteration={iteration}
              workItems={workItems}
              config={defaultConfig}
              onCapacityChange={handleCapacityChange}
              onDrop={handleDrop}
              onDragStart={handleDragStart}
            />
          ))}
        </div>

        {/* Summary Panel */}
        <div
          style={{
            width: 160,
            background: "var(--surface-primary, #ffffff)",
            borderLeft: "1px solid var(--border-default, #E0E0E0)",
            padding: "24px 16px",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-primary, #212121)",
              marginBottom: 16,
            }}
          >
            PI Summary
          </div>
          <div
            style={{
              height: 1,
              background: "var(--border-default, #E0E0E0)",
              marginBottom: 16,
            }}
          />
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "var(--text-secondary, #757575)", marginBottom: 4 }}>
              Total Load:
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace",
                color: "var(--text-primary, #212121)",
              }}
            >
              {teamMetrics.totalLoad}
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "var(--text-secondary, #757575)", marginBottom: 4 }}>
              Total Capacity:
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace",
                color: "var(--text-primary, #212121)",
              }}
            >
              {teamMetrics.totalCapacity}
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: "var(--text-secondary, #757575)", marginBottom: 6 }}>
              Utilization:
            </div>
            <div
              style={{
                height: 4,
                background: "var(--border-default, #E0E0E0)",
                borderRadius: 2,
                overflow: "hidden",
                marginBottom: 4,
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(teamMetrics.overallUtilization, 100)}%`,
                  background:
                    teamMetrics.overallUtilization >= 100
                      ? "var(--state-over-icon)"
                      : teamMetrics.overallUtilization >= 80
                        ? "var(--state-warn-icon)"
                        : "var(--state-ok-icon)",
                  transition: "width 0.3s, background 0.3s",
                }}
              />
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace",
                color: "var(--text-primary, #212121)",
              }}
            >
              {teamMetrics.overallUtilization.toFixed(1)}%
            </div>
          </div>
          <div
            style={{
              height: 1,
              background: "var(--border-default, #E0E0E0)",
              marginBottom: 12,
            }}
          />
          <div style={{ fontSize: 11, color: "var(--text-secondary, #757575)", marginBottom: 8 }}>
            By Type:
          </div>
          {Object.entries(teamMetrics.loadByType).map(([type, sp]) => {
            const config = getWorkItemTypeConfig(type as WorkItemType);
            return (
              <div
                key={type}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 6,
                  fontSize: 11,
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 2,
                    background: config.color,
                  }}
                />
                <span style={{ color: "var(--text-secondary, #757575)" }}>{config.badge}:</span>
                <span
                  style={{
                    fontWeight: 600,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: "var(--text-primary, #212121)",
                    marginLeft: "auto",
                  }}
                >
                  {sp} SP
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "var(--state-over-bg, #FFCDD2)",
            border: "1px solid var(--state-over-border, #EF9A9A)",
            borderLeft: "4px solid var(--state-over-icon, #C62828)",
            borderRadius: 8,
            padding: "12px 16px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.16)",
            maxWidth: 320,
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            animation: "slideInUp 0.3s ease-out",
            fontFamily: F,
          }}
        >
          <Warning size={20} color="#C62828" weight="fill" />
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#C62828",
                marginBottom: 4,
              }}
            >
              Capacity Warning
            </div>
            <div style={{ fontSize: 12, color: "#424242", lineHeight: "16px" }}>
              {toast}
            </div>
          </div>
          <button
            onClick={() => setToast(null)}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0,
              color: "#757575",
              display: "flex",
              alignItems: "center",
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Metrics Modal */}
      <MetricsModal
        open={metricsModalOpen}
        onClose={() => setMetricsModalOpen(false)}
        teamName={team.name}
        teamMetrics={teamMetrics}
      />

      <style>{`
        @keyframes slideInUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        /* CSS Custom Properties for Dark Mode Support */
        :root {
          --surface-primary: #ffffff;
          --surface-secondary: #FAFAFA;
          --surface-sidebar: #F0F4F8;
          --border-default: #E0E0E0;
          --text-primary: #212121;
          --text-secondary: #757575;
          --text-inverse: #ffffff;
          --accent-primary: #1976D2;
          --accent-hover: #1565C0;

          --iteration-header-bg: rgba(255, 255, 255, 0.7);

          --state-ok-bg: #E3F2FD;
          --state-ok-icon: #1565C0;
          --state-ok-border: #90CAF9;
          --state-warn-bg: #FFF9C4;
          --state-warn-icon: #F9A825;
          --state-warn-border: #FFF176;
          --state-over-bg: #FFCDD2;
          --state-over-icon: #C62828;
          --state-over-border: #EF9A9A;
          --state-empty-bg: #F5F5F5;

          --ip-iteration-border: #B0BEC5;
          --ip-iteration-bg: #ECEFF1;
        }

        /* Dark mode overrides */
        @media (prefers-color-scheme: dark) {
          :root {
            --surface-primary: #2a2a2a;
            --surface-secondary: #1a1a1a;
            --surface-sidebar: #252525;
            --border-default: #404040;
            --text-primary: #e0e0e0;
            --text-secondary: #a0a0a0;
            --text-inverse: #121212;

            --iteration-header-bg: rgba(42, 42, 42, 0.5);

            --state-ok-bg: rgba(21, 101, 192, 0.12);
            --state-ok-icon: #64B5F6;
            --state-ok-border: rgba(100, 181, 246, 0.3);
            --state-warn-bg: rgba(249, 168, 37, 0.12);
            --state-warn-icon: #FFB74D;
            --state-warn-border: rgba(255, 183, 77, 0.3);
            --state-over-bg: rgba(198, 40, 40, 0.12);
            --state-over-icon: #E57373;
            --state-over-border: rgba(229, 115, 115, 0.3);
            --state-empty-bg: #2a2a2a;

            --ip-iteration-bg: rgba(176, 190, 197, 0.08);
            --ip-iteration-border: rgba(176, 190, 197, 0.25);
          }
        }
      `}</style>
    </div>
  );
};

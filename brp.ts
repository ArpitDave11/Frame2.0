/**
 * BRP (Big Room Planning) — Load vs. Capacity Data Model
 * PI Planning component types for FRAME Platform
 */

// ═══════════════════════════════════════════════════════
// Core Domain Types
// ═══════════════════════════════════════════════════════

export enum WorkItemType {
  UserStory = "UserStory",
  EnablerStory = "EnablerStory",
  TechDebt = "TechDebt",
  Task = "Task",
  Defect = "Defect",
}

export enum IterationStatus {
  OK = "OK",
  WARNING = "WARNING",
  OVER = "OVER",
}

export interface WorkItem {
  id: string;
  title: string;
  storyPoints: number; // default 0
  workItemType: WorkItemType;
  iterationId: string | null; // null = in backlog
}

export interface Iteration {
  id: string;
  name: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  capacity: number; // editable, default 0
  isIP: boolean; // Innovation & Planning iteration flag
}

export interface Team {
  id: string;
  name: string;
  iterations: Iteration[];
  workItems: WorkItem[];
}

export interface ProgramIncrement {
  id: string;
  name: string; // e.g., "2026.2"
  startDate: string;
  endDate: string;
}

export interface ART {
  id: string;
  name: string; // e.g., "Payments Train"
  teams: Team[];
  programIncrement: ProgramIncrement;
}

// ═══════════════════════════════════════════════════════
// Configuration Types
// ═══════════════════════════════════════════════════════

export interface ThresholdConfig {
  warningThreshold: number; // percentage, default 80
  capacityLimitThreshold: number; // percentage, default 100
}

export enum CapacityUnit {
  StoryPoints = "Story Points",
  Hours = "Hours",
  PeopleDays = "People-Days",
}

export interface RTEConfig {
  thresholds: ThresholdConfig;
  capacityUnit: CapacityUnit;
}

// ═══════════════════════════════════════════════════════
// Computed Types
// ═══════════════════════════════════════════════════════

export interface IterationMetrics {
  iterationId: string;
  capacity: number;
  load: number; // computed: sum of story points
  status: IterationStatus;
  utilizationPercent: number;
}

export interface TeamMetrics {
  teamId: string;
  iterations: IterationMetrics[];
  totalCapacity: number;
  totalLoad: number;
  overallUtilization: number;
  loadByType: Record<WorkItemType, number>;
}

export interface ARTMetrics {
  artId: string;
  teams: TeamMetrics[];
  totalCapacity: number;
  totalLoad: number;
  overallUtilization: number;
}

// ═══════════════════════════════════════════════════════
// ART Grid View Types (Heat Map)
// ═══════════════════════════════════════════════════════

export interface ARTGridCell {
  teamId: string;
  teamName: string;
  iterationId: string;
  iterationName: string;
  load: number;
  capacity: number;
  status: IterationStatus;
  utilizationPercent: number;
}

export interface ARTGridRow {
  teamId: string;
  teamName: string;
  cells: ARTGridCell[];
  totalLoad: number;
  totalCapacity: number;
  overallUtilization: number;
}

export interface ARTGrid {
  rows: ARTGridRow[];
  iterationHeaders: string[]; // column headers
  totalsRow: {
    cells: ARTGridCell[];
    totalLoad: number;
    totalCapacity: number;
    overallUtilization: number;
  };
}

// ═══════════════════════════════════════════════════════
// Status Computation Functions
// ═══════════════════════════════════════════════════════

/**
 * Compute iteration status based on load, capacity, and thresholds
 *
 * Logic:
 * - if capacity is 0 and load > 0 → OVER
 * - if capacity is 0 and load is 0 → OK
 * - if (load / capacity) * 100 < warningThreshold → OK
 * - if (load / capacity) * 100 >= warningThreshold but < capacityLimitThreshold → WARNING
 * - if (load / capacity) * 100 >= capacityLimitThreshold → OVER
 */
export function computeIterationStatus(
  load: number,
  capacity: number,
  config: ThresholdConfig
): IterationStatus {
  // Edge case: capacity is 0
  if (capacity === 0) {
    return load > 0 ? IterationStatus.OVER : IterationStatus.OK;
  }

  const utilizationPercent = (load / capacity) * 100;

  if (utilizationPercent < config.warningThreshold) {
    return IterationStatus.OK;
  } else if (utilizationPercent < config.capacityLimitThreshold) {
    return IterationStatus.WARNING;
  } else {
    return IterationStatus.OVER;
  }
}

/**
 * Compute iteration load (sum of story points of all work items in iteration)
 */
export function computeIterationLoad(
  iterationId: string,
  workItems: WorkItem[]
): number {
  return workItems
    .filter((item) => item.iterationId === iterationId)
    .reduce((sum, item) => sum + item.storyPoints, 0);
}

/**
 * Compute iteration metrics
 */
export function computeIterationMetrics(
  iteration: Iteration,
  workItems: WorkItem[],
  config: ThresholdConfig
): IterationMetrics {
  const load = computeIterationLoad(iteration.id, workItems);
  const status = computeIterationStatus(load, iteration.capacity, config);
  const utilizationPercent =
    iteration.capacity === 0 ? 0 : (load / iteration.capacity) * 100;

  return {
    iterationId: iteration.id,
    capacity: iteration.capacity,
    load,
    status,
    utilizationPercent,
  };
}

/**
 * Compute team metrics
 */
export function computeTeamMetrics(
  team: Team,
  config: ThresholdConfig
): TeamMetrics {
  const iterations = team.iterations.map((iteration) =>
    computeIterationMetrics(iteration, team.workItems, config)
  );

  const totalCapacity = iterations.reduce(
    (sum, iter) => sum + iter.capacity,
    0
  );
  const totalLoad = iterations.reduce((sum, iter) => sum + iter.load, 0);
  const overallUtilization =
    totalCapacity === 0 ? 0 : (totalLoad / totalCapacity) * 100;

  // Compute load by work item type
  const loadByType: Record<WorkItemType, number> = {
    [WorkItemType.UserStory]: 0,
    [WorkItemType.EnablerStory]: 0,
    [WorkItemType.TechDebt]: 0,
    [WorkItemType.Task]: 0,
    [WorkItemType.Defect]: 0,
  };

  team.workItems.forEach((item) => {
    if (item.iterationId !== null) {
      loadByType[item.workItemType] += item.storyPoints;
    }
  });

  return {
    teamId: team.id,
    iterations,
    totalCapacity,
    totalLoad,
    overallUtilization,
    loadByType,
  };
}

/**
 * Compute ART-level metrics
 */
export function computeARTMetrics(
  art: ART,
  config: ThresholdConfig
): ARTMetrics {
  const teams = art.teams.map((team) => computeTeamMetrics(team, config));

  const totalCapacity = teams.reduce(
    (sum, team) => sum + team.totalCapacity,
    0
  );
  const totalLoad = teams.reduce((sum, team) => sum + team.totalLoad, 0);
  const overallUtilization =
    totalCapacity === 0 ? 0 : (totalLoad / totalCapacity) * 100;

  return {
    artId: art.id,
    teams,
    totalCapacity,
    totalLoad,
    overallUtilization,
  };
}

/**
 * Build ART grid for heat map view
 */
export function buildARTGrid(art: ART, config: ThresholdConfig): ARTGrid {
  const artMetrics = computeARTMetrics(art, config);

  // Get iteration headers (assume all teams have same iterations)
  const iterationHeaders =
    art.teams[0]?.iterations.map((iter) => iter.name) || [];

  // Build rows for each team
  const rows: ARTGridRow[] = artMetrics.teams.map((teamMetrics, teamIndex) => {
    const team = art.teams[teamIndex];
    const cells: ARTGridCell[] = teamMetrics.iterations.map(
      (iterMetrics, iterIndex) => {
        const iteration = team.iterations[iterIndex];
        return {
          teamId: team.id,
          teamName: team.name,
          iterationId: iteration.id,
          iterationName: iteration.name,
          load: iterMetrics.load,
          capacity: iterMetrics.capacity,
          status: iterMetrics.status,
          utilizationPercent: iterMetrics.utilizationPercent,
        };
      }
    );

    return {
      teamId: team.id,
      teamName: team.name,
      cells,
      totalLoad: teamMetrics.totalLoad,
      totalCapacity: teamMetrics.totalCapacity,
      overallUtilization: teamMetrics.overallUtilization,
    };
  });

  // Build totals row (aggregating across all teams for each iteration)
  const totalsRowCells: ARTGridCell[] = iterationHeaders.map(
    (iterName, iterIndex) => {
      let totalLoad = 0;
      let totalCapacity = 0;

      rows.forEach((row) => {
        const cell = row.cells[iterIndex];
        totalLoad += cell.load;
        totalCapacity += cell.capacity;
      });

      const status = computeIterationStatus(totalLoad, totalCapacity, config);
      const utilizationPercent =
        totalCapacity === 0 ? 0 : (totalLoad / totalCapacity) * 100;

      return {
        teamId: "art-total",
        teamName: "ART Totals",
        iterationId: `total-${iterIndex}`,
        iterationName: iterName,
        load: totalLoad,
        capacity: totalCapacity,
        status,
        utilizationPercent,
      };
    }
  );

  return {
    rows,
    iterationHeaders,
    totalsRow: {
      cells: totalsRowCells,
      totalLoad: artMetrics.totalLoad,
      totalCapacity: artMetrics.totalCapacity,
      overallUtilization: artMetrics.overallUtilization,
    },
  };
}

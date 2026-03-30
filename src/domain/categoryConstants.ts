/**
 * Epic Category Constants — Template definitions for the Welcome Screen.
 *
 * Shared by WelcomeScreen (template cards) and WorkspaceHeader (category selector).
 * Each category defines the sections that will scaffold a new epic.
 */

export interface EpicCategory {
  id: string;
  label: string;
  icon: string;
  secs: string[];
}

export const EPIC_CATEGORIES: EpicCategory[] = [
  {
    id: 'general',
    label: 'General',
    icon: '✦',
    secs: [],
  },
  {
    id: 'business_requirement',
    label: 'Business Requirement',
    icon: 'B',
    secs: [
      'Executive Summary',
      'Business Context',
      'Objectives',
      'Scope',
      'User Stories',
      'Acceptance Criteria',
      'Dependencies & Risks',
      'Timeline',
      'Approvals',
    ],
  },
  {
    id: 'technical_design',
    label: 'Technical Design',
    icon: 'T',
    secs: [
      'Objective',
      'Context & Motivation',
      'Goals & Non-Goals',
      'Architecture Overview',
      'Component Design',
      'Data Model',
      'API Contracts',
      'Security',
      'Testing Strategy',
      'Rollout Plan',
    ],
  },
  {
    id: 'feature_specification',
    label: 'Feature Spec',
    icon: 'F',
    secs: [
      'Objective',
      'Problem Statement',
      'User Stories',
      'Acceptance Criteria',
      'UX Requirements',
      'Technical Requirements',
      'Dependencies',
      'Success Metrics',
    ],
  },
  {
    id: 'api_specification',
    label: 'API Specification',
    icon: 'A',
    secs: [
      'Objective',
      'Authentication',
      'Resource Definitions',
      'Endpoints',
      'Error Handling',
      'Rate Limits',
      'Schema',
      'Versioning',
    ],
  },
  {
    id: 'infrastructure_design',
    label: 'Infrastructure',
    icon: 'I',
    secs: [
      'Objective',
      'Business Context',
      'SLA/SLO',
      'Architecture',
      'Compute',
      'Networking',
      'Monitoring',
      'DR',
      'Security',
      'Cost',
    ],
  },
  {
    id: 'migration_plan',
    label: 'Migration Plan',
    icon: 'M',
    secs: [
      'Objective',
      'Current State',
      'Target State',
      'Gap Analysis',
      'Strategy',
      'Phases',
      'Rollback',
      'Testing',
      'Data Migration',
      'Cutover',
      'Timeline',
    ],
  },
  {
    id: 'integration_spec',
    label: 'Integration Spec',
    icon: '\u222B',
    secs: [
      'Objective',
      'Overview',
      'Systems & Endpoints',
      'Data Mapping',
      'Auth',
      'Error Handling',
      'Testing',
      'Monitoring',
      'SLA',
    ],
  },
  {
    id: 'architecture_decision_record',
    label: 'Decision Record',
    icon: '⚖',
    secs: [
      'Context',
      'Decision Drivers',
      'Goals & Non-Goals',
      'Considered Options',
      'Decision Outcome',
      'Consequences',
    ],
  },
  {
    id: 'lightweight_rfc',
    label: 'Lightweight RFC',
    icon: '📄',
    secs: [
      'Problem Statement',
      'Goals & Non-Goals',
      'Proposed Solution',
      'Impact & Scope',
    ],
  },
];

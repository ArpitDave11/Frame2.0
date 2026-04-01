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
      'Epic Status',
      'Executive Summary',
      'Goals & Non-Goals',
      'Business Context & Problem Statement',
      'Scope & Non-Scope',
      'Stakeholders & RACI',
      'Requirements',
      'Process Flow',
      'Success Metrics',
      'User Stories',
    ],
  },
  {
    id: 'technical_design',
    label: 'Technical Design',
    icon: 'T',
    secs: [
      'Epic Status',
      'Objective',
      'Context & Motivation',
      'Goals & Non-Goals',
      'Architecture Overview',
      'Technical Requirements',
      'Proposed Design',
      'Alternatives Considered',
      'Cross-Cutting Concerns',
      'Implementation Plan',
      'User Stories',
    ],
  },
  {
    id: 'feature_specification',
    label: 'Feature Spec',
    icon: 'F',
    secs: [
      'Epic Status',
      'Problem Statement',
      'Goals & Non-Goals',
      'User Personas',
      'Functional Requirements',
      'Scope & Non-Scope',
      'User Flows',
      'Edge Cases & Error Handling',
      'Non-Functional Requirements',
      'Analytics & Success Metrics',
      'User Stories',
    ],
  },
  {
    id: 'api_specification',
    label: 'API Specification',
    icon: 'A',
    secs: [
      'Epic Status',
      'Objective',
      'Overview & Authentication',
      'Goals & Non-Goals',
      'Endpoints',
      'Data Models',
      'Error Handling',
      'Pagination & Rate Limiting',
      'User Stories',
    ],
  },
  {
    id: 'infrastructure_design',
    label: 'Infrastructure',
    icon: 'I',
    secs: [
      'Epic Status',
      'Objective',
      'Goals & Non-Goals',
      'SLA/SLO Requirements',
      'Architecture Diagram',
      'Compute & Storage',
      'Networking & Security',
      'CI/CD Pipeline',
      'Monitoring & Alerting',
      'Disaster Recovery',
      'Cost Analysis',
      'User Stories',
    ],
  },
  {
    id: 'migration_plan',
    label: 'Migration Plan',
    icon: 'M',
    secs: [
      'Epic Status',
      'Objective',
      'Goals & Non-Goals',
      'Current State',
      'Target State',
      'Migration Strategy',
      'Scope & Non-Scope',
      'Data Mapping',
      'RACI Matrix',
      'Risk Assessment',
      'Cutover Plan',
      'Rollback Plan',
      'Validation Criteria',
      'User Stories',
    ],
  },
  {
    id: 'integration_spec',
    label: 'Integration Spec',
    icon: '\u222B',
    secs: [
      'Epic Status',
      'Objective',
      'Goals & Non-Goals',
      'Integration Overview',
      'Systems & Endpoints',
      'Data Contract & Mappings',
      'Integration Flows',
      'Error Handling & Recovery',
      'Monitoring & Alerting',
      'Performance & SLAs',
      'User Stories',
    ],
  },
  {
    id: 'architecture_decision_record',
    label: 'Decision Record',
    icon: '⚖',
    secs: [
      'Epic Status',
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
      'Epic Status',
      'Problem Statement',
      'Goals & Non-Goals',
      'Proposed Solution',
      'Impact & Scope',
    ],
  },
];

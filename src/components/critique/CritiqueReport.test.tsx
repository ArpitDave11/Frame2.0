/**
 * Tests for CritiqueReport — Quality Report modal content.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CritiqueReport } from './CritiqueReport';
import { usePipelineStore } from '@/stores/pipelineStore';
import { useEpicStore } from '@/stores/epicStore';
import { useUiStore } from '@/stores/uiStore';
import type { ValidationOutput } from '@/pipeline/pipelineTypes';

// ─── Fixtures ────────────────────────────────────────────────

const MOCK_VALIDATION: ValidationOutput = {
  traceabilityMatrix: [
    { requirementId: 'REQ-1', coveredBy: ['SEC-1', 'SEC-2'], coverage: 'full' },
    { requirementId: 'REQ-2', coveredBy: ['SEC-3'], coverage: 'partial' },
    { requirementId: 'REQ-3', coveredBy: [], coverage: 'missing' },
  ],
  auditChecks: [
    { checkName: 'Acceptance Criteria', passed: true, score: 85, details: 'All stories have AC' },
    { checkName: 'Architecture Diagram', passed: true, score: 90, details: 'Mermaid diagram present' },
    { checkName: 'Risk Analysis', passed: false, score: 30, details: 'No risk section found' },
    { checkName: 'Dependencies', passed: true, score: 75, details: 'Dependencies listed' },
  ],
  overallScore: 78,
  passed: true,
  detectedFailures: [
    { pattern: 'Missing error handling', severity: 'critical', recommendation: 'Add error handling section' },
    { pattern: 'Vague requirements', severity: 'major', recommendation: 'Add specificity to REQ-2' },
    { pattern: 'Minor formatting', severity: 'minor', recommendation: 'Standardize heading levels' },
  ],
  feedback: [
    'Consider adding a rollback strategy',
    'User stories could include edge cases',
  ],
};

beforeEach(() => {
  usePipelineStore.setState(usePipelineStore.getInitialState());
  useUiStore.setState(useUiStore.getInitialState());
  useEpicStore.setState(useEpicStore.getInitialState());
});

// ─── Tests ───────────────────────────────────────────────────

describe('CritiqueReport', () => {
  it('shows empty state when no validation data', () => {
    render(<CritiqueReport />);
    expect(screen.getByTestId('critique-empty')).toBeDefined();
    expect(screen.getByText('No quality report available. Run Refine to generate one.')).toBeDefined();
  });

  it('renders ring gauge with correct score', () => {
    usePipelineStore.setState({ lastValidation: MOCK_VALIDATION });
    render(<CritiqueReport />);
    expect(screen.getByTestId('score-ring')).toBeDefined();
    expect(screen.getByTestId('score-value').textContent).toBe('78');
  });

  it('renders audit checks in grid', () => {
    usePipelineStore.setState({ lastValidation: MOCK_VALIDATION });
    render(<CritiqueReport />);
    expect(screen.getByTestId('audit-checks-grid')).toBeDefined();
    const items = screen.getAllByTestId('audit-check-item');
    expect(items).toHaveLength(4);
    // Check pass/fail badges
    expect(screen.getAllByTestId('badge-pass')).toHaveLength(3);
    expect(screen.getAllByTestId('badge-fail')).toHaveLength(1);
  });

  it('renders detected failures with severity colors', () => {
    usePipelineStore.setState({ lastValidation: MOCK_VALIDATION });
    render(<CritiqueReport />);
    const cards = screen.getAllByTestId('failure-card');
    expect(cards).toHaveLength(3);
    expect(screen.getByTestId('severity-critical')).toBeDefined();
    expect(screen.getByTestId('severity-major')).toBeDefined();
    expect(screen.getByTestId('severity-minor')).toBeDefined();
  });

  it('displays traceability summary with coverage counts', () => {
    usePipelineStore.setState({ lastValidation: MOCK_VALIDATION });
    render(<CritiqueReport />);
    expect(screen.getByTestId('traceability-summary')).toBeDefined();
    expect(screen.getByText('1/3 requirements covered')).toBeDefined();
    expect(screen.getByTestId('coverage-full')).toBeDefined();
    expect(screen.getByTestId('coverage-partial')).toBeDefined();
    expect(screen.getByTestId('coverage-missing')).toBeDefined();
    expect(screen.getByText('Full: 1')).toBeDefined();
    expect(screen.getByText('Partial: 1')).toBeDefined();
    expect(screen.getByText('Missing: 1')).toBeDefined();
  });

  it('renders feedback suggestions', () => {
    usePipelineStore.setState({ lastValidation: MOCK_VALIDATION });
    render(<CritiqueReport />);
    const items = screen.getAllByTestId('feedback-item');
    expect(items).toHaveLength(2);
    expect(screen.getByText('Consider adding a rollback strategy')).toBeDefined();
    expect(screen.getByText('User stories could include edge cases')).toBeDefined();
  });

  it('hides sections when data is empty', () => {
    const emptyValidation: ValidationOutput = {
      traceabilityMatrix: [],
      auditChecks: [],
      overallScore: 50,
      passed: false,
      detectedFailures: [],
      feedback: [],
    };
    usePipelineStore.setState({ lastValidation: emptyValidation });
    render(<CritiqueReport />);
    // Report renders but without the optional sections
    expect(screen.getByTestId('critique-report')).toBeDefined();
    expect(screen.getByTestId('score-value').textContent).toBe('50');
    expect(screen.queryByTestId('audit-checks-grid')).toBeNull();
    expect(screen.queryByTestId('failure-card')).toBeNull();
    expect(screen.queryByTestId('traceability-summary')).toBeNull();
    expect(screen.queryByTestId('feedback-item')).toBeNull();
  });
});

// ─── WorkspaceHeader score badge click ───────────────────────

describe('WorkspaceHeader score badge', () => {
  it('clicking score badge opens critique modal', async () => {
    // Dynamically import to avoid pulling in all deps at top level
    const { WorkspaceHeader } = await import('@/components/editor/WorkspaceHeader');
    useEpicStore.setState({
      document: {
        title: 'Test',
        sections: [],
        metadata: { createdAt: 0, lastRefined: null, complexity: 'moderate', qualityScore: 8.2 },
      },
    });
    render(<WorkspaceHeader />);
    const badge = screen.getByTestId('score-badge');
    fireEvent.click(badge);
    expect(useUiStore.getState().activeModal).toBe('critique');
  });
});

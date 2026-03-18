import { describe, it, expect, beforeEach } from 'vitest';
import { usePipelineStore } from './pipelineStore';
import type { PipelineResult } from './pipelineStore';

beforeEach(() => {
  usePipelineStore.setState(usePipelineStore.getInitialState());
});

// ─── Fixtures ───────────────────────────────────────────────

const MOCK_RESULT: PipelineResult = {
  refinedMarkdown: '# Refined',
  category: 'technical_design',
  categoryConfidence: 0.92,
  sectionCount: 10,
  storyCount: 12,
  wordCount: 2400,
  validationScore: 82,
  stages: {
    1: { status: 'complete', message: 'Done', durationMs: 1500 },
    2: { status: 'complete', message: 'Done', durationMs: 1500 },
    3: { status: 'complete', message: 'Done', durationMs: 1500 },
    4: { status: 'complete', message: 'Done', durationMs: 1500 },
    5: { status: 'complete', message: 'Done', durationMs: 1500 },
    6: { status: 'complete', message: 'Done', durationMs: 1500 },
  },
};

// ─── Initial State ──────────────────────────────────────────

describe('initial state', () => {
  it('isRunning is false', () => {
    expect(usePipelineStore.getState().isRunning).toBe(false);
  });

  it('all 6 stages are pending', () => {
    const { stages } = usePipelineStore.getState();
    for (let i = 1; i <= 6; i++) {
      const stage = stages[i as 1 | 2 | 3 | 4 | 5 | 6];
      expect(stage.status).toBe('pending');
      expect(stage.message).toBe('');
    }
  });

  it('result is null', () => {
    expect(usePipelineStore.getState().result).toBeNull();
  });

  it('error is null', () => {
    expect(usePipelineStore.getState().error).toBeNull();
  });

  it('showPanel is false', () => {
    expect(usePipelineStore.getState().showPanel).toBe(false);
  });
});

// ─── startPipeline ──────────────────────────────────────────

describe('startPipeline', () => {
  it('sets isRunning to true and showPanel to true', () => {
    usePipelineStore.getState().startPipeline();
    const state = usePipelineStore.getState();
    expect(state.isRunning).toBe(true);
    expect(state.showPanel).toBe(true);
  });

  it('resets all stages to pending', () => {
    usePipelineStore.getState().updateStage(1, 'complete', 'Done');
    usePipelineStore.setState({ isRunning: false });
    usePipelineStore.getState().startPipeline();

    const { stages } = usePipelineStore.getState();
    expect(stages[1].status).toBe('pending');
  });

  it('clears previous result and error', () => {
    usePipelineStore.setState({ result: MOCK_RESULT, error: 'old error', isRunning: false });
    usePipelineStore.getState().startPipeline();

    const state = usePipelineStore.getState();
    expect(state.result).toBeNull();
    expect(state.error).toBeNull();
  });

  it('is a no-op when already running (guard)', () => {
    usePipelineStore.getState().startPipeline();
    usePipelineStore.getState().updateStage(1, 'running', 'Processing...');

    // Try to start again
    usePipelineStore.getState().startPipeline();

    // Stage 1 should still be 'running', not reset to 'pending'
    expect(usePipelineStore.getState().stages[1].status).toBe('running');
  });
});

// ─── updateStage ────────────────────────────────────────────

describe('updateStage', () => {
  it('updates stage 1 status and message', () => {
    usePipelineStore.getState().updateStage(1, 'running', 'Analyzing...');
    const stage = usePipelineStore.getState().stages[1];
    expect(stage.status).toBe('running');
    expect(stage.message).toBe('Analyzing...');
  });

  it('updates stage 4 without affecting other stages', () => {
    usePipelineStore.getState().updateStage(1, 'complete', 'Done');
    usePipelineStore.getState().updateStage(4, 'running', 'Refining section 3/10');

    const { stages } = usePipelineStore.getState();
    expect(stages[1].status).toBe('complete');
    expect(stages[4].status).toBe('running');
    expect(stages[5].status).toBe('pending');
  });

  it('can set error status', () => {
    usePipelineStore.getState().updateStage(3, 'error', 'API timeout');
    expect(usePipelineStore.getState().stages[3].status).toBe('error');
  });
});

// ─── completePipeline ───────────────────────────────────────

describe('completePipeline', () => {
  it('sets isRunning to false and stores result', () => {
    usePipelineStore.getState().startPipeline();
    usePipelineStore.getState().completePipeline(MOCK_RESULT);

    const state = usePipelineStore.getState();
    expect(state.isRunning).toBe(false);
    expect(state.result).toBe(MOCK_RESULT);
  });

  it('preserves showPanel as true', () => {
    usePipelineStore.getState().startPipeline();
    usePipelineStore.getState().completePipeline(MOCK_RESULT);
    expect(usePipelineStore.getState().showPanel).toBe(true);
  });
});

// ─── failPipeline ───────────────────────────────────────────

describe('failPipeline', () => {
  it('sets isRunning to false and stores error', () => {
    usePipelineStore.getState().startPipeline();
    usePipelineStore.getState().failPipeline('Network error');

    const state = usePipelineStore.getState();
    expect(state.isRunning).toBe(false);
    expect(state.error).toBe('Network error');
  });

  it('does not clear existing stage progress', () => {
    usePipelineStore.getState().startPipeline();
    usePipelineStore.getState().updateStage(1, 'complete', 'Done');
    usePipelineStore.getState().updateStage(2, 'running', 'Working...');
    usePipelineStore.getState().failPipeline('Timeout');

    const { stages } = usePipelineStore.getState();
    expect(stages[1].status).toBe('complete');
    expect(stages[2].status).toBe('running');
  });
});

// ─── setShowPanel ───────────────────────────────────────────

describe('setShowPanel', () => {
  it('toggles panel visibility', () => {
    usePipelineStore.getState().setShowPanel(true);
    expect(usePipelineStore.getState().showPanel).toBe(true);
    usePipelineStore.getState().setShowPanel(false);
    expect(usePipelineStore.getState().showPanel).toBe(false);
  });
});

// ─── reset ──────────────────────────────────────────────────

describe('reset', () => {
  it('clears everything back to initial state', () => {
    usePipelineStore.getState().startPipeline();
    usePipelineStore.getState().updateStage(1, 'complete', 'Done');
    usePipelineStore.getState().completePipeline(MOCK_RESULT);

    usePipelineStore.getState().reset();
    const state = usePipelineStore.getState();
    expect(state.isRunning).toBe(false);
    expect(state.result).toBeNull();
    expect(state.error).toBeNull();
    expect(state.showPanel).toBe(false);
    expect(state.stages[1].status).toBe('pending');
  });
});

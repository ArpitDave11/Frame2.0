/**
 * Integration Test — Cross-feature interactions (T-16.5).
 *
 * Tests interactions between multiple stores and features:
 * chat+epic, undo after refine, complexity config, pipeline progress,
 * toast lifecycle, and blueprint after refine.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useEpicStore } from '@/stores/epicStore';
import { usePipelineStore } from '@/stores/pipelineStore';
import { useConfigStore } from '@/stores/configStore';
import { useBlueprintStore } from '@/stores/blueprintStore';
import { useChatStore } from '@/stores/chatStore';
import { useUiStore } from '@/stores/uiStore';
import { getComplexityConfig } from '@/domain/complexity';

// ─── Reset All Stores ───────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  useEpicStore.setState(useEpicStore.getInitialState());
  usePipelineStore.setState(usePipelineStore.getInitialState());
  useConfigStore.setState(useConfigStore.getInitialState());
  useBlueprintStore.setState(useBlueprintStore.getInitialState());
  useChatStore.setState(useChatStore.getInitialState());
  useUiStore.setState(useUiStore.getInitialState());
});

// ─── Tests ──────────────────────────────────────────────────

describe('Cross-feature interactions', () => {
  describe('Chat modifies epic', () => {
    it('adding a chat message and updating epicStore.markdown reflects in both stores', () => {
      // Simulate: user chats, assistant suggests changes, markdown gets updated
      useChatStore.getState().addMessage({ role: 'user', content: 'Improve the Objective section' });
      useChatStore.getState().addMessage({ role: 'assistant', content: 'Here is an improved objective...' });

      const originalMd = '## Objective\n\nOld content.';
      useEpicStore.getState().setMarkdown(originalMd);

      // Simulate AI applying a change
      const newMd = '## Objective\n\nImproved content from AI suggestions.';
      useEpicStore.getState().setMarkdown(newMd);

      expect(useEpicStore.getState().markdown).toBe(newMd);
      expect(useChatStore.getState().messages).toHaveLength(2);
      expect(useChatStore.getState().messages[1].content).toContain('improved objective');
    });
  });

  describe('Undo after refine', () => {
    it('applyRefinedEpic then undo restores previous content', () => {
      const original = '## Objective\n\nOriginal content.';
      const refined = '## Objective\n\nRefined content with improvements.';

      useEpicStore.getState().setMarkdown(original);
      useEpicStore.getState().applyRefinedEpic(refined);

      expect(useEpicStore.getState().markdown).toBe(refined);
      expect(useEpicStore.getState().previousMarkdown).toBe(original);

      useEpicStore.getState().undo();

      expect(useEpicStore.getState().markdown).toBe(original);
      expect(useEpicStore.getState().previousMarkdown).toBeNull();
    });

    it('undo with no previous markdown does nothing', () => {
      const md = '## Objective\n\nSome content.';
      useEpicStore.getState().setMarkdown(md);

      // No applyRefinedEpic called, so previousMarkdown is null
      useEpicStore.getState().undo();

      expect(useEpicStore.getState().markdown).toBe(md);
    });

    it('multiple refinements: only last one is undoable', () => {
      const v1 = '## Objective\n\nVersion 1.';
      const v2 = '## Objective\n\nVersion 2.';
      const v3 = '## Objective\n\nVersion 3.';

      useEpicStore.getState().setMarkdown(v1);
      useEpicStore.getState().applyRefinedEpic(v2);
      useEpicStore.getState().applyRefinedEpic(v3);

      expect(useEpicStore.getState().markdown).toBe(v3);
      expect(useEpicStore.getState().previousMarkdown).toBe(v2);

      useEpicStore.getState().undo();
      expect(useEpicStore.getState().markdown).toBe(v2);
    });
  });

  describe('Complexity change', () => {
    it('setting complexity to "complex" returns correct thresholds', () => {
      useEpicStore.getState().setMarkdown('## Objective\n\nContent.');
      useEpicStore.getState().setComplexity('complex');

      expect(useEpicStore.getState().complexity).toBe('complex');

      const config = getComplexityConfig('complex');
      expect(config.validationThreshold).toBe(85);
      expect(config.maxPipelineIterations).toBe(3);
      expect(config.sectionInclusion).toBe('all');
      expect(config.storyCountRange.min).toBe(15);
      expect(config.storyCountRange.max).toBe(25);
    });

    it('setting complexity to "simple" returns simpler thresholds', () => {
      useEpicStore.getState().setComplexity('simple');

      const config = getComplexityConfig('simple');
      expect(config.validationThreshold).toBe(70);
      expect(config.maxPipelineIterations).toBe(2);
      expect(config.sectionInclusion).toBe('required-only');
    });

    it('complexity change updates document metadata', () => {
      useEpicStore.getState().setMarkdown('## Objective\n\nContent.');
      useEpicStore.getState().setComplexity('complex');

      const doc = useEpicStore.getState().document;
      expect(doc?.metadata.complexity).toBe('complex');
    });
  });

  describe('Pipeline progress updates multiple stores', () => {
    it('startPipeline sets isRunning and resets stages', () => {
      usePipelineStore.getState().startPipeline();

      const state = usePipelineStore.getState();
      expect(state.isRunning).toBe(true);
      expect(state.showPanel).toBe(true);
      expect(state.stages[1].status).toBe('pending');
      expect(state.stages[6].status).toBe('pending');
    });

    it('updateStage changes individual stage status', () => {
      usePipelineStore.getState().startPipeline();

      usePipelineStore.getState().updateStage(1, 'running', 'Analyzing content...');
      expect(usePipelineStore.getState().stages[1].status).toBe('running');
      expect(usePipelineStore.getState().stages[1].message).toBe('Analyzing content...');

      usePipelineStore.getState().updateStage(1, 'complete', '3 entities found');
      expect(usePipelineStore.getState().stages[1].status).toBe('complete');
    });

    it('failPipeline sets error and stops running', () => {
      usePipelineStore.getState().startPipeline();
      usePipelineStore.getState().updateStage(3, 'error', 'Structural analysis failed');
      usePipelineStore.getState().failPipeline('Stage 3 failed: timeout');

      const state = usePipelineStore.getState();
      expect(state.isRunning).toBe(false);
      expect(state.error).toContain('Stage 3 failed');
      expect(state.stages[3].status).toBe('error');
    });

    it('iteration tracking updates correctly', () => {
      usePipelineStore.getState().startPipeline();
      usePipelineStore.getState().setCurrentIteration(1);
      expect(usePipelineStore.getState().currentIteration).toBe(1);

      usePipelineStore.getState().setCurrentIteration(2);
      expect(usePipelineStore.getState().currentIteration).toBe(2);
    });
  });

  describe('Toast lifecycle', () => {
    it('add toast -> verify in store -> remove -> verify gone', () => {
      useUiStore.getState().addToast({ type: 'success', title: 'Pipeline complete!' });

      const toasts = useUiStore.getState().toasts;
      expect(toasts).toHaveLength(1);
      expect(toasts[0].type).toBe('success');
      expect(toasts[0].title).toBe('Pipeline complete!');

      const toastId = toasts[0].id;
      useUiStore.getState().removeToast(toastId);

      expect(useUiStore.getState().toasts).toHaveLength(0);
    });

    it('multiple toasts can coexist and be removed individually', () => {
      useUiStore.getState().addToast({ type: 'success', title: 'Done' });
      useUiStore.getState().addToast({ type: 'error', title: 'Oops' });
      useUiStore.getState().addToast({ type: 'info', title: 'FYI' });

      expect(useUiStore.getState().toasts).toHaveLength(3);

      // Remove the error toast
      const errorToast = useUiStore.getState().toasts.find((t) => t.type === 'error');
      useUiStore.getState().removeToast(errorToast!.id);

      const remaining = useUiStore.getState().toasts;
      expect(remaining).toHaveLength(2);
      expect(remaining.every((t) => t.type !== 'error')).toBe(true);
    });
  });

  describe('Blueprint after refine', () => {
    it('setting diagram code updates blueprintStore', () => {
      const diagramCode = 'graph TD\n  A[Start] --> B[Process]\n  B --> C[End]';

      useBlueprintStore.getState().setCode(diagramCode, 'flowchart', 'Shows the main flow');

      const bState = useBlueprintStore.getState();
      expect(bState.code).toBe(diagramCode);
      expect(bState.diagramType).toBe('flowchart');
      expect(bState.reasoning).toBe('Shows the main flow');
    });

    it('svgContent can be set after diagram code is generated', () => {
      useBlueprintStore.getState().setCode('graph TD\n  A-->B');
      useBlueprintStore.getState().setSvg('<svg><g>rendered diagram</g></svg>');

      expect(useBlueprintStore.getState().svgContent).toContain('<svg>');
    });

    it('blueprint reset clears all blueprint state', () => {
      useBlueprintStore.getState().setCode('graph TD\n  A-->B', 'flowchart');
      useBlueprintStore.getState().setSvg('<svg></svg>');
      useBlueprintStore.getState().setZoom(150);

      useBlueprintStore.getState().reset();

      const bState = useBlueprintStore.getState();
      expect(bState.code).toBe('');
      expect(bState.svgContent).toBe('');
      expect(bState.zoom).toBe(100);
      expect(bState.diagramType).toBe('');
    });
  });

  describe('Full refine + undo + blueprint cycle', () => {
    it('simulates a complete refine cycle across all stores', () => {
      // 1. User sets initial content
      useEpicStore.getState().setMarkdown('## Objective\n\nInitial draft.');
      useEpicStore.getState().setComplexity('moderate');

      // 2. Pipeline starts
      usePipelineStore.getState().startPipeline();
      expect(usePipelineStore.getState().isRunning).toBe(true);

      // 3. Stages progress
      usePipelineStore.getState().updateStage(1, 'complete', 'Done');
      usePipelineStore.getState().updateStage(2, 'complete', 'feature_specification');
      usePipelineStore.getState().updateStage(3, 'complete', '5 sections scored');
      usePipelineStore.getState().updateStage(4, 'complete', '3 sections refined');
      usePipelineStore.getState().updateStage(5, 'complete', '10 stories');
      usePipelineStore.getState().updateStage(6, 'complete', 'Score: 88');

      // 4. Apply refined content
      useEpicStore.getState().applyRefinedEpic('## Objective\n\nRefined draft with full detail.');
      useEpicStore.getState().setQualityScore(8.8);

      // 5. Set blueprint
      useBlueprintStore.getState().setCode('graph TD\n  A-->B-->C', 'flowchart');

      // 6. Complete pipeline
      usePipelineStore.getState().completePipeline({
        refinedMarkdown: '## Objective\n\nRefined draft with full detail.',
        category: 'feature_specification',
        categoryConfidence: 0.95,
        sectionCount: 5,
        storyCount: 10,
        wordCount: 500,
        validationScore: 88,
        stages: {
          1: { status: 'complete', message: 'Done', durationMs: 0 },
          2: { status: 'complete', message: 'feature_specification', durationMs: 0 },
          3: { status: 'complete', message: '5 sections scored', durationMs: 0 },
          4: { status: 'complete', message: '3 sections refined', durationMs: 0 },
          5: { status: 'complete', message: '10 stories', durationMs: 0 },
          6: { status: 'complete', message: 'Score: 88', durationMs: 0 },
        },
      });

      // 7. Add success toast
      useUiStore.getState().addToast({ type: 'success', title: 'Refinement complete!' });

      // Verify final state across all stores
      expect(useEpicStore.getState().markdown).toContain('Refined draft');
      expect(useEpicStore.getState().document?.metadata.qualityScore).toBe(8.8);
      expect(usePipelineStore.getState().isRunning).toBe(false);
      expect(usePipelineStore.getState().result?.validationScore).toBe(88);
      expect(useBlueprintStore.getState().code).toContain('A-->B-->C');
      expect(useUiStore.getState().toasts).toHaveLength(1);

      // 8. User decides to undo
      useEpicStore.getState().undo();
      expect(useEpicStore.getState().markdown).toContain('Initial draft');
    });
  });
});

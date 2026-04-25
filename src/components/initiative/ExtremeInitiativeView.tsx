/**
 * ExtremeInitiativeView — Root wizard container for the Extreme Initiative module.
 *
 * Renders StepIndicator + the active step component based on `currentStep`.
 * Derives completed-step state from store and gates navigation accordingly.
 */

import { useMemo, useCallback } from 'react';
import { useInitiativeStore, type WizardStep } from '@/stores/initiativeStore';
import StepIndicator from './StepIndicator';
import InitStep from './steps/InitStep';
import StreamEpicStep from './steps/StreamEpicStep';
import SplitCrewsStep from './steps/SplitCrewsStep';
import RefineCrewsStep from './steps/RefineCrewsStep';

const FONT_FAMILY = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

export default function ExtremeInitiativeView() {
  const currentStep = useInitiativeStore((s) => s.currentStep);
  const selectedStreamId = useInitiativeStore((s) => s.selectedStreamId);
  const title = useInitiativeStore((s) => s.title);
  const crews = useInitiativeStore((s) => s.crews);
  const streamEpicMarkdown = useInitiativeStore((s) => s.streamEpicMarkdown);
  const headers = useInitiativeStore((s) => s.headers);
  const setStep = useInitiativeStore((s) => s.setStep);

  const completedSteps = useMemo<WizardStep[]>(() => {
    const completed: WizardStep[] = [];

    // init: selectedStreamId set, title non-empty, at least 2 crews
    if (selectedStreamId !== null && title.trim().length > 0 && crews.length >= 2) {
      completed.push('init');
    }

    // streamEpic: markdown non-empty and headers parsed
    if (streamEpicMarkdown.trim().length > 0 && headers.length > 0) {
      completed.push('streamEpic');
    }

    // splitCrews: every crew has at least 1 assigned header
    if (
      crews.length > 0 &&
      crews.every((crew) => headers.some((h) => h.assignedCrewIds.includes(crew.id)))
    ) {
      completed.push('splitCrews');
    }

    // refineCrews: all crews done
    if (crews.length > 0 && crews.every((c) => c.refineStatus === 'done')) {
      completed.push('refineCrews');
    }

    return completed;
  }, [selectedStreamId, title, crews, streamEpicMarkdown, headers]);

  const onStepClick = useCallback(
    (step: WizardStep) => {
      // Allow navigating to completed steps or the current step, not future ones
      if (completedSteps.includes(step) || step === currentStep) {
        setStep(step);
      }
    },
    [completedSteps, currentStep, setStep],
  );

  const stepComponent = (() => {
    switch (currentStep) {
      case 'init':
        return <InitStep />;
      case 'streamEpic':
        return <StreamEpicStep />;
      case 'splitCrews':
        return <SplitCrewsStep />;
      case 'refineCrews':
        return <RefineCrewsStep />;
    }
  })();

  return (
    <div
      data-testid="initiative-view"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: 24,
        fontFamily: FONT_FAMILY,
      }}
    >
      <StepIndicator
        current={currentStep}
        completedSteps={completedSteps}
        onStepClick={onStepClick}
      />
      <div style={{ flex: 1, overflow: 'auto', marginTop: 24 }}>
        {stepComponent}
      </div>
    </div>
  );
}

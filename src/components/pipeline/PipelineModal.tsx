/**
 * PipelineModal — T-8.3 wrapper.
 *
 * Auto-close logic: when pipeline finishes successfully
 * (wasRunning && !isRunning && !error), auto-close modal after 600ms.
 * Stays open on error.
 */

import { useEffect, useRef } from 'react';
import { usePipelineStore } from '@/stores/pipelineStore';
import { useUiStore } from '@/stores/uiStore';
import { PipelineProgressPanel } from './PipelineProgressPanel';

export function PipelineModal() {
  const isRunning = usePipelineStore((s) => s.isRunning);
  const error = usePipelineStore((s) => s.error);
  const closeModal = useUiStore((s) => s.closeModal);
  const wasRunning = useRef(false);

  useEffect(() => {
    if (isRunning) wasRunning.current = true;
    if (wasRunning.current && !isRunning && !error) {
      const timer = setTimeout(() => {
        closeModal();
        wasRunning.current = false;
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isRunning, error, closeModal]);

  return <PipelineProgressPanel />;
}

/**
 * ModalHost — Renders the active modal based on uiStore.activeModal.
 *
 * Each modal type maps to a Modal with appropriate title and content.
 * Real modal content is implemented in later phases; placeholders for now.
 */

import { useUiStore } from '@/stores/uiStore';
import { usePipelineStore } from '@/stores/pipelineStore';
import { Modal } from '@/components/shared/Modal';
import { PlaceholderView } from '@/components/layout/PlaceholderView';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { PipelineModal } from '@/components/pipeline/PipelineModal';

export function ModalHost() {
  const activeModal = useUiStore((s) => s.activeModal);
  const closeModal = useUiStore((s) => s.closeModal);
  const pipelineRunning = usePipelineStore((s) => s.isRunning);

  if (!activeModal) return null;

  switch (activeModal) {
    case 'settings':
      return (
        <Modal open onClose={closeModal} title="Settings" width={540}>
          <SettingsPanel />
        </Modal>
      );
    case 'publish':
      return (
        <Modal open onClose={closeModal} title="Publish to GitLab" width={480}>
          <PlaceholderView name="Publish — Phase 14" />
        </Modal>
      );
    case 'loadEpic':
      return (
        <Modal open onClose={closeModal} title="Load from GitLab" width={540}>
          <PlaceholderView name="Load Epic — Phase 14" />
        </Modal>
      );
    case 'issueCreation':
      return (
        <Modal open onClose={closeModal} title="Create Issues" width={600}>
          <PlaceholderView name="Issue Creation — Phase 15" />
        </Modal>
      );
    case 'pipeline':
      return (
        <Modal open onClose={closeModal} title="Refining your epic" preventClose={pipelineRunning}>
          <PipelineModal />
        </Modal>
      );
    case 'critique':
      return (
        <Modal open onClose={closeModal} title="Quality Report" width={600}>
          <PlaceholderView name="Critique Report — Phase 10" />
        </Modal>
      );
    default:
      return null;
  }
}

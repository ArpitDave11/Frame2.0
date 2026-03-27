/**
 * ModalHost — Renders the active modal based on uiStore.activeModal.
 *
 * All modal content is now real — no placeholders remain.
 */

import { useUiStore } from '@/stores/uiStore';
import { usePipelineStore } from '@/stores/pipelineStore';
import { Modal } from '@/components/shared/Modal';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { PipelineModal } from '@/components/pipeline/PipelineModal';
import { CritiqueReport } from '@/components/critique/CritiqueReport';
import { LoadEpicModal } from '@/components/gitlab/LoadEpicModal';
import { PublishModal } from '@/components/gitlab/PublishModal';
import { IssueCreationModal } from '@/components/issues/IssueCreationModal';

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
          <PublishModal />
        </Modal>
      );
    case 'loadEpic':
      return (
        <Modal open onClose={closeModal} title="Load from GitLab" width={540}>
          <LoadEpicModal />
        </Modal>
      );
    case 'issueCreation':
      return (
        <Modal open onClose={closeModal} title="Create Issues from User Stories" width={850}>
          <IssueCreationModal />
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
          <CritiqueReport />
        </Modal>
      );
    default:
      return null;
  }
}

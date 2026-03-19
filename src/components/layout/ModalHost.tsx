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

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

function IssueCreationContent() {
  return (
    <div style={{ fontFamily: F, fontSize: 13, color: 'var(--col-text-subtle)', textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontSize: 15, fontWeight: 400, color: 'var(--col-text-primary)', marginBottom: 8 }}>
        Create Issues from User Stories
      </div>
      <div style={{ fontWeight: 300, lineHeight: 1.6 }}>
        Run the Refine pipeline first to generate user stories, then use this modal to create GitLab issues from them.
      </div>
    </div>
  );
}

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
        <Modal open onClose={closeModal} title="Create Issues" width={600}>
          <IssueCreationContent />
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

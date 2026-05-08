/**
 * PublishToGitLabDialog — commit analysis markdown to a GitLab repo.
 * Reuses commitToGitLabBranch / publishWithMergeRequest from existing GitLab client.
 */

import { useState, useEffect } from 'react';
import { X, Spinner, GitBranch, Check } from '@phosphor-icons/react';
import { useDocIntelStore } from '@/stores/docIntelStore';
import { useConfigStore } from '@/stores/configStore';
import { useUiStore } from '@/stores/uiStore';
import {
  commitToGitLabBranch,
  publishWithMergeRequest,
  fetchGitLabBranches,
} from '@/services/gitlab/gitlabClient';

const F = "Frutiger, 'Helvetica Neue', Helvetica, Arial, sans-serif";

interface Props {
  open: boolean;
  onClose: () => void;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
}

export function PublishToGitLabDialog({ open, onClose }: Props) {
  const sections = useDocIntelStore((s) => s.sections);
  const fileName = useDocIntelStore((s) => s.fileName);
  const lens = useDocIntelStore((s) => s.lens);
  const addToast = useUiStore.getState().addToast;
  const gitlabConfig = useConfigStore((s) => s.config.gitlab);

  const [branch, setBranch] = useState('main');
  const [branches, setBranches] = useState<string[]>([]);
  const [filePath, setFilePath] = useState('');
  const [commitMsg, setCommitMsg] = useState('');
  const [openMR, setOpenMR] = useState(false);
  const [status, setStatus] = useState<'idle' | 'publishing' | 'done' | 'error'>('idle');
  const [resultUrl, setResultUrl] = useState('');

  // Set defaults
  useEffect(() => {
    const slug = slugify(fileName ?? 'analysis');
    const date = new Date().toISOString().slice(0, 10);
    setFilePath(`docs/intel/${slug}-${date}.md`);
    setCommitMsg(`docs(intel): add ${lens ?? ''} analysis of ${fileName ?? 'document'}`);
  }, [fileName, lens]);

  // Fetch branches
  useEffect(() => {
    if (!open || !gitlabConfig?.enabled) return;
    fetchGitLabBranches(gitlabConfig, String(gitlabConfig.rootGroupId))
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setBranches(res.data.map((b) => b.name));
        }
      })
      .catch(() => {});
  }, [open, gitlabConfig]);

  const handlePublish = async () => {
    if (!gitlabConfig?.enabled) {
      addToast({ type: 'error', title: 'GitLab not configured. Open Settings.' });
      return;
    }

    setStatus('publishing');
    const md = sections
      .filter((s) => s.status === 'done')
      .map((s) => s.markdown)
      .join('\n\n---\n\n');

    const actions = [{ action: 'create' as const, file_path: filePath, content: md }];
    const projectId = String(gitlabConfig.rootGroupId);

    try {
      let url = '';
      if (openMR) {
        const result = await publishWithMergeRequest(gitlabConfig, projectId, {
          branch: `intel/${slugify(fileName ?? 'doc')}-${Date.now()}`,
          targetBranch: branch,
          commitMessage: commitMsg,
          mrTitle: commitMsg,
          actions,
        });

        if (!result.success) {
          setStatus('error');
          addToast({ type: 'error', title: result.error ?? 'Publish failed' });
          return;
        }
        url = result.data?.web_url || result.data?.merge_request_url || '';
      } else {
        const result = await commitToGitLabBranch(gitlabConfig, projectId, {
          branch,
          commitMessage: commitMsg,
          actions,
        });

        if (!result.success) {
          setStatus('error');
          addToast({ type: 'error', title: result.error ?? 'Publish failed' });
          return;
        }
      }

      setStatus('done');
      setResultUrl(url);
      addToast({ type: 'success', title: url ? `Published: ${url}` : 'Published to GitLab' });
    } catch (e) {
      setStatus('error');
      addToast({ type: 'error', title: e instanceof Error ? e.message : 'Publish failed' });
    }
  };

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      fontFamily: F,
    }}>
      <div style={{
        backgroundColor: '#fff', borderRadius: 8, width: 500, maxWidth: '90vw',
        boxShadow: '0 20px 50px rgba(0,0,0,0.2)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #e5e7eb',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 16, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
            <GitBranch size={18} /> Publish to GitLab
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <X size={18} color="#6b7280" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#555', display: 'block', marginBottom: 4 }}>Branch</label>
            <select value={branch} onChange={(e) => setBranch(e.target.value)}
              style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #d1d5db', fontSize: 13 }}>
              {branches.length > 0 ? branches.map((b) => <option key={b} value={b}>{b}</option>)
                : <option value="main">main</option>}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#555', display: 'block', marginBottom: 4 }}>File Path</label>
            <input value={filePath} onChange={(e) => setFilePath(e.target.value)}
              style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #d1d5db', fontSize: 13 }} />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: '#555', display: 'block', marginBottom: 4 }}>Commit Message</label>
            <textarea value={commitMsg} onChange={(e) => setCommitMsg(e.target.value)} rows={2}
              style={{ width: '100%', padding: 8, borderRadius: 4, border: '1px solid #d1d5db', fontSize: 13, resize: 'vertical' }} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <input type="checkbox" checked={openMR} onChange={(e) => setOpenMR(e.target.checked)} />
            Open as Merge Request
          </label>
          {status === 'done' && resultUrl && (
            <a href={resultUrl} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 13, color: 'var(--col-background-brand)' }}>
              View in GitLab ↗
            </a>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid #e5e7eb',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
        }}>
          <button onClick={onClose} style={{
            padding: '8px 14px', borderRadius: 6, border: '1px solid #d1d5db',
            background: '#fff', cursor: 'pointer', fontFamily: F, fontSize: 13,
          }}>Cancel</button>
          <button onClick={handlePublish} disabled={status === 'publishing'}
            style={{
              padding: '8px 14px', borderRadius: 6, border: 'none',
              background: status === 'publishing' ? '#fca5a5' : 'var(--col-background-brand)',
              color: '#fff', cursor: status === 'publishing' ? 'not-allowed' : 'pointer',
              fontFamily: F, fontSize: 13, fontWeight: 500,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
            {status === 'publishing' ? <><Spinner size={14} className="animate-spin" /> Publishing...</> :
             status === 'done' ? <><Check size={14} /> Done</> : 'Publish'}
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState, useCallback } from 'react';
import { useInitiativeStore } from '@/stores/initiativeStore';
import { useConfigStore } from '@/stores/configStore';
import { useUiStore } from '@/stores/uiStore';
import { fetchStreamTree, type StreamGroup } from '@/services/gitlab/initiativeService';
import type { GitLabConfig } from '@/domain/configTypes';
import {
  convertDocument,
  ALLOWED_UPLOAD_EXTENSIONS,
  MAX_UPLOAD_MB,
} from '@/services/docmining/docminingClient';

const FONT_FAMILY = "Frutiger, Arial, Helvetica, sans-serif";

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '8px 12px',
  border: '1px solid #CCCABC',
  borderRadius: 6,
  fontSize: '0.875rem',
  fontFamily: FONT_FAMILY,
  outline: 'none',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.875rem',
  fontWeight: 500,
  marginBottom: 4,
  fontFamily: FONT_FAMILY,
};

export function InitStep() {
  const title = useInitiativeStore((s) => s.title);
  const description = useInitiativeStore((s) => s.description);
  const streamGroup = useInitiativeStore((s) => s.streamGroup);
  const setStep = useInitiativeStore((s) => s.setStep);
  const setTitle = useInitiativeStore((s) => s.setTitle);
  const setDescription = useInitiativeStore((s) => s.setDescription);
  const setStreamGroup = useInitiativeStore((s) => s.setStreamGroup);
  const setGroupTree = useInitiativeStore((s) => s.setGroupTree);
  const setCrewsFromSubgroups = useInitiativeStore((s) => s.setCrewsFromSubgroups);

  const config = useConfigStore((s) => s.config);
  const openModal = useUiStore((s) => s.openModal);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableSubgroups, setAvailableSubgroups] = useState<StreamGroup[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const [uploadPhase, setUploadPhase] = useState<'idle' | 'extracting' | 'done' | 'error'>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadFileName, setUploadFileName] = useState<string | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);

  // Cleanup upload abort on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const streamGroupId = config.gitlab.streamGroupId;

  const gitlabConfig: GitLabConfig = {
    enabled: config.gitlab.enabled,
    rootGroupId: config.gitlab.rootGroupId,
    streamGroupId: config.gitlab.streamGroupId,
    accessToken: config.gitlab.accessToken,
    authMode: config.gitlab.authMode,
  };

  // Fetch stream tree on mount when streamGroupId is set
  useEffect(() => {
    if (!streamGroupId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchStreamTree(gitlabConfig, streamGroupId).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (result.ok) {
        setStreamGroup(result.data.stream);
        setGroupTree(result.data.tree);
        setAvailableSubgroups(result.data.crews);
        // Pre-select all subgroups
        const allIds = new Set(result.data.crews.map((c) => c.id));
        setSelectedIds(allIds);
        setCrewsFromSubgroups(result.data.crews);
      } else {
        setError(result.error);
      }
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamGroupId]);

  const handleToggle = useCallback(
    (subgroup: StreamGroup) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(subgroup.id)) {
          next.delete(subgroup.id);
        } else {
          next.add(subgroup.id);
        }
        const selected = availableSubgroups.filter((sg) => next.has(sg.id));
        setCrewsFromSubgroups(selected);
        return next;
      });
    },
    [availableSubgroups, setCrewsFromSubgroups],
  );

  const handleFile = useCallback(async (file: File) => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_UPLOAD_EXTENSIONS.includes(ext as any)) {
      setUploadPhase('error');
      setUploadError(`Unsupported file type: ${ext}`);
      return;
    }
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setUploadPhase('error');
      setUploadError(`File too large (max ${MAX_UPLOAD_MB} MB)`);
      return;
    }
    setUploadPhase('extracting');
    setUploadError(null);
    setUploadFileName(file.name);
    const controller = new AbortController();
    abortRef.current = controller;
    const outcome = await convertDocument(file, { signal: controller.signal });
    if (!outcome.ok) {
      setUploadPhase('error');
      setUploadError(outcome.error);
      return;
    }
    setDescription(outcome.data.markdown);
    setUploadPhase('done');
  }, [setDescription]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  // ── No streamGroupId configured ──
  if (!streamGroupId) {
    return (
      <div
        data-testid="init-step"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          padding: 32,
          fontFamily: FONT_FAMILY,
        }}
      >
        <p style={{ fontSize: '0.925rem', color: '#666' }}>
          Configure Stream Group ID in Settings to continue.
        </p>
        <button
          data-testid="open-settings-btn"
          type="button"
          onClick={() => openModal('settings')}
          style={{
            padding: '10px 24px',
            border: 'none',
            borderRadius: 6,
            background: '#E60000',
            color: '#FFFFFF',
            fontSize: '0.875rem',
            fontWeight: 500,
            fontFamily: FONT_FAMILY,
            cursor: 'pointer',
          }}
        >
          Open Settings
        </button>
      </div>
    );
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div
        data-testid="init-step"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: 32,
          fontFamily: FONT_FAMILY,
          fontSize: '0.925rem',
          color: '#666',
        }}
      >
        Loading stream group...
      </div>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <div
        data-testid="init-step"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: 32,
          fontFamily: FONT_FAMILY,
        }}
      >
        <p style={{ fontSize: '0.925rem', color: '#C00' }}>
          Failed to load stream group: {error}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            padding: '8px 16px',
            border: '1px solid #CCCABC',
            borderRadius: 6,
            background: '#FFF',
            fontSize: '0.875rem',
            fontFamily: FONT_FAMILY,
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  const selectedCount = selectedIds.size;
  const canProceed = title.trim().length > 0 && selectedCount >= 2;

  return (
    <div
      data-testid="init-step"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        maxWidth: 560,
        fontFamily: FONT_FAMILY,
      }}
    >
      {/* Stream group header (read-only) */}
      {streamGroup && (
        <div
          data-testid="stream-group-header"
          style={{
            padding: '10px 14px',
            background: '#F5F0E1',
            borderRadius: 6,
            border: '1px solid #CCCABC',
          }}
        >
          <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>
            {streamGroup.name}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#888', marginTop: 2 }}>
            {streamGroup.fullPath}
          </div>
        </div>
      )}

      {/* Title */}
      <div>
        <label style={labelStyle}>Title</label>
        <input
          data-testid="init-title-input"
          type="text"
          placeholder="Initiative title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={inputStyle}
        />
      </div>

      {/* Description */}
      <div>
        <label style={labelStyle}>Description</label>
        <textarea
          data-testid="init-description-input"
          placeholder="Brief description of the initiative..."
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </div>

      {/* Document Upload Zone */}
      <div
        data-testid="init-upload-zone"
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        style={{
          border: '2px dashed #CCCABC',
          borderRadius: 8,
          padding: '16px 20px',
          textAlign: 'center',
          cursor: 'pointer',
          background: uploadPhase === 'extracting' ? '#F5F0E1' : 'transparent',
          transition: 'background 0.2s',
        }}
        onClick={() => document.getElementById('init-upload-input')?.click()}
      >
        <input
          id="init-upload-input"
          type="file"
          accept={ALLOWED_UPLOAD_EXTENSIONS.join(',')}
          style={{ display: 'none' }}
          onChange={onFileChange}
        />
        {uploadPhase === 'idle' && (
          <>
            <div style={{ fontSize: '0.875rem', fontWeight: 500, fontFamily: FONT_FAMILY }}>
              Or upload a document
            </div>
            <div style={{ fontSize: '0.8rem', color: '#8E8D83', marginTop: 4 }}>
              Drag & drop or click to browse. PDF, DOCX, PPTX, TXT (max {MAX_UPLOAD_MB} MB)
            </div>
          </>
        )}
        {uploadPhase === 'extracting' && (
          <div style={{ fontSize: '0.875rem', color: '#5A5D5C', fontFamily: FONT_FAMILY }}>
            Extracting text from {uploadFileName}...
          </div>
        )}
        {uploadPhase === 'done' && (
          <div style={{ fontSize: '0.875rem', color: '#00A651', fontFamily: FONT_FAMILY }}>
            Extracted from {uploadFileName}. Review the description above.
          </div>
        )}
        {uploadPhase === 'error' && (
          <div style={{ fontSize: '0.875rem', color: '#E60000', fontFamily: FONT_FAMILY }}>
            {uploadError}
          </div>
        )}
      </div>

      {/* Crew subgroup checkboxes */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={labelStyle}>
          Select crews ({selectedCount} selected)
        </label>
        {availableSubgroups.length === 0 && (
          <p style={{ fontSize: '0.85rem', color: '#888', margin: 0 }}>
            No subgroups found under this stream group.
          </p>
        )}
        {availableSubgroups.map((sg) => (
          <label
            key={sg.id}
            data-testid={`crew-checkbox-${sg.id}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '6px 10px',
              border: '1px solid #CCCABC',
              borderRadius: 6,
              cursor: 'pointer',
              background: selectedIds.has(sg.id) ? '#FAFAF5' : '#FFF',
              fontFamily: FONT_FAMILY,
              fontSize: '0.875rem',
            }}
          >
            <input
              type="checkbox"
              checked={selectedIds.has(sg.id)}
              onChange={() => handleToggle(sg)}
              style={{ accentColor: '#E60000' }}
            />
            <span style={{ fontWeight: 500 }}>{sg.name}</span>
            <span style={{ fontSize: '0.75rem', color: '#999', marginLeft: 'auto' }}>
              {sg.fullPath}
            </span>
          </label>
        ))}
        {selectedCount < 2 && availableSubgroups.length > 0 && (
          <p style={{ fontSize: '0.8rem', color: '#C00', margin: 0 }}>
            Select at least 2 crews to proceed.
          </p>
        )}
      </div>

      {/* Footer: Generate button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
        <button
          data-testid="generate-stream-epic-btn"
          type="button"
          disabled={!canProceed}
          onClick={() => setStep('streamEpic')}
          style={{
            padding: '10px 24px',
            border: 'none',
            borderRadius: 6,
            background: canProceed ? '#E60000' : '#CCCABC',
            color: '#FFFFFF',
            fontSize: '0.875rem',
            fontWeight: 500,
            fontFamily: FONT_FAMILY,
            cursor: canProceed ? 'pointer' : 'not-allowed',
            opacity: canProceed ? 1 : 0.7,
          }}
        >
          Generate Stream Epic &rarr;
        </button>
      </div>
    </div>
  );
}

export default InitStep;

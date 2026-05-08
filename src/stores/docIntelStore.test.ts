import { describe, it, expect, beforeEach } from 'vitest';
import { useDocIntelStore } from './docIntelStore';

describe('docIntelStore', () => {
  beforeEach(() => useDocIntelStore.getState().reset());

  it('starts in empty phase', () => {
    expect(useDocIntelStore.getState().phase).toBe('empty');
  });

  it('setDocument transitions to uploaded phase', () => {
    useDocIntelStore.getState().setDocument({
      fileName: 'test.pdf',
      markdown: '# Test',
      outline: [],
      tables: [],
      metadata: { filename: 'test.pdf', pageCount: 1, fileSha256: 'abc' },
    });
    const s = useDocIntelStore.getState();
    expect(s.phase).toBe('uploaded');
    expect(s.fileName).toBe('test.pdf');
    expect(s.documentMarkdown).toBe('# Test');
  });

  it('setLens stores the lens', () => {
    useDocIntelStore.getState().setLens('executive');
    expect(useDocIntelStore.getState().lens).toBe('executive');
  });

  it('startAnalysis sets phase to analyzing and initializes sections', () => {
    useDocIntelStore.getState().startAnalysis();
    const s = useDocIntelStore.getState();
    expect(s.phase).toBe('analyzing');
    expect(s.sections).toHaveLength(4);
    expect(s.sections.every(sec => sec.status === 'generating')).toBe(true);
  });

  it('updateSection sets markdown and status=done', () => {
    useDocIntelStore.getState().startAnalysis();
    useDocIntelStore.getState().updateSection('summary', '# Summary content');
    const sec = useDocIntelStore.getState().sections.find(s => s.id === 'summary');
    expect(sec?.markdown).toBe('# Summary content');
    expect(sec?.status).toBe('done');
  });

  it('updateSection pushes prior content to history', () => {
    useDocIntelStore.getState().startAnalysis();
    useDocIntelStore.getState().updateSection('summary', 'v1');
    useDocIntelStore.getState().updateSection('summary', 'v2');
    const sec = useDocIntelStore.getState().sections.find(s => s.id === 'summary');
    expect(sec?.markdown).toBe('v2');
    expect(sec?.history).toContain('v1');
  });

  it('revertSection pops from history', () => {
    useDocIntelStore.getState().startAnalysis();
    useDocIntelStore.getState().updateSection('summary', 'v1');
    useDocIntelStore.getState().updateSection('summary', 'v2');
    useDocIntelStore.getState().revertSection('summary');
    const sec = useDocIntelStore.getState().sections.find(s => s.id === 'summary');
    expect(sec?.markdown).toBe('v1');
  });

  it('all sections done transitions phase to ready', () => {
    useDocIntelStore.getState().startAnalysis();
    useDocIntelStore.getState().updateSection('summary', 'a');
    useDocIntelStore.getState().updateSection('insights', 'b');
    useDocIntelStore.getState().updateSection('explanations', 'c');
    useDocIntelStore.getState().updateSection('visuals', 'd');
    expect(useDocIntelStore.getState().phase).toBe('ready');
  });

  it('reset clears everything', () => {
    useDocIntelStore.getState().setDocument({
      fileName: 'x.pdf', markdown: 'md', outline: [], tables: [],
      metadata: { filename: 'x.pdf', pageCount: 5, fileSha256: 'sha' },
    });
    useDocIntelStore.getState().reset();
    const s = useDocIntelStore.getState();
    expect(s.phase).toBe('empty');
    expect(s.fileName).toBeNull();
    expect(s.sections).toHaveLength(0);
  });
});

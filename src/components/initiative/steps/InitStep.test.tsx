// src/components/initiative/steps/InitStep.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useInitiativeStore } from '@/stores/initiativeStore';

// Mock the docmining client
vi.mock('@/services/docmining/docminingClient', () => ({
  convertDocument: vi.fn().mockResolvedValue({
    ok: true,
    data: { markdown: '# Extracted Content\n\nSome initiative description from the PDF.', fileName: 'test.pdf', pages: 3, durationMs: 1200 },
  }),
  ALLOWED_UPLOAD_EXTENSIONS: ['.pdf', '.docx', '.pptx', '.txt'],
  MAX_UPLOAD_MB: 50,
}));

// Mock the gitlab service (InitStep fetches tree on mount)
vi.mock('@/services/gitlab/initiativeService', () => ({
  fetchStreamTree: vi.fn().mockResolvedValue({
    ok: true,
    data: {
      stream: { id: 1, name: 'Test Stream', fullPath: 'test/stream' },
      crews: [
        { id: 10, name: 'Crew A', fullPath: 'test/stream/a' },
        { id: 20, name: 'Crew B', fullPath: 'test/stream/b' },
      ],
      tree: { id: 1, name: 'Test Stream', fullPath: 'test/stream', children: [] },
    },
  }),
}));

// Mock configStore to have streamGroupId set
vi.mock('@/stores/configStore', () => ({
  useConfigStore: vi.fn((selector) => {
    const config = {
      gitlab: { enabled: true, rootGroupId: '1', streamGroupId: '123', accessToken: 'tok', authMode: 'pat' },
      endpoints: { azureEndpoint: '' },
    };
    return selector({ config });
  }),
}));

describe('InitStep document upload', () => {
  beforeEach(() => {
    useInitiativeStore.getState().reset();
  });

  it('renders the upload zone', async () => {
    const { InitStep } = await import('./InitStep');
    render(<InitStep />);
    await waitFor(() => {
      expect(screen.getByText(/upload a document/i)).toBeTruthy();
    });
  });

  it('calls convertDocument on file drop and fills description', async () => {
    const { convertDocument } = await import('@/services/docmining/docminingClient');
    const { InitStep } = await import('./InitStep');
    render(<InitStep />);

    await waitFor(() => screen.getByText(/upload a document/i));

    const dropZone = screen.getByTestId('init-upload-zone');
    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file], types: ['Files'] },
    });

    await waitFor(() => {
      expect(convertDocument).toHaveBeenCalledWith(file, expect.any(Object));
    });

    await waitFor(() => {
      expect(useInitiativeStore.getState().description).toContain('Extracted Content');
    });
  });
});

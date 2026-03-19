/**
 * Tests for ModalHost — Active modal rendering.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ModalHost } from './ModalHost';
import { useUiStore } from '@/stores/uiStore';

beforeEach(() => {
  useUiStore.setState(useUiStore.getInitialState());
});

describe('ModalHost', () => {
  it('activeModal=null renders nothing', () => {
    const { container } = render(<ModalHost />);
    expect(container.innerHTML).toBe('');
  });

  it('activeModal=settings renders Settings modal', () => {
    useUiStore.setState({ activeModal: 'settings' });
    render(<ModalHost />);
    expect(screen.getByTestId('modal-title').textContent).toBe('Settings');
  });

  it('activeModal=publish renders Publish modal', () => {
    useUiStore.setState({ activeModal: 'publish' });
    render(<ModalHost />);
    expect(screen.getByTestId('modal-title').textContent).toBe('Publish to GitLab');
  });

  it('activeModal=loadEpic renders Load modal', () => {
    useUiStore.setState({ activeModal: 'loadEpic' });
    render(<ModalHost />);
    expect(screen.getByTestId('modal-title').textContent).toBe('Load from GitLab');
  });

  it('activeModal=critique renders Pipeline modal with preventClose', () => {
    useUiStore.setState({ activeModal: 'critique' });
    render(<ModalHost />);
    expect(screen.getByTestId('modal-title').textContent).toBe('Refining your epic');
    expect(screen.queryByTestId('modal-close-btn')).toBeNull(); // preventClose
  });

  it('activeModal=issueCreation renders Issue Creation modal', () => {
    useUiStore.setState({ activeModal: 'issueCreation' });
    render(<ModalHost />);
    expect(screen.getByTestId('modal-title').textContent).toBe('Create Issues');
  });
});

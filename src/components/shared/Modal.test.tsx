/**
 * Tests for Modal — Shared overlay component.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from './Modal';

describe('Modal', () => {
  it('open={false} renders nothing', () => {
    const { container } = render(
      <Modal open={false} onClose={() => {}} title="Test">Content</Modal>,
    );
    expect(container.innerHTML).toBe('');
  });

  it('open={true} renders backdrop and card', () => {
    render(<Modal open onClose={() => {}} title="Test">Content</Modal>);
    expect(screen.getByTestId('modal-backdrop')).toBeDefined();
    expect(screen.getByTestId('modal-card')).toBeDefined();
  });

  it('backdrop click calls onClose', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="Test">Content</Modal>);
    fireEvent.click(screen.getByTestId('modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('card click does NOT call onClose', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="Test">Content</Modal>);
    fireEvent.click(screen.getByTestId('modal-card'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('preventClose=true disables backdrop click', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="Test" preventClose>Content</Modal>);
    fireEvent.click(screen.getByTestId('modal-backdrop'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('preventClose=true hides X button', () => {
    render(<Modal open onClose={() => {}} title="Test" preventClose>Content</Modal>);
    expect(screen.queryByTestId('modal-close-btn')).toBeNull();
  });

  it('X button visible when preventClose is false', () => {
    render(<Modal open onClose={() => {}} title="Test">Content</Modal>);
    expect(screen.getByTestId('modal-close-btn')).toBeDefined();
  });

  it('X button calls onClose', () => {
    const onClose = vi.fn();
    render(<Modal open onClose={onClose} title="Test">Content</Modal>);
    fireEvent.click(screen.getByTestId('modal-close-btn'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('title text rendered in header', () => {
    render(<Modal open onClose={() => {}} title="Settings">Content</Modal>);
    expect(screen.getByTestId('modal-title').textContent).toBe('Settings');
  });

  it('custom width applied to card', () => {
    render(<Modal open onClose={() => {}} title="Test" width={600}>Content</Modal>);
    expect(screen.getByTestId('modal-card').style.width).toBe('600px');
  });

  it('default width is 480px', () => {
    render(<Modal open onClose={() => {}} title="Test">Content</Modal>);
    expect(screen.getByTestId('modal-card').style.width).toBe('480px');
  });

  it('children rendered inside body', () => {
    render(<Modal open onClose={() => {}} title="Test"><div data-testid="child">Hello</div></Modal>);
    const body = screen.getByTestId('modal-body');
    expect(body.querySelector('[data-testid="child"]')).toBeDefined();
  });

  it('animation style present on backdrop', () => {
    render(<Modal open onClose={() => {}} title="Test">Content</Modal>);
    expect(screen.getByTestId('modal-backdrop').style.animation).toContain('ubsFade');
  });
});

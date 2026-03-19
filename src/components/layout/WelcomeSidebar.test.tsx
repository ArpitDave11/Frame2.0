/**
 * Tests for WelcomeSidebar — Landing page navigation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WelcomeSidebar } from './WelcomeSidebar';

beforeEach(() => {
  // Reset any DOM elements created for scroll targets
  document.body.innerHTML = '';
});

describe('WelcomeSidebar', () => {
  it('renders with 5 navigation items', () => {
    render(<WelcomeSidebar />);
    expect(screen.getByTestId('welcome-nav-home')).toBeDefined();
    expect(screen.getByTestId('welcome-nav-actions')).toBeDefined();
    expect(screen.getByTestId('welcome-nav-lifecycle')).toBeDefined();
    expect(screen.getByTestId('welcome-nav-templates')).toBeDefined();
    expect(screen.getByTestId('welcome-nav-quickstart')).toBeDefined();
  });

  it('initial state: sidebar is open (width 220px)', () => {
    render(<WelcomeSidebar />);
    const sidebar = screen.getByTestId('welcome-sidebar');
    expect(sidebar.style.width).toBe('220px');
  });

  it('click collapse → width becomes 56px, labels hidden', () => {
    render(<WelcomeSidebar />);
    fireEvent.click(screen.getByTestId('collapse-toggle'));
    const sidebar = screen.getByTestId('welcome-sidebar');
    expect(sidebar.style.width).toBe('56px');
    // Labels should not be in the DOM
    expect(screen.queryByText('What You Can Do')).toBeNull();
  });

  it('click collapse again → width returns to 220px', () => {
    render(<WelcomeSidebar />);
    fireEvent.click(screen.getByTestId('collapse-toggle'));
    fireEvent.click(screen.getByTestId('collapse-toggle'));
    const sidebar = screen.getByTestId('welcome-sidebar');
    expect(sidebar.style.width).toBe('220px');
    expect(screen.getByText('What You Can Do')).toBeDefined();
  });

  it('UBS logo visible in both states', () => {
    render(<WelcomeSidebar />);
    expect(screen.getByTestId('ubs-logo')).toBeDefined();
    fireEvent.click(screen.getByTestId('collapse-toggle'));
    expect(screen.getByTestId('ubs-logo')).toBeDefined();
  });

  it('FRAME text visible only when open', () => {
    render(<WelcomeSidebar />);
    expect(screen.getByTestId('frame-text')).toBeDefined();
    fireEvent.click(screen.getByTestId('collapse-toggle'));
    expect(screen.queryByTestId('frame-text')).toBeNull();
  });

  it('click on Templates → calls scrollIntoView', () => {
    // Create a target element
    const target = document.createElement('section');
    target.id = 'templates';
    target.scrollIntoView = vi.fn();
    document.body.appendChild(target);

    render(<WelcomeSidebar />);
    fireEvent.click(screen.getByTestId('welcome-nav-templates'));

    expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' });
  });

  it('active section has highlighted background', () => {
    render(<WelcomeSidebar />);
    const homeBtn = screen.getByTestId('welcome-nav-home');
    // Home is active by default
    expect(homeBtn.style.background).toContain('var(--input-background)');

    // Click templates
    fireEvent.click(screen.getByTestId('welcome-nav-templates'));
    const templatesBtn = screen.getByTestId('welcome-nav-templates');
    expect(templatesBtn.style.background).toContain('var(--input-background)');
    // Home should no longer be active
    expect(homeBtn.style.background).toBe('transparent');
  });

  it('collapse button shows "Collapse" text when open', () => {
    render(<WelcomeSidebar />);
    expect(screen.getByText('Collapse')).toBeDefined();
  });

  it('collapse button hides text when collapsed', () => {
    render(<WelcomeSidebar />);
    fireEvent.click(screen.getByTestId('collapse-toggle'));
    expect(screen.queryByText('Collapse')).toBeNull();
  });
});

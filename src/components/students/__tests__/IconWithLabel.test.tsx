// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { HeartIcon } from '@phosphor-icons/react';
import IconWithLabel from '../IconWithLabel';

describe('IconWithLabel', () => {
  it('renders icon and label correctly', () => {
    render(
      <IconWithLabel
        icon={<HeartIcon data-testid="heart-icon" />}
        label="Test"
      />,
    );

    expect(screen.getByTestId('heart-icon')).toBeInTheDocument();
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('handles click events', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <IconWithLabel
        icon={<HeartIcon />}
        label="Clickable"
        onClick={handleClick}
      />,
    );

    const button = screen.getByRole('button', { name: 'Clickable' });
    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('stops event propagation on click', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    const handleParentClick = vi.fn();

    render(
      <div onClick={handleParentClick}>
        <IconWithLabel
          icon={<HeartIcon />}
          label="Stop Propagation"
          onClick={handleClick}
        />
      </div>,
    );

    const button = screen.getByRole('button', { name: 'Stop Propagation' });
    await user.click(button);

    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(handleParentClick).not.toHaveBeenCalled();
  });

  it('shows active state correctly', () => {
    render(
      <IconWithLabel
        icon={<HeartIcon />}
        label="Active Button"
        active={true}
      />,
    );

    const button = screen.getByRole('button', { name: 'Active Button' });
    expect(button).toHaveClass('border-blue-400!');
    expect(button).toHaveClass('bg-blue-200!');
  });

  it('shows inactive state correctly', () => {
    render(
      <IconWithLabel
        icon={<HeartIcon />}
        label="Inactive Button"
        active={false}
      />,
    );

    const button = screen.getByRole('button', { name: 'Inactive Button' });
    expect(button).toHaveClass('border-gray-200!');
    expect(button).toHaveClass('bg-white!');
  });

  it('applies danger variant styles when active', () => {
    render(
      <IconWithLabel
        icon={<HeartIcon />}
        label="Danger Active"
        variant="danger"
        active={true}
      />,
    );

    const button = screen.getByRole('button', { name: 'Danger Active' });
    expect(button).toHaveClass('border-rose-400!');
    expect(button).toHaveClass('bg-rose-200!');
  });

  it('applies danger variant styles when inactive', () => {
    render(
      <IconWithLabel
        icon={<HeartIcon />}
        label="Danger Inactive"
        variant="danger"
        active={false}
      />,
    );

    const button = screen.getByRole('button', { name: 'Danger Inactive' });
    expect(button).toHaveClass('border-gray-200!');
  });

  it('uses custom tooltip when provided', () => {
    render(
      <IconWithLabel
        icon={<HeartIcon />}
        label="Button"
        tooltip="Custom Tooltip"
      />,
    );

    const button = screen.getByRole('button', { name: 'Button' });
    expect(button).toHaveAttribute('title', 'Custom Tooltip');
  });

  it('uses label as tooltip when tooltip not provided', () => {
    render(<IconWithLabel icon={<HeartIcon />} label="Default Tooltip" />);

    const button = screen.getByRole('button', { name: 'Default Tooltip' });
    expect(button).toHaveAttribute('title', 'Default Tooltip');
  });

  it('uses custom aria-label when provided', () => {
    render(
      <IconWithLabel
        icon={<HeartIcon />}
        label="Visual Label"
        ariaLabel="Custom Aria Label"
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Custom Aria Label' }),
    ).toBeInTheDocument();
  });

  it('uses label as aria-label when ariaLabel not provided', () => {
    render(<IconWithLabel icon={<HeartIcon />} label="Default Aria" />);

    expect(
      screen.getByRole('button', { name: 'Default Aria' }),
    ).toBeInTheDocument();
  });

  it('sets aria-pressed when provided', () => {
    render(
      <IconWithLabel
        icon={<HeartIcon />}
        label="Toggle Button"
        ariaPressed={true}
      />,
    );

    const button = screen.getByRole('button', { name: 'Toggle Button' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
  });

  it('is disabled when onClick is not provided', () => {
    render(<IconWithLabel icon={<HeartIcon />} label="No Click Handler" />);

    const button = screen.getByRole('button', { name: 'No Click Handler' });
    expect(button).toBeDisabled();
  });

  it('is not disabled when onClick is provided', () => {
    render(
      <IconWithLabel
        icon={<HeartIcon />}
        label="With Click Handler"
        onClick={() => {}}
      />,
    );

    const button = screen.getByRole('button', { name: 'With Click Handler' });
    expect(button).not.toBeDisabled();
  });

  it('has minimum touch target size', () => {
    render(<IconWithLabel icon={<HeartIcon />} label="Touch Target" />);

    const button = screen.getByRole('button', { name: 'Touch Target' });
    // Button is h-11 w-11 (44px x 44px), container has min-w-11
    expect(button).toHaveClass('h-11');
    expect(button).toHaveClass('w-11');
  });

  it('truncates long labels', () => {
    render(
      <IconWithLabel
        icon={<HeartIcon />}
        label="This is a very long label that should be truncated"
      />,
    );

    // Check for truncated text (first 7 chars + ellipsis)
    const labelElement = screen.getByText('This is…');
    expect(labelElement).toHaveClass('truncate');
    // Full label should be in title attribute for tooltip
    expect(labelElement).toHaveAttribute(
      'title',
      'This is a very long label that should be truncated',
    );
  });
});

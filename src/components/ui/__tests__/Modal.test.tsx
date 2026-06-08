import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import Modal from '../modals/Modal';

describe('Modal', () => {
  it('renders when open', () => {
    render(
      <Modal open onClose={vi.fn()}>
        <div>Content</div>
      </Modal>,
    );
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <Modal open={false} onClose={vi.fn()}>
        <div>Content</div>
      </Modal>,
    );
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('closes on ESC', async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose}>
        <div>Content</div>
      </Modal>,
    );
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on overlay click', async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose}>
        <div>Content</div>
      </Modal>,
    );
    await userEvent.click(screen.getByRole('dialog').parentElement!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

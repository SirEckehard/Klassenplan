// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TrashIcon } from '@phosphor-icons/react';
import { describe, expect, it, vi } from 'vitest';
import { getButton } from '@/__tests__/utils';
import ConfirmDialog from '../modals/ConfirmDialog';

type DialogProps = Partial<React.ComponentProps<typeof ConfirmDialog>>;

function renderDialog(props: DialogProps = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <ConfirmDialog
      open
      icon={TrashIcon}
      title="Delete 8b?"
      confirmLabel="Delete"
      cancelLabel="Cancel"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />,
  );
  return { onConfirm, onCancel };
}

describe('ConfirmDialog', () => {
  it('is named by its question and interrupts', () => {
    renderDialog({ meta: 'Class', message: 'This cannot be undone.' });
    const dialog = screen.getByRole('alertdialog', { name: 'Delete 8b?' });
    expect(dialog).toHaveAccessibleDescription('This cannot be undone.');
    expect(screen.getByText('Class')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderDialog({ open: false });
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('counts what goes, and leaves out what counts nothing', () => {
    renderDialog({
      facts: [
        { label: 'Students', count: 26 },
        { label: 'Mixes', count: 0 },
      ],
    });
    expect(screen.getByRole('listitem')).toHaveTextContent('Students26');
    expect(screen.queryByText('Mixes')).not.toBeInTheDocument();
  });

  it('calls onConfirm when the confirm button is clicked', async () => {
    const { onConfirm } = renderDialog();
    await userEvent.click(getButton('Delete'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when the cancel button is clicked', async () => {
    const { onCancel } = renderDialog();
    await userEvent.click(getButton('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('closes on ESC', async () => {
    const { onCancel } = renderDialog();
    await userEvent.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('closes on overlay click', async () => {
    const { onCancel } = renderDialog();
    await userEvent.click(screen.getByRole('alertdialog').parentElement!);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('cancels instead of confirming on Enter', async () => {
    const { onConfirm, onCancel } = renderDialog();
    // The cancel button holds the initial focus, so a reflexive Enter aborts
    // the destructive action instead of carrying it out.
    expect(getButton('Cancel')).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('offers a way out first, which only hands over', async () => {
    const onSelect = vi.fn();
    const { onConfirm, onCancel } = renderDialog({
      way: { label: 'Save a backup first', onSelect },
    });
    await userEvent.click(getButton('Save a backup first'));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('keeps rose for a deletion: a neutral step asks in plain buttons', () => {
    renderDialog({ tone: 'neutral' });
    expect(getButton('Delete')).not.toHaveClass('danger-button');
    expect(getButton('Cancel')).toHaveFocus();
  });

  it('focuses what a step the teacher asked for offers', () => {
    renderDialog({ tone: 'primary' });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(getButton('Delete')).toHaveFocus();
  });
});

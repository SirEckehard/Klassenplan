// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { getButton } from '@/__tests__/utils';
import { InspectorDeleteFooter } from '@/components/shell/InspectorPanel';
import { isAnyDialogOpen } from '@/hooks/ui/useDialogLayer';
import InlineQuestion from '../modals/InlineQuestion';

const QUESTION = {
  title: 'Delete plan?',
  detail: 'This cannot be undone.',
  confirmLabel: 'Delete',
};
const CANCEL = /^(Abbrechen|Cancel)$/;

describe('InlineQuestion', () => {
  function renderQuestion() {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <>
        <button type="button">elsewhere</button>
        <InlineQuestion
          question={QUESTION}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      </>,
    );
    return { onConfirm, onCancel };
  }

  it('says what it asks and starts on the cancel', () => {
    renderQuestion();
    const question = screen.getByRole('alertdialog', { name: 'Delete plan?' });
    expect(question).toHaveAccessibleDescription('This cannot be undone.');
    expect(getButton(CANCEL)).toHaveFocus();
  });

  it('takes no press on its confirm at first, for a double click', async () => {
    const { onConfirm } = renderQuestion();
    const confirm = getButton('Delete');

    fireEvent.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();

    await waitFor(() => expect(confirm).not.toHaveAttribute('aria-disabled'));
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('cancels on Enter, with the focus where it starts', async () => {
    const { onConfirm, onCancel } = renderQuestion();
    await userEvent.keyboard('{Enter}');
    expect(onCancel).toHaveBeenCalledWith('answered');
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('claims Escape while it stands, and stops it there', () => {
    const { onCancel } = renderQuestion();
    const below = vi.fn();
    window.addEventListener('keydown', below);

    expect(isAnyDialogOpen()).toBe(true);
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onCancel).toHaveBeenCalledWith('answered');
    expect(below).not.toHaveBeenCalled();
    window.removeEventListener('keydown', below);
  });

  it('ends when something else is pressed', () => {
    const { onCancel } = renderQuestion();
    fireEvent.pointerDown(getButton('elsewhere'));
    expect(onCancel).toHaveBeenCalledWith('outside');
  });
});

describe('InspectorDeleteFooter', () => {
  it('deletes at once without a question, for one that asks elsewhere', () => {
    const onDelete = vi.fn();
    render(<InspectorDeleteFooter label="Delete class" onDelete={onDelete} />);
    fireEvent.click(getButton('Delete class'));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('leaves what is blocked alone', () => {
    const onDelete = vi.fn();
    render(
      <InspectorDeleteFooter
        label="Delete room"
        onDelete={onDelete}
        blockedHint="The open room stays."
      />,
    );
    fireEvent.click(getButton('Delete room'));
    expect(onDelete).not.toHaveBeenCalled();
  });
});

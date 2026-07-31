// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BackupRestoreModeModal from '../BackupRestoreModeModal';
import { getButton, getDialog } from '@/__tests__/utils';

const renderModal = () => {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <BackupRestoreModeModal open onConfirm={onConfirm} onCancel={onCancel} />,
  );
  return { onConfirm, onCancel };
};

const submit = () => getButton(/Wiederherstellen|^Restore$/i);

describe('BackupRestoreModeModal', () => {
  afterEach(cleanup);

  it('renders as a modal dialog', () => {
    renderModal();
    expect(
      getDialog(/Backup wiederherstellen|Restore backup/i),
    ).toBeInTheDocument();
  });

  it('defaults to replacing all data', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderModal();

    await user.click(submit());

    expect(onConfirm).toHaveBeenCalledExactlyOnceWith('replace');
  });

  it('offers merging as an alternative', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderModal();

    await user.click(
      screen.getByRole('radio', { name: /Zusammenführen|Merge/i }),
    );
    await user.click(submit());

    expect(onConfirm).toHaveBeenCalledExactlyOnceWith('merge');
  });

  it('cancels without restoring', async () => {
    const user = userEvent.setup();
    const { onConfirm, onCancel } = renderModal();

    await user.click(getButton(/^(Abbrechen|Cancel)$/i));

    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

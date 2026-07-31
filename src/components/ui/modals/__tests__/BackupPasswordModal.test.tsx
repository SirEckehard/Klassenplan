// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BackupPasswordModal from '../BackupPasswordModal';
import { getButton, getDialog } from '@/__tests__/utils';

const renderModal = (
  props: Partial<React.ComponentProps<typeof BackupPasswordModal>> = {},
) => {
  const onSubmit = vi.fn();
  const onCancel = vi.fn();
  render(
    <BackupPasswordModal
      open
      mode="create"
      onSubmit={onSubmit}
      onCancel={onCancel}
      {...props}
    />,
  );
  return { onSubmit, onCancel };
};

const passwordField = () =>
  screen.getByLabelText(/^(Passwort|Password)$/i) as HTMLInputElement;
const confirmField = () =>
  screen.getByLabelText(
    /Passwort wiederholen|Repeat password/i,
  ) as HTMLInputElement;
const submitButton = () =>
  getButton(/Backup erstellen|Create backup|Entschlüsseln|Decrypt/i);

describe('BackupPasswordModal', () => {
  afterEach(cleanup);

  it('renders as a modal dialog', () => {
    renderModal();
    expect(
      getDialog(/Backup verschlüsseln|Encrypt backup/i),
    ).toBeInTheDocument();
  });

  it('rejects passwords below the minimum length', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderModal();

    await user.type(passwordField(), 'kurz');
    await user.type(confirmField(), 'kurz');
    await user.click(submitButton());

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toMatch(
      /mindestens 8|at least 8/i,
    );
  });

  it('rejects a mismatching confirmation', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderModal();

    await user.type(passwordField(), 'backup-passwort');
    await user.type(confirmField(), 'anderes-passwort');
    await user.click(submitButton());

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toMatch(
      /nicht überein|do not match/i,
    );
  });

  it('submits a valid password once', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderModal();

    await user.type(passwordField(), 'backup-passwort');
    await user.type(confirmField(), 'backup-passwort');
    await user.click(submitButton());

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith('backup-passwort');
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    renderModal();

    expect(passwordField().type).toBe('password');
    await user.click(getButton(/Passwort anzeigen|Show password/i));
    expect(passwordField().type).toBe('text');
  });

  it('asks for a single password in unlock mode', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderModal({ mode: 'unlock' });

    expect(
      screen.queryByLabelText(/Passwort wiederholen|Repeat password/i),
    ).toBeNull();

    await user.type(passwordField(), 'irgendwas');
    await user.click(submitButton());

    expect(onSubmit).toHaveBeenCalledExactlyOnceWith('irgendwas');
  });

  it('reports an empty password in unlock mode', async () => {
    const user = userEvent.setup();
    const { onSubmit } = renderModal({ mode: 'unlock' });

    await user.click(submitButton());

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('cancels without submitting', async () => {
    const user = userEvent.setup();
    const { onSubmit, onCancel } = renderModal();

    await user.click(getButton(/^(Abbrechen|Cancel)$/i));

    expect(onCancel).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

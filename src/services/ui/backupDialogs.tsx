// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { ReactElement } from 'react';
import { createRoot } from 'react-dom/client';
import BackupPasswordModal, {
  type BackupPasswordMode,
} from '@/components/ui/modals/BackupPasswordModal';
import BackupRestoreModeModal, {
  type BackupRestoreMode,
} from '@/components/ui/modals/BackupRestoreModeModal';

/**
 * Mounts a one-shot dialog outside the React tree and resolves once it closes —
 * same pattern as `confirmDialog`, so the backup flow can stay a
 * linear async function inside `useDataBackup`.
 */
function mountDialog<T>(
  render: (resolve: (value: T) => void) => ReactElement,
): Promise<T> {
  return new Promise((resolve) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const finish = (value: T) => {
      root.unmount();
      container.remove();
      resolve(value);
    };

    root.render(render(finish));
  });
}

/**
 * Ask for a backup password. Resolves `null` when the user cancels.
 * In `create` mode the dialog validates length and confirmation itself, so the
 * resolved password is always usable.
 */
export function promptBackupPassword(
  mode: BackupPasswordMode,
): Promise<string | null> {
  return mountDialog<string | null>((resolve) => (
    <BackupPasswordModal
      open
      mode={mode}
      onSubmit={(password) => resolve(password)}
      onCancel={() => resolve(null)}
    />
  ));
}

/**
 * Ask how a decrypted backup should be applied.
 * Resolves `null` when the user cancels.
 */
export function promptBackupRestoreMode(): Promise<BackupRestoreMode | null> {
  return mountDialog<BackupRestoreMode | null>((resolve) => (
    <BackupRestoreModeModal
      open
      onConfirm={(mode) => resolve(mode)}
      onCancel={() => resolve(null)}
    />
  ));
}

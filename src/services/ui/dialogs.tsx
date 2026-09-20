// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { createRoot } from 'react-dom/client';
import ConfirmDialog from '@/components/ui/modals/ConfirmDialog';
import i18n from '@/i18n';

interface ConfirmDialogOptions {
  /** Names what is being decided; the generic "please confirm" otherwise. */
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function confirmDialog(
  message: string,
  options: ConfirmDialogOptions = {},
): Promise<boolean> {
  const {
    title = i18n.t('dialogs.confirmTitle', { ns: 'common' }),
    confirmLabel = 'OK',
    cancelLabel = i18n.t('buttons.cancel', { ns: 'common' }),
  } = options;
  return new Promise((resolve) => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    const handleClose = (val: boolean) => {
      root.unmount();
      container.remove();
      resolve(val);
    };

    root.render(
      <ConfirmDialog
        open={true}
        title={title}
        message={message}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        onConfirm={() => handleClose(true)}
        onCancel={() => handleClose(false)}
      />,
    );
  });
}

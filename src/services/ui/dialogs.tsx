// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { createRoot } from 'react-dom/client';
import type { ComponentProps } from 'react';
import ConfirmDialog from '@/components/ui/modals/ConfirmDialog';
import i18n from '@/i18n';

type ConfirmDialogOptions = Omit<
  ComponentProps<typeof ConfirmDialog>,
  'open' | 'onConfirm' | 'onCancel' | 'cancelLabel'
> & { cancelLabel?: string };

/** Asks in the quiet dialog, for a caller that is no component. */
export function confirmDialog(options: ConfirmDialogOptions): Promise<boolean> {
  const {
    cancelLabel = i18n.t('buttons.cancel', { ns: 'common' }),
    ...dialog
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
        {...dialog}
        open={true}
        cancelLabel={cancelLabel}
        onConfirm={() => handleClose(true)}
        onCancel={() => handleClose(false)}
      />,
    );
  });
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DownloadSimpleIcon } from '@phosphor-icons/react';
import ConfirmDialog from './ConfirmDialog';
import { registerDownloadConfirmationHandler } from '@/utils/ui/downloadConfirmation';

type PendingRequest = {
  filename: string;
  resolve: (confirmed: boolean) => void;
};

/**
 * App-wide dialog asking the user to confirm a file download before it starts
 * (CSV lists, PDF exports, backups). Mounted once in `App`; download code
 * reaches it through `confirmDownload()` so no prop drilling is needed.
 */
export default function DownloadConfirmationHost() {
  const { t } = useTranslation('common');
  const [request, setRequest] = useState<PendingRequest | null>(null);

  useEffect(() => {
    return registerDownloadConfirmationHandler(
      (filename) =>
        new Promise<boolean>((resolve) => {
          setRequest((current) => {
            // A second download while one is pending cancels the stale request.
            current?.resolve(false);
            return { filename, resolve };
          });
        }),
    );
  }, []);

  const settle = (confirmed: boolean) => {
    setRequest((current) => {
      current?.resolve(confirmed);
      return null;
    });
  };

  return (
    <ConfirmDialog
      open={request !== null}
      tone="primary"
      icon={DownloadSimpleIcon}
      title={t('downloadConfirm.title')}
      message={t('downloadConfirm.message', {
        filename: request?.filename ?? '',
      })}
      confirmLabel={t('downloadConfirm.confirm')}
      cancelLabel={t('downloadConfirm.cancel')}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  );
}

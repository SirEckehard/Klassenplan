// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DownloadSimpleIcon } from '@phosphor-icons/react';
import Modal from './Modal';
import {
  cardSurfaceClass,
  primaryButtonClass,
  secondaryButtonClass,
} from '@/utils/ui/designTokens';
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
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

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

  useEffect(() => {
    if (request) {
      confirmButtonRef.current?.focus();
    }
  }, [request]);

  const settle = (confirmed: boolean) => {
    setRequest((current) => {
      current?.resolve(confirmed);
      return null;
    });
  };

  return (
    <Modal
      open={request !== null}
      onClose={() => settle(false)}
      title={t('downloadConfirm.title', 'Datei herunterladen?')}
      icon={<DownloadSimpleIcon size={24} aria-hidden="true" />}
      size="sm"
    >
      <div
        className={`${cardSurfaceClass} p-4 text-sm text-gray-700 shadow-sm dark:text-gray-200`}
      >
        {t('downloadConfirm.message', {
          filename: request?.filename ?? '',
          defaultValue: '„{{filename}}“ wird auf dieses Gerät heruntergeladen.',
        })}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={() => settle(false)}
          className={secondaryButtonClass}
        >
          {t('downloadConfirm.cancel', 'Abbrechen')}
        </button>
        <button
          ref={confirmButtonRef}
          type="button"
          onClick={() => settle(true)}
          className={primaryButtonClass}
        >
          {t('downloadConfirm.confirm', 'Herunterladen')}
        </button>
      </div>
    </Modal>
  );
}

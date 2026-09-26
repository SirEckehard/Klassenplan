// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ClockCounterClockwiseIcon,
  DeviceMobileIcon,
  DownloadIcon,
  HardDrivesIcon,
  TrashIcon,
  UploadIcon,
} from '@phosphor-icons/react';
import ConfirmDialog from '@/components/ui/modals/ConfirmDialog';
import { useStorageHistoryModal } from '@/components/ui/navigation/useStorageHistoryModal';
import { useSeatingPlanActions } from '@/contexts/SeatingPlanContext';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import {
  logError,
  menuItemClass,
  menuItemDangerClass,
  showToast,
  TOAST_MESSAGES,
} from '@/utils';

/**
 * What every settings menu offers: what is stored, how it leaves the device,
 * and the way to wipe it.
 *
 * Two menus show these rows — the footer's gear on the public pages, and the
 * header's on the workspace, which runs at viewport height and has no footer
 * to fall back on. The rows, their modals and their toasts live here once so
 * the two cannot drift apart; the caller brings the `role="menu"` container.
 */
export default function AppSettingsItems({
  onDone,
  storage = true,
}: {
  onDone: () => void;
  /**
   * "Pläne & Verlauf" and the backup. The workspace leaves them out: the foot
   * of every toolbar carries them, on every layer and on the export page, so
   * its gear keeps only what no toolbar holds.
   */
  storage?: boolean;
}) {
  const { t } = useTranslation(['common', 'generator']);
  const { clearAllData, handleExportAll, triggerImport } =
    useSeatingPlanActions();
  // Dismissing the install toast is permanent; this entry stays as the way
  // back in for as long as the browser reports the app as installable.
  const { isInstallable, triggerInstall } = useInstallPrompt();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const history = useStorageHistoryModal();

  const handleShowHistory = () => {
    onDone();
    history.show();
  };

  const handleExportBackup = () => {
    onDone();
    // The success toast is fired by the export itself, once the password has
    // been confirmed and the file has been written.
    handleExportAll().catch((error: unknown) => {
      logError('Backup export failed', { error }, 'AppSettingsItems');
    });
  };

  const handleImportBackup = () => {
    onDone();
    triggerImport();
  };

  const handleInstallApp = () => {
    onDone();
    triggerInstall().catch((error: unknown) => {
      logError('PWA install prompt failed', { error }, 'AppSettingsItems');
    });
  };

  const handleConfirm = async () => {
    try {
      await clearAllData();
      showToast('success', TOAST_MESSAGES.DATA_DELETED);
      setConfirmOpen(false);
    } catch {
      showToast('error', TOAST_MESSAGES.DATA_DELETE_ERROR);
    }
  };

  const iconClass = 'h-4 w-4 shrink-0 text-(--text-muted)';

  return (
    <>
      {storage && (
        <>
          <div className="flex items-center gap-2 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-(--text-muted)">
            <HardDrivesIcon className="h-4 w-4" aria-hidden="true" />
            {t('generator:storage.sectionTitle')}
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={handleShowHistory}
            className={menuItemClass}
          >
            <ClockCounterClockwiseIcon
              className={iconClass}
              aria-hidden="true"
            />
            {t('generator:storage.historyTitle')}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleExportBackup}
            className={menuItemClass}
          >
            <DownloadIcon className={iconClass} aria-hidden="true" />
            {t('generator:storage.exportBackup')}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleImportBackup}
            className={menuItemClass}
          >
            <UploadIcon className={iconClass} aria-hidden="true" />
            {t('generator:storage.importBackup')}
          </button>
        </>
      )}
      {isInstallable && (
        <button
          type="button"
          role="menuitem"
          onClick={handleInstallApp}
          className={menuItemClass}
        >
          <DeviceMobileIcon className={iconClass} aria-hidden="true" />
          {t('common:pwa.install')}
        </button>
      )}
      {(storage || isInstallable) && (
        <div className="my-1 h-px bg-(--border-card)" aria-hidden="true" />
      )}
      <button
        type="button"
        role="menuitem"
        onClick={() => {
          onDone();
          setConfirmOpen(true);
        }}
        className={menuItemDangerClass}
      >
        <TrashIcon className={iconClass} aria-hidden="true" />
        {t('common:footer.clearAllData')}
      </button>

      {history.modal}
      <ConfirmDialog
        open={confirmOpen}
        title={t('common:dialogs.clearAllData.title')}
        message={t('common:dialogs.clearAllData.message')}
        confirmLabel={t('common:dialogs.clearAllData.confirm')}
        cancelLabel={t('common:dialogs.clearAllData.cancel')}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}

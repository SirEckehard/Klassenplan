// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import {
  DeviceMobileIcon,
  DownloadIcon,
  FoldersIcon,
  HardDrivesIcon,
  TrashIcon,
  UploadIcon,
} from '@phosphor-icons/react';
import ConfirmDialog from '@/components/ui/modals/ConfirmDialog';
import { useSeatingPlanActions } from '@/contexts/SeatingPlanContext';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { useLocalizedNavigate } from '@/hooks/useLocalizedNavigate';
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
 * to fall back on. The rows and their toasts live here once so the two cannot
 * drift apart; the caller brings the container, and the dialogs the rows open
 * beside it: choosing a row closes the menu, and a dialog inside the menu
 * would close with it before anybody saw it.
 */
export default function AppSettingsItems({
  onDone,
  onClearAllData,
  storage = true,
  menuItems = true,
}: {
  onDone: () => void;
  /** Opens {@link ClearAllDataDialog}, which asks before anything is wiped. */
  onClearAllData: () => void;
  /**
   * Whether the rows are items of a `role="menu"` (the footer's gear). The
   * header's gear is a dialog that also holds the theme and language
   * switches, which a menu may not contain, so its rows are plain buttons.
   */
  menuItems?: boolean;
  /**
   * "Bibliothek" and the backup. The workspace leaves them out: the foot
   * of every toolbar carries them, on every layer and on the export page, so
   * its gear keeps only what no toolbar holds.
   */
  storage?: boolean;
}) {
  const { t } = useTranslation(['common', 'generator']);
  const itemRole = menuItems ? 'menuitem' : undefined;
  const { handleExportAll, triggerImport } = useSeatingPlanActions();
  // Dismissing the install toast is permanent; this entry stays as the way
  // back in for as long as the browser reports the app as installable.
  const { isInstallable, triggerInstall } = useInstallPrompt();
  const navigate = useLocalizedNavigate();

  // "Bibliothek" is a page of the workspace (decision 0024); its way
  // back leads here again.
  const handleShowHistory = () => {
    onDone();
    navigate('/bibliothek');
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
            role={itemRole}
            onClick={handleShowHistory}
            className={menuItemClass}
          >
            <FoldersIcon className={iconClass} aria-hidden="true" />
            {t('generator:storage.historyTitle')}
          </button>
          <button
            type="button"
            role={itemRole}
            onClick={handleExportBackup}
            className={menuItemClass}
          >
            <DownloadIcon className={iconClass} aria-hidden="true" />
            {t('generator:storage.exportBackup')}
          </button>
          <button
            type="button"
            role={itemRole}
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
          role={itemRole}
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
        role={itemRole}
        onClick={() => {
          onDone();
          onClearAllData();
        }}
        className={menuItemDangerClass}
      >
        <TrashIcon className={iconClass} aria-hidden="true" />
        {t('common:footer.clearAllData')}
      </button>
    </>
  );
}

/**
 * Asks before every class, plan and setting is wiped. Rendered by the host
 * beside its menu, not in it (see {@link AppSettingsItems}).
 */
export function ClearAllDataDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation('common');
  const { clearAllData } = useSeatingPlanActions();

  const handleConfirm = async () => {
    try {
      await clearAllData();
      showToast('success', TOAST_MESSAGES.DATA_DELETED);
      onClose();
    } catch {
      showToast('error', TOAST_MESSAGES.DATA_DELETE_ERROR);
    }
  };

  return (
    <ConfirmDialog
      open={open}
      title={t('dialogs.clearAllData.title')}
      message={t('dialogs.clearAllData.message')}
      confirmLabel={t('dialogs.clearAllData.confirm')}
      cancelLabel={t('dialogs.clearAllData.cancel')}
      onConfirm={handleConfirm}
      onCancel={onClose}
    />
  );
}

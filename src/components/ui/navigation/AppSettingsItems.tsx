// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DeviceMobileIcon, TrashIcon } from '@phosphor-icons/react';
import ConfirmDialog from '@/components/ui/modals/ConfirmDialog';
import { useSeatingPlanActions } from '@/contexts/SeatingPlanContext';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { isRunningInstalled } from '@/utils/ui/installGuide';
import {
  logError,
  menuItemClass,
  menuItemDangerClass,
  showToast,
  TOAST_MESSAGES,
} from '@/utils';

// Opened beside the menu like the confirm dialog below, and loaded with it.
export { default as InstallGuideDialog } from '@/components/pwa/InstallGuideDialog';

/**
 * The settings gear's rows about the app on this device: installing it, and
 * the way to wipe what it stored. "Bibliothek" and the backup are not among
 * them — the foot of every toolbar carries those.
 *
 * Apart from the menu (`AppSettingsMenu`) so they load on demand with the
 * dialogs they open. The menu renders those dialogs beside itself: choosing
 * a row closes the menu, and a dialog inside it would close with it before
 * anybody saw it.
 */
export default function AppSettingsItems({
  onDone,
  onClearAllData,
  onShowInstallGuide,
}: {
  onDone: () => void;
  /** Opens {@link ClearAllDataDialog}, which asks before anything is wiped. */
  onClearAllData: () => void;
  /**
   * Opens {@link InstallGuideDialog}, for a browser that offers no install
   * prompt of its own. Without it the entry shows only where one is offered.
   */
  onShowInstallGuide?: () => void;
}) {
  const { t } = useTranslation('common');
  // Dismissing the install toast is permanent; this entry stays as the way
  // back in. Where the browser offers no prompt — Safari, Firefox, a Chrome
  // that has not offered it yet — it opens the guide instead, and it goes
  // away once the page runs as the installed app.
  const { isInstallable, triggerInstall } = useInstallPrompt();
  const installed = useMemo(() => isRunningInstalled(), []);
  const showInstall =
    !installed && (isInstallable || onShowInstallGuide !== undefined);

  const handleInstallApp = () => {
    onDone();
    if (!isInstallable) {
      onShowInstallGuide?.();
      return;
    }
    triggerInstall().catch((error: unknown) => {
      logError('PWA install prompt failed', { error }, 'AppSettingsItems');
    });
  };

  const iconClass = 'h-4 w-4 shrink-0 text-(--text-muted)';

  return (
    <>
      {showInstall && (
        <button
          type="button"
          onClick={handleInstallApp}
          className={menuItemClass}
        >
          <DeviceMobileIcon className={iconClass} aria-hidden="true" />
          {t('pwa.install')}
        </button>
      )}
      {showInstall && (
        <div className="my-1 h-px bg-(--border-card)" aria-hidden="true" />
      )}
      <button
        type="button"
        onClick={() => {
          onDone();
          onClearAllData();
        }}
        className={menuItemDangerClass}
      >
        <TrashIcon className={iconClass} aria-hidden="true" />
        {t('footer.clearAllData')}
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

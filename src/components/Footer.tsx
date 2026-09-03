// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React, { useEffect, useRef, useState } from 'react';
import {
  HandHeartIcon,
  TrashIcon,
  GearIcon,
  MailboxIcon,
  QuestionIcon,
  GitDiffIcon,
  IdentificationCardIcon,
  ShieldCheckIcon,
  GithubLogoIcon,
  HardDrivesIcon,
  DownloadIcon,
  UploadIcon,
  ClockCounterClockwiseIcon,
  DeviceMobileIcon,
} from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import AppearanceControls from '@/components/ui/navigation/AppearanceControls';
import { useInstallPrompt } from '@/hooks/useInstallPrompt';
import { LocalizedLink } from './LocalizedLink';
import { useSeatingPlanActions } from '@/contexts/SeatingPlanContext';
import { showToast, TOAST_MESSAGES } from '@/utils/ui/toast';
import { logError, menuSurfaceClass } from '@/utils';
import ConfirmDialog from '@/components/ui/modals/ConfirmDialog';
import StorageHistoryModal from '@/components/ui/navigation/StorageHistoryModal';
import { GITHUB_REPO_URL } from '@/config/links';
import { getAppVersion } from '@/utils/version';

const Footer: React.FC = () => {
  const { t } = useTranslation('common');
  const { clearAllData, handleExportAll, triggerImport } =
    useSeatingPlanActions();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  // Dismissing the install toast is permanent; this menu entry stays as the
  // way back in for as long as the browser reports the app as installable.
  const { isInstallable, triggerInstall } = useInstallPrompt();

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  const handleConfirm = async () => {
    try {
      await clearAllData();
      showToast('success', TOAST_MESSAGES.DATA_DELETED);
      setConfirmOpen(false);
    } catch {
      showToast('error', TOAST_MESSAGES.DATA_DELETE_ERROR);
    }
  };

  const handleShowAllPlans = () => {
    setMenuOpen(false);
    setHistoryModalOpen(true);
  };

  const handleExportBackup = () => {
    setMenuOpen(false);
    // The success toast is fired by the export itself, once the password has
    // been confirmed and the file has been written.
    handleExportAll();
  };

  const handleImportBackup = () => {
    setMenuOpen(false);
    triggerImport();
  };

  const handleInstallApp = () => {
    setMenuOpen(false);
    triggerInstall().catch((error: unknown) => {
      logError('PWA install prompt failed', { error }, 'Footer');
    });
  };

  const linkClass =
    'inline-flex min-h-9 sm:min-h-11 items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition px-1.5 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm rounded whitespace-nowrap';
  const separatorClass = 'hidden sm:inline text-gray-300 dark:text-gray-600';
  const navGroupClass =
    'flex flex-wrap items-center justify-center gap-x-1 px-1 text-gray-600 dark:text-gray-300';

  return (
    <footer className="px-4 py-2 flex flex-wrap items-stretch justify-center lg:justify-between gap-2 bg-linear-to-b from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800 text-sm">
      {/* Navigation */}
      <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-1 gap-y-0.5 sm:gap-2">
        {/* Brand */}
        <nav className={navGroupClass}>
          <LocalizedLink
            to="/"
            className={linkClass}
            title={t('nav.titles.home')}
          >
            <img
              src="/brand/master/klassenplan-mark.svg"
              className="h-4 w-4"
              aria-hidden="true"
              alt=""
            />
            {t('nav.home')}
          </LocalizedLink>
        </nav>

        {/* Hilfe & Kontakt */}
        <nav className={navGroupClass}>
          <LocalizedLink
            to="/faq"
            className={linkClass}
            title={t('nav.titles.faq')}
          >
            <QuestionIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {t('nav.faq')}
          </LocalizedLink>
          <span className={separatorClass}>|</span>
          <LocalizedLink
            to="/feedback"
            className={linkClass}
            title={t('nav.titles.feedback')}
          >
            <MailboxIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {t('nav.feedback')}
          </LocalizedLink>
          <span className={separatorClass}>|</span>
          <LocalizedLink
            to="/support"
            className={linkClass}
            title={t('nav.titles.support')}
          >
            <HandHeartIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {t('nav.support')}
          </LocalizedLink>
        </nav>

        {/* Info & Rechtliches */}
        <nav className={navGroupClass}>
          <LocalizedLink
            to="/changelog"
            className={linkClass}
            title={t('nav.titles.changelog')}
          >
            <GitDiffIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {t('nav.changelog')}
            <span className="text-gray-400 dark:text-gray-500">
              v{getAppVersion()}
            </span>
          </LocalizedLink>
          <span className={separatorClass}>|</span>
          <LocalizedLink
            to="/datenschutz"
            className={linkClass}
            title={t('nav.titles.datenschutz')}
          >
            <ShieldCheckIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {t('nav.datenschutz')}
          </LocalizedLink>
          <span className={separatorClass}>|</span>
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
            title={t('nav.titles.github')}
          >
            <GithubLogoIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {t('nav.github')}
          </a>
          <span className={separatorClass}>|</span>
          <LocalizedLink
            to="/impressum"
            className={linkClass}
            title={t('nav.titles.impressum')}
          >
            <IdentificationCardIcon
              className="h-3.5 w-3.5"
              aria-hidden="true"
            />
            {t('nav.impressum')}
          </LocalizedLink>
        </nav>
      </div>

      {/* Aktionen */}
      <div className="flex justify-center items-center gap-2 px-2">
        <AppearanceControls />
        <span className="text-gray-300 dark:text-gray-600" aria-hidden="true">
          |
        </span>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="group flex items-center p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
            aria-label={t('footer.settings')}
            title={t('footer.settings')}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <GearIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors" />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className={`${menuSurfaceClass} absolute right-0 bottom-full mb-2 min-w-52 p-1`}
            >
              <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
                <HardDrivesIcon className="h-4 w-4" aria-hidden="true" />
                {t('generator:storage.sectionTitle')}
              </div>
              <button
                type="button"
                role="menuitem"
                onClick={handleShowAllPlans}
                className={storageMenuItemClass}
              >
                <ClockCounterClockwiseIcon className="h-4 w-4 text-purple-600" />
                {t('generator:storage.showAllPlans')}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={handleExportBackup}
                className={storageMenuItemClass}
              >
                <DownloadIcon className="h-4 w-4 text-green-600" />
                {t('generator:storage.exportBackup')}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={handleImportBackup}
                className={storageMenuItemClass}
              >
                <UploadIcon className="h-4 w-4 text-blue-600" />
                {t('generator:storage.importBackup')}
              </button>
              {isInstallable && (
                <>
                  <div className="my-1 h-px bg-gray-200 dark:bg-gray-700" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleInstallApp}
                    className={storageMenuItemClass}
                  >
                    <DeviceMobileIcon className="h-4 w-4 text-blue-600" />
                    {t('pwa.install')}
                  </button>
                </>
              )}
              <div className="my-1 h-px bg-gray-200 dark:bg-gray-700" />
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  setConfirmOpen(true);
                }}
                className="group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-red-50 dark:text-gray-200 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
              >
                <TrashIcon className="h-4 w-4 text-gray-500 group-hover:text-red-500 dark:text-gray-400 dark:group-hover:text-red-400 transition-colors" />
                {t('footer.clearAllData')}
              </button>
            </div>
          )}
        </div>
      </div>
      <StorageHistoryModal
        open={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
      />
      <ConfirmDialog
        open={confirmOpen}
        title={t('dialogs.clearAllData.title')}
        message={t('dialogs.clearAllData.message')}
        confirmLabel={t('dialogs.clearAllData.confirm')}
        cancelLabel={t('dialogs.clearAllData.cancel')}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </footer>
  );
};

// Storage menu item style (blue hover variant of the footer menu items)
const storageMenuItemClass =
  'group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 dark:text-gray-200 dark:hover:bg-blue-950/40 transition-colors cursor-pointer';

export default Footer;

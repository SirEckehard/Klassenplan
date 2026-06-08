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
} from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import ThemeToggle from './ThemeToggle';
import LanguageSelector from './LanguageSelector';
import { LocalizedLink } from './LocalizedLink';
import { useSeatingPlanActions } from '@/contexts/SeatingPlanContext';
import { showToast, TOAST_MESSAGES } from '@/utils/ui/toast';
import { menuSurfaceClass } from '@/utils';
import ConfirmDialog from '@/components/ui/modals/ConfirmDialog';
import { GITHUB_REPO_URL } from '@/config/links';

const Footer: React.FC = () => {
  const { t } = useTranslation('common');
  const { clearAllData } = useSeatingPlanActions();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  const linkClass =
    'inline-flex min-h-11 items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium transition px-2 py-2 text-xs sm:text-sm sm:px-3 rounded whitespace-nowrap';
  const separatorClass = 'text-gray-300 dark:text-gray-600';
  const navGroupClass =
    'flex flex-wrap items-center gap-x-1 px-3 py-1.5 rounded-lg bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50 text-gray-600 dark:text-gray-300';

  return (
    <footer className="px-4 py-2 flex flex-wrap items-stretch justify-center lg:justify-between gap-2 bg-linear-to-b from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800 text-sm">
      {/* Navigation */}
      <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
        {/* Brand */}
        <nav className={navGroupClass}>
          <LocalizedLink to="/" className={linkClass}>
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
          <LocalizedLink to="/faq" className={linkClass}>
            <QuestionIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {t('nav.faq')}
          </LocalizedLink>
          <span className={separatorClass}>|</span>
          <LocalizedLink to="/support" className={linkClass}>
            <HandHeartIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {t('nav.support')}
          </LocalizedLink>
          <span className={separatorClass}>|</span>
          <LocalizedLink to="/feedback" className={linkClass}>
            <MailboxIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {t('nav.feedback')}
          </LocalizedLink>
        </nav>

        {/* Info & Rechtliches */}
        <nav className={navGroupClass}>
          <LocalizedLink to="/changelog" className={linkClass}>
            <GitDiffIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {t('nav.changelog')}
          </LocalizedLink>
          <span className={separatorClass}>|</span>
          <LocalizedLink to="/impressum" className={linkClass}>
            <IdentificationCardIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {t('nav.impressum')}
          </LocalizedLink>
          <span className={separatorClass}>|</span>
          <LocalizedLink to="/datenschutz" className={linkClass}>
            <ShieldCheckIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {t('nav.datenschutz')}
          </LocalizedLink>
          <span className={separatorClass}>|</span>
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            <GithubLogoIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {t('nav.github')}
          </a>
        </nav>
      </div>

      {/* Aktionen */}
      <div className="flex justify-center items-center gap-2 px-3 py-1.5 rounded-lg bg-white/50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50">
        <ThemeToggle />
        <span className="text-gray-300 dark:text-gray-600">|</span>
        <LanguageSelector />
        <span className="text-gray-300 dark:text-gray-600">|</span>
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
              className={`${menuSurfaceClass} absolute right-0 bottom-full mb-2 min-w-48 p-1`}
            >
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

export default Footer;

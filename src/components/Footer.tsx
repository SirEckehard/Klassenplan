// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import {
  HandHeartIcon,
  GearIcon,
  MailboxIcon,
  QuestionIcon,
  GitDiffIcon,
  IdentificationCardIcon,
  ShieldCheckIcon,
  GithubLogoIcon,
} from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import AppearanceControls from '@/components/ui/navigation/AppearanceControls';
import UpdateCheckButton from '@/components/pwa/UpdateCheckButton';
import { LocalizedLink } from './LocalizedLink';
import { LegalPageLink } from './LegalPageLink';
import { menuSurfaceClass } from '@/utils';
import { GITHUB_REPO_URL } from '@/config/links';

// Behind a menu in both places it appears, so the storage dialogs, the confirm
// dialog and their icons stay out of the cold-start payload.
const AppSettingsItems = lazy(
  () => import('@/components/ui/navigation/AppSettingsItems'),
);
import { getAppVersion } from '@/utils/version';
import { useDialogLayer } from '@/hooks/ui/useDialogLayer';

const Footer: React.FC = () => {
  const { t } = useTranslation('common');
  const [menuOpen, setMenuOpen] = useState(false);
  // The settings menu owns Escape while it is open; the views underneath check
  // the layer registry before acting on it.
  useDialogLayer(menuOpen);
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

  const linkClass =
    'inline-flex min-h-9 sm:min-h-11 items-center gap-1 text-(--text-badge) hover:text-(--text-badge) font-medium transition px-1.5 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm rounded whitespace-nowrap';
  const separatorClass = 'hidden sm:inline text-(--border-card)';
  const navGroupClass =
    'flex flex-wrap items-center justify-center gap-x-1 px-1 text-(--text-muted)';

  return (
    <footer className="px-4 py-2 flex flex-wrap items-stretch justify-center lg:justify-between gap-2 bg-(--surface-page) text-sm">
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
            <span className="text-(--text-muted)">v{getAppVersion()}</span>
          </LocalizedLink>
          <span className={separatorClass}>|</span>
          <LegalPageLink
            to="/datenschutz"
            className={linkClass}
            title={t('nav.titles.datenschutz')}
          >
            <ShieldCheckIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {t('nav.datenschutz')}
          </LegalPageLink>
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
          <LegalPageLink
            to="/impressum"
            className={linkClass}
            title={t('nav.titles.impressum')}
          >
            <IdentificationCardIcon
              className="h-3.5 w-3.5"
              aria-hidden="true"
            />
            {t('nav.impressum')}
          </LegalPageLink>
        </nav>
      </div>

      {/* Aktionen */}
      <div className="flex justify-center items-center gap-2 px-2">
        <AppearanceControls />
        <span className="text-(--border-card)" aria-hidden="true">
          |
        </span>
        <UpdateCheckButton />
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="group flex items-center p-1.5 rounded hover:bg-(--surface-option-selected) transition-colors cursor-pointer"
            aria-label={t('footer.settings')}
            title={t('footer.settings')}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <GearIcon className="h-4 w-4 text-(--text-badge) group-hover:text-(--text-badge) transition-colors" />
          </button>
          {menuOpen && (
            <div
              role="menu"
              aria-label={t('footer.settings')}
              className={`${menuSurfaceClass} absolute right-0 bottom-full mb-2 min-w-56 p-1`}
            >
              <Suspense fallback={null}>
                <AppSettingsItems onDone={() => setMenuOpen(false)} />
              </Suspense>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
};

export default Footer;

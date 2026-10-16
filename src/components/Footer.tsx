// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { LocalizedLink } from './LocalizedLink';
import { LegalPageLink } from './LegalPageLink';
import { getAppVersion } from '@/utils/version';
import { APP_RETURN_STATE } from '@/hooks/useReturnToApp';

const linkClass =
  'inline-flex min-h-9 items-center gap-1 rounded px-1 text-(--text-muted) transition hover:text-(--text-page) whitespace-nowrap pointer-coarse:min-h-11';

/**
 * The foot of the pages beside the app: one line of plain links.
 *
 * Theme, language, the update check, the backup and wiping the data moved to
 * the gear at the right of the page's head (`AppSettingsMenu`), the same menu
 * in the same place as in the workspace; with them and their icons in the
 * footer it broke onto a second line on an iPad. The imprint and the privacy
 * policy stay here as words, where a visitor looks for them — behind a gear
 * they would not be "easily recognisable" (§ 5 DDG). The lockup in the head
 * leads home, so the footer does not repeat it. Every link offers the way
 * back on the page it opens (`APP_RETURN_STATE`).
 */
const Footer: React.FC = () => {
  const { t } = useTranslation('common');

  return (
    <footer className="bg-(--surface-page) px-4 py-3 text-sm">
      <nav
        aria-label={t('footer.navLabel')}
        className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1"
      >
        <LocalizedLink
          to="/faq"
          state={APP_RETURN_STATE}
          className={linkClass}
          title={t('nav.titles.faq')}
        >
          {t('nav.faq')}
        </LocalizedLink>
        <LocalizedLink
          to="/feedback"
          state={APP_RETURN_STATE}
          className={linkClass}
          title={t('nav.titles.feedback')}
        >
          {t('nav.feedback')}
        </LocalizedLink>
        <LocalizedLink
          to="/support"
          state={APP_RETURN_STATE}
          className={linkClass}
          title={t('nav.titles.support')}
        >
          {t('nav.support')}
        </LocalizedLink>
        <LocalizedLink
          to="/changelog"
          state={APP_RETURN_STATE}
          className={linkClass}
          title={t('nav.titles.changelog')}
        >
          {t('nav.changelog')}{' '}
          <span className="tabular-nums">v{getAppVersion()}</span>
        </LocalizedLink>
        <LegalPageLink
          to="/datenschutz"
          state={APP_RETURN_STATE}
          className={linkClass}
          title={t('nav.titles.datenschutz')}
        >
          {t('nav.datenschutz')}
        </LegalPageLink>
        <LegalPageLink
          to="/impressum"
          state={APP_RETURN_STATE}
          className={linkClass}
          title={t('nav.titles.impressum')}
        >
          {t('nav.impressum')}
        </LegalPageLink>
      </nav>
    </footer>
  );
};

export default Footer;

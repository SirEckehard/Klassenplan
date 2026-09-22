// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { LocalizedLink } from '@/components/LocalizedLink';
import { KpLockup } from '@/components/KpLockup';
import ReturnToAppLink from '@/components/ReturnToAppLink';

/**
 * The top of a page outside the workspace: the lockup leading home, and —
 * when the app opened the page — the way back to it.
 */
export default function PublicPageHeader({
  bannerLabel,
}: {
  /** Names the banner landmark, e.g. "FAQ Überblick". */
  bannerLabel: string;
}) {
  const { t } = useTranslation('pages');

  return (
    <header
      role="banner"
      aria-label={bannerLabel}
      className="flex items-center justify-between gap-4 py-8"
    >
      <LocalizedLink
        to="/"
        className="kp-lockup focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary) focus-visible:ring-offset-2"
        aria-label={t('header.homeLink')}
      >
        <KpLockup size="md" />
      </LocalizedLink>
      <ReturnToAppLink />
    </header>
  );
}

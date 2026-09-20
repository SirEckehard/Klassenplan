// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { MailboxIcon, GithubLogoIcon } from '@phosphor-icons/react';
import Seo from '@/components/Seo';
import { LocalizedLink } from '@/components/LocalizedLink';
import { cardSurfaceClass, primaryButtonClass } from '@/utils';
import { KpLockup } from '@/components/KpLockup';
import { usePageSeo } from '@/hooks/usePageSeo';
import { CONTACT_EMAIL, GITHUB_REPO_URL } from '@/config/links';

// Contact page that points users to email instead of a form
export default function Feedback() {
  const { t } = useTranslation('pages');
  const metadata = usePageSeo('/feedback');
  const contactEmail = CONTACT_EMAIL;

  return (
    <main
      id="main"
      tabIndex={-1}
      className="min-h-[80vh] bg-(--surface-page) px-4 py-12"
    >
      <Seo
        {...metadata}
        structuredData={{
          '@type': 'ContactPage',
          name: metadata.title,
          description: metadata.description,
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer support',
            email: contactEmail,
            url: `mailto:${contactEmail}`,
          },
        }}
      />
      <div className="mx-auto flex max-w-4xl flex-col gap-10">
        <header
          className="text-center"
          role="banner"
          aria-label={t('header.banner.feedback')}
        >
          <LocalizedLink
            to="/"
            className="kp-lockup focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary) focus-visible:ring-offset-2"
            aria-label={t('header.homeLink')}
          >
            <KpLockup size="md" />
          </LocalizedLink>
        </header>

        <section
          className={`${cardSurfaceClass} border px-5 py-5 sm:px-8 sm:py-8`}
          aria-labelledby="feedback-title"
        >
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-(--border-card) bg-(--surface-option-selected) text-(--text-badge) shadow-sm/20">
                <MailboxIcon aria-hidden="true" className="h-6 w-6" />
              </span>
              <h2
                id="feedback-title"
                className="text-xl font-semibold sm:text-2xl"
              >
                {t('feedback.title')}
              </h2>
            </div>

            <div className="text-center space-y-4 text-(--text-muted)">
              <p>{t('feedback.description')}</p>
              <a
                className={`${primaryButtonClass} px-5 py-2 text-base font-semibold`}
                href={`mailto:${contactEmail}`}
              >
                {contactEmail}
              </a>
            </div>

            <div
              className={`${cardSurfaceClass} border px-4 py-4 text-sm text-(--text-muted)`}
            >
              <p>{t('feedback.bugNote')}</p>
            </div>

            <div
              className={`${cardSurfaceClass} border px-4 py-4 text-sm text-(--text-muted)`}
            >
              <p className="flex items-center gap-2">
                <GithubLogoIcon
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0"
                />
                <span>
                  {t('feedback.githubNote')}{' '}
                  <a
                    href={GITHUB_REPO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-(--text-badge) underline hover:text-(--text-badge)"
                  >
                    {t('feedback.githubLink')}
                  </a>
                </span>
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

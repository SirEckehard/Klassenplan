// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import {
  ArrowRightIcon,
  ArrowUpRightIcon,
  BugIcon,
  EnvelopeSimpleIcon,
  GithubLogoIcon,
  QuestionIcon,
} from '@phosphor-icons/react';
import Seo from '@/components/Seo';
import { LocalizedLink } from '@/components/LocalizedLink';
import PublicPageHeader from '@/components/publicPage/PublicPageHeader';
import {
  pageEyebrowClass,
  pageTitleClass,
} from '@/components/publicPage/pageTokens';
import { primaryButtonClass, quietLinkClass } from '@/utils';
import { usePageSeo } from '@/hooks/usePageSeo';
import { CONTACT_EMAIL, GITHUB_REPO_URL } from '@/config/links';

// Contact page that points users to email instead of a form
export default function Feedback() {
  const { t } = useTranslation('pages');
  const metadata = usePageSeo('/feedback');
  const contactEmail = CONTACT_EMAIL;

  const notes = [
    {
      key: 'faq',
      icon: QuestionIcon,
      link: (
        <LocalizedLink to="/faq" className={`${quietLinkClass} text-sm`}>
          {t('feedback.notes.faq.link')}
          <ArrowRightIcon size={14} aria-hidden="true" />
        </LocalizedLink>
      ),
    },
    { key: 'bugs', icon: BugIcon, link: null },
    {
      key: 'code',
      icon: GithubLogoIcon,
      link: (
        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={`${quietLinkClass} text-sm`}
        >
          {t('feedback.notes.code.link')}
          <ArrowUpRightIcon size={14} aria-hidden="true" />
        </a>
      ),
    },
  ];

  return (
    <main id="main" tabIndex={-1} className="bg-(--surface-page) px-4 sm:px-6">
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
      <div className="mx-auto max-w-6xl">
        <PublicPageHeader bannerLabel={t('header.banner.feedback')} />

        <div className="grid gap-12 pt-4 pb-16 lg:grid-cols-12 lg:pb-24">
          <div className="lg:col-span-7">
            <p className={pageEyebrowClass}>{t('feedback.eyebrow')}</p>
            <h1 className={pageTitleClass}>{t('feedback.title')}</h1>
            <p className="mt-6 max-w-xl text-lg text-pretty text-(--text-muted)">
              {t('feedback.description')}
            </p>

            {/* The page's one action. The address is its label, so it can
                be read off and typed where no mail program opens. */}
            <a
              href={`mailto:${contactEmail}`}
              className={`${primaryButtonClass} mt-8 w-full gap-2 px-6 py-3 text-base font-semibold wrap-anywhere sm:w-auto`}
            >
              <EnvelopeSimpleIcon size={20} aria-hidden="true" />
              {contactEmail}
            </a>
          </div>

          <section aria-labelledby="feedback-notes" className="lg:col-span-5">
            <h2 id="feedback-notes" className={pageEyebrowClass}>
              {t('feedback.notes.title')}
            </h2>
            <ul className="mt-3 border-t border-(--border-card)">
              {notes.map((note) => (
                <li
                  key={note.key}
                  className="flex gap-4 border-b border-(--border-card) py-5"
                >
                  <note.icon
                    size={22}
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-(--text-muted)"
                  />
                  <div className="min-w-0">
                    <h3 className="font-semibold text-(--text-page)">
                      {t(`feedback.notes.${note.key}.title`)}
                    </h3>
                    <p className="mt-1 text-pretty text-(--text-muted)">
                      {t(`feedback.notes.${note.key}.text`)}
                    </p>
                    {note.link && <div className="mt-2">{note.link}</div>}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}

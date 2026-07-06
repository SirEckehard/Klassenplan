// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { HandHeartIcon } from '@phosphor-icons/react';
import Seo from '@/components/Seo';
import { LocalizedLink } from '@/components/LocalizedLink';
import { cardSurfaceClass } from '@/utils';
import { KpLockup } from '@/components/KpLockup';
import { usePageSeo } from '@/hooks/usePageSeo';

export default function Support() {
  const { t } = useTranslation('pages');
  const metadata = usePageSeo('/support');

  return (
    <main
      id="main"
      tabIndex={-1}
      className="min-h-[80vh] bg-linear-to-b from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 px-4 py-12"
    >
      <Seo {...metadata} />
      <div className="mx-auto flex max-w-4xl flex-col gap-10">
        <header
          className="text-center"
          role="banner"
          aria-label="Support Überblick"
        >
          <LocalizedLink
            to="/"
            className="kp-lockup focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            aria-label="Zur Startseite"
          >
            <KpLockup size="md" />
          </LocalizedLink>
        </header>

        <section
          className={`${cardSurfaceClass} border px-5 py-5 sm:px-8 sm:py-8`}
          aria-labelledby="support-content"
        >
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm dark:border-blue-900/40 dark:bg-blue-500/20 dark:text-blue-200">
                <HandHeartIcon aria-hidden="true" className="h-6 w-6" />
              </span>
              <h2
                id="support-content"
                className="text-xl font-semibold sm:text-2xl"
              >
                {t('support.title')}
              </h2>
            </div>

            <div className="space-y-4 text-gray-700 dark:text-gray-300">
              <p>{t('support.description1')}</p>
              <p>{t('support.description2')}</p>
            </div>

            <a
              href="https://www.paypal.com/donate/?hosted_button_id=995GP57S2EA9G"
              target="_top"
              rel="noopener noreferrer"
              aria-label="Support Klassenplan with a donation"
              className="group flex w-full items-center gap-4 rounded-lg bg-blue-600 p-4 text-white transition-colors hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              <span
                aria-hidden="true"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-amber-500 transition-colors group-hover:bg-amber-400 dark:bg-amber-400 dark:group-hover:bg-amber-300"
              >
                <HandHeartIcon className="h-6 w-6" />
              </span>

              <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
                <span className="text-base font-bold leading-tight tracking-tight">
                  Support Klassenplan
                </span>
                <span className="text-sm opacity-80">
                  Donate via PayPal or credit card
                </span>
              </span>

              <svg
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-1 shrink-0 opacity-60 transition-all group-hover:translate-x-0.5 group-hover:opacity-90"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}

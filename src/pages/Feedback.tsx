import { useTranslation } from 'react-i18next';
import { MailboxIcon } from '@phosphor-icons/react';
import Seo from '@/components/Seo';
import { LocalizedLink } from '@/components/LocalizedLink';
import { cardSurfaceClass, primaryButtonClass } from '@/utils';
import { KpLockup } from '@/components/KpLockup';
import { usePageSeo } from '@/hooks/usePageSeo';

// Contact page that points users to email instead of a form
export default function Feedback() {
  const { t } = useTranslation('pages');
  const metadata = usePageSeo('/feedback');
  const contactEmail = 'webmaster@klassenplan.de';

  return (
    <main id="main" tabIndex={-1} className="min-h-[80vh] bg-linear-to-b from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 px-4 py-12">
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
          aria-label="Feedback Überblick"
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
          className={`${cardSurfaceClass} border px-8 py-8`}
          aria-labelledby="feedback-title"
        >
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm dark:border-blue-900/40 dark:bg-blue-500/20 dark:text-blue-200">
                <MailboxIcon aria-hidden="true" className="h-6 w-6" />
              </span>
              <h2 id="feedback-title" className="text-2xl font-semibold">
                {t('feedback.title')}
              </h2>
            </div>

            <div className="text-center space-y-4 text-gray-700 dark:text-gray-300">
              <p>{t('feedback.description')}</p>
              <a
                className={`${primaryButtonClass} px-5 py-2 text-base font-semibold`}
                href={`mailto:${contactEmail}`}
              >
                {contactEmail}
              </a>
            </div>

            <div
              className={`${cardSurfaceClass} border px-4 py-4 text-sm text-gray-600 dark:text-gray-300`}
            >
              <p>{t('feedback.bugNote')}</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

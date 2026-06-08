import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { HouseLineIcon } from '@phosphor-icons/react';
import Seo from '@/components/Seo';
import { LocalizedLink } from '@/components/LocalizedLink';
import { KpLockup } from '@/components/KpLockup';
import { cardSurfaceClass, primaryButtonClass } from '@/utils';

export default function NotFound() {
  const { t, i18n } = useTranslation('common');
  const location = useLocation();
  const lang = i18n.language === 'en' ? 'en' : 'de';

  return (
    <main
      id="main"
      tabIndex={-1}
      className="min-h-[80vh] bg-linear-to-b from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 px-4 py-12"
    >
      <Seo
        title={t('notFound.title')}
        description={t('notFound.message')}
        path={location.pathname}
        lang={lang}
        ogType="website"
        noindex
      />
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-10 text-center">
        <LocalizedLink
          to="/"
          className="kp-lockup focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          aria-label={t('notFound.home')}
        >
          <KpLockup size="md" />
        </LocalizedLink>

        <section
          className={`${cardSurfaceClass} border border-blue-100/60 p-8 dark:border-blue-900/40`}
        >
          <p className="text-6xl font-bold text-blue-600 dark:text-blue-400">
            {t('notFound.code')}
          </p>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            {t('notFound.title')}
          </h1>
          <p className="mt-3 text-gray-600 dark:text-gray-300">
            {t('notFound.message')}
          </p>
          <LocalizedLink to="/" className={`${primaryButtonClass} mt-8`}>
            <HouseLineIcon aria-hidden="true" className="h-5 w-5" />
            {t('notFound.home')}
          </LocalizedLink>
        </section>
      </div>
    </main>
  );
}

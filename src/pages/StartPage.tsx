import {
  ShieldCheckIcon,
  BrainIcon,
  CursorClickIcon,
  QuestionIcon,
  AddressBookTabsIcon,
  HouseLineIcon,
  GridNineIcon,
  MailboxIcon,
  FilePdfIcon,
  HandHeartIcon,
} from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import Seo from '@/components/Seo';
import { LocalizedLink } from '@/components/LocalizedLink';
import { cardSurfaceClass, primaryButtonClass } from '@/utils';
import { KpLockup } from '@/components/KpLockup';
import { usePageSeo } from '@/hooks/usePageSeo';
import HeroMockup from '@/components/HeroMockup';

const benefits = [
  {
    icon: ShieldCheckIcon,
    titleKey: 'startPage.whyKlassenplanItems.privacy',
    descKey: 'startPage.whyKlassenplanItems.privacyDescription',
    color: 'text-green-600 dark:text-green-500',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    borderColor: 'border-t-2 border-t-green-500!',
  },
  {
    icon: CursorClickIcon,
    titleKey: 'startPage.whyKlassenplanItems.editor',
    descKey: 'startPage.whyKlassenplanItems.editorDescription',
    color: 'text-amber-600 dark:text-amber-500',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    borderColor: 'border-t-2 border-t-amber-500!',
  },
  {
    icon: BrainIcon,
    titleKey: 'startPage.whyKlassenplanItems.algorithm',
    descKey: 'startPage.whyKlassenplanItems.algorithmDescription',
    color: 'text-blue-600 dark:text-blue-500',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    borderColor: 'border-t-2 border-t-blue-500!',
  },
] as const;

const steps = [
  {
    icon: AddressBookTabsIcon,
    titleKey: 'startPage.howItWorksItems.step1Title',
    textKey: 'startPage.howItWorksItems.step1Text',
  },
  {
    icon: HouseLineIcon,
    titleKey: 'startPage.howItWorksItems.step2Title',
    textKey: 'startPage.howItWorksItems.step2Text',
  },
  {
    icon: GridNineIcon,
    titleKey: 'startPage.howItWorksItems.step3Title',
    textKey: 'startPage.howItWorksItems.step3Text',
  },
  {
    icon: FilePdfIcon,
    titleKey: 'startPage.howItWorksItems.step4Title',
    textKey: 'startPage.howItWorksItems.step4Text',
  },
] as const;

export default function StartPage() {
  const { t } = useTranslation('pages');
  const metadata = usePageSeo('/');

  return (
    <main id="main" tabIndex={-1} className="min-h-[80vh] px-4 py-12 bg-linear-to-b from-slate-50 to-slate-100 dark:from-gray-900 dark:to-gray-800 dark:text-white">
      <Seo
        {...metadata}
        structuredData={[
          {
            '@type': 'WebApplication',
            name: 'Klassenplan',
            applicationCategory: 'EducationApplication',
            operatingSystem: 'Web',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'EUR',
            },
            publisher: {
              '@type': 'Organization',
              name: 'Klassenplan',
            },
          },
          {
            '@type': 'WebSite',
            name: 'Klassenplan',
            inLanguage: metadata.lang === 'en' ? 'en' : 'de',
          },
        ]}
      />
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Hero – Split layout */}
        <header role="banner" aria-label="Klassenplan Einleitung">
          <div className="lg:grid lg:grid-cols-2 lg:gap-12 lg:items-start">
            {/* Text side */}
            <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
              <LocalizedLink
                to="/"
                className="kp-lockup focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
                aria-label="Zur Startseite"
              >
                <KpLockup size="md" />
              </LocalizedLink>

              <h1 className="mt-8 text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 dark:text-white">
                {t('startPage.heroTitle')}
              </h1>

              <p className="mt-3 text-base sm:text-lg text-gray-600 dark:text-gray-300">
                {t('startPage.heroDescription')}
              </p>

              {/* Support-Badge – über dem CTA */}
              <div className="mt-6 inline-flex items-center justify-center text-sm">
                <LocalizedLink
                  to="/support"
                  title={t('startPage.heroBadgeTooltip')}
                  className="inline-flex items-center gap-2 text-green-700 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300 font-medium transition"
                >
                  <HandHeartIcon size={16} weight="fill" aria-hidden="true" />
                  <span>{t('startPage.heroBadge')}</span>
                </LocalizedLink>
              </div>

              <LocalizedLink
                to="/generator"
                className={`mt-5 w-full sm:w-auto ${primaryButtonClass} px-6 py-3 text-base font-semibold shadow-lg text-center`}
                aria-label="Zum Generator wechseln und Klasse planen"
              >
                {t('startPage.ctaButton')}
              </LocalizedLink>

              {/* Quick-Links – unter dem CTA als dezente Nebeninfos */}
              <div className="mt-5 inline-flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
                <LocalizedLink
                  to="/faq"
                  className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-medium transition"
                >
                  <QuestionIcon size={16} aria-hidden="true" />
                  <span>{t('startPage.faqLink')}</span>
                </LocalizedLink>
                <LocalizedLink
                  to="/feedback"
                  className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 font-medium transition"
                >
                  <MailboxIcon size={16} aria-hidden="true" />
                  <span>{t('startPage.contactLink')}</span>
                </LocalizedLink>
              </div>
            </div>

            {/* Mockup side */}
            <div className="mt-8 lg:mt-0">
              <HeroMockup />
            </div>
          </div>
        </header>

        {/* Benefits - 3 cards */}
        <section aria-labelledby="vorteile-title">
          <h2
            id="vorteile-title"
            className="mb-5 text-center text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-200"
          >
            {t('startPage.whyKlassenplanTitle')}
          </h2>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {benefits.map((benefit) => (
              <div
                key={benefit.titleKey}
                className={`${cardSurfaceClass} ${benefit.borderColor} flex flex-col items-center p-2 sm:p-5 text-center border border-gray-100/60 dark:border-gray-700/40`}
              >
                <div
                  className={`mb-1 sm:mb-3 flex h-8 w-8 sm:h-12 sm:w-12 items-center justify-center rounded-full ${benefit.bgColor}`}
                >
                  <benefit.icon
                    className={`h-4 w-4 sm:h-6 sm:w-6 ${benefit.color}`}
                    aria-hidden="true"
                  />
                </div>
                <h3 className="text-xs sm:text-base font-semibold text-gray-900 dark:text-white">
                  {t(benefit.titleKey)}
                </h3>
                <p className="mt-1 text-[10px] leading-tight sm:text-sm text-gray-600 dark:text-gray-400">
                  {t(benefit.descKey)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section aria-labelledby="howItWorks-title">
          <h2
            id="howItWorks-title"
            className="mb-5 text-center text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-200"
          >
            {t('startPage.howItWorksTitle')}
          </h2>
          <div className="flex items-start justify-center gap-0">
            {steps.map((step, index) => (
              <div key={step.titleKey} className="flex items-start">
                <div className="flex flex-col items-center px-0.5 text-center sm:px-4">
                  <div className="landing-step-indicator pointer-events-none">
                    <step.icon
                      className="h-5 w-5 sm:h-8 sm:w-8"
                      aria-hidden="true"
                    />
                  </div>
                  <p className="mt-2 text-xs sm:mt-3 sm:text-base font-semibold text-gray-800 dark:text-gray-200">
                    {t(step.titleKey)}
                  </p>
                  <p className="mt-1 max-w-16 sm:max-w-44 text-[10px] leading-tight sm:text-sm sm:leading-snug text-gray-500 dark:text-gray-400">
                    {t(step.textKey)}
                  </p>
                </div>

                {index < steps.length - 1 && (
                  <div
                    className="landing-connector mt-5 mx-0.5 sm:mt-8 sm:mx-2"
                    aria-hidden="true"
                  />
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

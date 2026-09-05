// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React, { useMemo } from 'react';
import {
  BookOpenIcon,
  DatabaseIcon,
  HandshakeIcon,
  QuestionIcon,
  GridNineIcon,
  UsersThreeIcon,
  LifebuoyIcon,
  DesktopIcon,
  GearIcon,
  SparkleIcon,
  type Icon,
} from '@phosphor-icons/react';
import Seo from '@/components/Seo';
import CriteriaReferenceSection from '@/components/FAQ/CriteriaReferenceSection';
import { LocalizedLink } from '@/components/LocalizedLink';
import { cardSurfaceClass, secondaryButtonClass } from '@/utils';
import { KpLockup } from '@/components/KpLockup';
import { usePageSeo } from '@/hooks/usePageSeo';
import { useTranslation } from 'react-i18next';
import { GITHUB_REPO_URL } from '@/config/links';

interface FaqItem {
  question: string;
  answer: React.ReactNode;
}

interface FaqSection {
  id: string;
  title: string;
  description: string;
  icon: Icon;
  items: FaqItem[];
  customContent?: React.ReactNode;
}

/**
 * Recursively extract the plain text of an answer node so it can be used as the
 * `acceptedAnswer` text in FAQPage JSON-LD (Rich Results).
 */
function reactNodeToText(node: React.ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(reactNodeToText).join(' ');
  if (React.isValidElement(node)) {
    return reactNodeToText(
      (node.props as { children?: React.ReactNode }).children,
    );
  }
  return '';
}

export default function FAQ() {
  const { t, i18n } = useTranslation('pages');
  const metadata = usePageSeo('/faq');
  const isGerman = i18n.language === 'de';

  const faqSections: FaqSection[] = useMemo(
    () => [
      {
        id: 'allgemein',
        title: t('faq.allgemein.title'),
        description: t('faq.allgemein.description'),
        icon: QuestionIcon,
        items: [
          {
            question: t('faq.allgemein.algo_intro.q'),
            answer: <p>{t('faq.allgemein.algo_intro.a')}</p>,
          },
          {
            question: t('faq.allgemein.algo_neighbors.q'),
            answer: (
              <div className="space-y-2">
                <p>{t('faq.allgemein.algo_neighbors.intro')}</p>
                <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
                  <li>{t('faq.allgemein.algo_neighbors.li1')}</li>
                  <li>{t('faq.allgemein.algo_neighbors.li2')}</li>
                  <li>{t('faq.allgemein.algo_neighbors.li3')}</li>
                </ul>
                <p>{t('faq.allgemein.algo_neighbors.outro')}</p>
              </div>
            ),
          },
          {
            question: t('faq.allgemein.no_account.q'),
            answer: <p>{t('faq.allgemein.no_account.a')}</p>,
          },
          {
            question: t('faq.allgemein.imperfect.q'),
            answer: <p>{t('faq.allgemein.imperfect.a')}</p>,
          },
          // Gender language note - German only
          ...(isGerman
            ? [
                {
                  question: t('faq.allgemein.gender_language.q'),
                  answer: <p>{t('faq.allgemein.gender_language.a')}</p>,
                },
              ]
            : []),
        ],
      },
      {
        id: 'klassenliste',
        title: t('faq.klassenliste.title'),
        description: t('faq.klassenliste.description'),
        icon: UsersThreeIcon,
        items: [
          {
            question: t('faq.klassenliste.classes.q'),
            answer: <p>{t('faq.klassenliste.classes.a')}</p>,
          },
          {
            question: t('faq.klassenliste.csv.q'),
            answer: <p>{t('faq.klassenliste.csv.a')}</p>,
          },
          {
            question: t('faq.klassenliste.photos.q'),
            answer: <p>{t('faq.klassenliste.photos.a')}</p>,
          },
          {
            question: t('faq.klassenliste.bulk.q'),
            answer: <p>{t('faq.klassenliste.bulk.a')}</p>,
          },
          {
            question: t('faq.klassenliste.undo.q'),
            answer: <p>{t('faq.klassenliste.undo.a')}</p>,
          },
        ],
      },
      {
        id: 'eigenschaften',
        title: t('faq.eigenschaften.title'),
        description: t('faq.eigenschaften.description'),
        icon: BookOpenIcon,
        items: [],
        // Special section with custom content instead of FAQ items
        customContent: <CriteriaReferenceSection />,
      } as FaqSection & { customContent?: React.ReactNode },
      {
        id: 'wunschpartner',
        title: t('faq.wunschpartner.title'),
        description: t('faq.wunschpartner.description'),
        icon: HandshakeIcon,
        items: [
          {
            question: t('faq.wunschpartner.multi.q'),
            answer: <p>{t('faq.wunschpartner.multi.a')}</p>,
          },
          {
            question: t('faq.wunschpartner.force.q'),
            answer: <p>{t('faq.wunschpartner.force.a')}</p>,
          },
          {
            question: t('faq.wunschpartner.needs.q'),
            answer: <p>{t('faq.wunschpartner.needs.a')}</p>,
          },
          {
            question: t('faq.wunschpartner.height.q'),
            answer: <p>{t('faq.wunschpartner.height.a')}</p>,
          },
        ],
      },
      {
        id: 'layout',
        title: t('faq.layout.title'),
        description: t('faq.layout.description'),
        icon: GridNineIcon,
        items: [
          {
            question: t('faq.layout.best.q'),
            answer: <p>{t('faq.layout.best.a')}</p>,
          },
          {
            question: t('faq.layout.measure.q'),
            answer: <p>{t('faq.layout.measure.a')}</p>,
          },
          {
            question: t('faq.layout.limits.q'),
            answer: <p>{t('faq.layout.limits.a')}</p>,
          },
        ],
      },
      {
        id: 'einstellungen',
        title: t('faq.settings.title'),
        description: t('faq.settings.description'),
        icon: GearIcon,
        items: [
          {
            question: t('faq.settings.weights.q'),
            answer: <p>{t('faq.settings.weights.a')}</p>,
          },
          {
            question: t('faq.settings.check.q'),
            answer: <p>{t('faq.settings.check.a')}</p>,
          },
          {
            question: t('faq.settings.colors.q'),
            answer: (
              <div className="space-y-2">
                <p>{t('faq.settings.colors.intro')}</p>
                <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
                  <li>
                    <strong className="text-green-600">
                      {t('faq.settings.colors.green')}
                    </strong>{' '}
                    {t('faq.settings.colors.green_desc')}
                  </li>
                  <li>
                    <strong className="text-amber-500">
                      {t('faq.settings.colors.yellow')}
                    </strong>{' '}
                    {t('faq.settings.colors.yellow_desc')}
                  </li>
                  <li>
                    <strong className="text-red-500">
                      {t('faq.settings.colors.red')}
                    </strong>{' '}
                    {t('faq.settings.colors.red_desc')}
                  </li>
                </ul>
              </div>
            ),
          },
          {
            question: t('faq.settings.percent.q'),
            answer: (
              <div className="space-y-2">
                <p>{t('faq.settings.percent.intro')}</p>
                <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
                  <li>{t('faq.settings.percent.li1')}</li>
                  <li>{t('faq.settings.percent.li2')}</li>
                  <li>{t('faq.settings.percent.li3')}</li>
                </ul>
                <p>{t('faq.settings.percent.example')}</p>
              </div>
            ),
          },
          {
            question: t('faq.settings.interact.q'),
            answer: <p>{t('faq.settings.interact.a')}</p>,
          },
          {
            question: t('faq.settings.repeat.q'),
            answer: (
              <div className="space-y-2">
                <p>{t('faq.settings.repeat.intro')}</p>
                <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
                  <li>
                    <strong>{t('faq.settings.repeat.li1_b')}</strong>{' '}
                    {t('faq.settings.repeat.li1')}
                  </li>
                  <li>
                    <strong>{t('faq.settings.repeat.li2_b')}</strong>{' '}
                    {t('faq.settings.repeat.li2')}
                  </li>
                </ul>
                <p>{t('faq.settings.repeat.outro')}</p>
              </div>
            ),
          },
          {
            question: t('faq.settings.values.q'),
            answer: (
              <div className="space-y-2">
                <p>{t('faq.settings.values.intro')}</p>
                <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
                  <li>
                    <strong>{t('faq.settings.values.li1_b')}</strong>{' '}
                    {t('faq.settings.values.li1')}
                  </li>
                  <li>
                    <strong>{t('faq.settings.values.li2_b')}</strong>{' '}
                    {t('faq.settings.values.li2')}
                  </li>
                  <li>
                    <strong>{t('faq.settings.values.li3_b')}</strong>{' '}
                    {t('faq.settings.values.li3')}
                  </li>
                  <li>
                    <strong>{t('faq.settings.values.li4_b')}</strong>{' '}
                    {t('faq.settings.values.li4')}
                  </li>
                  <li>
                    <strong>{t('faq.settings.values.li5_b')}</strong>{' '}
                    {t('faq.settings.values.li5')}
                  </li>
                </ul>
              </div>
            ),
          },
        ],
      },
      {
        id: 'backups',
        title: t('faq.backups.title'),
        description: t('faq.backups.description'),
        icon: DatabaseIcon,
        items: [
          {
            question: t('faq.backups.where.q'),
            answer: <p>{t('faq.backups.where.a')}</p>,
          },
          {
            question: t('faq.backups.loss.q'),
            answer: (
              <div className="space-y-2">
                <p>{t('faq.backups.loss.intro')}</p>
                <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
                  <li>{t('faq.backups.loss.li1')}</li>
                  <li>{t('faq.backups.loss.li2')}</li>
                  <li>{t('faq.backups.loss.li3')}</li>
                </ul>
                <p>{t('faq.backups.loss.outro')}</p>
              </div>
            ),
          },
          {
            question: t('faq.backups.how.q'),
            answer: <p>{t('faq.backups.how.a')}</p>,
          },
          {
            question: t('faq.backups.deviceChange.q'),
            answer: (
              <div className="space-y-2">
                <p>{t('faq.backups.deviceChange.intro')}</p>
                <ol className="list-decimal pl-5 space-y-1 text-gray-700 dark:text-gray-300">
                  <li>{t('faq.backups.deviceChange.li1')}</li>
                  <li>{t('faq.backups.deviceChange.li2')}</li>
                  <li>{t('faq.backups.deviceChange.li3')}</li>
                  <li>{t('faq.backups.deviceChange.li4')}</li>
                </ol>
                <p>{t('faq.backups.deviceChange.outro')}</p>
              </div>
            ),
          },
          {
            question: t('faq.backups.frequency.q'),
            answer: <p>{t('faq.backups.frequency.a')}</p>,
          },
          {
            question: t('faq.backups.restore.q'),
            answer: <p>{t('faq.backups.restore.a')}</p>,
          },
          {
            question: t('faq.backups.update.q'),
            answer: <p>{t('faq.backups.update.a')}</p>,
          },
        ],
      },
      {
        id: 'tipps',
        title: t('faq.tipps.title'),
        description: t('faq.tipps.description'),
        icon: SparkleIcon,
        items: [
          {
            question: t('faq.tipps.improve.q'),
            answer: (
              <div className="space-y-2">
                <p>{t('faq.tipps.improve.intro')}</p>
                <ul className="list-disc pl-5 space-y-1 text-gray-700 dark:text-gray-300">
                  <li>{t('faq.tipps.improve.li1')}</li>
                  <li>{t('faq.tipps.improve.li2')}</li>
                  <li>{t('faq.tipps.improve.li3')}</li>
                  <li>{t('faq.tipps.improve.li4')}</li>
                  <li>{t('faq.tipps.improve.li5')}</li>
                </ul>
              </div>
            ),
          },
        ],
      },
      {
        id: 'oberflaeche',
        title: t('faq.oberflaeche.title'),
        description: t('faq.oberflaeche.description'),
        icon: DesktopIcon,
        items: [
          {
            question: t('faq.oberflaeche.print.q'),
            answer: <p>{t('faq.oberflaeche.print.a')}</p>,
          },
          {
            question: t('faq.oberflaeche.dark.q'),
            answer: <p>{t('faq.oberflaeche.dark.a')}</p>,
          },
          {
            question: t('faq.oberflaeche.shortcuts.q'),
            answer: <p>{t('faq.oberflaeche.shortcuts.a')}</p>,
          },
          {
            question: t('faq.oberflaeche.circle.q'),
            answer: <p>{t('faq.oberflaeche.circle.a')}</p>,
          },
          {
            question: t('faq.oberflaeche.present.q'),
            answer: <p>{t('faq.oberflaeche.present.a')}</p>,
          },
          {
            question: t('faq.oberflaeche.nameGame.q'),
            answer: <p>{t('faq.oberflaeche.nameGame.a')}</p>,
          },
          {
            question: t('faq.oberflaeche.exportFormats.q'),
            answer: <p>{t('faq.oberflaeche.exportFormats.a')}</p>,
          },
          {
            question: t('faq.oberflaeche.names.q'),
            answer: <p>{t('faq.oberflaeche.names.a')}</p>,
          },
          {
            question: t('faq.oberflaeche.tablet.q'),
            answer: <p>{t('faq.oberflaeche.tablet.a')}</p>,
          },
          {
            question: t('faq.oberflaeche.pwa.q'),
            answer: <p>{t('faq.oberflaeche.pwa.a')}</p>,
          },
        ],
      },
      {
        id: 'projekt',
        title: t('faq.projekt.title'),
        description: t('faq.projekt.description'),
        icon: LifebuoyIcon,
        items: [
          {
            question: t('faq.projekt.cost.q'),
            answer: <p>{t('faq.projekt.cost.a')}</p>,
          },
          {
            question: t('faq.projekt.update.q'),
            answer: <p>{t('faq.projekt.update.a')}</p>,
          },
          {
            question: t('faq.projekt.feedback.q'),
            answer: (
              <div className="space-y-2">
                <p>{t('faq.projekt.feedback.a')}</p>
                <p>
                  {t('faq.projekt.feedback.openSource')}{' '}
                  <a
                    href={GITHUB_REPO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-blue-600 underline hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
                  >
                    {t('faq.projekt.feedback.githubLink')}
                  </a>
                </p>
              </div>
            ),
          },
          {
            question: t('faq.projekt.license.q'),
            answer: (
              <div className="space-y-2">
                <p>{t('faq.projekt.license.a')}</p>
                <p>
                  {t('faq.projekt.license.linkPrefix')}{' '}
                  <a
                    href={GITHUB_REPO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-blue-600 underline hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
                  >
                    {t('faq.projekt.license.githubLink')}
                  </a>
                  .
                </p>
              </div>
            ),
          },
        ],
      },
    ],
    [t, isGerman],
  );

  const faqStructuredData = useMemo(
    () => ({
      '@type': 'FAQPage',
      mainEntity: faqSections.flatMap((section) =>
        section.items.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: reactNodeToText(item.answer).replace(/\s+/g, ' ').trim(),
          },
        })),
      ),
    }),
    [faqSections],
  );

  return (
    <main
      id="main"
      tabIndex={-1}
      className="min-h-[80vh] bg-linear-to-b from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 px-4 py-12"
    >
      <Seo {...metadata} structuredData={faqStructuredData} />
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <header
          className="text-center"
          role="banner"
          aria-label={t('faq.header.ariaOverview')}
        >
          <LocalizedLink
            to="/"
            className="kp-lockup focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            aria-label={t('faq.header.ariaNav')}
          >
            <KpLockup size="md" />
          </LocalizedLink>
        </header>

        <section
          className={`${cardSurfaceClass} border px-5 py-5 sm:px-8 sm:py-8`}
          aria-labelledby="faq-intro"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm dark:border-blue-900/40 dark:bg-blue-500/20 dark:text-blue-200">
              <QuestionIcon aria-hidden="true" className="h-6 w-6" />
            </span>
            <div>
              <h1
                id="faq-intro"
                className="text-xl font-bold text-gray-900 sm:text-3xl dark:text-gray-100"
              >
                {t('faq.header.title')}
              </h1>
              <p className="mt-1 text-sm text-gray-700 sm:text-base dark:text-gray-300">
                {t('faq.header.subtitle')}
              </p>
            </div>
          </div>

          <nav aria-label={t('faq.header.ariaNav')} className="mt-6">
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {faqSections.map((section) => (
                <li key={section.id} className="h-full">
                  <a
                    className={`${cardSurfaceClass} group flex h-full min-h-33 items-start gap-4 border px-5 py-5 text-left transition hover:border-blue-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2`}
                    href={`#${section.id}`}
                  >
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm transition group-hover:border-blue-200 group-hover:bg-blue-100 group-hover:text-blue-700 dark:border-blue-900/40 dark:bg-blue-500/20 dark:text-blue-100 dark:group-hover:border-blue-800 dark:group-hover:bg-blue-500/30">
                      <section.icon aria-hidden="true" className="h-6 w-6" />
                    </span>
                    <div className="flex flex-1 flex-col gap-1">
                      <span className="text-base font-semibold text-gray-900 transition-colors group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-200">
                        {section.title}
                      </span>
                      <p className="text-sm leading-5 text-gray-600 transition-colors group-hover:text-blue-700 dark:text-gray-300 dark:group-hover:text-blue-200">
                        {section.description}
                      </p>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </section>

        <section
          className={`${cardSurfaceClass} border-l-4 border-l-amber-400 border px-8 py-6`}
          aria-label={t('faq.disclaimer.title')}
        >
          <div className="flex items-start gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-800/40 dark:bg-amber-500/20 dark:text-amber-300">
              <BookOpenIcon aria-hidden="true" className="h-5 w-5" />
            </span>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('faq.disclaimer.title')}
              </h2>
              <p className="text-gray-700 dark:text-gray-300">
                {t('faq.disclaimer.body')}
              </p>
              <p className="text-sm italic text-gray-500 dark:text-gray-400">
                {t('faq.disclaimer.hattieNote')}
              </p>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('faq.disclaimer.callToAction')}
              </p>
            </div>
          </div>
        </section>

        <div className="space-y-10">
          {faqSections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className={`${cardSurfaceClass} border px-8 py-8`}
              aria-labelledby={`${section.id}-title`}
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm dark:border-blue-900/40 dark:bg-blue-500/20 dark:text-blue-200">
                    <section.icon aria-hidden="true" className="h-6 w-6" />
                  </span>
                  <div>
                    <h2
                      id={`${section.id}-title`}
                      className="text-2xl font-semibold"
                    >
                      {section.title}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300">
                      {section.description}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {/* Render custom content if provided (e.g., for eigenschaften section) */}
                {(section as FaqSection).customContent
                  ? (section as FaqSection).customContent
                  : section.items.map((item) => (
                      <details
                        key={item.question}
                        className={`group ${cardSurfaceClass} border px-5 py-4 transition-all hover:border-blue-200 hover:shadow-md open:border-blue-300 open:shadow-md`}
                      >
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-left text-lg font-medium text-gray-900 marker:hidden dark:text-white">
                          <h3 className="text-lg font-medium">
                            {item.question}
                          </h3>
                          <span className="text-blue-600 transition group-open:rotate-45 dark:text-blue-200">
                            +
                          </span>
                        </summary>
                        <div className="mt-3 text-gray-700 dark:text-gray-300">
                          {item.answer}
                        </div>
                      </details>
                    ))}
              </div>
            </section>
          ))}
        </div>

        <footer className={`${cardSurfaceClass} border px-8 py-8 text-center`}>
          <h2 className="text-2xl font-semibold text-blue-600">
            {t('faq.footer.title')}
          </h2>
          <p className="mt-2 text-gray-700 dark:text-gray-300">
            {t('faq.footer.text')}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <LocalizedLink
              to="/feedback"
              className={`${secondaryButtonClass} px-5 py-2.5 text-base font-semibold`}
            >
              {t('faq.footer.contactBtn')}
            </LocalizedLink>
            <LocalizedLink
              to="/generator"
              className={`${secondaryButtonClass} px-5 py-2.5 text-base font-semibold`}
            >
              {t('faq.footer.generatorBtn')}
            </LocalizedLink>
          </div>
        </footer>
      </div>
    </main>
  );
}

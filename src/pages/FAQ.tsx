// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React, { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  AddressBookTabsIcon,
  BookOpenIcon,
  ChalkboardTeacherIcon,
  DatabaseIcon,
  DesktopIcon,
  GridNineIcon,
  HandshakeIcon,
  HouseIcon,
  IdentificationCardIcon,
  LifebuoyIcon,
  LightbulbIcon,
  PlusIcon,
  QuestionIcon,
  type Icon,
} from '@phosphor-icons/react';
import Seo from '@/components/Seo';
import CriteriaReferenceSection from '@/components/FAQ/CriteriaReferenceSection';
import PublicPageHeader from '@/components/publicPage/PublicPageHeader';
import {
  pageEyebrowClass,
  pageSectionTitleClass,
  pageTitleClass,
} from '@/components/publicPage/pageTokens';
import { LocalizedLink } from '@/components/LocalizedLink';
import {
  getStatisticStatusMeta,
  MIX_IMPORTANCE_LEVELS,
  MIX_RECIPES,
  primaryButtonClass,
  secondaryButtonClass,
  STATISTIC_STATUS_THRESHOLDS,
} from '@/utils';
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
  /** Replaces the questions, e.g. the reference of all student properties. */
  customContent?: React.ReactNode;
}

const listClass = 'list-disc space-y-1 pl-5';
const termClass = 'font-medium text-(--text-page)';
const inlineLinkClass =
  'font-medium text-(--text-badge) underline underline-offset-2';

/**
 * The three fulfilment colours, each at a percentage inside its band, so the
 * dots come from the same function that colours the bars beside the plan.
 */
const FULFILMENT_BANDS = [
  { status: 'ok', word: 'green', at: 100 },
  { status: 'warn', word: 'orange', at: STATISTIC_STATUS_THRESHOLDS.warn },
  { status: 'alert', word: 'red', at: 0 },
] as const;

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
  const location = useLocation();
  const navigate = useNavigate();

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
              <>
                <p>{t('faq.allgemein.algo_neighbors.intro')}</p>
                <ul className={listClass}>
                  <li>{t('faq.allgemein.algo_neighbors.li1')}</li>
                  <li>{t('faq.allgemein.algo_neighbors.li2')}</li>
                  <li>{t('faq.allgemein.algo_neighbors.li3')}</li>
                </ul>
                <p>{t('faq.allgemein.algo_neighbors.outro')}</p>
              </>
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
        icon: AddressBookTabsIcon,
        items: [
          'classes',
          'csv',
          'photos',
          'focusMode',
          'bulk',
          'demo',
          'nameGame',
        ].map((key) => ({
          question: t(`faq.klassenliste.${key}.q`),
          answer: <p>{t(`faq.klassenliste.${key}.a`)}</p>,
        })),
      },
      {
        id: 'eigenschaften',
        title: t('faq.eigenschaften.title'),
        description: t('faq.eigenschaften.description'),
        icon: IdentificationCardIcon,
        items: [],
        customContent: <CriteriaReferenceSection />,
      },
      {
        id: 'wunschpartner',
        title: t('faq.wunschpartner.title'),
        description: t('faq.wunschpartner.description'),
        icon: HandshakeIcon,
        items: ['relations', 'multi', 'force', 'needs', 'height'].map(
          (key) => ({
            question: t(`faq.wunschpartner.${key}.q`),
            answer: <p>{t(`faq.wunschpartner.${key}.a`)}</p>,
          }),
        ),
      },
      {
        id: 'layout',
        title: t('faq.layout.title'),
        description: t('faq.layout.description'),
        icon: HouseIcon,
        items: ['best', 'measure', 'limits'].map((key) => ({
          question: t(`faq.layout.${key}.q`),
          answer: <p>{t(`faq.layout.${key}.a`)}</p>,
        })),
      },
      {
        id: 'einstellungen',
        title: t('faq.settings.title'),
        description: t('faq.settings.description'),
        icon: GridNineIcon,
        items: [
          {
            // The recipes and the four levels are named as the inspector
            // names them, so the answer cannot fall behind the app.
            question: t('faq.settings.recipes.q'),
            answer: (
              <>
                <p>{t('faq.settings.recipes.intro')}</p>
                <ul className={listClass}>
                  {MIX_RECIPES.map((recipe) => (
                    <li key={recipe.id}>
                      <strong className={termClass}>
                        {t(`generator:mix.recipes.${recipe.id}.label`)}:
                      </strong>{' '}
                      {t(`generator:mix.recipes.${recipe.id}.desc`)}
                    </li>
                  ))}
                </ul>
                <p>{t('faq.settings.recipes.outro')}</p>
              </>
            ),
          },
          {
            question: t('faq.settings.weights.q'),
            answer: (
              <>
                <p>{t('faq.settings.weights.intro')}</p>
                <ul className={listClass}>
                  {MIX_IMPORTANCE_LEVELS.map((level) => (
                    <li key={level}>
                      <strong className={termClass}>
                        {t(`generator:mix.importance.${level}`)}:
                      </strong>{' '}
                      {t(`generator:mix.importance.${level}Hint`)}
                    </li>
                  ))}
                </ul>
                <p>{t('faq.settings.weights.outro')}</p>
              </>
            ),
          },
          {
            question: t('faq.settings.check.q'),
            answer: <p>{t('faq.settings.check.a')}</p>,
          },
          {
            question: t('faq.settings.colors.q'),
            answer: (
              <>
                <p>{t('faq.settings.colors.intro')}</p>
                <ul className="space-y-1">
                  {FULFILMENT_BANDS.map((band) => (
                    <li key={band.status} className="flex items-baseline gap-2">
                      <span
                        aria-hidden="true"
                        className={`inline-block size-2.5 shrink-0 rounded-full ${
                          getStatisticStatusMeta(band.at).dotClass
                        }`}
                      />
                      <span>
                        <strong className={termClass}>
                          {t(`faq.settings.colors.${band.word}`)}
                        </strong>{' '}
                        – {t(`generator:statisticsBadge.status.${band.status}`)}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            ),
          },
          {
            question: t('faq.settings.interact.q'),
            answer: <p>{t('faq.settings.interact.a')}</p>,
          },
          {
            question: t('faq.settings.percent.q'),
            answer: (
              <>
                <p>{t('faq.settings.percent.intro')}</p>
                <ul className={listClass}>
                  <li>{t('faq.settings.percent.li1')}</li>
                  <li>{t('faq.settings.percent.li2')}</li>
                  <li>{t('faq.settings.percent.li3')}</li>
                </ul>
                <p>{t('faq.settings.percent.example')}</p>
              </>
            ),
          },
          {
            question: t('faq.settings.values.q'),
            answer: (
              <>
                <p>{t('faq.settings.values.intro')}</p>
                <ul className={listClass}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <li key={n}>
                      <strong className={termClass}>
                        {t(`faq.settings.values.li${n}_b`)}
                      </strong>{' '}
                      {t(`faq.settings.values.li${n}`)}
                    </li>
                  ))}
                </ul>
              </>
            ),
          },
          {
            question: t('faq.settings.repeat.q'),
            answer: (
              <>
                <p>{t('faq.settings.repeat.intro')}</p>
                <ul className={listClass}>
                  <li>
                    <strong className={termClass}>
                      {t('faq.settings.repeat.li1_b')}
                    </strong>{' '}
                    {t('faq.settings.repeat.li1')}
                  </li>
                  <li>
                    <strong className={termClass}>
                      {t('faq.settings.repeat.li2_b')}
                    </strong>{' '}
                    {t('faq.settings.repeat.li2')}
                  </li>
                </ul>
                <p>{t('faq.settings.repeat.outro')}</p>
                <p>{t('faq.settings.repeat.usageIntro')}</p>
                <ul className={listClass}>
                  <li>{t('faq.settings.repeat.usage1')}</li>
                  <li>{t('faq.settings.repeat.usage2')}</li>
                  <li>{t('faq.settings.repeat.usage3')}</li>
                  <li>{t('faq.settings.repeat.usage4')}</li>
                </ul>
                <p>{t('faq.settings.repeat.usageOutro')}</p>
                <p>{t('faq.settings.repeat.weightNote')}</p>
                <p>{t('faq.settings.repeat.viewNote')}</p>
              </>
            ),
          },
        ],
      },
      {
        id: 'tipps',
        title: t('faq.tipps.title'),
        description: t('faq.tipps.description'),
        icon: LightbulbIcon,
        items: [
          {
            question: t('faq.tipps.improve.q'),
            answer: (
              <>
                <p>{t('faq.tipps.improve.intro')}</p>
                <ul className={listClass}>
                  <li>{t('faq.tipps.improve.li1')}</li>
                  <li>{t('faq.tipps.improve.li2')}</li>
                  <li>{t('faq.tipps.improve.li3')}</li>
                  <li>{t('faq.tipps.improve.li4')}</li>
                </ul>
              </>
            ),
          },
        ],
      },
      {
        id: 'unterricht',
        title: t('faq.unterricht.title'),
        description: t('faq.unterricht.description'),
        icon: ChalkboardTeacherIcon,
        items: [
          'present',
          'tools',
          'circle',
          'exportFormats',
          'print',
          'names',
        ].map((key) => ({
          question: t(`faq.unterricht.${key}.q`),
          answer: <p>{t(`faq.unterricht.${key}.a`)}</p>,
        })),
      },
      {
        id: 'oberflaeche',
        title: t('faq.oberflaeche.title'),
        description: t('faq.oberflaeche.description'),
        icon: DesktopIcon,
        items: ['undo', 'shortcuts', 'tour', 'dark', 'tablet', 'pwa'].map(
          (key) => ({
            question: t(`faq.oberflaeche.${key}.q`),
            answer: <p>{t(`faq.oberflaeche.${key}.a`)}</p>,
          }),
        ),
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
              <>
                <p>{t('faq.backups.loss.intro')}</p>
                <ul className={listClass}>
                  <li>{t('faq.backups.loss.li1')}</li>
                  <li>{t('faq.backups.loss.li2')}</li>
                  <li>{t('faq.backups.loss.li3')}</li>
                </ul>
                <p>{t('faq.backups.loss.outro')}</p>
              </>
            ),
          },
          {
            question: t('faq.backups.how.q'),
            answer: <p>{t('faq.backups.how.a')}</p>,
          },
          {
            question: t('faq.backups.deviceChange.q'),
            answer: (
              <>
                <p>{t('faq.backups.deviceChange.intro')}</p>
                <ol className="list-decimal space-y-1 pl-5">
                  <li>{t('faq.backups.deviceChange.li1')}</li>
                  <li>{t('faq.backups.deviceChange.li2')}</li>
                  <li>{t('faq.backups.deviceChange.li3')}</li>
                  <li>{t('faq.backups.deviceChange.li4')}</li>
                </ol>
                <p>{t('faq.backups.deviceChange.outro')}</p>
              </>
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
              <>
                <p>{t('faq.projekt.feedback.a')}</p>
                <p>
                  {t('faq.projekt.feedback.openSource')}{' '}
                  <a
                    href={GITHUB_REPO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={inlineLinkClass}
                  >
                    {t('faq.projekt.feedback.githubLink')}
                  </a>
                </p>
              </>
            ),
          },
          {
            question: t('faq.projekt.license.q'),
            answer: (
              <>
                <p>{t('faq.projekt.license.a')}</p>
                <p>
                  {t('faq.projekt.license.linkPrefix')}{' '}
                  <a
                    href={GITHUB_REPO_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={inlineLinkClass}
                  >
                    {t('faq.projekt.license.githubLink')}
                  </a>
                  .
                </p>
              </>
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

  // The help dialog opens this page at the section for the screen it was
  // asked on. The page loads lazily and the router scrolls to the top on a new
  // path, so the jump waits a frame for both to be done.
  useEffect(() => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id) return;
    const frame = requestAnimationFrame(() =>
      document.getElementById(id)?.scrollIntoView(),
    );
    return () => cancelAnimationFrame(frame);
  }, [location.hash, location.key]);

  // The contents replace the hash instead of pushing it and keep the router
  // state: "Zurück" stays one step back to the app however much was read.
  const goToSection = (
    event: React.MouseEvent<HTMLAnchorElement>,
    id: string,
  ) => {
    event.preventDefault();
    void navigate({ hash: id }, { replace: true, state: location.state });
    document.getElementById(id)?.focus({ preventScroll: true });
  };

  return (
    <main id="main" tabIndex={-1} className="bg-(--surface-page) px-4 sm:px-6">
      <Seo {...metadata} structuredData={faqStructuredData} />
      <div className="mx-auto max-w-6xl">
        <PublicPageHeader bannerLabel={t('faq.header.ariaOverview')} />

        {/* The same columns as the page below: the title over the contents,
            the note on what a seating plan can do over the questions. */}
        <div className="grid gap-8 pt-4 pb-10 lg:grid-cols-12 lg:items-start lg:gap-12 lg:pb-14">
          <div className="lg:col-span-4">
            <p className={pageEyebrowClass}>{t('faq.header.eyebrow')}</p>
            <h1 className={pageTitleClass}>{t('faq.header.title')}</h1>
            <p className="mt-4 text-lg text-pretty text-(--text-muted)">
              {t('faq.header.subtitle')}
            </p>
          </div>
          <aside
            aria-labelledby="faq-disclaimer-title"
            className="rounded-(--radius-card) bg-(--surface-sunken) p-5 sm:p-6 lg:col-span-8"
          >
            <h2
              id="faq-disclaimer-title"
              className="flex items-center gap-2 font-semibold text-(--text-page)"
            >
              <BookOpenIcon
                size={18}
                aria-hidden="true"
                className="shrink-0 text-(--text-muted)"
              />
              {t('faq.disclaimer.title')}
            </h2>
            <div className="mt-2 space-y-2 text-(--text-muted)">
              <p>{t('faq.disclaimer.body')}</p>
              <p className="text-sm">{t('faq.disclaimer.researchNote')}</p>
              <p className="text-sm font-medium text-(--text-page)">
                {t('faq.disclaimer.callToAction')}
              </p>
            </div>
          </aside>
        </div>

        <div className="grid gap-10 border-t border-(--border-card) pt-10 pb-16 lg:grid-cols-12 lg:gap-12 lg:pb-24">
          <nav aria-label={t('faq.header.ariaNav')} className="lg:col-span-4">
            <div className="lg:sticky lg:top-8">
              <p className={pageEyebrowClass}>{t('faq.header.onThisPage')}</p>
              <ol className="-mx-2 mt-3 flex flex-col gap-0.5">
                {faqSections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      onClick={(event) => goToSection(event, section.id)}
                      className="flex items-center gap-3 rounded-lg px-2 py-2 text-(--text-page) transition-colors hover:bg-(--surface-sunken) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary)"
                    >
                      <section.icon
                        size={18}
                        aria-hidden="true"
                        className="shrink-0 text-(--text-muted)"
                      />
                      {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </nav>

          <div className="min-w-0 lg:col-span-8">
            {faqSections.map((section) => (
              <section
                key={section.id}
                id={section.id}
                tabIndex={-1}
                aria-labelledby={`${section.id}-title`}
                className="scroll-mt-6 pt-14 first:pt-0 focus:outline-none"
              >
                <h2
                  id={`${section.id}-title`}
                  className={pageSectionTitleClass}
                >
                  {section.title}
                </h2>
                <p className="mt-2 text-pretty text-(--text-muted)">
                  {section.description}
                </p>

                <div className="mt-6">
                  {section.customContent ?? (
                    <div className="border-t border-(--border-card)">
                      {section.items.map((item) => (
                        <details
                          key={item.question}
                          className="group border-b border-(--border-card)"
                        >
                          <summary className="flex cursor-pointer list-none items-start justify-between gap-4 rounded-sm py-4 text-left marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary)">
                            <h3 className="text-base font-medium text-(--text-page) sm:text-lg">
                              {item.question}
                            </h3>
                            <PlusIcon
                              size={18}
                              aria-hidden="true"
                              className="mt-1 shrink-0 text-(--text-muted) transition-transform group-open:rotate-45"
                            />
                          </summary>
                          <div className="space-y-2 pb-5 text-pretty text-(--text-muted)">
                            {item.answer}
                          </div>
                        </details>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            ))}

            <section
              aria-labelledby="faq-more-title"
              className="mt-16 border-t border-(--border-card) pt-10"
            >
              <h2 id="faq-more-title" className={pageSectionTitleClass}>
                {t('faq.footer.title')}
              </h2>
              <p className="mt-2 text-(--text-muted)">{t('faq.footer.text')}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <LocalizedLink
                  to="/generator"
                  className={`${primaryButtonClass} px-5 py-2.5 text-base font-semibold`}
                >
                  {t('faq.footer.generatorBtn')}
                </LocalizedLink>
                <LocalizedLink
                  to="/feedback"
                  className={`${secondaryButtonClass} px-5 py-2.5 text-base font-semibold`}
                >
                  {t('faq.footer.contactBtn')}
                </LocalizedLink>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

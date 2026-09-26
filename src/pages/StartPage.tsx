// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import {
  ShieldCheckIcon,
  QuestionIcon,
  AddressBookTabsIcon,
  HouseIcon,
  GridNineIcon,
  MailboxIcon,
  HandHeartIcon,
  ChalkboardTeacherIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import Seo from '@/components/Seo';
import { LocalizedLink } from '@/components/LocalizedLink';
import {
  dataChipClass,
  dataFamilyClass,
  dataHeadingClass,
  primaryButtonClass,
  quietLinkClass,
} from '@/utils';
import {
  pageEyebrowClass,
  pageSectionTitleClass,
} from '@/components/publicPage/pageTokens';
import {
  CRITERIA_FAMILY_MAP,
  CRITERIA_ICON_MAP,
} from '@/utils/ui/criteriaIcons';
import { KpLockup } from '@/components/KpLockup';
import { usePageSeo } from '@/hooks/usePageSeo';
import HeroMockup from '@/components/HeroMockup';
import type { ScalarMixSettingKey } from '@/types';

const sectionTitleClass = `mt-3 ${pageSectionTitleClass}`;
const sectionClass = 'border-t border-(--border-card) py-14 lg:py-20';

/**
 * The three layers of the workspace, named with the layer switcher's own words
 * so the start page and the app cannot call them differently.
 */
const layers = [
  {
    icon: AddressBookTabsIcon,
    titleKey: 'generator:shell.layers.class',
    textKey: 'startPage.layers.classText',
  },
  {
    icon: HouseIcon,
    titleKey: 'generator:shell.layers.room',
    textKey: 'startPage.layers.roomText',
  },
  {
    icon: GridNineIcon,
    titleKey: 'generator:shell.layers.plan',
    textKey: 'startPage.layers.planText',
  },
] as const;

/**
 * The criteria in the order the inspector asks about a student, each under the
 * family it speaks for. Colour and icon come from `criteriaIcons`, the label
 * from the criterion itself — the chips here read exactly like the ones beside
 * the plan.
 */
const criteriaGroups: readonly {
  labelKey: string;
  criteria: readonly ScalarMixSettingKey[];
}[] = [
  {
    labelKey: 'students:inspector.groups.behavior',
    criteria: ['avoidRestlessTogether', 'avoidConcentrationTogether'],
  },
  {
    labelKey: 'students:inspector.groups.social',
    criteria: [
      'avoidShyAlone',
      'distributeSocialRoles',
      'considerWishPartners',
      'avoidConflictPartners',
    ],
  },
  {
    labelKey: 'students:inspector.groups.learning',
    criteria: ['peerTutoring', 'homogeneousPerformanceGroups'],
  },
  {
    labelKey: 'students:inspector.groups.language',
    criteria: ['preferLanguageMixing'],
  },
  {
    labelKey: 'students:inspector.groups.space',
    criteria: [
      'preferFrontForNeedsFrontSeat',
      'preferFrontForSmallerStudents',
      'preferWindowSeats',
      'preferDoorSeats',
    ],
  },
  {
    labelKey: 'students:inspector.groups.person',
    criteria: ['preferGenderMix'],
  },
  {
    labelKey: 'startPage.criteria.historyGroup',
    criteria: ['avoidPreviousPairs'],
  },
];

const recipeKeys = [
  'generator:mix.recipes.quietWork.label',
  'generator:mix.recipes.groupWork.label',
  'generator:mix.recipes.exam.label',
] as const;

export default function StartPage() {
  const { t, i18n } = useTranslation('pages');
  const metadata = usePageSeo('/');

  // Names quoted from the app, joined the way the language joins a list.
  const quote = (key: string) => t('startPage.quoted', { text: t(key) });
  const joinWith = (
    keys: readonly string[],
    type: 'conjunction' | 'disjunction',
  ) =>
    new Intl.ListFormat(i18n.language, { style: 'long', type }).format(
      keys.map(quote),
    );

  const benefits = [
    {
      icon: ShieldCheckIcon,
      title: t('startPage.why.privacy'),
      text: t('startPage.why.privacyDescription'),
    },
    {
      icon: ChalkboardTeacherIcon,
      title: t('startPage.why.projector'),
      text: t('startPage.why.projectorDescription'),
    },
    {
      icon: UsersThreeIcon,
      title: t('startPage.why.sample'),
      text: t('startPage.why.sampleDescription'),
    },
  ];

  return (
    <main id="main" tabIndex={-1} className="bg-(--surface-page) px-4 sm:px-6">
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
      <div className="mx-auto max-w-6xl">
        <header
          role="banner"
          aria-label={t('header.banner.start')}
          className="grid items-center gap-10 py-10 lg:grid-cols-12 lg:gap-12 lg:py-16"
        >
          <div className="flex flex-col items-start lg:col-span-5">
            <LocalizedLink
              to="/"
              className="kp-lockup focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary) focus-visible:ring-offset-2"
              aria-label={t('header.homeLink')}
            >
              <KpLockup size="md" />
            </LocalizedLink>

            <h1 className="mt-10 font-serif text-5xl tracking-tight text-balance text-(--text-page) sm:text-6xl">
              {t('startPage.heroTitle')}
            </h1>

            <p className="mt-5 max-w-md text-lg text-pretty text-(--text-muted)">
              {t('startPage.heroDescription')}
            </p>

            <LocalizedLink
              to="/generator"
              className={`mt-8 w-full sm:w-auto ${primaryButtonClass} px-6 py-3 text-center text-base font-semibold`}
            >
              {t('startPage.ctaButton')}
            </LocalizedLink>

            <ul className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <li>
                <LocalizedLink
                  to="/support"
                  title={t('startPage.heroBadgeTooltip')}
                  className={quietLinkClass}
                >
                  <HandHeartIcon size={16} aria-hidden="true" />
                  <span>{t('startPage.heroBadge')}</span>
                </LocalizedLink>
              </li>
              <li>
                <LocalizedLink to="/faq" className={quietLinkClass}>
                  <QuestionIcon size={16} aria-hidden="true" />
                  <span>{t('startPage.faqLink')}</span>
                </LocalizedLink>
              </li>
              <li>
                <LocalizedLink to="/feedback" className={quietLinkClass}>
                  <MailboxIcon size={16} aria-hidden="true" />
                  <span>{t('startPage.contactLink')}</span>
                </LocalizedLink>
              </li>
            </ul>
          </div>

          <div className="min-w-0 lg:col-span-7">
            <HeroMockup />
          </div>
        </header>

        {/* Klasse · Raum · Plan */}
        <section aria-labelledby="layers-title" className={sectionClass}>
          <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-5">
              <p className={pageEyebrowClass}>
                {t('startPage.layers.eyebrow')}
              </p>
              <h2 id="layers-title" className={sectionTitleClass}>
                {t('startPage.layers.title')}
              </h2>
              <p className="mt-4 max-w-md text-pretty text-(--text-muted)">
                {t('startPage.layers.intro')}
              </p>
            </div>

            <div className="lg:col-span-7">
              <ol className="border-b border-(--border-card)">
                {layers.map((layer, index) => (
                  <li
                    key={layer.titleKey}
                    className="flex gap-5 border-t border-(--border-card) py-5"
                  >
                    <span
                      className="w-6 shrink-0 font-serif text-3xl leading-none tabular-nums text-(--text-muted)"
                      aria-hidden="true"
                    >
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <h3 className="flex items-center gap-2 text-lg font-semibold text-(--text-page)">
                        <layer.icon
                          size={20}
                          className="text-(--text-muted)"
                          aria-hidden="true"
                        />
                        {t(layer.titleKey)}
                      </h3>
                      <p className="mt-1 text-pretty text-(--text-muted)">
                        {t(layer.textKey, {
                          question: quote(
                            'students:focusMode.questions.restless',
                          ),
                        })}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-5 text-sm text-pretty text-(--text-muted)">
                {t('startPage.layers.exits')}
              </p>
            </div>
          </div>
        </section>

        {/* The criteria — the one place this page carries colour, and only
            because each colour describes pedagogy, with icon and word. */}
        <section aria-labelledby="criteria-title" className={sectionClass}>
          <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-5">
              <p className={pageEyebrowClass}>
                {t('startPage.criteria.eyebrow')}
              </p>
              <h2 id="criteria-title" className={sectionTitleClass}>
                {t('startPage.criteria.title')}
              </h2>
              <p className="mt-4 max-w-md text-pretty text-(--text-muted)">
                {t('startPage.criteria.intro', {
                  recipes: joinWith(recipeKeys, 'disjunction'),
                })}
              </p>
            </div>

            <div className="grid content-start gap-x-8 gap-y-6 sm:grid-cols-2 lg:col-span-7">
              {criteriaGroups.map((group) => (
                <div
                  key={group.labelKey}
                  className={`${dataFamilyClass[CRITERIA_FAMILY_MAP[group.criteria[0]]]} border-t border-(--border-card) pt-3`}
                >
                  <h3 className={dataHeadingClass}>{t(group.labelKey)}</h3>
                  <ul className="mt-2.5 flex flex-wrap gap-1.5">
                    {group.criteria.map((key) => {
                      const Icon = CRITERIA_ICON_MAP[key];
                      return (
                        <li key={key} className={dataChipClass}>
                          <Icon size={14} aria-hidden="true" />
                          {t(`generator:mix.criteria.${key}.label`)}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="why-title" className={sectionClass}>
          <p className={pageEyebrowClass}>{t('startPage.why.eyebrow')}</p>
          <h2 id="why-title" className={`${sectionTitleClass} max-w-2xl`}>
            {t('startPage.why.title')}
          </h2>
          <ul className="mt-10 grid gap-8 sm:grid-cols-3">
            {benefits.map((benefit) => (
              <li
                key={benefit.title}
                className="border-t border-(--border-card) pt-5"
              >
                <benefit.icon
                  size={24}
                  className="text-(--text-muted)"
                  aria-hidden="true"
                />
                <h3 className="mt-3 text-lg font-semibold text-(--text-page)">
                  {benefit.title}
                </h3>
                <p className="mt-1 text-pretty text-(--text-muted)">
                  {benefit.text}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}

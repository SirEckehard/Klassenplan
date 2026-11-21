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
  IdentificationCardIcon,
  GameControllerIcon,
  HandPointingIcon,
  BroomIcon,
  MagnifyingGlassIcon,
} from '@phosphor-icons/react';
import { useState } from 'react';
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
  pageTitleClass,
} from '@/components/publicPage/pageTokens';
import {
  CRITERIA_FAMILY_MAP,
  CRITERIA_ICON_MAP,
} from '@/utils/ui/criteriaIcons';
import PublicPage from '@/components/publicPage/PublicPage';
import { APP_RETURN_STATE } from '@/hooks/useReturnToApp';
import { usePageSeo } from '@/hooks/usePageSeo';
import HeroMockup from '@/components/HeroMockup';
import PreviewDetail from '@/components/publicPage/PreviewDetail';
import type { ScalarMixSettingKey } from '@/types';

const sectionTitleClass = `mt-3 ${pageSectionTitleClass}`;
const sectionClass = 'border-t border-(--border-card) py-14 lg:py-20';
/**
 * A section's claim on the left. From `lg` up its column is as tall as the
 * list beside it, and the close-up under the claim takes what is left.
 */
const sectionClaimClass = 'lg:col-span-5 lg:flex lg:flex-col';
/**
 * The title of a step or a tool whose close-up is not the one shown: grey
 * from `lg` up, where the close-up stands beside the list, and ink again
 * under a pointer. The one shown keeps its ink, its number or icon too.
 */
const unchosenTitleClass =
  'lg:text-(--text-muted) lg:group-hover:text-(--text-page)';

/**
 * The three layers of the workspace, named with the layer switcher's own words
 * so the start page and the app cannot call them differently, each with the
 * close-up that shows what its text says.
 */
const layers = [
  {
    icon: AddressBookTabsIcon,
    titleKey: 'generator:shell.layers.class',
    textKey: 'startPage.layers.classText',
    detail: 'detail_klasse',
  },
  {
    icon: HouseIcon,
    titleKey: 'generator:shell.layers.room',
    textKey: 'startPage.layers.roomText',
    detail: 'detail_raum',
  },
  {
    icon: GridNineIcon,
    titleKey: 'generator:shell.layers.plan',
    textKey: 'startPage.layers.planText',
    detail: 'detail_sitzplan',
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
      'keepNeighbourSeatFree',
      'seatLeftHandersLeft',
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

/**
 * The families in the cells of a two-column grid. The last two, Person and
 * Verlauf, a criterion each, share a cell: they stand under one another
 * beside the tall "Platz & Raum" rather than one of them in a row of its own.
 * In one column the order is the same.
 */
const criteriaCells = [
  ...criteriaGroups.slice(0, -2).map((group) => [group]),
  criteriaGroups.slice(-2),
];

/**
 * What the class is good for beyond the plan, in the order a school year
 * meets it: the first day, the lessons, the week, a substitute. Icon and name
 * are the ones the export's toolbar (the name cards) and the toolbar's
 * "Klassenwerkzeuge" give them, the close-up the page at work. The tool pages
 * are `noindex` — they show an empty state without a class — so this is
 * where a search finds them.
 */
const tools = [
  {
    icon: IdentificationCardIcon,
    titleKey: 'generator:export.cards.view',
    textKey: 'startPage.tools.cards',
    detail: 'detail_namensschilder',
  },
  {
    icon: GameControllerIcon,
    titleKey: 'pages:nameGame.title',
    textKey: 'startPage.tools.nameGame',
    detail: 'detail_namensspiel',
  },
  {
    icon: HandPointingIcon,
    titleKey: 'generator:tools.whoIsNext.title',
    textKey: 'startPage.tools.whoIsNext',
    detail: 'detail_werkommtdran',
  },
  {
    icon: UsersThreeIcon,
    titleKey: 'generator:tools.groups.title',
    textKey: 'startPage.tools.groups',
    detail: 'detail_gruppen',
  },
  {
    icon: BroomIcon,
    titleKey: 'generator:tools.duties.title',
    textKey: 'startPage.tools.duties',
    detail: 'detail_dienste',
  },
  {
    icon: MagnifyingGlassIcon,
    titleKey: 'generator:tools.seatFinder.title',
    textKey: 'startPage.tools.seatFinder',
    detail: 'detail_wositztwer',
  },
] as const;

const layerDetails = layers.map((layer) => layer.detail);
/** "Vordere Plätze" marking its seats beside the criteria's values. */
const criteriaDetails = ['detail_kriterien'] as const;
const toolDetails = tools.map((tool) => tool.detail);

export default function StartPage() {
  const { t } = useTranslation('pages');
  const metadata = usePageSeo('/');
  // The layer and the tool whose close-ups stand beside their lists: the one
  // last clicked or tapped, the first to begin with.
  const [shownLayer, setShownLayer] = useState(0);
  const [shownTool, setShownTool] = useState(0);

  // Names quoted from the app.
  const quote = (key: string) => t('common:quoted', { text: t(key) });

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
    <PublicPage bannerLabel={t('header.banner.start')} headInColumn>
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
      <div className="grid items-center gap-10 pt-2 pb-10 lg:grid-cols-12 lg:gap-12 lg:pt-0 lg:pb-16">
        <div className="flex flex-col items-start lg:col-span-5">
          <p className={pageEyebrowClass}>{t('startPage.heroEyebrow')}</p>
          <h1 className={pageTitleClass}>{t('startPage.heroTitle')}</h1>

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
                state={APP_RETURN_STATE}
                title={t('startPage.heroBadgeTooltip')}
                className={quietLinkClass}
              >
                <HandHeartIcon size={16} aria-hidden="true" />
                <span>{t('startPage.heroBadge')}</span>
              </LocalizedLink>
            </li>
            <li>
              <LocalizedLink
                to="/faq"
                state={APP_RETURN_STATE}
                className={quietLinkClass}
              >
                <QuestionIcon size={16} aria-hidden="true" />
                <span>{t('startPage.faqLink')}</span>
              </LocalizedLink>
            </li>
            <li>
              <LocalizedLink
                to="/feedback"
                state={APP_RETURN_STATE}
                className={quietLinkClass}
              >
                <MailboxIcon size={16} aria-hidden="true" />
                <span>{t('startPage.contactLink')}</span>
              </LocalizedLink>
            </li>
          </ul>
        </div>

        <div className="min-w-0 lg:col-span-7">
          <HeroMockup />
        </div>
      </div>

      {/* Klasse · Raum · Plan */}
      <section aria-labelledby="layers-title" className={sectionClass}>
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
          <div className={sectionClaimClass}>
            <p className={pageEyebrowClass}>{t('startPage.layers.eyebrow')}</p>
            <h2 id="layers-title" className={sectionTitleClass}>
              {t('startPage.layers.title')}
            </h2>
            <p className="mt-4 max-w-md text-pretty text-(--text-muted)">
              {t('startPage.layers.intro')}
            </p>
            <PreviewDetail slugs={layerDetails} current={shownLayer} />
          </div>

          <div className="lg:col-span-7">
            <ol>
              {layers.map((layer, index) => (
                // A click or a tap on a step puts its close-up beside the
                // list — never pointing alone, which the page scrolling under
                // a resting pointer does too. The picture adds nothing the
                // words do not say, so the keyboard loses nothing.
                <li
                  key={layer.titleKey}
                  onClick={() => setShownLayer(index)}
                  className="group flex gap-5 border-t border-(--border-card) py-5 lg:cursor-pointer"
                >
                  <span
                    className={`w-6 shrink-0 font-serif text-3xl leading-none tabular-nums text-(--text-muted) transition-colors lg:group-hover:text-(--text-page) ${
                      index === shownLayer ? 'lg:text-(--text-page)' : ''
                    }`}
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <h3
                      className={`flex items-center gap-2 text-lg font-semibold text-(--text-page) transition-colors ${
                        index === shownLayer ? '' : unchosenTitleClass
                      }`}
                    >
                      <layer.icon
                        size={20}
                        className="text-(--text-muted)"
                        aria-hidden="true"
                      />
                      {t(layer.titleKey)}
                    </h3>
                    <p className="mt-1 text-pretty text-(--text-muted)">
                      {t(layer.textKey, {
                        question: quote('students:brush.questions.restless'),
                        setup: quote('generator:sceneInspector.setup'),
                      })}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* The criteria — the one place this page carries colour, and only
            because each colour describes pedagogy, with icon and word. */}
      <section aria-labelledby="criteria-title" className={sectionClass}>
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
          <div className={sectionClaimClass}>
            <p className={pageEyebrowClass}>
              {t('startPage.criteria.eyebrow')}
            </p>
            <h2 id="criteria-title" className={sectionTitleClass}>
              {t('startPage.criteria.title')}
            </h2>
            <p className="mt-4 max-w-md text-pretty text-(--text-muted)">
              {t('startPage.criteria.intro')}
            </p>
            <PreviewDetail slugs={criteriaDetails} />
          </div>

          <div className="grid content-start gap-x-8 gap-y-6 sm:grid-cols-2 lg:col-span-7">
            {criteriaCells.map((cell) => (
              <div key={cell[0].labelKey} className="flex flex-col gap-y-6">
                {cell.map((group) => (
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
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="tools-title" className={sectionClass}>
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
          <div className={sectionClaimClass}>
            <p className={pageEyebrowClass}>{t('startPage.tools.eyebrow')}</p>
            <h2 id="tools-title" className={sectionTitleClass}>
              {t('startPage.tools.title')}
            </h2>
            <p className="mt-4 max-w-md text-pretty text-(--text-muted)">
              {t('startPage.tools.intro')}
            </p>
            <PreviewDetail slugs={toolDetails} current={shownTool} />
          </div>

          <ul className="grid content-start gap-x-8 gap-y-6 sm:grid-cols-2 lg:col-span-7">
            {tools.map((tool, index) => (
              // As the layers' steps: a click or a tap on a tool puts its
              // close-up beside the list.
              <li
                key={tool.titleKey}
                onClick={() => setShownTool(index)}
                className="group border-t border-(--border-card) pt-3 lg:cursor-pointer"
              >
                <h3
                  className={`flex items-center gap-2 text-lg font-semibold text-(--text-page) transition-colors ${
                    index === shownTool ? '' : unchosenTitleClass
                  }`}
                >
                  <tool.icon
                    size={20}
                    className={`text-(--text-muted) transition-colors lg:group-hover:text-(--text-page) ${
                      index === shownTool ? 'lg:text-(--text-page)' : ''
                    }`}
                    aria-hidden="true"
                  />
                  {t(tool.titleKey)}
                </h3>
                <p className="mt-1 text-pretty text-(--text-muted)">
                  {t(tool.textKey)}
                </p>
              </li>
            ))}
          </ul>
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
    </PublicPage>
  );
}

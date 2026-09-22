// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import {
  // Person
  PersonSimpleIcon,
  ArrowsVerticalIcon,
  // Learning
  TrendUpIcon,
  TrendDownIcon,
  // Language
  TranslateIcon,
  // Behaviour
  ActivityIcon,
  BrainIcon,
  // Social
  SmileyNervousIcon,
  UsersThreeIcon,
  HeartIcon,
  HeartBreakIcon,
  // Seat & room
  MapPinAreaIcon,
  ImageIcon,
  DoorIcon,
} from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';
import {
  dataChipClass,
  dataFamilyClass,
  dataHeadingClass,
  type DataFamily,
} from '@/utils';

interface PropertyDefinition {
  key: string;
  icon: Icon;
  labelKey: string;
  descriptionKey: string;
  algorithmKey: string;
}

interface CategoryDefinition {
  /** The pedagogical family, which is also the inspector's group. */
  id: DataFamily;
  labelKey: string;
  properties: PropertyDefinition[];
}

/**
 * Every student property under the family it belongs to, as the class list
 * shows it: a chip with icon and word in the family's colour, what the property
 * means and what the algorithm does with it.
 */
export default function CriteriaReferenceSection() {
  const { t } = useTranslation('pages');

  // Student properties in the class list's groups and order
  // (`StudentInspector`), under the same headings.
  const categories: CategoryDefinition[] = [
    {
      id: 'person',
      labelKey: 'students:inspector.groups.person',
      properties: [
        {
          key: 'gender',
          icon: PersonSimpleIcon,
          labelKey: 'faq.eigenschaften.props.gender.label',
          descriptionKey: 'faq.eigenschaften.props.gender.description',
          algorithmKey: 'faq.eigenschaften.props.gender.algorithm',
        },
        {
          key: 'height',
          icon: ArrowsVerticalIcon,
          labelKey: 'faq.eigenschaften.props.height.label',
          descriptionKey: 'faq.eigenschaften.props.height.description',
          algorithmKey: 'faq.eigenschaften.props.height.algorithm',
        },
      ],
    },
    {
      id: 'learning',
      labelKey: 'students:inspector.groups.learning',
      properties: [
        {
          key: 'performanceStrong',
          icon: TrendUpIcon,
          labelKey: 'faq.eigenschaften.props.performanceStrong.label',
          descriptionKey:
            'faq.eigenschaften.props.performanceStrong.description',
          algorithmKey: 'faq.eigenschaften.props.performanceStrong.algorithm',
        },
        {
          key: 'performanceWeak',
          icon: TrendDownIcon,
          labelKey: 'faq.eigenschaften.props.performanceWeak.label',
          descriptionKey: 'faq.eigenschaften.props.performanceWeak.description',
          algorithmKey: 'faq.eigenschaften.props.performanceWeak.algorithm',
        },
      ],
    },
    {
      id: 'language',
      labelKey: 'students:inspector.groups.language',
      properties: [
        {
          key: 'languageSkill',
          icon: TranslateIcon,
          labelKey: 'faq.eigenschaften.props.languageSkill.label',
          descriptionKey: 'faq.eigenschaften.props.languageSkill.description',
          algorithmKey: 'faq.eigenschaften.props.languageSkill.algorithm',
        },
      ],
    },
    {
      id: 'behavior',
      labelKey: 'students:inspector.groups.behavior',
      properties: [
        {
          key: 'restless',
          icon: ActivityIcon,
          labelKey: 'faq.eigenschaften.props.restless.label',
          descriptionKey: 'faq.eigenschaften.props.restless.description',
          algorithmKey: 'faq.eigenschaften.props.restless.algorithm',
        },
        {
          key: 'concentrationIssues',
          icon: BrainIcon,
          labelKey: 'faq.eigenschaften.props.concentrationIssues.label',
          descriptionKey:
            'faq.eigenschaften.props.concentrationIssues.description',
          algorithmKey: 'faq.eigenschaften.props.concentrationIssues.algorithm',
        },
      ],
    },
    {
      id: 'social',
      labelKey: 'students:inspector.groups.social',
      properties: [
        {
          key: 'shy',
          icon: SmileyNervousIcon,
          labelKey: 'faq.eigenschaften.props.shy.label',
          descriptionKey: 'faq.eigenschaften.props.shy.description',
          algorithmKey: 'faq.eigenschaften.props.shy.algorithm',
        },
        {
          key: 'socialRole',
          icon: UsersThreeIcon,
          labelKey: 'faq.eigenschaften.props.socialRole.label',
          descriptionKey: 'faq.eigenschaften.props.socialRole.description',
          algorithmKey: 'faq.eigenschaften.props.socialRole.algorithm',
        },
        {
          key: 'wishPartner',
          icon: HeartIcon,
          labelKey: 'faq.eigenschaften.props.wishPartner.label',
          descriptionKey: 'faq.eigenschaften.props.wishPartner.description',
          algorithmKey: 'faq.eigenschaften.props.wishPartner.algorithm',
        },
        {
          key: 'avoidPartner',
          icon: HeartBreakIcon,
          labelKey: 'faq.eigenschaften.props.avoidPartner.label',
          descriptionKey: 'faq.eigenschaften.props.avoidPartner.description',
          algorithmKey: 'faq.eigenschaften.props.avoidPartner.algorithm',
        },
      ],
    },
    {
      id: 'space',
      labelKey: 'students:inspector.groups.space',
      properties: [
        {
          key: 'needsFrontSeat',
          icon: MapPinAreaIcon,
          labelKey: 'faq.eigenschaften.props.needsFrontSeat.label',
          descriptionKey: 'faq.eigenschaften.props.needsFrontSeat.description',
          algorithmKey: 'faq.eigenschaften.props.needsFrontSeat.algorithm',
        },
        {
          key: 'prefersWindow',
          icon: ImageIcon,
          labelKey: 'faq.eigenschaften.props.prefersWindow.label',
          descriptionKey: 'faq.eigenschaften.props.prefersWindow.description',
          algorithmKey: 'faq.eigenschaften.props.prefersWindow.algorithm',
        },
        {
          key: 'prefersDoor',
          icon: DoorIcon,
          labelKey: 'faq.eigenschaften.props.prefersDoor.label',
          descriptionKey: 'faq.eigenschaften.props.prefersDoor.description',
          algorithmKey: 'faq.eigenschaften.props.prefersDoor.algorithm',
        },
      ],
    },
  ];

  return (
    <div className="space-y-8">
      <p className="text-pretty text-(--text-muted)">
        {t('faq.eigenschaften.intro')}
      </p>

      {categories.map((category) => (
        <section
          key={category.id}
          aria-labelledby={`property-group-${category.id}`}
          className={`${dataFamilyClass[category.id]} border-t border-(--border-card) pt-3`}
        >
          <h3 id={`property-group-${category.id}`} className={dataHeadingClass}>
            {t(category.labelKey)}
          </h3>
          <dl className="mt-1">
            {category.properties.map((prop) => (
              <div
                key={prop.key}
                className="grid gap-x-6 gap-y-2 border-b border-(--border-card) py-3 last:border-b-0 sm:grid-cols-12"
              >
                <dt className="sm:col-span-4">
                  <span className={dataChipClass}>
                    <prop.icon size={14} aria-hidden="true" />
                    {t(prop.labelKey)}
                  </span>
                </dt>
                <dd className="text-sm text-pretty sm:col-span-8">
                  <p className="text-(--text-page)">{t(prop.descriptionKey)}</p>
                  <p className="mt-1 text-(--text-muted)">
                    <span className="font-medium">
                      {t('faq.eigenschaften.algorithmLabel')}
                    </span>{' '}
                    {t(prop.algorithmKey)}
                  </p>
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

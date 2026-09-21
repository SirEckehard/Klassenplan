// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
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
import { cardSurfaceClass } from '@/utils';

interface PropertyDefinition {
  key: string;
  icon: Icon;
  labelKey: string;
  descriptionKey: string;
  algorithmKey: string;
}

interface CategoryDefinition {
  id: string;
  labelKey: string;
  properties: PropertyDefinition[];
}

/**
 * Displays a styled HTML table of student properties and mix criteria
 * with icons, descriptions, and algorithm explanations.
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
    <div className="space-y-6">
      {/* Introduction */}
      <p className="text-(--text-muted)">{t('faq.eigenschaften.intro')}</p>

      {/* TableIcon */}
      <div className="overflow-x-auto">
        <table
          className={`${cardSurfaceClass} w-full border-collapse border text-sm`}
        >
          <thead>
            <tr className="bg-(--surface-option-selected)">
              <th className="border border-(--border-card) px-4 py-3 text-left font-semibold text-(--text-page)">
                {t('faq.eigenschaften.tableHeaders.property', 'Eigenschaft')}
              </th>
              <th className="border border-(--border-card) px-4 py-3 text-left font-semibold text-(--text-page)">
                {t(
                  'faq.eigenschaften.tableHeaders.description',
                  'Beschreibung',
                )}
              </th>
              <th className="border border-(--border-card) px-4 py-3 text-left font-semibold text-(--text-page)">
                {t(
                  'faq.eigenschaften.tableHeaders.algorithm',
                  'Algorithmus-Auswirkung',
                )}
              </th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <React.Fragment key={category.id}>
                {/* Category Header Row */}
                <tr className="bg-(--surface-sunken)">
                  <td
                    colSpan={3}
                    className="border border-(--border-card) px-4 py-2"
                  >
                    <span className="font-semibold text-(--text-badge)">
                      {t(category.labelKey)}
                    </span>
                  </td>
                </tr>
                {/* Property Rows */}
                {category.properties.map((prop) => (
                  <tr
                    key={prop.key}
                    className="hover:bg-(--surface-sunken) transition-colors"
                  >
                    <td className="border border-(--border-card) px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-(--surface-option-selected) text-(--text-badge)">
                          <prop.icon size={14} aria-hidden="true" />
                        </span>
                        <span className="font-medium text-(--text-page)">
                          {t(prop.labelKey)}
                        </span>
                      </div>
                    </td>
                    <td className="border border-(--border-card) px-4 py-3 text-(--text-muted)">
                      {t(prop.descriptionKey)}
                    </td>
                    <td className="border border-(--border-card) px-4 py-3 text-(--text-badge)">
                      {t(prop.algorithmKey)}
                    </td>
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

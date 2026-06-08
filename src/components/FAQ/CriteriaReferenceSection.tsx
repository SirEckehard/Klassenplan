// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  // Identity
  PersonSimpleIcon,
  ArrowsVerticalIcon,
  // Abilities
  TranslateIcon,
  TrendUpIcon,
  TrendDownIcon,
  MapPinAreaIcon,
  // Behavior
  ActivityIcon,
  SmileyNervousIcon,
  BrainIcon,
  // Social
  UsersThreeIcon,
  HeartIcon,
  HeartBreakIcon,
  // Room
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

  // Student properties organized by category (matching Step 1 order)
  const categories: CategoryDefinition[] = [
    {
      id: 'identity',
      labelKey: 'faq.eigenschaften.categories.identity',
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
      id: 'abilities',
      labelKey: 'faq.eigenschaften.categories.abilities',
      properties: [
        {
          key: 'languageSkill',
          icon: TranslateIcon,
          labelKey: 'faq.eigenschaften.props.languageSkill.label',
          descriptionKey: 'faq.eigenschaften.props.languageSkill.description',
          algorithmKey: 'faq.eigenschaften.props.languageSkill.algorithm',
        },
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
        {
          key: 'needsFrontSeat',
          icon: MapPinAreaIcon,
          labelKey: 'faq.eigenschaften.props.needsFrontSeat.label',
          descriptionKey:
            'faq.eigenschaften.props.needsFrontSeat.description',
          algorithmKey: 'faq.eigenschaften.props.needsFrontSeat.algorithm',
        },
      ],
    },
    {
      id: 'behavior',
      labelKey: 'faq.eigenschaften.categories.behavior',
      properties: [
        {
          key: 'restless',
          icon: ActivityIcon,
          labelKey: 'faq.eigenschaften.props.restless.label',
          descriptionKey: 'faq.eigenschaften.props.restless.description',
          algorithmKey: 'faq.eigenschaften.props.restless.algorithm',
        },
        {
          key: 'shy',
          icon: SmileyNervousIcon,
          labelKey: 'faq.eigenschaften.props.shy.label',
          descriptionKey: 'faq.eigenschaften.props.shy.description',
          algorithmKey: 'faq.eigenschaften.props.shy.algorithm',
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
      labelKey: 'faq.eigenschaften.categories.social',
      properties: [
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
      id: 'room',
      labelKey: 'faq.eigenschaften.categories.room',
      properties: [
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
      <p className="text-gray-700 dark:text-gray-300">
        {t('faq.eigenschaften.intro')}
      </p>

      {/* TableIcon */}
      <div className="overflow-x-auto">
        <table
          className={`${cardSurfaceClass} w-full border-collapse border text-sm`}
        >
          <thead>
            <tr className="bg-blue-50 dark:bg-blue-900/30">
              <th className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-800 dark:text-gray-200">
                {t('faq.eigenschaften.tableHeaders.property', 'Eigenschaft')}
              </th>
              <th className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-800 dark:text-gray-200">
                {t(
                  'faq.eigenschaften.tableHeaders.description',
                  'Beschreibung',
                )}
              </th>
              <th className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-800 dark:text-gray-200">
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
                <tr className="bg-gray-100 dark:bg-gray-800">
                  <td
                    colSpan={3}
                    className="border border-gray-200 dark:border-gray-700 px-4 py-2"
                  >
                    <span className="font-semibold text-blue-600 dark:text-blue-300">
                      {t(category.labelKey)}
                    </span>
                  </td>
                </tr>
                {/* Property Rows */}
                {category.properties.map((prop) => (
                  <tr
                    key={prop.key}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300">
                          <prop.icon size={14} aria-hidden="true" />
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {t(prop.labelKey)}
                        </span>
                      </div>
                    </td>
                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-gray-600 dark:text-gray-400">
                      {t(prop.descriptionKey)}
                    </td>
                    <td className="border border-gray-200 dark:border-gray-700 px-4 py-3 text-blue-600 dark:text-blue-300">
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

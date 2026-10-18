// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { ShuffleIcon, WarningIcon } from '@phosphor-icons/react';
import {
  InspectorBody,
  InspectorDeleteFooter,
  InspectorHeader,
  InspectorIcon,
  InspectorMediaTile,
  InspectorRow,
  InspectorSection,
} from '@/components/shell/InspectorPanel';
import { buildMixCriteriaCategories } from '@/hooks/ui/useMixCriteria';
import type { MixResult } from '@/types';
import {
  criterionImportance,
  criterionWeight,
  formatDateAndTime,
} from '@/utils';
import { CRITERIA_ICON_MAP } from '@/utils/ui/criteriaIcons';

/**
 * A recent mix: when it was made and in which room, the criteria it was
 * mixed by in words — read as the criteria panel reads them, a row per
 * criterion under its family, its level's word where the scale stands there;
 * a mix keeps no tables of its own, so one that no longer fits its room says
 * so — and removing it.
 */
export default function MixPanel({
  mix,
  roomName,
  fits,
  onDelete,
}: {
  mix: MixResult;
  roomName?: string;
  /** Whether it still fits the tables of the room it was made in. */
  fits: boolean;
  onDelete: () => void;
}) {
  const { t } = useTranslation('generator');
  // Only what carried weight, in the criteria panel's order and families.
  const categories = buildMixCriteriaCategories(t)
    .map((category) => ({
      ...category,
      criteria: category.criteria.filter(
        (criterion) => criterionWeight(mix.mixSettings, criterion.key) > 0,
      ),
    }))
    .filter((category) => category.criteria.length > 0);

  return (
    <>
      <InspectorHeader
        media={<InspectorMediaTile icon={ShuffleIcon} />}
        title={formatDateAndTime(mix.timestamp)}
        subtitle={roomName}
      />
      <InspectorBody>
        {!fits && (
          // The same notice as the criteria panel's for a purely random mix.
          <div
            role="status"
            className="mb-3 flex items-center gap-2 rounded-md border border-(--border-card) bg-(--surface-sunken) px-2.5 py-1.5 text-xs font-medium text-(--text-page)"
          >
            <WarningIcon
              size={16}
              aria-hidden="true"
              className="shrink-0 text-(--status-warn)"
            />
            {t('toast:mix.doesNotFit')}
          </div>
        )}
        {categories.length === 0 ? (
          <InspectorSection title={t('library.mix.criteria')}>
            <p className="text-control text-(--text-muted)">
              {t('library.mix.random')}
            </p>
          </InspectorSection>
        ) : (
          categories.map((category) => (
            <InspectorSection
              key={category.id}
              family={category.id}
              title={category.label}
            >
              {category.criteria.map((criterion) => (
                <InspectorRow
                  key={criterion.key}
                  label={criterion.label}
                  icon={
                    <InspectorIcon
                      icon={CRITERIA_ICON_MAP[criterion.key]}
                      family={category.id}
                    />
                  }
                >
                  <span className="text-control text-(--text-muted)">
                    {t(
                      `mix.importance.${criterionImportance(mix.mixSettings, criterion.key)}`,
                    )}
                  </span>
                </InspectorRow>
              ))}
            </InspectorSection>
          ))
        )}
      </InspectorBody>
      <InspectorDeleteFooter
        label={t('library.mix.delete')}
        onDelete={onDelete}
      />
    </>
  );
}

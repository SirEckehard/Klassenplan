// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { QuestionIcon } from '@phosphor-icons/react';
import { formatPercent, getStatisticStatusMeta } from '@/utils';
import type { CriterionFulfillment } from '@/utils/algorithm/seatingStatistics';
import {
  CRITERIA_FAMILY_MAP,
  CRITERIA_ICON_MAP,
} from '@/utils/ui/criteriaIcons';
import type { ScalarMixSettingKey } from '@/types';
import { InspectorIcon } from '@/components/shell/InspectorPanel';
import { touchHitAreaClass } from '@/components/shell/shellTokens';

interface FulfillmentBandProps {
  criteria: CriterionFulfillment[];
  onHighlightHover?: (criterion: CriterionFulfillment) => void;
  onHighlightLeave?: () => void;
  onHighlightToggle?: (criterion: CriterionFulfillment) => void;
  activeHighlightKey?: CriterionFulfillment['key'] | null;
  activeHighlightMode?: 'hover' | 'persistent' | null;
}

const chipClass = `${touchHitAreaClass} inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring)`;
const chipIdleClass =
  'border-(--button-secondary-border) bg-(--button-secondary-bg) text-(--text-page) hover:bg-(--button-secondary-bg-hover)';
const chipPinnedClass =
  'border-(--border-option-selected) bg-(--surface-option-selected) text-(--text-badge)';

/**
 * The values per criterion on a phone and a tablet, as a row of chips under
 * the plan: there the inspector is a sheet or a drawer over the stage, and a
 * criterion's seats lit on the plan lay under it. The band takes its height
 * out of the stage as the notices above the plan do, so the plan fits what
 * is left and stays in view; from `lg` up the values stand beside the
 * criteria in the inspector's column instead.
 *
 * The weakest criterion comes first, a fulfilled one last — what a teacher
 * looks for is where the plan falls short. A tap marks a criterion's seats
 * and the notice above the plan names them; a second tap takes the marking
 * off. The overall figure is the status bar's, which opens the band, so it
 * is not said again here.
 */
function FulfillmentBand({
  criteria,
  onHighlightHover,
  onHighlightLeave,
  onHighlightToggle,
  activeHighlightKey = null,
  activeHighlightMode = null,
}: FulfillmentBandProps) {
  const { t } = useTranslation('generator');
  // `sort` is stable, so equal values keep the criteria's own order.
  const sorted = React.useMemo(
    () => [...criteria].sort((a, b) => a.percentage - b.percentage),
    [criteria],
  );

  if (sorted.length === 0) return null;

  return (
    <div
      role="group"
      aria-label={t('statisticsBadge.title')}
      data-testid="fulfillment-band"
      // Vertical padding leaves room for the chips' touch hit areas, which
      // reach 5px beyond them and would be cut off by the scroll container.
      className="-mx-1 flex min-w-0 shrink-0 gap-2 overflow-x-auto overscroll-x-contain px-1 py-1.5"
    >
      {sorted.map((criterion) => {
        const key = criterion.key as ScalarMixSettingKey;
        const label = t(`mix.criteria.${criterion.key}.label`);
        const value = formatPercent(Math.round(criterion.percentage));
        const { status, dotClass } = getStatisticStatusMeta(
          criterion.percentage,
        );
        const pinned =
          activeHighlightKey === criterion.key &&
          activeHighlightMode === 'persistent';
        return (
          <button
            key={criterion.key}
            type="button"
            onClick={() => onHighlightToggle?.(criterion)}
            onMouseEnter={() => onHighlightHover?.(criterion)}
            onMouseLeave={onHighlightLeave}
            onFocus={() => onHighlightHover?.(criterion)}
            onBlur={onHighlightLeave}
            aria-pressed={pinned}
            aria-label={t(
              pinned
                ? 'mix.fulfillment.unpinLabel'
                : 'mix.fulfillment.pinLabel',
              { label, value },
            )}
            title={t(`statisticsBadge.status.${status}`)}
            className={`${chipClass} ${pinned ? chipPinnedClass : chipIdleClass}`}
          >
            <InspectorIcon
              icon={CRITERIA_ICON_MAP[key] ?? QuestionIcon}
              family={CRITERIA_FAMILY_MAP[key]}
            />
            <span>{label}</span>
            <span className="font-semibold">{value}</span>
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotClass}`}
            />
          </button>
        );
      })}
    </div>
  );
}

export default React.memo(FulfillmentBand);

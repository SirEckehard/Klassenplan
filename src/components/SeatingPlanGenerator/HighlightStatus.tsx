// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { QuestionIcon, XIcon } from '@phosphor-icons/react';
import type { CriterionFulfillment } from '@/utils/algorithm/seatingStatistics';
import type { ScalarMixSettingKey } from '@/types';
import {
  CRITERIA_FAMILY_MAP,
  CRITERIA_ICON_MAP,
} from '@/utils/ui/criteriaIcons';
import { InspectorIcon } from '@/components/shell/InspectorPanel';
import { touchHitAreaBorderlessClass } from '@/components/shell/shellTokens';

/**
 * What a pinned criterion marks on the plan, in the status bar in place of
 * the fulfilment while the marking stands: the criterion's icon, how many of
 * its seats fall short and a cross, all one button that takes the marking
 * off. A highlight changes what the seats mean, so it is said — but in the
 * bar, so nothing appears over the plan and the plan never moves under a tap:
 * as a notice above it, it pushed the plan down at every chip pressed.
 *
 * The words follow the bar's other words (`statusBarWordClass`): a desktop
 * and a whiteboard name the criterion, a phone and a tablet say "2 offen"
 * beside its icon — there the pressed chip of the band names it. One button
 * rather than words beside a cross of their own: a 402px phone leaves the
 * bar's left end about 100px beside the toolbar's switch, and the cross's
 * own target cut the words to "2…". Where even that is too narrow, the word
 * wraps out of sight (`h-lh overflow-hidden flex-wrap`) and the figure stays.
 */
export default function HighlightStatus({
  criterionKey,
  openCount,
  onClear,
}: {
  criterionKey: CriterionFulfillment['key'];
  openCount: number;
  onClear: () => void;
}) {
  const { t } = useTranslation('generator');
  const key = criterionKey as ScalarMixSettingKey;
  // The translated name: the statistics' own label is the algorithm's German.
  const criterion = t(`mix.criteria.${criterionKey}.label`);
  const sentence = t('statisticsBadge.highlighted', {
    criterion,
    count: openCount,
  });
  const offLabel = t('statisticsBadge.highlightOff');

  return (
    <button
      type="button"
      onClick={onClear}
      title={`${sentence} · ${offLabel}`}
      className={`${touchHitAreaBorderlessClass} inline-flex min-w-0 cursor-pointer items-center gap-1 rounded-md px-1 py-1 text-xs tabular-nums text-(--text-muted) transition hover:bg-(--surface-sunken) hover:text-(--text-page) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring) pointer-coarse:h-9 sm:gap-1.5 sm:px-1.5 sm:text-sm`}
    >
      <InspectorIcon
        icon={CRITERIA_ICON_MAP[key] ?? QuestionIcon}
        family={CRITERIA_FAMILY_MAP[key]}
      />
      <span className="sr-only">
        {sentence}. {offLabel}
      </span>
      <span
        aria-hidden="true"
        className="flex h-lh min-w-0 flex-wrap items-center gap-x-1 overflow-hidden"
      >
        <span className="hidden whitespace-nowrap lg:pointer-fine:inline xl:inline">
          {criterion} ·
        </span>
        <span className="font-semibold text-(--text-page)">{openCount}</span>
        <span className="whitespace-nowrap lg:pointer-fine:hidden xl:hidden">
          {t('statisticsBadge.openShort', { count: openCount })}
        </span>
        <span className="hidden whitespace-nowrap lg:pointer-fine:inline xl:inline">
          {t('statisticsBadge.openLong', { count: openCount })}
        </span>
      </span>
      <XIcon size={14} aria-hidden="true" className="shrink-0" />
    </button>
  );
}

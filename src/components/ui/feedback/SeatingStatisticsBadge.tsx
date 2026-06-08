// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  XIcon,
  ChartBarIcon,
  QuestionIcon,
} from '@phosphor-icons/react';
import {
  cardSurfaceClass,
  getStatisticStatusMeta,
  iconButtonClass,
} from '@/utils';
import {
  calculateCriteriaWeightedScore,
  type CriterionFulfillment,
} from '@/utils/algorithm/seatingStatistics';
import { CRITERIA_ICON_MAP } from '@/utils/ui/criteriaIcons';
import type { ScalarMixSettingKey } from '@/types';

function getCriterionIcon(key: string): React.ReactNode {
  const iconProps = { size: 14, className: 'shrink-0' };
  const IconComp = CRITERIA_ICON_MAP[key as ScalarMixSettingKey];
  return IconComp ? <IconComp {...iconProps} /> : <QuestionIcon {...iconProps} />;
}

interface SeatingStatisticsBadgeProps {
  criteria: CriterionFulfillment[];
  onClose: () => void;
  className?: string;
  onHighlightHover?: (criterion: CriterionFulfillment) => void;
  onHighlightLeave?: () => void;
  onHighlightToggle?: (criterion: CriterionFulfillment) => void;
  activeHighlightKey?: CriterionFulfillment['key'] | null;
  activeHighlightMode?: 'hover' | 'persistent' | null;
}

/**
 * Compact badge showing top fulfilled criteria after seating generation.
 * - On xl+ viewports: renders as a flex-based sidebar (relative positioning)
 * - On smaller viewports: renders as a fixed overlay at bottom-right
 */
function SeatingStatisticsBadge({
  criteria,
  onClose,
  className = '',
  onHighlightHover,
  onHighlightLeave,
  onHighlightToggle,
  activeHighlightKey = null,
  activeHighlightMode = null,
}: SeatingStatisticsBadgeProps) {
  const { t } = useTranslation('generator');

  // Helper function to get translated criterion label
  const translateCriterionLabel = (
    key: string,
    fallbackLabel: string,
  ): string => {
    return t(`mix.criteria.${key}.label`, fallbackLabel);
  };

  if (criteria.length === 0) return null;

  // Calculate overall score (weighted average)
  // IMPORTANT: Use ALL criteria for score calculation, not just visible ones
  const weightedScore = calculateCriteriaWeightedScore(criteria);

  // Responsive positioning for normal badge (sm+):
  // - xl+ (≥1280px): relative positioning for flex layout integration
  // - sm to xl: absolute positioning above the statistics toggle button
  const positionClasses =
    'xl:relative xl:w-56 xl:shadow-lg xl:z-auto xl:bottom-auto xl:right-auto ' +
    'absolute bottom-16 right-3 w-52 shadow-xl z-30';

  // Shared criteria list renderer
  const renderCriteriaList = (isFullscreen: boolean) => (
    <div className={`${isFullscreen ? 'flex-1 overflow-y-auto p-4' : 'flex-1 min-h-0 overflow-y-auto p-0.5'} space-y-1`}>
      {criteria.map((criterion) => {
        const statusMeta = getStatisticStatusMeta(criterion.percentage);
        const roundedPercentage = Math.round(criterion.percentage);
        const isActive = activeHighlightKey === criterion.key;
        const isPersistent = isActive && activeHighlightMode === 'persistent';

        const stateClass = isPersistent
          ? 'bg-blue-100 dark:bg-blue-900/40 ring-1 ring-blue-400'
          : isActive
            ? 'bg-blue-50 dark:bg-blue-900/20'
            : isFullscreen
              ? '' // No hover state on mobile (non-interactive)
              : 'hover:bg-gray-50 dark:hover:bg-gray-800/50';

        // On fullscreen (mobile), render as non-interactive div
        if (isFullscreen) {
          return (
            <div
              key={criterion.key}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-2"
            >
              <span className="text-blue-600 dark:text-blue-400">
                {getCriterionIcon(criterion.key)}
              </span>
              <span className="flex-1 truncate text-sm text-gray-700 dark:text-gray-300">
                {translateCriterionLabel(criterion.key, criterion.label)}
              </span>
              <span className="flex items-center gap-1.5 shrink-0">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {roundedPercentage}%
                </span>
                <div
                  className={`w-2 h-2 rounded-full ${statusMeta.dotClass}`}
                  role="status"
                  aria-label={statusMeta.ariaLabel}
                />
              </span>
            </div>
          );
        }

        // On desktop, render as interactive button
        return (
          <button
            key={criterion.key}
            type="button"
            className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 ${stateClass}`}
            onMouseEnter={() => onHighlightHover?.(criterion)}
            onMouseLeave={onHighlightLeave}
            onFocus={() => onHighlightHover?.(criterion)}
            onBlur={onHighlightLeave}
            onClick={() => onHighlightToggle?.(criterion)}
            aria-pressed={isPersistent}
            title={`${translateCriterionLabel(criterion.key, criterion.label)}: ${roundedPercentage}%`}
          >
            <span className="text-blue-600 dark:text-blue-400">
              {getCriterionIcon(criterion.key)}
            </span>
            <span className="flex-1 truncate text-xs text-gray-700 dark:text-gray-300">
              {translateCriterionLabel(criterion.key, criterion.label)}
            </span>
            <span className="flex items-center gap-1 shrink-0">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                {roundedPercentage}%
              </span>
              <div
                className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotClass}`}
                role="status"
                aria-label={statusMeta.ariaLabel}
              />
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Fullscreen overlay for <sm viewports (mobile) */}
      <div className="fixed inset-0 z-50 overflow-y-auto bg-white dark:bg-gray-900 sm:hidden">
        {/* Header with close button */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-blue-100/70 bg-white px-4 py-3 shadow-sm dark:border-blue-900/40 dark:bg-gray-900">
          <div className="flex items-center gap-2">
            <ChartBarIcon
              size={18}
              className="text-blue-600 dark:text-blue-400"
            />
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {t('statisticsBadge.title', 'Kriterien-Erfüllung')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className={`${iconButtonClass} h-10 w-10 border-none bg-transparent text-gray-500 shadow-none transition hover:text-blue-600 dark:text-gray-300`}
            aria-label={t('statisticsBadge.close', 'Schließen')}
          >
            <XIcon size={24} />
          </button>
        </div>

        {/* Overall Score */}
        <div className="mx-4 mt-4 rounded-2xl bg-blue-50/80 px-4 py-4 dark:bg-blue-900/20">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t('statisticsBadge.overallLabel', 'Gesamt')}:
            </span>
            <div className="flex items-center gap-3">
              <div className="h-2 w-24 rounded-full bg-white/70 dark:bg-gray-800/80">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${Math.round(weightedScore)}%` }}
                />
              </div>
              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {Math.round(weightedScore)}%
              </span>
            </div>
          </div>
        </div>

        {/* Criteria List */}
        {renderCriteriaList(true)}
      </div>

      {/* Normal compact badge for sm+ viewports */}
      <div
        className={`${cardSurfaceClass} ${positionClasses} hidden sm:flex max-h-[calc(100vh-6rem)] xl:max-h-none flex-col gap-2 overflow-hidden border-2 border-blue-200/80 p-3 transition-[opacity,transform] duration-100 ease-out dark:border-blue-900/50 ${className}`}
      >
        {/* Compact Header with Score */}
        <div className="flex items-center justify-between gap-2 border-b border-blue-100/70 pb-2 dark:border-blue-900/40">
          <div className="flex items-center gap-1.5">
            <ChartBarIcon
              size={14}
              className="text-blue-600 dark:text-blue-400"
            />
            <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
              {t('statisticsBadge.overallLabel', 'Gesamt')} {Math.round(weightedScore)}%
            </span>
            <div className="h-1.5 w-12 rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-500"
                style={{ width: `${Math.round(weightedScore)}%` }}
              />
            </div>
          </div>
          <button
            onClick={onClose}
            className={`${iconButtonClass} h-7 w-7 border-none bg-transparent text-gray-400 shadow-none transition hover:text-blue-600 dark:text-gray-500`}
            title={t('statisticsBadge.close', 'Schließen')}
          >
            <XIcon size={16} />
          </button>
        </div>

        {/* Criteria List */}
        {renderCriteriaList(false)}
      </div>
    </>
  );
}

const areCriteriaEqual = (
  prev: CriterionFulfillment[],
  next: CriterionFulfillment[],
) => {
  if (prev.length !== next.length) {
    return false;
  }

  for (let index = 0; index < prev.length; index += 1) {
    const prevCriterion = prev[index];
    const nextCriterion = next[index];

    if (
      prevCriterion.key !== nextCriterion.key ||
      prevCriterion.label !== nextCriterion.label ||
      prevCriterion.percentage !== nextCriterion.percentage ||
      prevCriterion.weight !== nextCriterion.weight ||
      prevCriterion.active !== nextCriterion.active
    ) {
      return false;
    }
  }

  return true;
};

const arePropsEqual = (
  prev: SeatingStatisticsBadgeProps,
  next: SeatingStatisticsBadgeProps,
) => {
  return (
    prev.onClose === next.onClose &&
    prev.className === next.className &&
    prev.onHighlightHover === next.onHighlightHover &&
    prev.onHighlightLeave === next.onHighlightLeave &&
    prev.onHighlightToggle === next.onHighlightToggle &&
    prev.activeHighlightKey === next.activeHighlightKey &&
    prev.activeHighlightMode === next.activeHighlightMode &&
    areCriteriaEqual(prev.criteria, next.criteria)
  );
};

export default React.memo(SeatingStatisticsBadge, arePropsEqual);

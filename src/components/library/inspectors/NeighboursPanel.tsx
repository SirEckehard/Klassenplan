// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowCounterClockwiseIcon,
  UsersThreeIcon,
} from '@phosphor-icons/react';
import {
  InspectorBody,
  InspectorHeader,
  InspectorSection,
} from '@/components/shell/InspectorPanel';
import type { PlanUsageRecordsReturn } from '@/hooks/plan/usePlanUsageRecords';
import type { PlanUsage } from '@/types';
import {
  formatDate,
  formatLongDate,
  logError,
  neutralButtonClass,
} from '@/utils';
import { isCountedUsage, type UsageOrigin } from '@/utils/data/planUsage';
import { showToast } from '@/utils/ui/toast';
import { IconTile } from './panelParts';

/**
 * The plans a neighbourhood rests on, each named by its saved plan and room
 * where the class still has them, and each taken out of the count or let back in by hand
 * (decision 0010).
 */
export function UsageRecordList({
  records,
  origins,
  onSetConfirmed,
}: {
  records: readonly PlanUsage[];
  /** Saved plans and rooms by fingerprint (`buildUsageOrigins`). */
  origins?: ReadonlyMap<string, UsageOrigin>;
  onSetConfirmed: (usageId: string, confirmed: boolean) => void;
}) {
  const { t } = useTranslation('generator');
  // The saved plan's name where one holds the arrangement, the date it was
  // last used and the room it was made in.
  const recordLabel = (entry: PlanUsage) => {
    const origin = origins?.get(entry.fingerprint);
    const date = formatDate(entry.lastSeenAt);
    return [
      origin?.planNames.length
        ? `${origin.planNames.join(', ')} · ${date}`
        : t('storage.neighbors.recordLabel', { date }),
      ...(origin?.roomNames ?? []),
    ].join(' · ');
  };
  return (
    <ul className="flex flex-col divide-y divide-(--border-card)">
      {records.map((entry) => {
        const excluded = !isCountedUsage(entry);
        return (
          <li
            key={entry.id}
            className="flex items-center justify-between gap-3 py-2 text-xs"
          >
            <span className="flex min-w-0 flex-col">
              <span
                className={
                  excluded
                    ? 'text-(--text-muted) line-through'
                    : 'text-(--text-page)'
                }
              >
                {recordLabel(entry)}
              </span>
              <span className="text-(--text-muted)">
                {entry.sources
                  .map((source) => t(`storage.neighbors.sources.${source}`))
                  .join(', ')}
              </span>
            </span>
            <button
              type="button"
              onClick={() => onSetConfirmed(entry.id, excluded)}
              className={`${neutralButtonClass} shrink-0 text-xs`}
            >
              {excluded
                ? t('storage.neighbors.include')
                : t('storage.neighbors.exclude')}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Who has sat next to whom in a class, across all its rooms — the plans that
 * were really in use (decision 0010). The pairs themselves stand in the
 * columns, a student and then their neighbours, where a name fits whole; the
 * inspector says what they rest on. "Zurücksetzen" starts afresh in one
 * click, and the message after it takes it back (decision 0023).
 */
export default function NeighboursPanel({
  className,
  records,
  origins,
}: {
  className: string;
  records: PlanUsageRecordsReturn;
  /** Saved plans and rooms by fingerprint (`buildUsageOrigins`). */
  origins?: ReadonlyMap<string, UsageOrigin>;
}) {
  const { t } = useTranslation('generator');
  const {
    planUsage,
    planUsageSince,
    planUsageManual,
    setUsageConfirmed,
    resetUsage,
    undoReset,
  } = records;

  const counted = React.useMemo(
    () => planUsage.filter(isCountedUsage),
    [planUsage],
  );
  const since = React.useMemo(
    () =>
      counted.reduce<string | null>(
        (earliest, entry) =>
          earliest === null || entry.firstSeenAt < earliest
            ? entry.firstSeenAt
            : earliest,
        null,
      ),
    [counted],
  );

  const handleReset = React.useCallback(() => {
    resetUsage()
      .then((snapshot) => {
        if (!snapshot) return;
        showToast('info', 'toast:planUsage.reset', {
          duration: 8000,
          action: {
            label: t('toast:planUsage.resetAction'),
            onClick: () => {
              undoReset(snapshot)
                .then(() => showToast('success', 'toast:planUsage.resetUndone'))
                .catch((error: unknown) => {
                  logError(
                    'Undoing the neighbourhood reset failed',
                    { error },
                    'NeighboursPanel',
                  );
                });
            },
          },
        });
      })
      .catch((error: unknown) => {
        logError(
          'Resetting the neighbourhoods failed',
          { error },
          'NeighboursPanel',
        );
      });
  }, [resetUsage, t, undoReset]);

  return (
    <>
      <InspectorHeader
        media={<IconTile icon={UsersThreeIcon} />}
        title={t('storage.neighbors.tab')}
        subtitle={className}
      />
      <InspectorBody>
        {planUsage.length === 0 ? (
          <div className="flex flex-col gap-2 text-[13px] leading-relaxed text-(--text-muted)">
            <p>{t('storage.neighbors.empty')}</p>
            <p>
              {planUsageManual
                ? t('storage.neighbors.emptyHintManual')
                : t('storage.neighbors.emptyHint')}
            </p>
            {planUsageSince && (
              <p>
                {t('storage.neighbors.countingSince', {
                  date: formatLongDate(planUsageSince),
                })}
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 pb-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[13px] leading-relaxed text-(--text-muted)">
                  {t('storage.neighbors.basis', { count: counted.length })}
                  {since
                    ? ` ${t('storage.neighbors.basisSince', {
                        date: formatLongDate(since),
                      })}`
                    : ''}
                </p>
                <button
                  type="button"
                  onClick={handleReset}
                  title={t('storage.neighbors.resetTitle')}
                  className={`${neutralButtonClass} shrink-0 gap-1.5 px-2.5 py-1 text-xs`}
                >
                  <ArrowCounterClockwiseIcon size={14} aria-hidden="true" />
                  {t('storage.neighbors.reset')}
                </button>
              </div>
              <p className="text-[13px] leading-relaxed text-(--text-muted)">
                {counted.length === 0
                  ? t('storage.neighbors.empty')
                  : t('library.neighboursHint')}
              </p>
            </div>
            <InspectorSection title={t('storage.neighbors.basisTitle')}>
              <UsageRecordList
                records={planUsage}
                origins={origins}
                onSetConfirmed={setUsageConfirmed}
              />
            </InspectorSection>
          </>
        )}
      </InspectorBody>
    </>
  );
}

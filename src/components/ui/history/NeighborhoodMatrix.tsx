// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MagnifyingGlassIcon, UsersThreeIcon } from '@phosphor-icons/react';
import type { PlanUsage, Student } from '@/types';
import { buildNeighborhoodStats, isCountedUsage } from '@/utils/data/planUsage';
import {
  cardSurfaceClass,
  formatDate,
  formatLongDate,
  inputFieldClass,
  neutralButtonClass,
} from '@/utils';

interface NeighborhoodMatrixProps {
  planUsage: PlanUsage[];
  students: Student[];
  onSetConfirmed: (usageId: string, confirmed: boolean) => void;
}

/**
 * "Who has sat next to whom", built from the plans that were really in use.
 *
 * Deliberately a ranked pair list rather than an N×N grid: at 36 students a
 * grid is 1,296 cells of mostly zeros, while the question a teacher actually
 * asks — who has been paired up a lot, and when last — is a sorted list.
 */
export default function NeighborhoodMatrix({
  planUsage,
  students,
  onSetConfirmed,
}: NeighborhoodMatrixProps) {
  const { t } = useTranslation('generator');
  const [query, setQuery] = useState('');
  const [basisOpen, setBasisOpen] = useState(false);

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const student of students) {
      map.set(student.id, student.name);
    }
    return map;
  }, [students]);

  const counted = useMemo(() => planUsage.filter(isCountedUsage), [planUsage]);

  const stats = useMemo(() => buildNeighborhoodStats(planUsage), [planUsage]);

  const unknownLabel = t('storage.neighbors.unknownStudent');
  const nameOf = useCallback(
    (id: string) => nameById.get(id) ?? unknownLabel,
    [nameById, unknownLabel],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return stats;
    return stats.filter(
      (stat) =>
        nameOf(stat.studentIdA).toLowerCase().includes(needle) ||
        nameOf(stat.studentIdB).toLowerCase().includes(needle),
    );
  }, [stats, query, nameOf]);

  const since = useMemo(() => {
    if (counted.length === 0) return null;
    return counted.reduce(
      (earliest, entry) =>
        entry.firstSeenAt < earliest ? entry.firstSeenAt : earliest,
      counted[0].firstSeenAt,
    );
  }, [counted]);

  if (planUsage.length === 0) {
    return (
      <div className="py-4 text-center">
        <UsersThreeIcon
          size={28}
          aria-hidden="true"
          className="mx-auto text-(--text-muted)"
        />
        <p className="mt-2 text-sm text-(--text-muted)">
          {t('storage.neighbors.empty')}
        </p>
        <p className="mx-auto mt-1 max-w-md text-xs text-(--text-muted)">
          {t('storage.neighbors.emptyHint')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-(--text-muted)">
        {t('storage.neighbors.basis', { count: counted.length })}
        {since
          ? ` ${t('storage.neighbors.basisSince', {
              date: formatLongDate(since),
            })}`
          : ''}
      </p>

      <label className="relative block">
        <span className="sr-only">{t('storage.neighbors.searchLabel')}</span>
        <MagnifyingGlassIcon
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted)"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('storage.neighbors.searchPlaceholder')}
          className={`${inputFieldClass} pl-9`}
        />
      </label>

      {filtered.length === 0 ? (
        <p className="py-4 text-center text-sm text-(--text-muted)">
          {t('storage.neighbors.noMatches')}
        </p>
      ) : (
        <ul className="max-h-96 space-y-1 overflow-y-auto pr-1">
          {filtered.map((stat) => (
            <li
              key={stat.key}
              className="flex items-center justify-between gap-3 rounded-lg border border-(--border-card) px-3 py-2 text-sm"
            >
              <span className="min-w-0 truncate text-(--text-page)">
                {nameOf(stat.studentIdA)}
                <span className="mx-1.5 text-(--text-muted)">&amp;</span>
                {nameOf(stat.studentIdB)}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-(--text-muted)">
                  {t('storage.neighbors.lastSeen', {
                    date: formatDate(stat.lastSeenAt),
                  })}
                </span>
                <span className="rounded-full bg-(--surface-option-selected) px-2 py-0.5 text-xs font-semibold text-(--text-badge)">
                  {t('storage.neighbors.times', { count: stat.count })}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div>
        <button
          type="button"
          onClick={() => setBasisOpen((open) => !open)}
          aria-expanded={basisOpen}
          aria-controls="neighbors-basis"
          className={`${neutralButtonClass} text-xs`}
        >
          {basisOpen
            ? t('storage.neighbors.hideBasis')
            : t('storage.neighbors.showBasis')}
        </button>

        <ul id="neighbors-basis" hidden={!basisOpen} className="mt-2 space-y-1">
          {planUsage.map((entry) => {
            const excluded = !isCountedUsage(entry);
            return (
              <li
                key={entry.id}
                className={`${cardSurfaceClass} flex items-center justify-between gap-3 border px-3 py-2 text-xs`}
              >
                <span className="min-w-0">
                  <span
                    className={
                      excluded
                        ? 'text-(--text-muted) line-through dark:text-(--text-muted)'
                        : 'text-(--text-page)'
                    }
                  >
                    {t('storage.neighbors.recordLabel', {
                      date: formatDate(entry.lastSeenAt),
                    })}
                  </span>
                  <span className="ml-2 text-(--text-muted)">
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
      </div>
    </div>
  );
}

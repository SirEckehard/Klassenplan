// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MagnifyingGlassIcon, XIcon } from '@phosphor-icons/react';
import ToolPage, { ToolEmptyState } from '@/components/tools/ToolPage';
import SeatLocationLine from '@/components/tools/SeatLocationLine';
import PresentationScene from '@/components/scene/PresentationScene';
import { useSeatingPlanState } from '@/contexts/SeatingPlanContext';
import { useIsDarkMode } from '@/hooks/useIsDarkMode';
import {
  findSeatLocation,
  inputFieldClass,
  quietIconButtonClass,
  type SeatLocation,
} from '@/utils';
import type { Student } from '@/types';

/**
 * "Wo sitzt wer?" — the question a substitute teacher has, standing in a room
 * they have never taught in.
 *
 * Typing is the whole interaction: a name, an answer in one line, and the plan
 * with that seat lit so the line can be checked against the room. Nothing here
 * changes anything; this view is read-only on purpose.
 */
export default function SeatFinder() {
  const { t } = useTranslation('generator');
  const { students, currentSeating, classroomScene, activeClass } =
    useSeatingPlanState();
  const isDark = useIsDarkMode();
  const [query, setQuery] = React.useState('');
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const seated = React.useMemo(() => {
    const ids = new Set<string>();
    currentSeating.forEach((table) =>
      table?.forEach((student) => {
        if (student) ids.add(student.id);
      }),
    );
    return students.filter((student) => ids.has(student.id));
  }, [currentSeating, students]);

  const matches = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    const pool = [...seated].sort((a, b) => a.name.localeCompare(b.name));
    if (!needle) return pool;
    return pool.filter((student) =>
      student.name.toLowerCase().includes(needle),
    );
  }, [query, seated]);

  // One match left is the answer, so it opens itself: typing three letters and
  // then having to press the one row would be a step for nothing.
  const selected: Student | null =
    matches.find((student) => student.id === selectedId) ??
    (matches.length === 1 ? matches[0] : null);

  const location: SeatLocation | null = React.useMemo(
    () =>
      selected
        ? findSeatLocation(currentSeating, classroomScene, selected.id)
        : null,
    [classroomScene, currentSeating, selected],
  );

  const help = (
    <ul className="list-disc space-y-1 pl-4">
      <li>{t('tools.seatFinder.help1')}</li>
      <li>{t('tools.seatFinder.help2')}</li>
    </ul>
  );

  return (
    <ToolPage
      route="/wo-sitzt-wer"
      title={t('tools.seatFinder.title')}
      subtitle={activeClass.name}
      help={help}
    >
      {seated.length === 0 ? (
        <ToolEmptyState
          title={t('tools.seatFinder.emptyTitle')}
          body={t('tools.seatFinder.emptyBody')}
          actionLabel={t('tools.toPlan')}
        />
      ) : (
        <div className="mx-auto flex max-w-xl flex-col gap-4">
          <div className="relative">
            <MagnifyingGlassIcon
              size={18}
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-(--text-muted)"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelectedId(null);
              }}
              // The one field on the screen, and the reason the page exists.
              autoFocus
              placeholder={t('tools.seatFinder.placeholder')}
              aria-label={t('tools.seatFinder.placeholder')}
              className={`${inputFieldClass} h-12 w-full pr-11 pl-10 text-base`}
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setSelectedId(null);
                }}
                aria-label={t('tools.seatFinder.clear')}
                className={`${quietIconButtonClass} absolute top-1/2 right-1.5 h-9 w-9 -translate-y-1/2`}
              >
                <XIcon size={16} aria-hidden />
              </button>
            )}
          </div>

          {selected && location ? (
            <div className="flex flex-col gap-3 rounded-xl border border-(--border-card) bg-(--surface-card) p-4">
              <div className="flex flex-col gap-1">
                <span className="text-xl font-semibold text-(--text-page)">
                  {selected.name}
                </span>
                <SeatLocationLine location={location} />
              </div>
              {/* The same drawing the beamer shows, with the seat lit: the
                  sentence above is only useful if it can be checked. */}
              <div className="h-56 w-full overflow-hidden rounded-lg bg-(--surface-sunken)">
                <PresentationScene
                  scene={classroomScene}
                  seating={currentSeating}
                  students={students}
                  perspective="teacher"
                  showBadges={false}
                  showPhotos={false}
                  showFeatures
                  nameDisplay="firstName"
                  isDark={isDark}
                  spotlight={{
                    tableIndex: location.tableIndex,
                    seatIndex: location.seatIndex,
                  }}
                />
              </div>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-(--border-card) overflow-hidden rounded-xl border border-(--border-card) bg-(--surface-card)">
              {matches.length === 0 && (
                <li className="px-4 py-6 text-center text-sm text-(--text-muted)">
                  {t('tools.seatFinder.noMatch', { query: query.trim() })}
                </li>
              )}
              {matches.map((student) => (
                <li key={student.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(student.id)}
                    className="flex h-14 w-full cursor-pointer items-center px-4 text-left text-base text-(--text-page) transition hover:bg-(--surface-sunken) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary) focus-visible:-outline-offset-2"
                  >
                    {student.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </ToolPage>
  );
}

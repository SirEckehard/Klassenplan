// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowCounterClockwiseIcon,
  HandPointingIcon,
  SkipForwardIcon,
} from '@phosphor-icons/react';
import ToolPage, { ToolEmptyState } from '@/components/tools/ToolPage';
import SeatLocationLine from '@/components/tools/SeatLocationLine';
import PresentationScene from '@/components/scene/PresentationScene';
import SimpleCircleView from '@/components/circle/SimpleCircleView';
import StudentAvatar from '@/components/students/StudentAvatar';
import { useSeatingPlanState } from '@/contexts/SeatingPlanContext';
import { useRandomStudentPicker } from '@/hooks/ui/useRandomStudentPicker';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useIsDarkMode } from '@/hooks/useIsDarkMode';
import {
  dataChipClass,
  dataFamilyClass,
  findCircleLocation,
  findSeatLocation,
  hasPlanForScene,
  primaryButtonClass,
  secondaryButtonClass,
} from '@/utils';
import { getStudentBadges, sortBadges } from '@/utils/ui/studentAppearance';
import type { SeatingArrangement } from '@/types';

const NO_SEATING: SeatingArrangement = [];

/**
 * "Wer kommt dran?" without a projector: the phone in the hand, in the middle
 * of a lesson.
 *
 * Draws without replacement, like the beamer's own button — everybody has a
 * turn before anyone repeats, which is the whole reason to use it instead of
 * pointing. Who has already been asked stays on screen, because that is the
 * part a teacher cannot keep in their head while teaching.
 */
export default function WhoIsNext() {
  const { t } = useTranslation('generator');
  const {
    students,
    currentSeating,
    classroomScene,
    activeClass,
    seatingMode,
    circleLayout,
  } = useSeatingPlanState();
  const isDark = useIsDarkMode();

  // While the class sits in the circle, the draw comes from the circle — it
  // takes every student, a seat at a table or not — and says who sits on
  // either side instead of naming a table.
  const usesCircle =
    seatingMode === 'circle' &&
    Boolean(circleLayout?.students.some((place) => place?.student));
  const circleSeating = React.useMemo(
    () => [
      (circleLayout?.students ?? []).map((place) => place?.student ?? null),
    ],
    [circleLayout],
  );

  // A plan made for tables the room no longer has (set up anew, not mixed
  // yet) names tables that are gone: the draw takes the class list then, as
  // before the first plan.
  const tableSeating = hasPlanForScene(classroomScene, currentSeating)
    ? currentSeating
    : NO_SEATING;
  const picker = useRandomStudentPicker(
    usesCircle ? circleSeating : tableSeating,
    students,
  );
  const picked = picker.picked;

  const location = React.useMemo(() => {
    if (!picked || picked.tableIndex < 0) return null;
    if (usesCircle && circleLayout) {
      return findCircleLocation(circleLayout, picked.student.id);
    }
    return findSeatLocation(tableSeating, classroomScene, picked.student.id);
  }, [circleLayout, classroomScene, tableSeating, picked, usesCircle]);

  const badges = React.useMemo(
    () => (picked ? sortBadges(getStudentBadges(picked.student, true)) : []),
    [picked],
  );

  useKeyboardShortcuts({
    ' ': () => picker.pick(),
    escape: () => picker.reset(),
  });

  const help = (
    <ul className="list-disc space-y-1 pl-4">
      <li>{t('tools.whoIsNext.help1')}</li>
      <li>{t('tools.whoIsNext.help2')}</li>
      <li>{t('tools.whoIsNext.help3')}</li>
    </ul>
  );

  return (
    <ToolPage
      route="/wer-kommt-dran"
      title={t('tools.whoIsNext.title')}
      subtitle={activeClass.name}
      help={help}
      footer={
        picker.total > 0 ? (
          <div className="flex gap-2">
            {picked && (
              <button
                type="button"
                onClick={picker.skip}
                className={`${secondaryButtonClass} h-12 shrink-0 gap-2 px-4 text-sm font-semibold`}
              >
                <SkipForwardIcon size={18} aria-hidden />
                {t('tools.whoIsNext.skip')}
              </button>
            )}
            <button
              type="button"
              onClick={picker.pick}
              className={`${primaryButtonClass} h-12 flex-1 gap-2 text-base font-semibold`}
            >
              <HandPointingIcon size={20} aria-hidden />
              {picked ? t('tools.whoIsNext.next') : t('tools.whoIsNext.start')}
            </button>
          </div>
        ) : undefined
      }
    >
      {picker.total === 0 ? (
        <ToolEmptyState
          title={t('tools.whoIsNext.emptyTitle')}
          body={t('tools.whoIsNext.emptyBody')}
          actionLabel={t('tools.toClass')}
          step={1}
        />
      ) : (
        // At least as tall as the page, so the plan under the answer can take
        // whatever height the rest leaves. Every zone but the plan keeps one
        // height whoever is drawn — a longer line, a row of badges or one more
        // name already asked made the plan jump at every draw.
        <div className="mx-auto flex min-h-full max-w-xl flex-col gap-4 lg:max-w-3xl">
          <div
            role="status"
            aria-live="polite"
            className="flex h-44 shrink-0 flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border border-(--border-card) bg-(--surface-card) px-4 text-center"
          >
            {picked ? (
              <>
                <span className="flex max-w-full items-center justify-center gap-3">
                  {/* The face, where there is one: the name is read out, the
                      photo is what a teacher still new to the class looks
                      for. No stand-in without a photo. */}
                  {picked.student.hasPhoto && (
                    <StudentAvatar student={picked.student} size={56} />
                  )}
                  <span className="min-w-0 truncate text-3xl font-semibold text-(--text-page)">
                    {picked.student.name}
                  </span>
                </span>
                {location && (
                  <SeatLocationLine
                    location={location}
                    className="line-clamp-2"
                  />
                )}
                {badges.length > 0 && (
                  <span className="mt-1 flex h-6 flex-wrap justify-center gap-1.5 overflow-hidden">
                    {badges.map((badge) => (
                      <span
                        key={badge.key}
                        title={badge.tooltip}
                        className={`${dataChipClass} ${dataFamilyClass[badge.family]}`}
                      >
                        <badge.icon size={12} aria-hidden />
                        {badge.label}
                      </span>
                    ))}
                  </span>
                )}
              </>
            ) : (
              <span className="text-sm text-(--text-muted)">
                {t('tools.whoIsNext.idle', { waiting: picker.total })}
              </span>
            )}
          </div>

          {/* The plan, there from the start so the first draw does not push
              it in, with the drawn student lit: the line above is quicker to
              take in with the room beside it. Nothing is dimmed — held close,
              every name stays readable and the lit seat speaks for itself.
              Outside the live region, so only the name and the line are read
              out. The scene sits in an absolute box so its 100% size resolves
              against what the flex layout handed out. */}
          {(usesCircle || tableSeating.length > 0) && (
            <div className="relative min-h-72 w-full flex-1 overflow-hidden rounded-xl border border-(--border-card) bg-(--surface-sunken)">
              <div className="absolute inset-0">
                {usesCircle && circleLayout ? (
                  <SimpleCircleView
                    layout={circleLayout}
                    editable={false}
                    isDark={isDark}
                    showSpecialNeeds={false}
                    photoMode="off"
                    nameDisplay="firstName"
                    connectionMode="off"
                    transparentBackground
                    fit
                    spotlightStudentId={
                      location && 'kind' in location
                        ? (picked?.student.id ?? null)
                        : null
                    }
                    spotlightDims={false}
                  />
                ) : (
                  <PresentationScene
                    scene={classroomScene}
                    seating={tableSeating}
                    students={students}
                    perspective="teacher"
                    showBadges={false}
                    showPhotos={false}
                    showFeatures
                    nameDisplay="firstName"
                    isDark={isDark}
                    spotlight={
                      location && 'tableIndex' in location
                        ? {
                            tableIndex: location.tableIndex,
                            seatIndex: location.seatIndex,
                          }
                        : null
                    }
                    spotlightDims={false}
                  />
                )}
              </div>
            </div>
          )}

          <div className="flex h-8 shrink-0 items-center justify-between gap-3 text-xs text-(--text-muted)">
            <span>
              {t('tools.whoIsNext.remaining', {
                remaining: picker.remaining,
                total: picker.total,
              })}
            </span>
            {picker.recent.length > 0 && (
              <button
                type="button"
                onClick={picker.reset}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 font-medium transition hover:text-(--text-page) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring)"
              >
                <ArrowCounterClockwiseIcon size={14} aria-hidden />
                {t('tools.whoIsNext.reset')}
              </button>
            )}
          </div>

          {/* Who has been asked, one line the newest first, sliding sideways
              rather than growing: its height is the plan's to keep. */}
          <div className="flex h-10 shrink-0 items-center gap-2">
            {picker.recent.length > 1 && (
              <>
                <span className="shrink-0 text-xs font-semibold tracking-wider text-(--text-muted) uppercase">
                  {t('tools.whoIsNext.already')}
                </span>
                <ul
                  aria-label={t('tools.whoIsNext.already')}
                  className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto overscroll-x-contain"
                >
                  {picker.recent.slice(1).map((student) => (
                    <li
                      key={student.id}
                      className="shrink-0 rounded-md border border-(--border-card) bg-(--surface-card) px-2 py-1 text-xs whitespace-nowrap text-(--text-muted)"
                    >
                      {student.name}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      )}
    </ToolPage>
  );
}

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
import { useSeatingPlanState } from '@/contexts/SeatingPlanContext';
import { useRandomStudentPicker } from '@/hooks/ui/useRandomStudentPicker';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import {
  dataChipClass,
  dataFamilyClass,
  findSeatLocation,
  primaryButtonClass,
  secondaryButtonClass,
} from '@/utils';
import { getStudentBadges, sortBadges } from '@/utils/ui/studentAppearance';

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
  const { students, currentSeating, classroomScene, activeClass } =
    useSeatingPlanState();

  const picker = useRandomStudentPicker(currentSeating, students);
  const picked = picker.picked;

  const location = React.useMemo(
    () =>
      picked && picked.tableIndex >= 0
        ? findSeatLocation(currentSeating, classroomScene, picked.student.id)
        : null,
    [classroomScene, currentSeating, picked],
  );

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
        />
      ) : (
        <div className="mx-auto flex max-w-xl flex-col gap-4">
          <div
            role="status"
            aria-live="polite"
            className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-(--border-card) bg-(--surface-card) px-4 py-8 text-center"
          >
            {picked ? (
              <>
                <span className="text-3xl font-semibold text-(--text-page)">
                  {picked.student.name}
                </span>
                {location && <SeatLocationLine location={location} />}
                {badges.length > 0 && (
                  <span className="mt-1 flex flex-wrap justify-center gap-1.5">
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

          <div className="flex items-center justify-between gap-3 text-xs text-(--text-muted)">
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
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 font-medium transition hover:text-(--text-page) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary)"
              >
                <ArrowCounterClockwiseIcon size={14} aria-hidden />
                {t('tools.whoIsNext.reset')}
              </button>
            )}
          </div>

          {picker.recent.length > 1 && (
            <div>
              <span className="mb-1.5 block text-xs font-semibold tracking-wider text-(--text-muted) uppercase">
                {t('tools.whoIsNext.already')}
              </span>
              <ul className="flex flex-wrap gap-1.5">
                {picker.recent.slice(1).map((student) => (
                  <li
                    key={student.id}
                    className="rounded-md border border-(--border-card) bg-(--surface-card) px-2 py-1 text-xs text-(--text-muted)"
                  >
                    {student.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </ToolPage>
  );
}

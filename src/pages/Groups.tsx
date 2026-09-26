// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { DiceThreeIcon, WarningIcon } from '@phosphor-icons/react';
import ToolPage, { ToolEmptyState } from '@/components/tools/ToolPage';
import { useSeatingPlanState } from '@/contexts/SeatingPlanContext';
import { buildGroups, primaryButtonClass, type GroupDrawResult } from '@/utils';

/** Group sizes a lesson actually asks for; two is a pair, six is a table. */
const SIZES = [2, 3, 4, 5, 6] as const;

/**
 * Drawing groups out of the class, on the way into the room.
 *
 * The draw is not kept anywhere: a group that matters gets written on the
 * board, and one that does not is re-rolled. Nothing here touches the seating
 * plan — a group is for the next forty-five minutes, a seat is for the term.
 */
export default function Groups() {
  const { t } = useTranslation('generator');
  const { students, activeClass } = useSeatingPlanState();
  const [size, setSize] = React.useState(4);
  // The draw carries the class it was made for: switching classes must not
  // leave names on screen that are no longer in the room.
  const [lastDraw, setLastDraw] = React.useState<{
    classId: string | null;
    result: GroupDrawResult;
  } | null>(null);
  const draw = lastDraw?.classId === activeClass.id ? lastDraw.result : null;

  const named = React.useMemo(
    () => students.filter((student) => student.name.trim().length > 0),
    [students],
  );

  const roll = React.useCallback(
    (groupSize: number) => {
      setLastDraw({
        classId: activeClass.id,
        result: buildGroups(named, { size: groupSize }),
      });
    },
    [activeClass.id, named],
  );

  const help = (
    <ul className="list-disc space-y-1 pl-4">
      <li>{t('tools.groups.help1')}</li>
      <li>{t('tools.groups.help2')}</li>
      <li>{t('tools.groups.help3')}</li>
    </ul>
  );

  return (
    <ToolPage
      route="/gruppen"
      title={t('tools.groups.title')}
      subtitle={activeClass.name}
      help={help}
      footer={
        named.length > 0 ? (
          <button
            type="button"
            onClick={() => roll(size)}
            className={`${primaryButtonClass} h-12 w-full gap-2 text-base font-semibold`}
          >
            <DiceThreeIcon size={20} aria-hidden />
            {draw ? t('tools.groups.again') : t('tools.groups.draw')}
          </button>
        ) : undefined
      }
    >
      {named.length === 0 ? (
        <ToolEmptyState
          title={t('tools.groups.emptyTitle')}
          body={t('tools.groups.emptyBody')}
          actionLabel={t('tools.toClass')}
          step={1}
        />
      ) : (
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          <div>
            <span
              id="group-size-label"
              className="mb-1.5 block text-xs font-semibold tracking-wider text-(--text-muted) uppercase"
            >
              {t('tools.groups.size')}
            </span>
            <div
              role="group"
              aria-labelledby="group-size-label"
              className="flex gap-1.5"
            >
              {SIZES.map((option) => {
                const isActive = option === size;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      setSize(option);
                      if (draw) roll(option);
                    }}
                    aria-pressed={isActive}
                    aria-label={t('tools.groups.sizeOption', {
                      size: option,
                    })}
                    className={`h-11 flex-1 cursor-pointer rounded-lg border text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary) ${
                      isActive
                        ? 'border-(--border-option-selected) bg-(--surface-option-selected) text-(--text-badge)'
                        : 'border-(--border-card) bg-(--surface-card) text-(--text-page) hover:border-(--border-option-hover)'
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
            </div>
          </div>

          {draw === null ? (
            <p className="rounded-lg border border-(--border-card) bg-(--surface-card) px-4 py-6 text-center text-sm text-(--text-muted)">
              {t('tools.groups.hint', { total: named.length })}
            </p>
          ) : (
            <>
              {draw.conflicts.length > 0 && (
                <p
                  role="status"
                  className="flex items-start gap-2 rounded-lg border border-(--border-card) bg-(--status-warn-surface) px-3 py-2 text-xs text-(--status-warn-text)"
                >
                  <WarningIcon
                    size={16}
                    aria-hidden
                    className="mt-0.5 shrink-0"
                  />
                  <span>
                    {t('tools.groups.conflict', {
                      names: draw.conflicts
                        .map(
                          (conflict) =>
                            `${conflict.student.name} & ${conflict.other.name}`,
                        )
                        .join(', '),
                    })}
                  </span>
                </p>
              )}

              <ul className="grid gap-3 sm:grid-cols-2">
                {draw.groups.map((group, index) => (
                  <li
                    key={index}
                    className="rounded-lg border border-(--border-card) bg-(--surface-card) p-3"
                  >
                    <div className="mb-2 flex items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold text-(--text-page)">
                        {t('tools.groups.groupName', { number: index + 1 })}
                      </span>
                      <span className="text-xs tabular-nums text-(--text-muted)">
                        {t('tools.groups.memberCount', {
                          count: group.length,
                        })}
                      </span>
                    </div>
                    <ul className="flex flex-col gap-1">
                      {group.map((student) => (
                        <li
                          key={student.id}
                          className="text-sm text-(--text-page)"
                        >
                          {student.name}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </ToolPage>
  );
}

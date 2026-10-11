// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowsClockwiseIcon,
  BroomIcon,
  FilePdfIcon,
  MinusIcon,
  PlusIcon,
  TrashIcon,
  WarningIcon,
} from '@phosphor-icons/react';
import ToolPage, { ToolEmptyState } from '@/components/tools/ToolPage';
import { useSeatingPlanState } from '@/contexts/SeatingPlanContext';
import {
  emptyClassDuties,
  loadClassDuties,
  saveClassDuties,
} from '@/repositories/dutyStore';
import {
  MAX_DUTIES,
  MAX_DUTY_COUNT,
  MAX_DUTY_NAME_LENGTH,
  formatLongDate,
  generateId,
  inputFieldClass,
  logError,
  pickForDuty,
  primaryButtonClass,
  quietDangerIconButtonClass,
  quietIconButtonClass,
  secondaryButtonClass,
  showToast,
  startDutyRound,
  trimRound,
} from '@/utils';
import {
  isChunkLoadError,
  reportChunkLoadFailure,
} from '@/utils/performance/chunkLoad';
import type { ClassDuties, Duty, DutyRound, Student } from '@/types';

const LOG_SOURCE = 'Duties';

/** Duties nearly every class hands out, offered while the list is empty. */
const SUGGESTIONS = ['board', 'sweeping', 'bins', 'tidying'] as const;

/**
 * Handing out the class's duties — board, sweeping, the bins — in turns
 * that go round (decision 0028).
 *
 * Unlike the other tools this one keeps what it did: a duty runs for a week or
 * two, and only the rounds before it can say whose turn it is now. The duties
 * and their rounds are stored per class, apart from the class record.
 */
export default function Duties() {
  const { t } = useTranslation(['generator', 'toast']);
  const { students, activeClass } = useSeatingPlanState();
  const classId = activeClass.id;

  // What was loaded carries the class it belongs to, as the group draw does:
  // switching classes must not show — or write — another class's duties.
  const [loaded, setLoaded] = React.useState<{
    classId: string;
    duties: ClassDuties;
  } | null>(null);
  const state = classId && loaded?.classId === classId ? loaded.duties : null;

  React.useEffect(() => {
    if (!classId) return;
    let cancelled = false;
    loadClassDuties(classId)
      .then((duties) => {
        if (!cancelled) setLoaded({ classId, duties });
      })
      .catch((error: unknown) => {
        logError('Loading the duties failed', { error }, LOG_SOURCE);
        if (!cancelled) setLoaded({ classId, duties: emptyClassDuties() });
      });
    return () => {
      cancelled = true;
    };
  }, [classId]);

  const named = React.useMemo(
    () => students.filter((student) => student.name.trim().length > 0),
    [students],
  );

  const update = React.useCallback(
    (next: ClassDuties) => {
      if (!classId) return;
      setLoaded({ classId, duties: next });
      saveClassDuties(classId, next)
        .then((saved) => {
          if (!saved) showToast('error', 'toast:duties.saveFailed');
        })
        .catch((error: unknown) => {
          logError('Saving the duties failed', { error }, LOG_SOURCE);
          showToast('error', 'toast:duties.saveFailed');
        });
    },
    [classId],
  );

  const round = React.useMemo(
    () =>
      state?.current ? trimRound(state.current, state.duties, students) : null,
    [state, students],
  );

  const dutyName = (duty: Duty, index: number) =>
    duty.name.trim() || t('tools.duties.unnamed', { number: index + 1 });

  const changeDuty = (id: string, change: Partial<Duty>) => {
    if (!state) return;
    update({
      ...state,
      duties: state.duties.map((duty) =>
        duty.id === id ? { ...duty, ...change } : duty,
      ),
    });
  };

  const addDuty = (name = '') => {
    if (!state || state.duties.length >= MAX_DUTIES) return;
    update({
      ...state,
      duties: [...state.duties, { id: generateId(), name, count: 1 }],
    });
  };

  const removeDuty = (id: string) => {
    if (!state) return;
    update({ ...state, duties: state.duties.filter((duty) => duty.id !== id) });
  };

  const distribute = () => {
    if (!state) return;
    const before = state;
    update(startDutyRound({ ...state, current: round }, named));
    if (!before.current) return;
    showToast('info', 'toast:duties.redistributed', {
      duration: 8000,
      action: {
        label: t('toast:duties.redistributedAction'),
        onClick: () => update(before),
      },
    });
  };

  /** Fill an empty place of a duty, or stand someone in for `replacing`. */
  const pick = (duty: Duty, replacing?: string) => {
    if (!state || !round) return;
    const id = pickForDuty(
      duty.id,
      round,
      named,
      state.rounds,
      Math.random,
      replacing,
    );
    if (!id) {
      showToast('info', 'toast:duties.nobodyLeft');
      return;
    }
    const holders = round.assignments[duty.id] ?? [];
    const next: DutyRound = {
      ...round,
      assignments: {
        ...round.assignments,
        [duty.id]: replacing
          ? holders.map((holder) => (holder === replacing ? id : holder))
          : [...holders, id],
      },
    };
    update({ ...state, current: next });
  };

  /**
   * The round as a sheet like every other export (decision 0028): the shared
   * frame and header, ink on white, saved as a PDF. The PDF code is fetched
   * when it is asked for, as the export page fetches it.
   */
  const exportPdf = async () => {
    if (!state || !round) return;
    const sheetTitle = t('tools.duties.sheet.title');
    const rows = state.duties.map((duty, index) => {
      const holders = (round.assignments[duty.id] ?? [])
        .map((id) => studentsById.get(id)?.name)
        .filter((name): name is string => Boolean(name));
      return {
        name: dutyName(duty, index),
        holders,
        open: Math.max(0, duty.count - holders.length),
      };
    });
    try {
      const { exportDutyRosterToPdf } =
        await import('@/services/export/pdfExportFunctions');
      await exportDutyRosterToPdf(
        {
          title: sheetTitle,
          classMetadata: {
            name: activeClass.name,
            label: activeClass.label,
            notes: activeClass.notes,
          },
          at: round.at,
          rows,
        },
        [sheetTitle, activeClass.name].filter(Boolean).join('_'),
      );
    } catch (error) {
      if (isChunkLoadError(error)) {
        reportChunkLoadFailure(error, LOG_SOURCE);
        return;
      }
      logError('Exporting the duties failed', { error }, LOG_SOURCE);
      showToast('error', 'toast:export.pdfError');
    }
  };

  const help = (
    <ul className="list-disc space-y-1 pl-4">
      <li>{t('tools.duties.help1')}</li>
      <li>{t('tools.duties.help2')}</li>
      <li>{t('tools.duties.help3')}</li>
      <li>{t('tools.duties.help4')}</li>
    </ul>
  );

  const studentsById = new Map(
    students.map((student) => [student.id, student]),
  );
  const wanted = state?.duties.reduce((sum, duty) => sum + duty.count, 0) ?? 0;
  const short = round
    ? (state?.duties ?? []).reduce(
        (sum, duty) =>
          sum + duty.count - (round.assignments[duty.id]?.length ?? 0),
        0,
      )
    : 0;

  return (
    <ToolPage
      route="/dienste"
      title={t('tools.duties.title')}
      subtitle={activeClass.name}
      help={help}
      footer={
        named.length > 0 && state && state.duties.length > 0 ? (
          <button
            type="button"
            onClick={distribute}
            className={`${primaryButtonClass} h-12 w-full gap-2 text-base font-semibold`}
          >
            <BroomIcon size={20} aria-hidden />
            {round ? t('tools.duties.again') : t('tools.duties.draw')}
          </button>
        ) : undefined
      }
    >
      {named.length === 0 ? (
        <ToolEmptyState
          title={t('tools.duties.emptyTitle')}
          body={t('tools.duties.emptyBody')}
          actionLabel={t('tools.toClass')}
          step={1}
        />
      ) : state === null ? null : (
        <div className="mx-auto flex max-w-2xl flex-col gap-6">
          <section aria-labelledby="duties-heading">
            <h2
              id="duties-heading"
              className="mb-1.5 text-xs font-semibold tracking-wider text-(--text-muted) uppercase"
            >
              {t('tools.duties.listHeading')}
            </h2>
            {state.duties.length > 0 && (
              <ul className="mb-2 flex flex-col gap-2">
                {state.duties.map((duty, index) => (
                  <DutyRow
                    key={duty.id}
                    duty={duty}
                    label={dutyName(duty, index)}
                    number={index + 1}
                    onChange={(change) => changeDuty(duty.id, change)}
                    onRemove={() => removeDuty(duty.id)}
                  />
                ))}
              </ul>
            )}
            {state.duties.length === 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {SUGGESTIONS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => addDuty(t(`tools.duties.suggestion.${key}`))}
                    className={`${secondaryButtonClass} h-9 gap-1.5 px-3 text-sm`}
                  >
                    <PlusIcon size={14} aria-hidden />
                    {t(`tools.duties.suggestion.${key}`)}
                  </button>
                ))}
              </div>
            )}
            {state.duties.length < MAX_DUTIES && (
              <button
                type="button"
                onClick={() => addDuty()}
                className={`${secondaryButtonClass} h-10 w-full gap-2 text-sm`}
              >
                <PlusIcon size={16} aria-hidden />
                {t('tools.duties.add')}
              </button>
            )}
          </section>

          {state.duties.length > 0 && (
            <section aria-labelledby="round-heading">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2
                  id="round-heading"
                  className="text-xs font-semibold tracking-wider text-(--text-muted) uppercase"
                >
                  {round
                    ? t('tools.duties.roundHeading', {
                        date: formatLongDate(new Date(round.at)),
                      })
                    : t('tools.duties.roundEmptyHeading')}
                </h2>
                {round && (
                  <button
                    type="button"
                    onClick={() => {
                      void exportPdf();
                    }}
                    title={t('tools.duties.pdfTitle')}
                    className={`${secondaryButtonClass} h-9 gap-1.5 px-3 text-sm`}
                  >
                    <FilePdfIcon size={16} aria-hidden />
                    {t('tools.duties.pdf')}
                  </button>
                )}
              </div>

              {!round ? (
                <p className="rounded-lg border border-(--border-card) bg-(--surface-card) px-4 py-6 text-center text-sm text-(--text-muted)">
                  {t('tools.duties.hint', { total: named.length })}
                </p>
              ) : (
                <>
                  {short > 0 && wanted > named.length && (
                    <p
                      role="status"
                      className="mb-3 flex items-start gap-2 rounded-lg border border-(--border-card) bg-(--status-warn-surface) px-3 py-2 text-xs text-(--status-warn-text)"
                    >
                      <WarningIcon
                        size={16}
                        aria-hidden
                        className="mt-0.5 shrink-0"
                      />
                      <span>
                        {t('tools.duties.shortfall', {
                          count: short,
                          total: named.length,
                        })}
                      </span>
                    </p>
                  )}
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {state.duties.map((duty, index) => (
                      <DutyCard
                        key={duty.id}
                        name={dutyName(duty, index)}
                        count={duty.count}
                        holders={(round.assignments[duty.id] ?? [])
                          .map((id) => studentsById.get(id))
                          .filter((s): s is Student => s !== undefined)}
                        onReplace={(id) => pick(duty, id)}
                        onFill={() => pick(duty)}
                      />
                    ))}
                  </ul>
                </>
              )}
            </section>
          )}
        </div>
      )}
    </ToolPage>
  );
}

/** One duty in the list the teacher edits: its name, its number, removing it. */
function DutyRow({
  duty,
  label,
  number,
  onChange,
  onRemove,
}: {
  duty: Duty;
  /** The name, or "Dienst 2" while it has none. */
  label: string;
  number: number;
  onChange: (change: Partial<Duty>) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation('generator');
  const countId = React.useId();

  return (
    <li className="flex items-center gap-2 rounded-lg border border-(--border-card) bg-(--surface-card) p-2">
      <input
        type="text"
        value={duty.name}
        maxLength={MAX_DUTY_NAME_LENGTH}
        onChange={(event) => onChange({ name: event.target.value })}
        placeholder={t('tools.duties.namePlaceholder')}
        aria-label={t('tools.duties.nameLabel', { number })}
        className={`${inputFieldClass} h-10 min-w-0 flex-1 text-sm`}
      />
      <div
        role="group"
        aria-label={t('tools.duties.countLabel', { name: label })}
        className="flex shrink-0 items-center"
      >
        <button
          type="button"
          onClick={() => onChange({ count: duty.count - 1 })}
          disabled={duty.count <= 1}
          aria-label={t('tools.duties.fewer', { name: label })}
          aria-describedby={countId}
          className={`${quietIconButtonClass} h-10 w-10`}
        >
          <MinusIcon size={16} aria-hidden />
        </button>
        <span
          id={countId}
          aria-live="polite"
          className="w-6 text-center text-sm font-semibold tabular-nums text-(--text-page)"
        >
          {duty.count}
        </span>
        <button
          type="button"
          onClick={() => onChange({ count: duty.count + 1 })}
          disabled={duty.count >= MAX_DUTY_COUNT}
          aria-label={t('tools.duties.more', { name: label })}
          aria-describedby={countId}
          className={`${quietIconButtonClass} h-10 w-10`}
        >
          <PlusIcon size={16} aria-hidden />
        </button>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={t('tools.duties.remove', { name: label })}
        title={t('tools.duties.remove', { name: label })}
        className={`${quietDangerIconButtonClass} h-10 w-10 shrink-0`}
      >
        <TrashIcon size={16} aria-hidden />
      </button>
    </li>
  );
}

/** One duty of the round: who holds it, and the way to change one of them. */
function DutyCard({
  name,
  count,
  holders,
  onReplace,
  onFill,
}: {
  name: string;
  count: number;
  holders: Student[];
  onReplace: (studentId: string) => void;
  onFill: () => void;
}) {
  const { t } = useTranslation('generator');
  const open = Math.max(0, count - holders.length);

  return (
    <li className="rounded-lg border border-(--border-card) bg-(--surface-card) p-3">
      <span className="mb-2 block text-sm font-semibold text-(--text-page)">
        {name}
      </span>
      <ul className="flex flex-col gap-1">
        {holders.map((student) => (
          <li
            key={student.id}
            className="flex min-h-9 items-center justify-between gap-2 text-sm text-(--text-page)"
          >
            <span className="min-w-0 truncate">{student.name}</span>
            <button
              type="button"
              onClick={() => onReplace(student.id)}
              aria-label={t('tools.duties.replace', { name: student.name })}
              title={t('tools.duties.replace', { name: student.name })}
              className={`${quietIconButtonClass} h-9 w-9 shrink-0`}
            >
              <ArrowsClockwiseIcon size={16} aria-hidden />
            </button>
          </li>
        ))}
        {Array.from({ length: open }, (_, index) => (
          <li
            key={`open-${index}`}
            className="flex min-h-9 items-center justify-between gap-2 text-sm text-(--text-muted)"
          >
            <span>{t('tools.duties.open')}</span>
            <button
              type="button"
              onClick={onFill}
              className={`${secondaryButtonClass} h-8 gap-1.5 px-2.5 text-xs`}
            >
              <PlusIcon size={14} aria-hidden />
              {t('tools.duties.fill')}
            </button>
          </li>
        ))}
      </ul>
    </li>
  );
}

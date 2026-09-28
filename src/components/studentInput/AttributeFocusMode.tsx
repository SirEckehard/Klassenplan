// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  DoorIcon,
  PanoramaIcon,
  type Icon,
} from '@phosphor-icons/react';
import type { Student } from '@/types';
import { useInspector } from '@/contexts/InspectorContext';
import {
  STUDENT_FLAGS,
  dataFamilyClass,
  secondaryButtonClass,
  type DataFamily,
} from '@/utils';
import StudentAvatar from '@/components/students/StudentAvatar';

/** A flag the whole class can be walked through in one pass. */
type Pass = {
  key:
    | 'restless'
    | 'concentrationIssues'
    | 'shy'
    | 'performanceStrong'
    | 'performanceWeak'
    | 'needsFrontSeat'
    | 'prefersWindow'
    | 'prefersDoor';
  family: DataFamily;
  icon: Icon;
  /** The other flag this one rules out, if any. */
  exclusiveWith?: 'performanceStrong' | 'performanceWeak';
};

const flagIcon = (key: string): Icon =>
  STUDENT_FLAGS.find((flag) => flag.key === key)?.icon ?? CheckIcon;

/**
 * The order is the order a teacher thinks in: what disturbs the lesson, then
 * who holds back, then who needs what, then where they would rather sit.
 */
const PASSES: readonly Pass[] = [
  { key: 'restless', family: 'behavior', icon: flagIcon('restless') },
  {
    key: 'concentrationIssues',
    family: 'behavior',
    icon: flagIcon('concentrationIssues'),
  },
  { key: 'shy', family: 'social', icon: flagIcon('shy') },
  {
    key: 'performanceStrong',
    family: 'learning',
    icon: flagIcon('performanceStrong'),
    exclusiveWith: 'performanceWeak',
  },
  {
    key: 'performanceWeak',
    family: 'learning',
    icon: flagIcon('performanceWeak'),
    exclusiveWith: 'performanceStrong',
  },
  { key: 'needsFrontSeat', family: 'space', icon: flagIcon('needsFrontSeat') },
  { key: 'prefersWindow', family: 'space', icon: PanoramaIcon },
  { key: 'prefersDoor', family: 'space', icon: DoorIcon },
] as const;

type Props = {
  students: Student[];
  updateStudent: (id: string, patch: Partial<Student>) => void;
  onFinish: () => void;
};

/**
 * One question, the whole class, one tap per answer.
 *
 * Teachers think attribute-first — "who is restless? those four" — not
 * student-first. The list asks the other way round: thirty rows, each wanting
 * sixteen decisions, which is why classes ended up half-filled. Here a pass is
 * one question and up to thirty-six quick binary answers, and it works with one
 * thumb on a phone in a free period.
 *
 * Only the yes/no attributes are walked through. Gender, height, language
 * level and social role have more than two values; asking them this way would
 * put a dropdown on every tile, and they are set once per class anyway —
 * the inspector handles those.
 */
export default function AttributeFocusMode({
  students,
  updateStudent,
  onFinish,
}: Props) {
  const { t } = useTranslation('students');
  const { setSuspended } = useInspector();
  const [passIndex, setPassIndex] = React.useState(0);

  // The pass asks about the whole class at once; there is no "selected one"
  // for the inspector to show, and the grid wants the width.
  React.useEffect(() => {
    setSuspended(true);
    return () => setSuspended(false);
  }, [setSuspended]);

  const pass = PASSES[passIndex];
  const previous = passIndex > 0 ? PASSES[passIndex - 1] : null;
  const next = passIndex < PASSES.length - 1 ? PASSES[passIndex + 1] : null;
  const label = (key: string) =>
    key === 'prefersWindow'
      ? t('roomPreference.windowSeat')
      : key === 'prefersDoor'
        ? t('roomPreference.doorProximity')
        : t(`studentFlags.${key}.label`);

  const isSet = (student: Student) => Boolean(student[pass.key]);
  const selectedCount = students.filter(isSet).length;

  const toggle = (student: Student) => {
    const nextValue = !isSet(student);
    const patch: Partial<Student> = { [pass.key]: nextValue };
    // Leistungsstark and leistungsschwach rule each other out; the old row
    // enforced that through `exclusiveWith`, and a pass must not undo it.
    if (nextValue && pass.exclusiveWith) {
      (patch as Record<string, boolean>)[pass.exclusiveWith] = false;
    }
    updateStudent(student.id, patch);
  };

  const clearPass = () => {
    students.filter(isSet).forEach((student) => {
      updateStudent(student.id, { [pass.key]: false } as Partial<Student>);
    });
  };

  const PassIcon = pass.icon;
  const family = dataFamilyClass[pass.family];

  return (
    <section className="flex flex-col gap-5" aria-label={t('focusMode.title')}>
      {/* One line for where the pass stands, then the question across the
          whole width — beside the icon it was squeezed into a column a few
          words wide on a phone. The count and "Auswahl leeren" follow the
          hint there, right above the names they count; from `lg` up there is
          room for them at the end of the first line. */}
      <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 ${family}`}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-(--data-chip-surface) text-(--data-chip-text) sm:h-11 sm:w-11">
          <PassIcon size={20} aria-hidden="true" />
        </span>
        {/* How far through the questions this is, above the question itself:
            on a phone the footer is a thumb's width away and only carries the
            way on. The bars give way before the words do. */}
        <span className="flex min-w-0 flex-1 items-center gap-2 text-xs tabular-nums text-(--text-muted)">
          <span className="shrink-0 whitespace-nowrap">
            {t('focusMode.progress', {
              index: passIndex + 1,
              total: PASSES.length,
            })}
          </span>
          <span className="flex min-w-0 gap-1" aria-hidden="true">
            {PASSES.map((entry, index) => (
              <span
                key={entry.key}
                className={`h-1 w-4 rounded-full ${
                  index === passIndex
                    ? 'bg-(--button-primary-bg)'
                    : index < passIndex
                      ? 'bg-(--text-page)'
                      : 'bg-(--border-card)'
                }`}
              />
            ))}
          </span>
        </span>
        <h2 className="w-full font-serif text-2xl leading-tight sm:text-3xl lg:order-1">
          {t(`focusMode.questions.${pass.key}`)}
        </h2>
        <p className="w-full text-sm text-(--text-muted) lg:order-1">
          {t('focusMode.hint')}
        </p>
        <div className="flex w-full items-center justify-between gap-2 lg:w-auto lg:justify-end">
          <span className="text-sm tabular-nums text-(--text-muted)">
            {t('focusMode.selected', { count: selectedCount })}
          </span>
          <button
            type="button"
            onClick={clearPass}
            disabled={selectedCount === 0}
            className={`${secondaryButtonClass} text-xs`}
          >
            {t('focusMode.clear')}
          </button>
        </div>
      </div>

      {students.length === 0 ? (
        <p className="py-10 text-center text-sm text-(--text-muted)">
          {t('focusMode.empty')}
        </p>
      ) : (
        <ul className="grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2 xl:grid-cols-3">
          {students.map((student) => {
            const active = isSet(student);
            return (
              <li key={student.id}>
                <button
                  type="button"
                  onClick={() => toggle(student)}
                  aria-pressed={active}
                  className={`${family} flex min-h-14 w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${
                    active
                      ? 'border-(--data-chip-accent) bg-(--data-chip-surface) font-semibold'
                      : 'border-(--border-card) bg-(--surface-card) hover:bg-(--surface-sunken)'
                  }`}
                >
                  {/* The face or the initial, as in the class list — a bare
                      ring read as an unticked radio button beside the tick
                      at the end of the row. */}
                  <StudentAvatar student={student} size={32} />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {student.name || t('studentList.newStudent')}
                  </span>
                  {active && (
                    <CheckIcon
                      size={18}
                      weight="bold"
                      className="shrink-0 text-(--data-chip-text)"
                      aria-hidden="true"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Sticky below `lg`, where the list flows in the page: the pass is as
          long as the class, and the way on must not be at the far end of a
          scroll. It stops above the shell's status bar, which is sticky at
          the bottom edge too and would otherwise cover it; from `lg` up the
          list scrolls in its own column and the way on follows it. There it
          is no bar of its own: the page's paper on the stage's sunken
          surface drew a dark strip across it.
          Both buttons are grey — the status bar's "Weiter" to the room is
          the layer's one blue button, and two of them read as rivals. */}
      <div className="sticky bottom-(--shell-bottom-inset) z-10 flex items-center justify-between gap-2 border-t border-(--border-card) bg-(--surface-page) py-3 lg:static lg:border-t-0 lg:bg-transparent lg:py-0">
        <button
          type="button"
          onClick={() => setPassIndex((index) => index - 1)}
          disabled={!previous}
          // The visible text is the attribute; on its own that does not say
          // the button steps backwards, so the accessible name spells it out.
          aria-label={
            previous
              ? t('focusMode.previousPass', { label: label(previous.key) })
              : t('focusMode.firstPass')
          }
          className={`${secondaryButtonClass} h-11 shrink-0 gap-2`}
        >
          <ArrowLeftIcon size={14} aria-hidden="true" />
          {/* The label costs the width the next button needs on a phone. */}
          <span className="hidden sm:inline">
            {previous ? label(previous.key) : t('focusMode.firstPass')}
          </span>
        </button>

        {next ? (
          <button
            type="button"
            onClick={() => setPassIndex((index) => index + 1)}
            aria-label={t('focusMode.nextPass', { label: label(next.key) })}
            className={`${secondaryButtonClass} h-11 flex-1 justify-center gap-2 sm:flex-none`}
          >
            <span className="truncate">
              {t('focusMode.nextPass', { label: label(next.key) })}
            </span>
            <ArrowRightIcon size={14} aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onFinish}
            className={`${secondaryButtonClass} h-11 flex-1 justify-center gap-2 sm:flex-none`}
          >
            {t('focusMode.finish')}
            <CheckIcon size={14} aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}

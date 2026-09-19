// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  DoorIcon,
  ImageIcon,
  type Icon,
} from '@phosphor-icons/react';
import type { Student } from '@/types';
import { useInspector } from '@/contexts/InspectorContext';
import {
  STUDENT_FLAGS,
  dataFamilyClass,
  primaryButtonClass,
  secondaryButtonClass,
  type DataFamily,
} from '@/utils';
import { getStudentAppearance } from '@/utils/ui/studentAppearance';
import { useIsDarkMode } from '@/hooks/useIsDarkMode';

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
  { key: 'prefersWindow', family: 'space', icon: ImageIcon },
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
  const isDark = useIsDarkMode();
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
      <div className={`flex flex-wrap items-start gap-4 ${family}`}>
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-(--data-chip-surface) text-(--data-chip-text)">
          <PassIcon size={22} aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="font-serif text-3xl leading-tight">
            {t(`focusMode.questions.${pass.key}`)}
          </h2>
          <p className="text-sm text-(--text-muted)">{t('focusMode.hint')}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
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
            const appearance = getStudentAppearance(student, isDark);
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
                  <span
                    className="h-8 w-8 shrink-0 rounded-full border-2"
                    style={{
                      backgroundColor: appearance.fill,
                      borderColor: appearance.stroke,
                    }}
                    aria-hidden="true"
                  />
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

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-(--border-card) pt-4">
        <button
          type="button"
          onClick={() => setPassIndex((index) => index - 1)}
          disabled={!previous}
          // The visible text is the attribute; on its own that does not say
          // the button steps backwards, so the accessible name spells it out.
          aria-label={
            previous
              ? t('focusMode.previousPass', { label: label(previous.key) })
              : undefined
          }
          className={`${secondaryButtonClass} gap-2`}
        >
          <ArrowLeftIcon size={14} aria-hidden="true" />
          {previous ? label(previous.key) : t('focusMode.firstPass')}
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs tabular-nums text-(--text-muted)">
            {t('focusMode.progress', {
              index: passIndex + 1,
              total: PASSES.length,
            })}
          </span>
          <span className="flex gap-1" aria-hidden="true">
            {PASSES.map((entry, index) => (
              <span
                key={entry.key}
                className={`h-1 w-5 rounded-full ${
                  index === passIndex
                    ? 'bg-(--button-primary-bg)'
                    : index < passIndex
                      ? 'bg-(--text-page)'
                      : 'bg-(--border-card)'
                }`}
              />
            ))}
          </span>
        </div>

        {next ? (
          <button
            type="button"
            onClick={() => setPassIndex((index) => index + 1)}
            aria-label={t('focusMode.nextPass', { label: label(next.key) })}
            className={`${primaryButtonClass} gap-2`}
          >
            {label(next.key)}
            <ArrowRightIcon size={14} aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onFinish}
            className={`${primaryButtonClass} gap-2`}
          >
            {t('focusMode.finish')}
            <CheckIcon size={14} aria-hidden="true" />
          </button>
        )}
      </div>
    </section>
  );
}

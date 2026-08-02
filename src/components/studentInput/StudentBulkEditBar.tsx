// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIcon,
  BrainIcon,
  DoorIcon,
  ImageIcon,
  MapPinAreaIcon,
  SmileyNervousIcon,
  TrashIcon,
  TrendDownIcon,
  TrendUpIcon,
  XIcon,
  type Icon,
} from '@phosphor-icons/react';
import type {
  Gender,
  HeightCategory,
  LanguageSkillLevel,
  SocialRole,
  Student,
} from '@/types';
import {
  dangerButtonClass,
  quietIconButtonClass,
  selectFieldClass,
} from '@/utils';
import { specialNeedsButtonTokens } from '@/components/students/studentStyleTokens';

/**
 * Attribute flags that can be set or cleared for a whole selection, in the
 * order the student row shows them.
 */
const BULK_FLAGS = [
  'performanceStrong',
  'performanceWeak',
  'needsFrontSeat',
  'restless',
  'shy',
  'concentrationIssues',
  'prefersWindow',
  'prefersDoor',
] as const;

type BulkFlag = (typeof BULK_FLAGS)[number];

/**
 * The same icons the student row toggles use (`STUDENT_FLAGS`,
 * `StudentPreferenceToggles`), so a chip here and a toggle down in the list
 * read as the same thing.
 */
const FLAG_ICONS: Record<BulkFlag, Icon> = {
  performanceStrong: TrendUpIcon,
  performanceWeak: TrendDownIcon,
  needsFrontSeat: MapPinAreaIcon,
  restless: ActivityIcon,
  shy: SmileyNervousIcon,
  concentrationIssues: BrainIcon,
  prefersWindow: ImageIcon,
  prefersDoor: DoorIcon,
};

/**
 * Flags that cannot hold at the same time — setting one clears its counterpart,
 * matching `STUDENT_FLAGS.exclusiveWith` in the per-student toggles.
 */
const EXCLUSIVE_FLAGS: Partial<Record<BulkFlag, BulkFlag>> = {
  performanceStrong: 'performanceWeak',
  performanceWeak: 'performanceStrong',
};

/** How a flag is distributed across the selection. */
type FlagState = 'on' | 'off' | 'mixed';

const GENDERS: Gender[] = ['boy', 'girl', 'diverse'];
const HEIGHTS: HeightCategory[] = ['small', 'medium', 'tall'];
const LANGUAGE_LEVELS: LanguageSkillLevel[] = [
  'native',
  'fluent',
  'intermediate',
  'beginner',
  'daz',
];
const SOCIAL_ROLES: SocialRole[] = ['mediator', 'leader', 'loner', 'socialHub'];

interface StudentBulkEditBarProps {
  selectedStudents: Student[];
  onApply: (patch: Partial<Student>) => void;
  onDeleteSelected: () => void;
  onClearSelection: () => void;
  /**
   * Search/filter/sort, collapsed into a popover trigger by the workbench —
   * this row takes over the line they would otherwise occupy.
   */
  filterSlot?: React.ReactNode;
}

/**
 * Bulk attribute editing for the selected students.
 *
 * With 30 students and 16 criteria, setting a shared attribute one row at a
 * time is the single most tedious part of preparing a class — this applies it
 * to the whole selection in one step. `__clear__` writes `undefined`, so a
 * mistakenly set attribute can be taken back the same way it was applied.
 *
 * Renders bare: the surrounding card, tint and landmark belong to
 * `StudentListToolsRow`, which swaps this row in for the browse toolbar so
 * selecting students costs no extra height.
 */
export default function StudentBulkEditBar({
  selectedStudents,
  onApply,
  onDeleteSelected,
  onClearSelection,
  filterSlot,
}: StudentBulkEditBarProps) {
  const { t } = useTranslation('students');
  const CLEAR_VALUE = '__clear__';
  const selectedCount = selectedStudents.length;

  const applyChoice = React.useCallback(
    <K extends keyof Student>(field: K, raw: string) => {
      if (!raw) return;
      onApply({
        [field]: raw === CLEAR_VALUE ? undefined : raw,
      } as Partial<Student>);
    },
    [onApply],
  );

  // A chip shows what the selection currently is, not what a click would do:
  // with a mixed selection "toggle" would be ambiguous, so a click always
  // writes one absolute state — set for everyone unless everyone already has it.
  const flagStates = React.useMemo(() => {
    const states = {} as Record<BulkFlag, FlagState>;
    for (const flag of BULK_FLAGS) {
      const onCount = selectedStudents.filter((student) =>
        Boolean(student[flag]),
      ).length;
      states[flag] =
        onCount === 0
          ? 'off'
          : onCount === selectedStudents.length
            ? 'on'
            : 'mixed';
    }
    return states;
  }, [selectedStudents]);

  // The closed select shows the bare attribute ("Geschlecht"); the accessible
  // name keeps the verb ("Geschlecht setzen"). Spelling out "setzen" four times
  // pushed the bar onto a second line without telling anyone anything new.
  const renderSelect = <T extends string>(
    id: string,
    label: string,
    placeholder: string,
    values: T[],
    translate: (value: T) => string,
    field: keyof Student,
  ) => (
    <label key={id} className="flex items-center gap-2">
      <span className="sr-only">{label}</span>
      <select
        value=""
        onChange={(event) => {
          applyChoice(field, event.target.value);
          event.target.value = '';
        }}
        className={`${selectFieldClass} w-auto`}
        title={label}
      >
        <option value="">{placeholder}</option>
        {values.map((value) => (
          <option key={value} value={value}>
            {translate(value)}
          </option>
        ))}
        <option value={CLEAR_VALUE}>
          {t('bulkEdit.clearValue', '— entfernen —')}
        </option>
      </select>
    </label>
  );

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">
        {t('bulkEdit.selectedCount', {
          count: selectedCount,
          defaultValue: '{{count}} ausgewählt',
        })}
      </span>
      {/* Sits with the count it undoes, not with the destructive action. */}
      <button
        type="button"
        onClick={onClearSelection}
        className={`${quietIconButtonClass} h-9 w-9`}
        aria-label={t('bulkEdit.clearSelection', 'Auswahl aufheben')}
        aria-keyshortcuts="Escape"
        title={`${t('bulkEdit.clearSelection', 'Auswahl aufheben')} (Esc)`}
      >
        <XIcon size={16} aria-hidden />
      </button>

      {filterSlot && (
        <>
          <div className="h-6 w-px bg-blue-200 dark:bg-blue-900/60" />
          {filterSlot}
          <div className="h-6 w-px bg-blue-200 dark:bg-blue-900/60" />
        </>
      )}

      {renderSelect(
        'gender',
        t('bulkEdit.setGender', 'Geschlecht setzen'),
        t('gender.title', 'Geschlecht'),
        GENDERS,
        (value) => t(`gender.${value}`),
        'gender',
      )}
      {renderSelect(
        'height',
        t('bulkEdit.setHeight', 'Körpergröße setzen'),
        t('height.title', 'Körpergröße'),
        HEIGHTS,
        (value) => t(`height.${value}`),
        'height',
      )}
      {renderSelect(
        'language',
        t('bulkEdit.setLanguage', 'Sprachniveau setzen'),
        t('languageSkill.title', 'Sprachniveau'),
        LANGUAGE_LEVELS,
        (value) => t(`languageSkill.${value}`),
        'languageSkill',
      )}
      {renderSelect(
        'role',
        t('bulkEdit.setRole', 'Soziale Rolle setzen'),
        t('socialRole.title', 'Soziale Rolle'),
        SOCIAL_ROLES,
        (value) => t(`socialRole.${value}`),
        'socialRole',
      )}

      <div
        role="group"
        aria-label={t('bulkEdit.setFlag', 'Merkmal setzen')}
        className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-1"
      >
        {BULK_FLAGS.map((flag: BulkFlag) => {
          const state = flagStates[flag];
          const FlagIcon = FLAG_ICONS[flag];
          const label = t(`bulkEdit.flags.${flag}`);
          const stateLabel = t(`bulkEdit.flagState.${state}`);
          const hint = t(
            state === 'on' ? 'bulkEdit.flagClearHint' : 'bulkEdit.flagSetHint',
          );

          return (
            <button
              key={flag}
              type="button"
              className={`${specialNeedsButtonTokens.compactBaseClass} ${
                state === 'on'
                  ? specialNeedsButtonTokens.activeStateClass
                  : state === 'mixed'
                    ? specialNeedsButtonTokens.mixedStateClass
                    : specialNeedsButtonTokens.inactiveStateClass
              }`}
              aria-pressed={state === 'mixed' ? 'mixed' : state === 'on'}
              aria-label={`${label}: ${stateLabel}`}
              title={`${label}: ${stateLabel} — ${hint}`}
              onClick={() => {
                const next = state !== 'on';
                const counterpart = EXCLUSIVE_FLAGS[flag];
                onApply({
                  [flag]: next,
                  // Only setting can conflict — clearing leaves the other flag alone.
                  ...(next && counterpart ? { [counterpart]: false } : {}),
                } as Partial<Student>);
              }}
            >
              <FlagIcon size={16} aria-hidden="true" className="shrink-0" />
            </button>
          );
        })}
      </div>

      {/*
        Icon-only: the German labels ("Entfernen", "Auswahl aufheben") pushed
        the bar onto a second line on a 14" screen. Both actions are reversible
        or confirmed, and carry their wording in the tooltip and accessible name.

        No `ml-auto` here: with a wrapping row that pushes this button onto a
        line of its own as soon as the chips fill the first one. The chip group
        above claims the free space instead, so this stays beside them and the
        chips wrap among themselves when it gets tight.
      */}
      <button
        type="button"
        onClick={onDeleteSelected}
        className={`${dangerButtonClass} h-9 w-9 p-0!`}
        aria-label={t('bulkEdit.deleteSelected', 'Entfernen')}
        title={t('bulkEdit.deleteSelected', 'Entfernen')}
      >
        <TrashIcon size={16} aria-hidden />
      </button>
    </div>
  );
}

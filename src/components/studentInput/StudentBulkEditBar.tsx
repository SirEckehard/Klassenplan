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
import { dangerButtonClass, quietIconButtonClass } from '@/utils';
import { specialNeedsButtonTokens } from '@/components/students/studentStyleTokens';
import BulkAttributeMenu from '@/components/studentInput/BulkAttributeMenu';

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
  const selectedCount = selectedStudents.length;

  const applyValue = React.useCallback(
    (field: keyof Student, value: string | null) => {
      onApply({ [field]: value ?? undefined } as Partial<Student>);
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

  // The closed trigger shows the bare attribute ("Geschlecht"); the accessible
  // name keeps the verb ("Geschlecht setzen"). Spelling out "setzen" four times
  // pushed the bar onto a second line without telling anyone anything new.
  const renderMenu = <T extends string>(
    id: string,
    label: string,
    triggerLabel: string,
    values: T[],
    translate: (value: T) => string,
    field: keyof Student,
  ) => (
    <BulkAttributeMenu
      key={id}
      label={triggerLabel}
      actionLabel={label}
      options={values.map((value) => ({ value, label: translate(value) }))}
      onSelect={(value) => applyValue(field, value)}
    />
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

      {renderMenu(
        'gender',
        t('bulkEdit.setGender', 'Geschlecht setzen'),
        t('gender.title', 'Geschlecht'),
        GENDERS,
        (value) => t(`gender.${value}`),
        'gender',
      )}
      {renderMenu(
        'height',
        t('bulkEdit.setHeight', 'Körpergröße setzen'),
        t('height.title', 'Körpergröße'),
        HEIGHTS,
        (value) => t(`height.${value}`),
        'height',
      )}
      {renderMenu(
        'language',
        t('bulkEdit.setLanguage', 'Sprachniveau setzen'),
        t('languageSkill.title', 'Sprachniveau'),
        LANGUAGE_LEVELS,
        (value) => t(`languageSkill.${value}`),
        'languageSkill',
      )}
      {renderMenu(
        'role',
        t('bulkEdit.setRole', 'Soziale Rolle setzen'),
        t('socialRole.title', 'Soziale Rolle'),
        SOCIAL_ROLES,
        (value) => t(`socialRole.${value}`),
        'socialRole',
      )}

      {/*
        From `sm` up, `min-w-max` + `flex-nowrap` + `shrink-0` keep the eight
        chips as one visual unit that never breaks 7/1 across two lines: if the
        row is too narrow the whole group moves down instead, and `grow` keeps
        it claiming the free space so the delete button stays beside it.

        Below `sm` that would overflow the card — eight 44px touch targets do
        not fit a phone — so the group wraps there and reads left-aligned like
        the rest of the bar.
      */}
      <div
        role="group"
        aria-label={t('bulkEdit.setFlag', 'Merkmal setzen')}
        className="flex flex-wrap items-center justify-start gap-1 sm:min-w-max sm:shrink-0 sm:grow sm:flex-nowrap sm:justify-end"
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
              className={`${specialNeedsButtonTokens.bulkBaseClass} ${
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
        above claims the free space instead, so this stays beside them — and if
        the row ever does run out, the two travel to the next line together.
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

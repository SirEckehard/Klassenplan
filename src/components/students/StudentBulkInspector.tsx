// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { TrashIcon, XIcon } from '@phosphor-icons/react';
import type { Student } from '@/types';
import { dangerButtonClass, quietIconButtonClass } from '@/utils';
import {
  InspectorBody,
  InspectorFooter,
  InspectorHeader,
  InspectorSection,
} from '@/components/shell/InspectorPanel';
import GenderSelector from './GenderSelector';
import HeightSelector from './HeightSelector';
import LanguageSkillSelector from './LanguageSkillSelector';
import SocialRoleSelector from './SocialRoleSelector';
import SpecialNeedsToggles from './SpecialNeedsToggles';
import StudentPreferenceToggles from './StudentPreferenceToggles';

const CHOICE_FIELDS = [
  'gender',
  'height',
  'languageSkill',
  'socialRole',
] as const;

const FLAG_FIELDS = [
  'performanceStrong',
  'performanceWeak',
  'restless',
  'concentrationIssues',
  'shy',
  'needsFrontSeat',
  'prefersWindow',
  'prefersDoor',
] as const;

/**
 * The selection read as one student: a value everybody shares, a flag
 * everybody carries. Whatever differs is left unset, and a flag only some of
 * them carry is named in `mixed` so its switch can say so.
 *
 * That is exactly what the single-student controls need to behave as bulk
 * controls: a chip pressed sets its value for all, the chip everybody already
 * has clears it for all, and a switch that is not on for everyone turns it on
 * for everyone.
 */
function readSelection(students: Student[]): {
  student: Student;
  mixed: ReadonlySet<keyof Student>;
} {
  const shared: Record<string, unknown> = {};
  const mixed = new Set<keyof Student>();

  for (const field of CHOICE_FIELDS) {
    const first = students[0]?.[field];
    if (students.every((student) => student[field] === first)) {
      shared[field] = first;
    }
  }
  for (const flag of FLAG_FIELDS) {
    const count = students.filter((student) => Boolean(student[flag])).length;
    shared[flag] = count > 0 && count === students.length;
    if (count > 0 && count < students.length) {
      mixed.add(flag);
    }
  }

  return {
    student: { id: 'selection', name: '', ...shared } as Student,
    mixed,
  };
}

type Props = {
  selectedStudents: Student[];
  /** Writes one patch to every selected student. */
  onApply: (patch: Partial<Student>) => void;
  /** Remove the selected students, confirmation included. */
  onRemove: () => void;
  /** Let the selection go. */
  onClear: () => void;
};

/**
 * Several students at once, in the shape the inspector gives one of them.
 *
 * The sections and rows are `StudentInspector`'s own controls, so setting an
 * attribute for twelve students looks and works like setting it for one.
 * Left out is what only makes sense per person: the name, the photo and the
 * partners, who are somebody else for each of them.
 */
export default function StudentBulkInspector({
  selectedStudents,
  onApply,
  onRemove,
  onClear,
}: Props) {
  const { t } = useTranslation('students');
  const { student, mixed } = React.useMemo(
    () => readSelection(selectedStudents),
    [selectedStudents],
  );
  const update = React.useCallback(
    (_id: string, patch: Partial<Student>) => onApply(patch),
    [onApply],
  );
  const clearLabel = t('bulkEdit.clearSelection');

  return (
    <>
      <InspectorHeader
        title={t('bulkEdit.selectedCount', { count: selectedStudents.length })}
        subtitle={t('bulkEdit.appliesToAll')}
        actions={
          <button
            type="button"
            onClick={onClear}
            className={`${quietIconButtonClass} h-8 w-8`}
            aria-label={clearLabel}
            aria-keyshortcuts="Escape"
            title={`${clearLabel} (Esc)`}
          >
            <XIcon size={16} aria-hidden="true" />
          </button>
        }
      />
      <InspectorBody>
        <InspectorSection family="person" title={t('inspector.groups.person')}>
          <GenderSelector student={student} updateStudent={update} />
          <HeightSelector student={student} updateStudent={update} />
        </InspectorSection>

        <InspectorSection
          family="learning"
          title={t('inspector.groups.learning')}
        >
          <SpecialNeedsToggles
            student={student}
            updateStudent={update}
            keys={['performanceStrong', 'performanceWeak']}
            mixed={mixed}
          />
        </InspectorSection>

        <InspectorSection
          family="language"
          title={t('inspector.groups.language')}
        >
          <LanguageSkillSelector student={student} updateStudent={update} />
        </InspectorSection>

        <InspectorSection
          family="behavior"
          title={t('inspector.groups.behavior')}
        >
          <SpecialNeedsToggles
            student={student}
            updateStudent={update}
            keys={['restless', 'concentrationIssues']}
            mixed={mixed}
          />
        </InspectorSection>

        <InspectorSection family="social" title={t('inspector.groups.social')}>
          <SpecialNeedsToggles
            student={student}
            updateStudent={update}
            keys={['shy']}
            mixed={mixed}
          />
          <SocialRoleSelector student={student} updateStudent={update} />
        </InspectorSection>

        <InspectorSection family="space" title={t('inspector.groups.space')}>
          <SpecialNeedsToggles
            student={student}
            updateStudent={update}
            keys={['needsFrontSeat']}
            mixed={mixed}
          />
          <StudentPreferenceToggles
            student={student}
            updateStudent={update}
            mixed={mixed}
          />
        </InspectorSection>
      </InspectorBody>

      <InspectorFooter>
        <button
          type="button"
          onClick={onRemove}
          className={`${dangerButtonClass} h-8 gap-2 px-3 text-xs`}
        >
          <TrashIcon size={14} aria-hidden="true" />
          {t('bulkEdit.deleteSelected')}
        </button>
      </InspectorFooter>
    </>
  );
}

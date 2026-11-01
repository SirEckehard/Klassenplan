// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { CaretDownIcon, CaretUpIcon, XIcon } from '@phosphor-icons/react';
import type { Student } from '@/types';
import { useStudentRowState } from '@/hooks/ui/useStudentRowState';
import { quietIconButtonClass } from '@/utils';
import {
  InspectorBody,
  InspectorDeleteFooter,
  InspectorHeader,
  InspectorSection,
} from '@/components/shell/InspectorPanel';
import { ENTITY_ICONS } from '@/components/shell/entityIcons';
import StudentNameEditor from './StudentNameEditor';
import StudentPhotoButton from './StudentPhotoButton';
import GenderSelector from './GenderSelector';
import HeightSelector from './HeightSelector';
import LanguageSkillSelector from './LanguageSkillSelector';
import SocialRoleSelector from './SocialRoleSelector';
import SpecialNeedsToggles from './SpecialNeedsToggles';
import StudentPreferenceToggles from './StudentPreferenceToggles';
import PartnerSelector from './PartnerSelector';
import AvoidPartnerSelector from './AvoidPartnerSelector';

type Props = {
  student: Student;
  allStudents: Student[];
  updateStudent: (id: string, patch: Partial<Student>) => void;
  /** Remove this student, confirmation included. Omitted where it has none. */
  onRemove?: () => void;
  /** Let the selection go, so the panel falls back to its empty state. */
  onClose?: () => void;
  /** Step to the previous/next student; omitted at the ends of the list. */
  onPrevious?: () => void;
  onNext?: () => void;
  position: { index: number; total: number };
  /**
   * Whether an unnamed student's name field takes the focus as it opens.
   * Not when the student was reached by the keyboard's arrows.
   */
  autoFocusName?: boolean;
};

/**
 * Everything about one student, grouped and labelled.
 *
 * Each control stands in a row with its name, under a heading that says which
 * pedagogical family it belongs to, in that family's colour.
 */
export default function StudentInspector({
  student,
  allStudents,
  updateStudent,
  onRemove,
  onClose,
  onPrevious,
  onNext,
  position,
  autoFocusName = true,
}: Props) {
  const { t } = useTranslation('students');
  const rowState = useStudentRowState();

  // A different student means different partner lists; leaving one open across
  // the switch would point a portal at a control that just unmounted.
  const {
    setShowPartnerDropdown,
    setShowAvoidDropdown,
    setIsEditing,
    setDraftName,
  } = rowState;
  React.useEffect(() => {
    setShowPartnerDropdown(false);
    setShowAvoidDropdown(false);
  }, [setShowAvoidDropdown, setShowPartnerDropdown, student.id]);

  // A student without a name has exactly one thing to do next, so the field is
  // already open for it. With Enter handing over to the next student, naming a
  // class of placeholders is typing and Enter, all the way down.
  const hasName = student.name.trim().length > 0;
  React.useEffect(() => {
    if (hasName) return;
    setIsEditing(true);
    setDraftName('');
  }, [hasName, setDraftName, setIsEditing, student.id]);

  return (
    <>
      <InspectorHeader
        media={
          <StudentPhotoButton student={student} updateStudent={updateStudent} />
        }
        title={
          <StudentNameEditor
            student={student}
            allStudents={allStudents}
            updateStudent={updateStudent}
            isEditing={rowState.isEditing}
            setIsEditing={rowState.setIsEditing}
            draftName={rowState.draftName}
            setDraftName={rowState.setDraftName}
            showEditButton={false}
            onSubmit={onNext}
            autoFocus={autoFocusName}
          />
        }
        meta={[
          {
            icon: ENTITY_ICONS.students,
            label: t('inspector.position', {
              index: position.index,
              total: position.total,
            }),
          },
        ]}
        // The arrows step up and down the class list, as Alt/⌥+↑ and ↓ do,
        // at the far end of the strip rather than in the line under the name,
        // so the header stands at the others' height: stacked under a mouse
        // (2 × 28px within the strip), side by side as 44px targets under a
        // finger.
        actions={
          <>
            <div className="flex flex-col pointer-coarse:flex-row pointer-coarse:gap-1">
              <button
                type="button"
                onClick={onPrevious}
                disabled={!onPrevious}
                className={`${quietIconButtonClass} h-7 w-7 pointer-coarse:h-11 pointer-coarse:w-11`}
                aria-label={t('inspector.previousStudent')}
                aria-keyshortcuts="Alt+ArrowUp"
                title={t('inspector.previousStudentHint')}
              >
                <CaretUpIcon size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={onNext}
                disabled={!onNext}
                className={`${quietIconButtonClass} h-7 w-7 pointer-coarse:h-11 pointer-coarse:w-11`}
                aria-label={t('inspector.nextStudent')}
                aria-keyshortcuts="Alt+ArrowDown"
                title={t('inspector.nextStudentHint')}
              >
                <CaretDownIcon size={16} aria-hidden="true" />
              </button>
            </div>
            {/* Only the phone's sheet and the tablet's drawer close from
                here: a finger needs a way out it can see. From `lg` up
                putting the student away would only leave the column's empty
                notice — the column folds from the status bar. */}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className={`${quietIconButtonClass} h-8 w-8 pointer-coarse:h-11 pointer-coarse:w-11 lg:hidden`}
                aria-label={t('inspector.close')}
              >
                <XIcon size={16} aria-hidden="true" />
              </button>
            )}
          </>
        }
      />
      <InspectorBody>
        <InspectorSection family="person" title={t('inspector.groups.person')}>
          <GenderSelector student={student} updateStudent={updateStudent} />
          <HeightSelector student={student} updateStudent={updateStudent} />
        </InspectorSection>

        <InspectorSection
          family="learning"
          title={t('inspector.groups.learning')}
        >
          <SpecialNeedsToggles
            student={student}
            updateStudent={updateStudent}
            keys={['performanceStrong', 'performanceWeak']}
          />
        </InspectorSection>

        <InspectorSection
          family="behavior"
          title={t('inspector.groups.behavior')}
        >
          <SpecialNeedsToggles
            student={student}
            updateStudent={updateStudent}
            keys={['restless', 'concentrationIssues']}
          />
        </InspectorSection>

        <InspectorSection family="social" title={t('inspector.groups.social')}>
          <PartnerSelector
            student={student}
            allStudents={allStudents}
            updateStudent={updateStudent}
            showDropdown={rowState.showPartnerDropdown}
            setShowDropdown={rowState.setShowPartnerDropdown}
            dropdownRef={rowState.dropdownRef}
          />
          <AvoidPartnerSelector
            student={student}
            allStudents={allStudents}
            updateStudent={updateStudent}
            showDropdown={rowState.showAvoidDropdown}
            setShowDropdown={rowState.setShowAvoidDropdown}
            dropdownRef={rowState.avoidDropdownRef}
          />
          <SpecialNeedsToggles
            student={student}
            updateStudent={updateStudent}
            keys={['shy']}
          />
          <SocialRoleSelector student={student} updateStudent={updateStudent} />
        </InspectorSection>

        <InspectorSection family="space" title={t('inspector.groups.space')}>
          <SpecialNeedsToggles
            student={student}
            updateStudent={updateStudent}
            keys={['needsFrontSeat']}
          />
          <StudentPreferenceToggles
            student={student}
            updateStudent={updateStudent}
          />
        </InspectorSection>

        <InspectorSection
          family="language"
          title={t('inspector.groups.language')}
        >
          <LanguageSkillSelector
            student={student}
            updateStudent={updateStudent}
          />
        </InspectorSection>
      </InspectorBody>

      {/* Removing a student left the list with its rows; this is where it
          landed, next to everything else that acts on this one student. */}
      {onRemove && (
        <InspectorDeleteFooter
          label={t('studentList.delete')}
          onDelete={onRemove}
        />
      )}
    </>
  );
}

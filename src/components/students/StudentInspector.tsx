// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CaretLeftIcon,
  CaretRightIcon,
  TrashIcon,
  XIcon,
} from '@phosphor-icons/react';
import type { Student } from '@/types';
import { useStudentRowState } from '@/hooks/ui/useStudentRowState';
import { quietIconButtonClass, dangerButtonClass } from '@/utils';
import {
  InspectorBody,
  InspectorFooter,
  InspectorHeader,
  InspectorSection,
} from '@/components/shell/InspectorPanel';
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
};

/**
 * Everything about one student, grouped and labelled.
 *
 * The controls are the same components the row used to carry — they already
 * knew how to edit a student, they were just wedged into sixteen unlabelled
 * columns. Here they get their `hybrid` variant (icon plus word) and a heading
 * that says which pedagogical family they belong to, in that family's colour.
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
}: Props) {
  const { t } = useTranslation('students');
  const rowState = useStudentRowState();

  // A different student means a different set of dropdowns; leaving one open
  // across the switch would point a portal at a control that just unmounted.
  const { setShowGenderDropdown, setIsEditing, setDraftName } = rowState;
  React.useEffect(() => {
    setShowGenderDropdown(false);
  }, [setShowGenderDropdown, student.id]);

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
          />
        }
        subtitle={t('inspector.position', {
          index: position.index,
          total: position.total,
        })}
        actions={
          <>
            <button
              type="button"
              onClick={onPrevious}
              disabled={!onPrevious}
              className={`${quietIconButtonClass} h-8 w-8`}
              aria-label={t('inspector.previousStudent')}
            >
              <CaretLeftIcon size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!onNext}
              className={`${quietIconButtonClass} h-8 w-8`}
              aria-label={t('inspector.nextStudent')}
            >
              <CaretRightIcon size={16} aria-hidden="true" />
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className={`${quietIconButtonClass} h-8 w-8`}
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
          <GenderSelector
            student={student}
            updateStudent={updateStudent}
            variant="hybrid"
            showDropdown={rowState.showGenderDropdown}
            setShowDropdown={rowState.setShowGenderDropdown}
            dropdownRef={rowState.genderDropdownRef}
            hintId={`inspector-gender-hint-${student.id}`}
          />
          <HeightSelector
            student={student}
            updateStudent={updateStudent}
            variant="hybrid"
            showDropdown={rowState.showHeightDropdown}
            setShowDropdown={rowState.setShowHeightDropdown}
            dropdownRef={rowState.heightDropdownRef}
          />
        </InspectorSection>

        <InspectorSection
          family="learning"
          title={t('inspector.groups.learning')}
        >
          <SpecialNeedsToggles
            student={student}
            updateStudent={updateStudent}
            variant="hybrid"
            keys={['performanceStrong', 'performanceWeak']}
          />
        </InspectorSection>

        <InspectorSection
          family="language"
          title={t('inspector.groups.language')}
        >
          <LanguageSkillSelector
            student={student}
            updateStudent={updateStudent}
            variant="hybrid"
            showDropdown={rowState.showLanguageDropdown}
            setShowDropdown={rowState.setShowLanguageDropdown}
            dropdownRef={rowState.languageDropdownRef}
          />
        </InspectorSection>

        <InspectorSection
          family="behavior"
          title={t('inspector.groups.behavior')}
        >
          <SpecialNeedsToggles
            student={student}
            updateStudent={updateStudent}
            variant="hybrid"
            keys={['restless', 'concentrationIssues']}
          />
        </InspectorSection>

        <InspectorSection family="social" title={t('inspector.groups.social')}>
          <SpecialNeedsToggles
            student={student}
            updateStudent={updateStudent}
            variant="hybrid"
            keys={['shy']}
          />
          <SocialRoleSelector
            student={student}
            updateStudent={updateStudent}
            variant="hybrid"
            showDropdown={rowState.showSocialRoleDropdown}
            setShowDropdown={rowState.setShowSocialRoleDropdown}
            dropdownRef={rowState.socialRoleDropdownRef}
          />
          <PartnerSelector
            student={student}
            allStudents={allStudents}
            updateStudent={updateStudent}
            variant="hybrid"
            showDropdown={rowState.showPartnerDropdown}
            setShowDropdown={rowState.setShowPartnerDropdown}
            dropdownRef={rowState.dropdownRef}
          />
          <AvoidPartnerSelector
            student={student}
            allStudents={allStudents}
            updateStudent={updateStudent}
            variant="hybrid"
            showDropdown={rowState.showAvoidDropdown}
            setShowDropdown={rowState.setShowAvoidDropdown}
            dropdownRef={rowState.avoidDropdownRef}
          />
        </InspectorSection>

        <InspectorSection family="space" title={t('inspector.groups.space')}>
          <SpecialNeedsToggles
            student={student}
            updateStudent={updateStudent}
            variant="hybrid"
            keys={['needsFrontSeat']}
          />
          <StudentPreferenceToggles
            student={student}
            updateStudent={updateStudent}
            variant="hybrid"
          />
        </InspectorSection>
      </InspectorBody>

      {/* Removing a student left the list with its rows; this is where it
          landed, next to everything else that acts on this one student. */}
      {onRemove && (
        <InspectorFooter>
          <button
            type="button"
            onClick={onRemove}
            className={`${dangerButtonClass} h-8 gap-2 px-3 text-xs`}
          >
            <TrashIcon size={14} aria-hidden="true" />
            {t('studentList.delete')}
          </button>
        </InspectorFooter>
      )}
    </>
  );
}

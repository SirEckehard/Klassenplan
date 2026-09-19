// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react';
import type { Student } from '@/types';
import { useStudentRowState } from '@/hooks/ui/useStudentRowState';
import {
  dataFamilyClass,
  dataHeadingClass,
  quietIconButtonClass,
} from '@/utils';
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
function Section({
  family,
  title,
  children,
}: {
  family: keyof typeof dataFamilyClass;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className={`${dataHeadingClass} ${dataFamilyClass[family]}`}>
        {title}
      </h3>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </section>
  );
}

export default function StudentInspector({
  student,
  allStudents,
  updateStudent,
  onPrevious,
  onNext,
  position,
}: Props) {
  const { t } = useTranslation('students');
  const rowState = useStudentRowState();

  // A different student means a different set of dropdowns; leaving one open
  // across the switch would point a portal at a control that just unmounted.
  const { setShowGenderDropdown } = rowState;
  React.useEffect(() => {
    setShowGenderDropdown(false);
  }, [setShowGenderDropdown, student.id]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <StudentPhotoButton student={student} updateStudent={updateStudent} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <StudentNameEditor
            student={student}
            allStudents={allStudents}
            updateStudent={updateStudent}
            isEditing={rowState.isEditing}
            setIsEditing={rowState.setIsEditing}
            draftName={rowState.draftName}
            setDraftName={rowState.setDraftName}
            showEditButton={false}
          />
          <span className="text-xs tabular-nums text-(--text-muted)">
            {t('inspector.position', {
              index: position.index,
              total: position.total,
            })}
          </span>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1">
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
        </div>
      </div>

      <Section family="person" title={t('inspector.groups.person')}>
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
      </Section>

      <Section family="learning" title={t('inspector.groups.learning')}>
        <SpecialNeedsToggles
          student={student}
          updateStudent={updateStudent}
          variant="hybrid"
          keys={['performanceStrong', 'performanceWeak']}
        />
      </Section>

      <Section family="language" title={t('inspector.groups.language')}>
        <LanguageSkillSelector
          student={student}
          updateStudent={updateStudent}
          variant="hybrid"
          showDropdown={rowState.showLanguageDropdown}
          setShowDropdown={rowState.setShowLanguageDropdown}
          dropdownRef={rowState.languageDropdownRef}
        />
      </Section>

      <Section family="behavior" title={t('inspector.groups.behavior')}>
        <SpecialNeedsToggles
          student={student}
          updateStudent={updateStudent}
          variant="hybrid"
          keys={['restless', 'concentrationIssues']}
        />
      </Section>

      <Section family="social" title={t('inspector.groups.social')}>
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
      </Section>

      <Section family="space" title={t('inspector.groups.space')}>
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
      </Section>
    </div>
  );
}

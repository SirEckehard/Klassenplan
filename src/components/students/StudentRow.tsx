import { TrashIcon } from '@phosphor-icons/react';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Student } from '@/types';
import { useStudentRowState } from '@/hooks/ui/useStudentRowState';
import { useIsLgUp } from '@/hooks/ui/useIsLgUp';
import { cardSurfaceClass, dangerIconButtonClass } from '@/utils';
import StudentNameEditor from './StudentNameEditor';
import PartnerSelector from './PartnerSelector';
import AvoidPartnerSelector from './AvoidPartnerSelector';
import GenderSelector from './GenderSelector';
import HeightSelector from './HeightSelector';
import LanguageSkillSelector from './LanguageSkillSelector';
import SocialRoleSelector from './SocialRoleSelector';
import SpecialNeedsToggles from './SpecialNeedsToggles';
import StudentPreferenceToggles from './StudentPreferenceToggles';

type Props = {
  student: Student;
  index: number;
  highlight: boolean;
  updateStudent: (id: string, patch: Partial<Student>) => void;
  removeStudent: (id: string) => void;
  allStudents: Student[];
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
};

/**
 * Displays controls for a single student entry.
 *
 * Renders compact icon-only buttons; column labels are provided by the
 * StudentListHeader above the list.
 *
 * Refactored to use sub-components:
 * - StudentNameEditor (name editing logic)
 * - PartnerSelector (wish partner dropdown)
 * - AvoidPartnerSelector (avoid partner dropdown)
 * - GenderSelector (gender selection UI)
 * - HeightSelector (height category selection)
 * - SpecialNeedsToggles (special needs flags)
 * - StudentPreferenceToggles (room preferences)
 * - useStudentRowState (centralized state management)
 */
function StudentRow({
  student,
  index,
  highlight,
  updateStudent,
  removeStudent,
  allStudents,
  scrollContainerRef,
}: Props) {
  // Centralized state management for dropdowns
  const rowState = useStudentRowState();
  const { t } = useTranslation('students');

  // Below `lg` the row stacks and each control renders as a labelled chip
  // (`hybrid`); at `lg+` it stays a single-line columnar row (`compact`) that
  // the sticky StudentListHeader aligns over.
  const isLgUp = useIsLgUp();
  const variant = isLgUp ? 'compact' : 'hybrid';

  // Close any open selector dropdown when the layout switches, so a portal
  // anchored to a now-remounted control can't be left orphaned.
  const {
    setShowGenderDropdown,
    setShowHeightDropdown,
    setShowLanguageDropdown,
    setShowSocialRoleDropdown,
    setShowPartnerDropdown,
    setShowAvoidDropdown,
  } = rowState;
  useEffect(() => {
    setShowGenderDropdown(false);
    setShowHeightDropdown(false);
    setShowLanguageDropdown(false);
    setShowSocialRoleDropdown(false);
    setShowPartnerDropdown(false);
    setShowAvoidDropdown(false);
  }, [
    isLgUp,
    setShowGenderDropdown,
    setShowHeightDropdown,
    setShowLanguageDropdown,
    setShowSocialRoleDropdown,
    setShowPartnerDropdown,
    setShowAvoidDropdown,
  ]);

  const baseCardClass = `${cardSurfaceClass} cursor-default transition-shadow hover:shadow-lg`;
  const highlightClass = highlight
    ? 'border-green-500 bg-green-50/90 shadow-md dark:border-green-400 dark:bg-green-900/30'
    : '';
  const genderHintId = `gender-hint-${student.id}`;

  return (
    <div
      id={`student-${student.id}`}
      className={`${baseCardClass} px-3 py-2 ${highlightClass}`}
    >
      <div className="flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        {/* Left: Index + Name */}
        <div className="flex flex-1 items-center gap-2 min-w-fit">
          <span className="min-w-6 text-sm text-gray-500 dark:text-gray-400 font-medium">
            {index + 1}.
          </span>
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
        </div>

        {/* Right: Icon-only selectors (labelled chips below lg) */}
        <div
          className="flex flex-wrap items-start gap-2 lg:items-center lg:justify-end"
          data-disable-card-toggle
        >
          {/* Identität */}
          <GenderSelector
            student={student}
            updateStudent={updateStudent}
            variant={variant}
            showDropdown={rowState.showGenderDropdown}
            setShowDropdown={rowState.setShowGenderDropdown}
            dropdownRef={rowState.genderDropdownRef}
            hintId={genderHintId}
            scrollContainerRef={scrollContainerRef}
          />
          <HeightSelector
            student={student}
            updateStudent={updateStudent}
            variant={variant}
            showDropdown={rowState.showHeightDropdown}
            setShowDropdown={rowState.setShowHeightDropdown}
            dropdownRef={rowState.heightDropdownRef}
            scrollContainerRef={scrollContainerRef}
          />
          {/* Fähigkeiten/Eigenschaften */}
          <LanguageSkillSelector
            student={student}
            updateStudent={updateStudent}
            variant={variant}
            showDropdown={rowState.showLanguageDropdown}
            setShowDropdown={rowState.setShowLanguageDropdown}
            dropdownRef={rowState.languageDropdownRef}
            scrollContainerRef={scrollContainerRef}
          />
          <SpecialNeedsToggles
            student={student}
            updateStudent={updateStudent}
            variant={variant}
          />
          {/* Soziales */}
          <SocialRoleSelector
            student={student}
            updateStudent={updateStudent}
            variant={variant}
            showDropdown={rowState.showSocialRoleDropdown}
            setShowDropdown={rowState.setShowSocialRoleDropdown}
            dropdownRef={rowState.socialRoleDropdownRef}
            scrollContainerRef={scrollContainerRef}
          />
          <PartnerSelector
            student={student}
            allStudents={allStudents}
            updateStudent={updateStudent}
            showDropdown={rowState.showPartnerDropdown}
            setShowDropdown={rowState.setShowPartnerDropdown}
            dropdownRef={rowState.dropdownRef}
            variant={variant}
            scrollContainerRef={scrollContainerRef}
          />
          <AvoidPartnerSelector
            student={student}
            allStudents={allStudents}
            updateStudent={updateStudent}
            showDropdown={rowState.showAvoidDropdown}
            setShowDropdown={rowState.setShowAvoidDropdown}
            dropdownRef={rowState.avoidDropdownRef}
            variant={variant}
            scrollContainerRef={scrollContainerRef}
          />
          {/* Raumpräferenzen */}
          <StudentPreferenceToggles
            student={student}
            updateStudent={updateStudent}
            variant={variant}
          />
          <button
            type="button"
            className={dangerIconButtonClass}
            onClick={(e) => {
              e.stopPropagation();
              removeStudent(student.id);
            }}
            title={t('studentList.removeStudentTitle', {
              name: student.name,
              defaultValue: `${student.name} entfernen`,
            })}
            aria-label={t('studentList.removeStudentTitle', {
              name: student.name,
              defaultValue: `${student.name} entfernen`,
            })}
          >
            <TrashIcon size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// Export with React.memo for performance optimization
export default React.memo(StudentRow);

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckIcon, XIcon, PencilIcon } from '@phosphor-icons/react';
import type { Student } from '@/types';
import {
  stringValidation,
  isNameTruncated,
  getDisplayName,
  showToast,
  TOAST_MESSAGES,
  inputFieldClass,
  mutedIconButtonClass,
  successIconButtonClass,
  dangerIconButtonClass,
} from '@/utils';

type Props = {
  student: Student;
  allStudents: Student[];
  updateStudent: (id: string, patch: Partial<Student>) => void;
  isEditing: boolean;
  setIsEditing: (value: boolean) => void;
  draftName: string;
  setDraftName: (value: string) => void;
  showEditButton?: boolean;
  onEditStart?: () => void; // Called when editing starts
  onEditEnd?: () => void; // Called when editing ends (save or cancel)
};

/**
 * StudentNameEditor Component
 *
 * Handles inline name editing with validation and truncation warnings.
 * Shows a badge when the name will be truncated in table view.
 *
 * @param student - Current student object
 * @param allStudents - All students for duplicate check
 * @param updateStudent - Callback to update student name
 * @param isEditing - Whether name is currently being edited
 * @param setIsEditing - Setter for editing state
 * @param draftName - Current draft name during editing
 * @param setDraftName - Setter for draft name
 * @param showEditButton - Whether to show the inline edit button (default: true)
 * @param onEditStart - Optional callback when editing starts
 * @param onEditEnd - Optional callback when editing ends
 */
export default function StudentNameEditor({
  student,
  allStudents,
  updateStudent,
  isEditing,
  setIsEditing,
  draftName,
  setDraftName,
  showEditButton = true,
  onEditStart,
  onEditEnd,
}: Props) {
  const { t } = useTranslation('students');
  // Check if name will be truncated in table view
  const nameTruncated = isNameTruncated(student.name, 'table');
  const truncatedPreview = nameTruncated
    ? getDisplayName(student.name, 'table')
    : null;

  const saveName = () => {
    const trimmedName = draftName.trim();

    if (!trimmedName) {
      showToast('error', TOAST_MESSAGES.STUDENT_NAME_EMPTY);
      return;
    }

    const nameValidation = stringValidation.validateStudentName(trimmedName);
    if (!nameValidation.isValid) {
      showToast('error', TOAST_MESSAGES.STUDENT_NAME_INVALID);
      return;
    }

    // Check if name already exists (excluding current student)
    const nameExists = allStudents.some(
      (s) =>
        s.id !== student.id &&
        s.name.toLowerCase() === trimmedName.toLowerCase(),
    );

    if (nameExists) {
      showToast('error', TOAST_MESSAGES.STUDENT_NAME_EXISTS);
      return;
    }

    updateStudent(student.id, { name: trimmedName });
    setIsEditing(false);
    setDraftName('');
    onEditEnd?.(); // Notify that editing ended
  };

  const startEditing = () => {
    setIsEditing(true);
    setDraftName(student.name);
    onEditStart?.(); // Notify that editing started
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setDraftName('');
    onEditEnd?.(); // Notify that editing ended
  };

  const truncatedNameBadge =
    nameTruncated && truncatedPreview ? (
      <span
        className="ml-2 inline-flex shrink-0 items-center rounded-full border border-amber-200 bg-amber-100/90 px-2 py-0.5 text-xs font-semibold text-amber-800 shadow-sm dark:border-amber-500 dark:bg-amber-900/40 dark:text-amber-200"
        title={t('nameEditor.truncatedTitle', { preview: truncatedPreview })}
        aria-label={t('nameEditor.truncatedLabel', {
          preview: truncatedPreview,
        })}
      >
        {truncatedPreview}
      </span>
    ) : null;

  return (
    <div className="flex items-center gap-1">
      {/* Name Field or Input */}
      {isEditing ? (
        <div className="relative">
          <input
            type="text"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                saveName();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEditing();
              }
            }}
            onBlur={saveName}
            className={`${inputFieldClass} w-full px-3 py-1.5 pr-14 lg:w-44`}
            autoFocus
          />
          <div className="absolute inset-y-0 right-1 flex items-center gap-0.5">
            <button
              type="button"
              className={`${successIconButtonClass} h-6 w-6 p-1.5!`}
              title={t('common.save', 'Speichern')}
              onPointerDown={(e) => e.preventDefault()}
              onClick={saveName}
              aria-label={t('nameEditor.saveName', 'Namen speichern')}
            >
              <CheckIcon size={12} />
            </button>
            <button
              type="button"
              className={`${dangerIconButtonClass} h-6 w-6 p-1.5!`}
              title={t('common.cancel', 'Abbrechen')}
              onPointerDown={(e) => e.preventDefault()}
              onClick={cancelEditing}
              aria-label={t('nameEditor.cancelEdit', 'Bearbeitung abbrechen')}
            >
              <XIcon size={12} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center overflow-visible">
          <span
            onClick={(e) => {
              e.stopPropagation(); // Prevent event bubbling to card container
              startEditing();
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                event.stopPropagation();
                startEditing();
              }
            }}
            className={`student-name-editable cursor-text select-text rounded-xl border px-3 py-1 text-sm font-medium text-gray-800 shadow-sm transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-400 dark:text-gray-100 dark:hover:bg-gray-800/70 ${
              nameTruncated
                ? 'border-dashed border-amber-300 bg-amber-50/30 dark:border-amber-500 dark:bg-amber-900/30'
                : 'border-blue-100 bg-white/70 dark:border-blue-900/40 dark:bg-gray-950/70'
            }`}
            tabIndex={0}
            role="button"
            aria-label={t('nameEditor.editName', { name: student.name })}
            title={
              nameTruncated
                ? t('nameEditor.truncatedEditTitle', {
                    preview: truncatedPreview,
                  })
                : t(
                    'nameEditor.editTitle',
                    'Klick oder Eingabetaste zum Bearbeiten',
                  )
            }
          >
            {student.name}
          </span>
          {truncatedNameBadge}
        </div>
      )}

      {/* Edit Button - Only show when not editing and showEditButton is true */}
      {!isEditing && showEditButton && (
        <button
          type="button"
          className={`${mutedIconButtonClass} h-8 w-8 opacity-70 hover:opacity-100`}
          title={t('nameEditor.editButton', 'Namen bearbeiten')}
          onClick={startEditing}
        >
          <PencilIcon size={12} />
        </button>
      )}
    </div>
  );
}

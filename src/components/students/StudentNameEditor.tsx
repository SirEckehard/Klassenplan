// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckIcon, XIcon, PencilIcon } from '@phosphor-icons/react';
import type { Student } from '@/types';
import {
  stringValidation,
  TOAST_MESSAGES,
  inputFieldClass,
  editableTitleClass,
  inspectorTitleTextClass,
  mutedIconButtonClass,
  successIconButtonClass,
  dangerIconButtonClass,
  MAX_STUDENT_NAME_LENGTH,
} from '@/utils';

/**
 * Marks the name field, so Alt/⌥+↑/↓ may step on from it
 * (`StudentInspectorPanel`).
 */
export const STUDENT_NAME_INPUT_ATTRIBUTE = 'data-student-name-input';

type Props = {
  student: Student;
  allStudents: Student[];
  updateStudent: (id: string, patch: Partial<Student>) => void;
  isEditing: boolean;
  setIsEditing: (value: boolean) => void;
  draftName: string;
  setDraftName: (value: string) => void;
  showEditButton?: boolean;
  /**
   * What Enter does after the name is saved. Given one, the field stays open
   * and hands over — the inspector steps to the next student, and a whole
   * class of placeholders can be named without touching the mouse.
   */
  onSubmit?: () => void;
  /** Whether the field takes the focus as it opens (default: true). */
  autoFocus?: boolean;
};

/**
 * StudentNameEditor Component
 *
 * Handles inline name editing with validation.
 *
 * @param student - Current student object
 * @param allStudents - All students for duplicate check
 * @param updateStudent - Callback to update student name
 * @param isEditing - Whether name is currently being edited
 * @param setIsEditing - Setter for editing state
 * @param draftName - Current draft name during editing
 * @param setDraftName - Setter for draft name
 * @param showEditButton - Whether to show the inline edit button (default: true)
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
  onSubmit,
  autoFocus = true,
}: Props) {
  const { t } = useTranslation('students');
  // Why the draft was refused, said under the field until it changes — a
  // card came far from the name being typed (decision 0037).
  const [problem, setProblem] = React.useState<string | null>(null);
  const problemId = React.useId();
  const hintId = React.useId();

  // Handing over to the next student swaps the `student` prop underneath an
  // open field; the draft has to follow, or it would still hold the name that
  // was just saved.
  const editedId = React.useRef(student.id);
  React.useEffect(() => {
    if (editedId.current === student.id) return;
    editedId.current = student.id;
    if (isEditing) setDraftName(student.name);
    setProblem(null);
  }, [isEditing, setDraftName, student.id, student.name]);

  /** Saves the draft; false when it was refused, which the field says. */
  const saveName = ({ advance = false } = {}): boolean => {
    const trimmedName = draftName.trim();

    if (!trimmedName) {
      setProblem(TOAST_MESSAGES.STUDENT_NAME_EMPTY);
      return false;
    }

    const nameValidation = stringValidation.validateStudentName(trimmedName);
    if (!nameValidation.isValid) {
      setProblem(TOAST_MESSAGES.STUDENT_NAME_INVALID);
      return false;
    }

    // Check if name already exists (excluding current student)
    const nameExists = allStudents.some(
      (s) =>
        s.id !== student.id &&
        s.name.toLowerCase() === trimmedName.toLowerCase(),
    );

    if (nameExists) {
      setProblem(TOAST_MESSAGES.STUDENT_NAME_EXISTS);
      return false;
    }

    setProblem(null);
    updateStudent(student.id, { name: trimmedName });

    if (advance && onSubmit) {
      // Stay open: the effect above seeds the draft from whoever arrives next.
      onSubmit();
      return true;
    }

    setIsEditing(false);
    setDraftName('');
    return true;
  };

  const startEditing = () => {
    setIsEditing(true);
    setDraftName(student.name);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setDraftName('');
    setProblem(null);
  };

  // A student still without a name is named by typing and Enter, which steps
  // on to the next one; the field says so while it is empty of a name — the
  // card that came with the placeholders said it once, over the stage.
  const showsEnterHint = Boolean(onSubmit) && !student.name.trim() && !problem;
  const describedBy = problem ? problemId : showsEnterHint ? hintId : undefined;

  // The whole width of the inspector's title, so a long name fits its field
  // and the field fits the panel; a name wider than that wraps, never cut.
  return (
    <div className="flex min-w-0 items-center gap-1">
      {/* Name Field or Input */}
      {isEditing ? (
        <div className="flex w-full min-w-0 flex-col gap-1">
          <div className="relative w-full min-w-0">
            <input
              type="text"
              value={draftName}
              // As long as the backup import lets a name be.
              maxLength={MAX_STUDENT_NAME_LENGTH}
              onChange={(e) => {
                setDraftName(e.target.value);
                setProblem(null);
              }}
              aria-invalid={problem ? true : undefined}
              aria-describedby={describedBy}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  saveName({ advance: true });
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  cancelEditing();
                } else if (
                  e.altKey &&
                  (e.key === 'ArrowUp' || e.key === 'ArrowDown') &&
                  draftName.trim() !== student.name.trim()
                ) {
                  // Alt/⌥+↑/↓ steps on to a neighbour from here too. A changed
                  // name is saved first, and a refused one keeps the step from
                  // happening, or the draft would be lost under the next
                  // student.
                  if (!saveName()) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }
              }}
              onBlur={() => saveName()}
              // The on-screen keyboard's Enter names what it does here: on to
              // the next student while there is one, done at the last.
              enterKeyHint={onSubmit ? 'next' : 'done'}
              className={`${inputFieldClass} w-full px-3 py-1 pr-14 ${inspectorTitleTextClass}`}
              autoFocus={autoFocus}
              data-student-name-input=""
            />
            <div className="absolute inset-y-0 right-1 flex items-center gap-0.5">
              <button
                type="button"
                className={`${successIconButtonClass} h-6 w-6 p-1.5!`}
                title={t('common.save')}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => saveName()}
                aria-label={t('nameEditor.saveName')}
              >
                <CheckIcon size={12} />
              </button>
              <button
                type="button"
                className={`${dangerIconButtonClass} h-6 w-6 p-1.5!`}
                title={t('common.cancel')}
                onPointerDown={(e) => e.preventDefault()}
                onClick={cancelEditing}
                aria-label={t('nameEditor.cancelEdit')}
              >
                <XIcon size={12} />
              </button>
            </div>
          </div>
          {problem && (
            <p id={problemId} className="text-xs text-(--status-alert-text)">
              {t(problem)}
            </p>
          )}
          {showsEnterHint && (
            <p id={hintId} className="text-xs text-(--text-muted)">
              {t('nameEditor.enterHint')}
            </p>
          )}
        </div>
      ) : (
        <div className="flex min-w-0 items-center">
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
            className={`student-name-editable ${editableTitleClass}`}
            tabIndex={0}
            role="button"
            aria-label={t('nameEditor.editName', { name: student.name })}
            title={t('nameEditor.editTitle')}
          >
            {student.name}
          </span>
        </div>
      )}

      {/* Edit Button - Only show when not editing and showEditButton is true */}
      {!isEditing && showEditButton && (
        <button
          type="button"
          className={`${mutedIconButtonClass} h-8 w-8 opacity-70 hover:opacity-100`}
          title={t('nameEditor.editButton')}
          onClick={startEditing}
        >
          <PencilIcon size={12} />
        </button>
      )}
    </div>
  );
}

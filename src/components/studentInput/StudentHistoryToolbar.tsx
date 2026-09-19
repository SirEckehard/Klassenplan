// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { useStudentManagementContext } from '@/contexts/seatingPlan/StudentManagementContext';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import UndoRedoButtons from '@/components/ui/buttons/UndoRedoButtons';

/**
 * Undo/redo for the class list, including the Ctrl/Cmd+Z bindings.
 *
 * Sits in the shell's status bar, where the two other histories are too: one
 * gesture for taking something back, in the same spot on every layer.
 *
 * The shortcuts stand down while a form element has focus (the default of
 * `useKeyboardShortcuts`), which matters more here than anywhere else in the
 * app: step 1 is mostly text fields, and inside one Cmd+Z has to keep meaning
 * "undo my typing".
 */
export default function StudentHistoryToolbar({
  buttonClass,
}: {
  /** Set by the row it sits in, so the pair matches its neighbours. */
  buttonClass: string;
}) {
  const { t } = useTranslation('students');
  const { undoStudents, redoStudents, canUndoStudents, canRedoStudents } =
    useStudentManagementContext();

  useKeyboardShortcuts({
    'ctrl+z': undoStudents,
    'cmd+z': undoStudents,
    'ctrl+shift+z': redoStudents,
    'cmd+shift+z': redoStudents,
    'ctrl+y': redoStudents,
    'cmd+y': redoStudents,
  });

  return (
    <UndoRedoButtons
      onUndo={undoStudents}
      canUndo={canUndoStudents}
      onRedo={redoStudents}
      canRedo={canRedoStudents}
      undoTitle={t('history.undo')}
      redoTitle={t('history.redo')}
      undoLabel={t('history.undoLabel')}
      redoLabel={t('history.redoLabel')}
      buttonClass={buttonClass}
    />
  );
}

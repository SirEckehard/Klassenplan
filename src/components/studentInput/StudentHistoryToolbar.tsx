// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { useStudentManagementContext } from '@/contexts/seatingPlan/StudentManagementContext';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import UndoRedoButtons from '@/components/ui/buttons/UndoRedoButtons';

const buttonClass =
  'inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-gray-200/80 bg-white text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-gray-600 dark:hover:bg-gray-800';

/**
 * Undo/redo for the class list, including the Ctrl/Cmd+Z bindings.
 *
 * Sits in the workbench header next to import/export rather than above the
 * list: the actions it takes back — adding, deleting, bulk-editing students —
 * are triggered from that same row.
 *
 * The shortcuts stand down while a form element has focus (the default of
 * `useKeyboardShortcuts`), which matters more here than anywhere else in the
 * app: step 1 is mostly text fields, and inside one Cmd+Z has to keep meaning
 * "undo my typing".
 */
export default function StudentHistoryToolbar() {
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

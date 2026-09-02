// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@/i18n';
import StudentHistoryToolbar from '@/components/studentInput/StudentHistoryToolbar';
import {
  StudentManagementContext,
  type StudentManagementContextValue,
} from '@/contexts/seatingPlan/StudentManagementContext';
import { getButton } from '@/__tests__/utils';

const undoStudents = vi.fn();
const redoStudents = vi.fn();

const renderToolbar = (
  overrides: Partial<StudentManagementContextValue> = {},
  children?: React.ReactNode,
) =>
  render(
    <StudentManagementContext.Provider
      value={
        {
          undoStudents,
          redoStudents,
          canUndoStudents: true,
          canRedoStudents: true,
          ...overrides,
        } as StudentManagementContextValue
      }
    >
      <StudentHistoryToolbar />
      {children}
    </StudentManagementContext.Provider>,
  );

const undoButton = () => getButton(/rückgängig machen|undo the last/i);
const redoButton = () => getButton(/wiederherstellen|redo the last/i);

describe('StudentHistoryToolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('triggers undo and redo from the buttons', async () => {
    renderToolbar();
    const user = userEvent.setup();

    await user.click(undoButton());
    await user.click(redoButton());

    expect(undoStudents).toHaveBeenCalledTimes(1);
    expect(redoStudents).toHaveBeenCalledTimes(1);
  });

  it('disables each button while its stack is empty', () => {
    renderToolbar({ canUndoStudents: false, canRedoStudents: false });

    expect(undoButton()).toBeDisabled();
    expect(redoButton()).toBeDisabled();
  });

  it('binds Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z', async () => {
    renderToolbar();
    const user = userEvent.setup();

    await user.keyboard('{Control>}z{/Control}');
    expect(undoStudents).toHaveBeenCalledTimes(1);

    await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}');
    expect(redoStudents).toHaveBeenCalledTimes(1);
  });

  it('leaves Ctrl+Z to the text field the teacher is typing in', async () => {
    renderToolbar({}, <input aria-label="Name" />);
    const user = userEvent.setup();

    await user.click(screen.getByLabelText('Name'));
    await user.keyboard('{Control>}z{/Control}');

    // Inside a field Ctrl+Z has to keep meaning "undo my typing".
    expect(undoStudents).not.toHaveBeenCalled();
  });
});

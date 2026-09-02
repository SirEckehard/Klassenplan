// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import '@/i18n';
import StudentInput from '../StudentInput';
import Modal from '@/components/ui/modals/Modal';
import {
  createMockStudent,
  createMockStudentInputProps,
} from '../../__tests__/utils';
import {
  ClassManagementContext,
  type ClassManagementContextValue,
} from '@/contexts/seatingPlan/ClassManagementContext';
import { SeatingPlanGeneratorProvider } from '@/contexts/SeatingPlanContext';
import { STUDENT_LIST_TOOLS_THRESHOLD } from '@/utils';

/**
 * The list itself is replaced by a checkbox-per-student stand-in: what is under
 * test here is the wiring in StudentInput (search → visible rows → selection →
 * bulk edit), not how a row renders. The leading select-all mirrors the real
 * list's sticky header, which owns it.
 */
vi.mock('@/components/studentInput/StudentList', () => ({
  __esModule: true,
  default: ({
    students,
    isSelected,
    onToggleSelected,
    allVisibleSelected,
    onToggleAllVisible,
  }: {
    students: Array<{ id: string; name: string }>;
    isSelected?: (id: string) => boolean;
    onToggleSelected?: (id: string) => void;
    allVisibleSelected?: boolean;
    onToggleAllVisible?: () => void;
  }) => (
    <div>
      {onToggleSelected && onToggleAllVisible && (
        <label>
          <input
            type="checkbox"
            checked={Boolean(allVisibleSelected)}
            onChange={onToggleAllVisible}
          />
          Alle auswählen
        </label>
      )}
      <ul data-testid="mock-student-list">
        {students.map((student) => (
          <li key={student.id}>
            {onToggleSelected ? (
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(isSelected?.(student.id))}
                  onChange={() => onToggleSelected(student.id)}
                />
                {student.name}
              </label>
            ) : (
              student.name
            )}
          </li>
        ))}
      </ul>
    </div>
  ),
}));

const NAMES = [
  'Anna',
  'Ben',
  'Cem',
  'Dana',
  'Emil',
  'Fatima',
  'Greta',
  'Hugo',
  'Ida',
  'Jonas',
];

const makeStudents = () =>
  NAMES.map((name, index) =>
    createMockStudent({ id: String(index + 1), name }),
  );

const classContext = (): ClassManagementContextValue =>
  ({
    classSummaries: [],
    activeClass: { id: 'class-1', name: '5a', label: null, notes: null },
    selectClass: vi.fn(),
    createClass: vi.fn(),
    updateClassMetadata: vi.fn(),
    duplicateClass: vi.fn(),
    deleteClass: vi.fn(),
  }) as unknown as ClassManagementContextValue;

const renderInput = (props = {}) =>
  render(
    <MemoryRouter>
      <SeatingPlanGeneratorProvider>
        <ClassManagementContext.Provider value={classContext()}>
          <StudentInput
            {...createMockStudentInputProps({
              students: makeStudents(),
              ...props,
            })}
          />
        </ClassManagementContext.Provider>
      </SeatingPlanGeneratorProvider>
    </MemoryRouter>,
  );

const listItems = () =>
  within(screen.getByTestId('mock-student-list')).getAllByRole('listitem');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('StudentInput list tools', () => {
  it('hides the toolbar for a class below the threshold', () => {
    renderInput({
      students: makeStudents().slice(0, STUDENT_LIST_TOOLS_THRESHOLD - 1),
    });

    expect(
      screen.queryByRole('searchbox', { name: /suchen|search/i }),
    ).not.toBeInTheDocument();
  });

  it('narrows the list to the search term', async () => {
    renderInput();
    const user = userEvent.setup();

    await user.type(
      screen.getByRole('searchbox', { name: /suchen|search/i }),
      'an',
    );

    expect(listItems().map((item) => item.textContent)).toEqual([
      'Anna',
      'Dana',
    ]);
  });

  it('shows an empty state when nothing matches', async () => {
    renderInput();
    const user = userEvent.setup();

    await user.type(
      screen.getByRole('searchbox', { name: /suchen|search/i }),
      'zzz',
    );

    expect(screen.queryByTestId('mock-student-list')).not.toBeInTheDocument();
    expect(
      screen.getByText(/Keine Schüler passen|No students match/i),
    ).toBeInTheDocument();
  });

  it('applies a bulk attribute to every selected student', async () => {
    const updateStudent = vi.fn();
    renderInput({ updateStudent });
    const user = userEvent.setup();

    const checkboxes = screen.getAllByRole('checkbox');
    // First checkbox is the list header's select-all.
    await user.click(checkboxes[1]);
    await user.click(checkboxes[2]);

    await user.click(
      screen.getByRole('button', {
        name: /Sprachniveau setzen|Set language level/i,
      }),
    );
    // The menu is a portal that only enters the a11y tree once positioned.
    await user.click(
      await screen.findByRole('menuitem', { name: /Fließend|Fluent/i }),
    );

    expect(updateStudent).toHaveBeenCalledTimes(2);
    expect(updateStudent).toHaveBeenCalledWith('1', {
      languageSkill: 'fluent',
    });
    expect(updateStudent).toHaveBeenCalledWith('2', {
      languageSkill: 'fluent',
    });
  });

  it('clears an attribute for the whole selection', async () => {
    const updateStudent = vi.fn();
    renderInput({ updateStudent });
    const user = userEvent.setup();

    await user.click(screen.getAllByRole('checkbox')[1]);
    await user.click(
      screen.getByRole('button', { name: /Geschlecht setzen|Set gender/i }),
    );
    await user.click(
      await screen.findByRole('menuitem', { name: /entfernen|clear/i }),
    );

    expect(updateStudent).toHaveBeenCalledWith('1', { gender: undefined });
  });

  it('opens an attribute menu from the keyboard and lands on its first entry', async () => {
    renderInput();
    const user = userEvent.setup();

    await user.click(screen.getAllByRole('checkbox')[1]);
    screen
      .getByRole('button', { name: /Geschlecht setzen|Set gender/i })
      .focus();
    await user.keyboard('{ArrowDown}');

    const items = await screen.findAllByRole('menuitem');
    expect(items[0]).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(items[1]).toHaveFocus();
  });

  it('leaves Escape to an open attribute menu instead of dropping the selection', async () => {
    renderInput();
    const user = userEvent.setup();

    await user.click(screen.getAllByRole('checkbox')[1]);
    const trigger = screen.getByRole('button', {
      name: /Geschlecht setzen|Set gender/i,
    });
    await user.click(trigger);
    await screen.findByRole('menu', {
      name: /Geschlecht setzen|Set gender/i,
    });

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(bulkBar()).toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('select-all only covers the students the search left visible', async () => {
    const updateStudent = vi.fn();
    renderInput({ updateStudent });
    const user = userEvent.setup();

    await user.type(
      screen.getByRole('searchbox', { name: /suchen|search/i }),
      'an',
    );
    await user.click(
      screen.getByRole('checkbox', { name: /Alle auswählen|Select all/i }),
    );

    await user.click(screen.getByRole('button', { name: /Unruhig|Restless/i }));

    expect(updateStudent).toHaveBeenCalledTimes(2);
    expect(updateStudent).toHaveBeenCalledWith('1', { restless: true });
    expect(updateStudent).toHaveBeenCalledWith('4', { restless: true });
  });

  it('clears a flag that every selected student already carries', async () => {
    const updateStudent = vi.fn();
    renderInput({
      students: makeStudents().map((student) => ({
        ...student,
        restless: true,
      })),
      updateStudent,
    });
    const user = userEvent.setup();

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);
    await user.click(checkboxes[2]);

    const chip = screen.getByRole('button', { name: /Unruhig|Restless/i });
    expect(chip).toHaveAttribute('aria-pressed', 'true');

    await user.click(chip);

    expect(updateStudent).toHaveBeenCalledTimes(2);
    expect(updateStudent).toHaveBeenCalledWith('1', { restless: false });
    expect(updateStudent).toHaveBeenCalledWith('2', { restless: false });
  });

  it('clears the opposite performance flag when setting one', async () => {
    const updateStudent = vi.fn();
    renderInput({ updateStudent });
    const user = userEvent.setup();

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);

    await user.click(
      screen.getByRole('button', { name: /Leistungsstark|High performer/i }),
    );

    expect(updateStudent).toHaveBeenCalledWith('1', {
      performanceStrong: true,
      performanceWeak: false,
    });
  });

  it('marks a flag only some of the selection carries as mixed', async () => {
    const students = makeStudents();
    students[0] = { ...students[0], restless: true };
    renderInput({ students });
    const user = userEvent.setup();

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);
    await user.click(checkboxes[2]);

    expect(
      screen.getByRole('button', { name: /Unruhig|Restless/i }),
    ).toHaveAttribute('aria-pressed', 'mixed');
  });

  const bulkBar = () =>
    screen.queryByRole('region', {
      name: /Mehrfachbearbeitung|Bulk editing/i,
    });

  it('drops the selection on Escape', async () => {
    renderInput();
    const user = userEvent.setup();

    await user.click(screen.getAllByRole('checkbox')[1]);
    expect(bulkBar()).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(bulkBar()).not.toBeInTheDocument();
  });

  it('leaves Escape to the filter popover instead of dropping the selection', async () => {
    renderInput();
    const user = userEvent.setup();

    await user.click(screen.getAllByRole('checkbox')[1]);
    // While students are selected, search/filter/sort sit behind the popover
    // the bulk row collapses them into.
    await user.click(
      screen.getByRole('button', {
        name: /Suche und Filter|Search and filter/i,
      }),
    );
    // The popover is a portal that stays `visibility: hidden` until it has
    // measured itself, so it only enters the a11y tree a frame later.
    await user.click(
      await screen.findByRole('searchbox', { name: /suchen|search/i }),
    );

    await user.keyboard('{Escape}');

    expect(
      screen.queryByRole('dialog', {
        name: /Suche und Filter|Search and filter/i,
      }),
    ).not.toBeInTheDocument();
    expect(bulkBar()).toBeInTheDocument();
  });

  it('keeps the selection when Escape closes a dialog mounted before the list', async () => {
    // Mirrors the help modal: it registers its Escape listener before
    // StudentInput does. The listener ordering this depends on is covered in
    // useKeyboardShortcuts.test.ts — jsdom dispatches every listener in one
    // stack, so the commit-in-between that breaks this in a real browser
    // cannot be reproduced here.
    function HelpHarness() {
      const [open, setOpen] = React.useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Hilfe
          </button>
          <Modal open={open} onClose={() => setOpen(false)} title="Hilfe">
            <p>Hilfetext</p>
          </Modal>
        </>
      );
    }

    render(
      <MemoryRouter>
        <SeatingPlanGeneratorProvider>
          <ClassManagementContext.Provider value={classContext()}>
            <HelpHarness />
            <StudentInput
              {...createMockStudentInputProps({ students: makeStudents() })}
            />
          </ClassManagementContext.Provider>
        </SeatingPlanGeneratorProvider>
      </MemoryRouter>,
    );
    const user = userEvent.setup();

    await user.click(screen.getAllByRole('checkbox')[1]);
    await user.click(screen.getByRole('button', { name: 'Hilfe' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(bulkBar()).toBeInTheDocument();
  });

  it('keeps the selection when Escape closes the delete dialog', async () => {
    renderInput();
    const user = userEvent.setup();

    await user.click(screen.getAllByRole('checkbox')[1]);
    await user.click(
      screen.getByRole('button', { name: /^(Entfernen|Remove)$/i }),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(bulkBar()).toBeInTheDocument();
  });

  it('asks before removing the selected students', async () => {
    const removeStudent = vi.fn();
    renderInput({ removeStudent });
    const user = userEvent.setup();

    await user.click(
      screen.getByRole('checkbox', { name: /Alle auswählen|Select all/i }),
    );
    await user.click(
      screen.getByRole('button', { name: /^(Entfernen|Remove)$/i }),
    );

    const dialog = screen.getByRole('dialog');
    expect(removeStudent).not.toHaveBeenCalled();

    await user.click(
      within(dialog).getByRole('button', { name: /Entfernen|Remove/i }),
    );

    expect(removeStudent).toHaveBeenCalledTimes(NAMES.length);
  });
});

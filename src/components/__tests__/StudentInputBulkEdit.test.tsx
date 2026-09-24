// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
import { InspectorProvider } from '@/contexts/InspectorContext';
import Inspector from '@/components/shell/Inspector';
import { STUDENT_LIST_TOOLS_THRESHOLD } from '@/utils';
import type { Student } from '@/types';

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

/** As the shell mounts the class layer: the inspector column beside it. */
const renderWithInspector = (props = {}) =>
  render(
    <MemoryRouter>
      <SeatingPlanGeneratorProvider>
        <ClassManagementContext.Provider value={classContext()}>
          <InspectorProvider>
            <StudentInput
              {...createMockStudentInputProps({
                students: makeStudents(),
                ...props,
              })}
            />
            <Inspector />
          </InspectorProvider>
        </ClassManagementContext.Provider>
      </SeatingPlanGeneratorProvider>
    </MemoryRouter>,
  );

const setWidth = (width: number): void => {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  });
  act(() => {
    window.dispatchEvent(new Event('resize'));
  });
};

// jsdom's window is 1024px wide, which is `lg`.
const LG_WIDTH = 1024;

const listItems = () =>
  within(screen.getByTestId('mock-student-list')).getAllByRole('listitem');

beforeEach(() => {
  vi.clearAllMocks();
});

// Below `lg` there is no inspector column, so the bulk controls take over the
// row above the list.
describe('StudentInput list tools', () => {
  beforeEach(() => setWidth(900));
  afterEach(() => setWidth(LG_WIDTH));

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
    const updateStudents = vi.fn();
    renderInput({ updateStudents });
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

    // One batched write, so the whole selection is a single undo step.
    expect(updateStudents).toHaveBeenCalledExactlyOnceWith(['1', '2'], {
      languageSkill: 'fluent',
    });
  });

  it('clears an attribute for the whole selection', async () => {
    const updateStudents = vi.fn();
    renderInput({ updateStudents });
    const user = userEvent.setup();

    await user.click(screen.getAllByRole('checkbox')[1]);
    await user.click(
      screen.getByRole('button', { name: /Geschlecht setzen|Set gender/i }),
    );
    await user.click(
      await screen.findByRole('menuitem', { name: /entfernen|clear/i }),
    );

    expect(updateStudents).toHaveBeenCalledWith(['1'], { gender: undefined });
  });

  it('opens an attribute menu from the keyboard and lands on its first entry', async () => {
    renderInput();
    const user = userEvent.setup();

    await user.click(screen.getAllByRole('checkbox')[1]);
    screen
      .getByRole('button', { name: /Geschlecht setzen|Set gender/i })
      .focus();
    await user.keyboard('{ArrowDown}');

    // The menu enters the tree as soon as it is positioned; moving focus into
    // it is a frame later.
    const items = await screen.findAllByRole('menuitem');
    await waitFor(() => expect(items[0]).toHaveFocus());

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
    const updateStudents = vi.fn();
    renderInput({ updateStudents });
    const user = userEvent.setup();

    await user.type(
      screen.getByRole('searchbox', { name: /suchen|search/i }),
      'an',
    );
    await user.click(
      screen.getByRole('checkbox', { name: /Alle auswählen|Select all/i }),
    );

    await user.click(screen.getByRole('button', { name: /Unruhig|Restless/i }));

    expect(updateStudents).toHaveBeenCalledExactlyOnceWith(['1', '4'], {
      restless: true,
    });
  });

  it('clears a flag that every selected student already carries', async () => {
    const updateStudents = vi.fn();
    renderInput({
      students: makeStudents().map((student) => ({
        ...student,
        restless: true,
      })),
      updateStudents,
    });
    const user = userEvent.setup();

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);
    await user.click(checkboxes[2]);

    const chip = screen.getByRole('button', { name: /Unruhig|Restless/i });
    expect(chip).toHaveAttribute('aria-pressed', 'true');

    await user.click(chip);

    expect(updateStudents).toHaveBeenCalledExactlyOnceWith(['1', '2'], {
      restless: false,
    });
  });

  it('clears the opposite performance flag when setting one', async () => {
    const updateStudents = vi.fn();
    renderInput({ updateStudents });
    const user = userEvent.setup();

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[1]);

    await user.click(
      screen.getByRole('button', { name: /Leistungsstark|High performer/i }),
    );

    expect(updateStudents).toHaveBeenCalledWith(['1'], {
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
    // The popover is a portal that is not rendered until it has
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
      screen.getByRole('button', { name: /^(Löschen|Delete)$/i }),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(bulkBar()).toBeInTheDocument();
  });

  it('asks before removing the selected students', async () => {
    const removeStudents = vi.fn();
    renderInput({ removeStudents });
    const user = userEvent.setup();

    await user.click(
      screen.getByRole('checkbox', { name: /Alle auswählen|Select all/i }),
    );
    await user.click(
      screen.getByRole('button', { name: /^(Löschen|Delete)$/i }),
    );

    const dialog = screen.getByRole('dialog');
    expect(removeStudents).not.toHaveBeenCalled();

    await user.click(
      within(dialog).getByRole('button', { name: /^(Löschen|Delete)$/i }),
    );

    // The whole selection goes in one write, undoable in one step.
    expect(removeStudents).toHaveBeenCalledExactlyOnceWith(
      NAMES.map((_, index) => String(index + 1)),
    );
  });
});

describe('StudentInput bulk editing in the inspector', () => {
  const selectionPanel = () =>
    screen.queryByRole('complementary', {
      name: /Mehrfachbearbeitung|Bulk editing/i,
    });

  const tick = async (
    user: ReturnType<typeof userEvent.setup>,
    ...rows: number[]
  ) => {
    const checkboxes = screen.getAllByRole('checkbox');
    // First checkbox is the list header's select-all.
    for (const row of rows) {
      await user.click(checkboxes[row]);
    }
  };

  it('moves the bulk controls into the inspector and keeps the row for browsing', async () => {
    renderWithInspector();
    const user = userEvent.setup();

    await tick(user, 1, 2);

    const panel = await screen.findByRole('complementary', {
      name: /Mehrfachbearbeitung|Bulk editing/i,
    });
    expect(
      within(panel).getByRole('heading', { name: /2 ausgewählt|2 selected/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('searchbox', { name: /suchen|search/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('region', {
        name: /Mehrfachbearbeitung|Bulk editing/i,
      }),
    ).not.toBeInTheDocument();
  });

  it('sets a value for every selected student', async () => {
    const updateStudents = vi.fn();
    renderWithInspector({ updateStudents });
    const user = userEvent.setup();

    await tick(user, 1, 2);
    const panel = await screen.findByRole('complementary', {
      name: /Mehrfachbearbeitung|Bulk editing/i,
    });
    await user.click(
      within(panel).getByRole('button', { name: /^(Fließend|Fluent)$/i }),
    );

    expect(updateStudents).toHaveBeenCalledExactlyOnceWith(['1', '2'], {
      languageSkill: 'fluent',
    });
  });

  it('clears a value everybody in the selection shares', async () => {
    const updateStudents = vi.fn();
    renderWithInspector({
      students: makeStudents().map((student): Student => ({
        ...student,
        gender: 'girl',
      })),
      updateStudents,
    });
    const user = userEvent.setup();

    await tick(user, 1, 2);
    const panel = await screen.findByRole('complementary', {
      name: /Mehrfachbearbeitung|Bulk editing/i,
    });
    const chip = within(panel).getByRole('button', {
      name: /^(Weiblich|Female)$/i,
    });
    expect(chip).toHaveAttribute('aria-pressed', 'true');

    await user.click(chip);

    expect(updateStudents).toHaveBeenCalledExactlyOnceWith(['1', '2'], {
      gender: undefined,
    });
  });

  it('says a flag is mixed and sets it for everyone on a press', async () => {
    const updateStudents = vi.fn();
    const students = makeStudents();
    students[0] = { ...students[0], restless: true };
    renderWithInspector({ students, updateStudents });
    const user = userEvent.setup();

    await tick(user, 1, 2);
    const panel = await screen.findByRole('complementary', {
      name: /Mehrfachbearbeitung|Bulk editing/i,
    });
    const flag = within(panel).getByRole('switch', {
      name: /(unruhig|restless) \((gemischt|mixed)\)/i,
    });
    expect(flag).toHaveAttribute('aria-checked', 'false');

    await user.click(flag);

    expect(updateStudents).toHaveBeenCalledExactlyOnceWith(['1', '2'], {
      restless: true,
    });
  });

  it('asks before removing the selection from the inspector', async () => {
    const removeStudents = vi.fn();
    renderWithInspector({ removeStudents });
    const user = userEvent.setup();

    await tick(user, 1, 2);
    const panel = await screen.findByRole('complementary', {
      name: /Mehrfachbearbeitung|Bulk editing/i,
    });
    await user.click(
      within(panel).getByRole('button', { name: /^(Löschen|Delete)$/i }),
    );
    const dialog = screen.getByRole('dialog');
    await user.click(
      within(dialog).getByRole('button', { name: /^(Löschen|Delete)$/i }),
    );

    expect(removeStudents).toHaveBeenCalledExactlyOnceWith(['1', '2']);
  });

  it('hands the inspector back when the selection is dropped', async () => {
    renderWithInspector();
    const user = userEvent.setup();

    await tick(user, 1, 2);
    await screen.findByRole('complementary', {
      name: /Mehrfachbearbeitung|Bulk editing/i,
    });

    await user.keyboard('{Escape}');

    await waitFor(() => expect(selectionPanel()).not.toBeInTheDocument());
    expect(
      screen.getByRole('complementary', { name: /Merkmale|Attributes/i }),
    ).toBeInTheDocument();
  });
});

// A selection of one needs nothing the bulk panel offers, and would lose the
// name, the photo and the partners to it.
describe('StudentInput with a single ticked student', () => {
  const studentPanel = () =>
    screen.findByRole('complementary', { name: /Merkmale|Attributes/i });

  const tickFirst = async (user: ReturnType<typeof userEvent.setup>) => {
    // First checkbox is the list header's select-all.
    await user.click(screen.getAllByRole('checkbox')[1]);
  };

  it('shows the student in the panel an opened one gets', async () => {
    renderWithInspector();
    const user = userEvent.setup();

    await tickFirst(user);

    const panel = await studentPanel();
    expect(within(panel).getByText('Anna')).toBeInTheDocument();
    expect(
      within(panel).getByText(/Schüler 1 von 10|Student 1 of 10/i),
    ).toBeInTheDocument();
    expect(
      within(panel).queryByRole('heading', { name: /ausgewählt|selected/i }),
    ).not.toBeInTheDocument();
  });

  it('carries the tick along when stepping to the next student', async () => {
    renderWithInspector();
    const user = userEvent.setup();

    await tickFirst(user);
    const panel = await studentPanel();
    const next = within(panel).getByRole('button', {
      name: /Nächster Schüler|Next student/i,
    });
    await user.click(next);

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[1]).not.toBeChecked();
    expect(checkboxes[2]).toBeChecked();
    expect(
      within(panel).getByText(/Schüler 2 von 10|Student 2 of 10/i),
    ).toBeInTheDocument();
    // The panel stayed where it was, so the keyboard did too.
    expect(next).toHaveFocus();
  });

  it('lets the selection go when the panel is closed', async () => {
    renderWithInspector();
    const user = userEvent.setup();

    await tickFirst(user);
    const panel = await studentPanel();
    await user.click(
      within(panel).getByRole('button', {
        name: /Merkmale schließen|Close attributes/i,
      }),
    );

    expect(screen.getAllByRole('checkbox')[1]).not.toBeChecked();
    expect(
      await screen.findByText(/Kein Schüler ausgewählt|No student selected/i),
    ).toBeInTheDocument();
  });

  it('asks by name before removing the student', async () => {
    const removeStudents = vi.fn();
    renderWithInspector({ removeStudents });
    const user = userEvent.setup();

    await tickFirst(user);
    const panel = await studentPanel();
    await user.click(
      within(panel).getByRole('button', { name: /^(Löschen|Delete)$/i }),
    );
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent(/Anna/);
    expect(removeStudents).not.toHaveBeenCalled();

    await user.click(
      within(dialog).getByRole('button', { name: /^(Löschen|Delete)$/i }),
    );

    await waitFor(() =>
      expect(removeStudents).toHaveBeenCalledExactlyOnceWith(['1']),
    );
  });
});

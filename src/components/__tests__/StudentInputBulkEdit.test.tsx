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
import { InspectorProvider, useInspector } from '@/contexts/InspectorContext';
import Inspector from '@/components/shell/Inspector';
import AppStatusBar from '@/components/shell/AppStatusBar';
import { StatusBarSlotProvider } from '@/contexts/StatusBarSlotContext';
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
    // Marked as the real list's card is: a tap in it is not a tap beside
    // the inspector's drawer.
    <div data-student-list>
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

describe('StudentInput list tools', () => {
  beforeEach(() => setWidth(600));
  afterEach(() => setWidth(LG_WIDTH));

  it('hides the toolbar for a class below the threshold', async () => {
    renderInput({
      students: makeStudents().slice(0, STUDENT_LIST_TOOLS_THRESHOLD - 1),
    });
    // The provider loads the stored classes once it is mounted.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
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

  const viewMenuButton = () =>
    screen.queryByRole('button', {
      name: /^(Anzeigen und sortieren|Show and sort):/i,
    });

  it('puts the filter and the sort behind one button on a phone', async () => {
    const students = makeStudents();
    students[2] = { ...students[2], restless: true };
    renderInput({ students });
    const user = userEvent.setup();

    expect(
      screen.queryByRole('button', { name: /^(Nach Merkmal|Filter by)/i }),
    ).not.toBeInTheDocument();
    await user.click(viewMenuButton() as HTMLElement);
    const menu = await screen.findByRole('dialog', {
      name: /Anzeigen und sortieren|Show and sort/i,
    });
    expect(
      within(menu).getByRole('button', {
        name: /^(Alle Schüler|All students)$/i,
      }),
    ).toHaveAttribute('aria-pressed', 'true');

    await user.click(
      within(menu).getByRole('button', {
        name: /^(Nur unruhige|Restless only)$/i,
      }),
    );

    expect(listItems().map((item) => item.textContent)).toEqual(['Cem']);
    expect(
      screen.queryByRole('dialog', {
        name: /Anzeigen und sortieren|Show and sort/i,
      }),
    ).not.toBeInTheDocument();
    expect(viewMenuButton()).toHaveAccessibleName(
      /(Nur unruhige|Restless only)/i,
    );
  });

  it('lets a search that finds nobody go from the empty list on a phone', async () => {
    renderInput();
    const user = userEvent.setup();

    await user.type(
      screen.getByRole('searchbox', { name: /suchen|search/i }),
      'zzz',
    );
    await user.click(
      screen.getByRole('button', {
        name: /^(Suche und Filter zurücksetzen|Reset search and filter)$/i,
      }),
    );

    expect(listItems()).toHaveLength(NAMES.length);
  });

  it('keeps the two fields beside the search on a tablet', () => {
    setWidth(900);
    renderInput();

    expect(viewMenuButton()).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^(Nach Merkmal|Filter by)/i }),
    ).toBeInTheDocument();
  });

  const ticked = (row: number) =>
    (screen.getAllByRole('checkbox')[row] as HTMLInputElement).checked;

  it('drops the selection on Escape', async () => {
    renderInput();
    const user = userEvent.setup();

    await user.click(screen.getAllByRole('checkbox')[1]);
    expect(ticked(1)).toBe(true);

    await user.keyboard('{Escape}');

    expect(ticked(1)).toBe(false);
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
    expect(ticked(1)).toBe(true);
  });
});

// A phone edits the ticked students in the sheet an opened student gets,
// opened from the status bar's switch alone, which says how many are ticked.
describe('StudentInput bulk editing on a phone', () => {
  beforeEach(() => setWidth(600));
  afterEach(() => setWidth(LG_WIDTH));

  /** As the shell mounts the class layer on a phone: sheet and status bar. */
  const renderOnPhone = (props = {}) =>
    render(
      <MemoryRouter>
        <SeatingPlanGeneratorProvider>
          <ClassManagementContext.Provider value={classContext()}>
            <InspectorProvider>
              <StatusBarSlotProvider>
                <StudentInput
                  {...createMockStudentInputProps({
                    students: makeStudents(),
                    ...props,
                  })}
                />
                <Inspector />
                <AppStatusBar />
              </StatusBarSlotProvider>
            </InspectorProvider>
          </ClassManagementContext.Provider>
        </SeatingPlanGeneratorProvider>
      </MemoryRouter>,
    );

  const selectionSwitch = () =>
    screen.getByRole('button', {
      name: /Mehrfachbearbeitung|Bulk editing/i,
    });
  const sheet = () =>
    screen.queryByRole('dialog', { name: /Mehrfachbearbeitung|Bulk editing/i });
  const ticked = (row: number) =>
    (screen.getAllByRole('checkbox')[row] as HTMLInputElement).checked;

  it('opens nothing on a tick, keeps the row for browsing and counts the ticks on the switch', async () => {
    renderOnPhone();
    const user = userEvent.setup();

    await user.click(screen.getAllByRole('checkbox')[1]);
    await user.click(screen.getAllByRole('checkbox')[2]);

    expect(sheet()).not.toBeInTheDocument();
    expect(
      screen.getByRole('searchbox', { name: /suchen|search/i }),
    ).toBeInTheDocument();
    expect(selectionSwitch()).toHaveTextContent('2');
    expect(selectionSwitch()).toHaveAttribute('aria-expanded', 'false');
  });

  it('sets a value for everyone in the sheet the switch opens', async () => {
    const updateStudents = vi.fn();
    renderOnPhone({ updateStudents });
    const user = userEvent.setup();

    await user.click(screen.getAllByRole('checkbox')[1]);
    await user.click(screen.getAllByRole('checkbox')[2]);
    await user.click(selectionSwitch());

    const dialog = await waitFor(() => {
      const found = sheet();
      expect(found).toBeInTheDocument();
      return found as HTMLElement;
    });
    expect(
      within(dialog).getByRole('heading', { name: /2 ausgewählt|2 selected/i }),
    ).toBeInTheDocument();

    await user.click(
      within(dialog).getByRole('switch', { name: /^(Unruhig|Restless)$/i }),
    );

    expect(updateStudents).toHaveBeenCalledExactlyOnceWith(['1', '2'], {
      restless: true,
    });
  });

  it('closes the sheet on Escape and keeps the ticks, the next Escape lets them go', async () => {
    renderOnPhone();
    const user = userEvent.setup();

    await user.click(screen.getAllByRole('checkbox')[1]);
    await user.click(screen.getAllByRole('checkbox')[2]);
    await user.click(selectionSwitch());
    await waitFor(() => expect(sheet()).toBeInTheDocument());

    await user.keyboard('{Escape}');

    await waitFor(() => expect(sheet()).not.toBeInTheDocument());
    expect(ticked(1)).toBe(true);
    expect(ticked(2)).toBe(true);

    await user.keyboard('{Escape}');

    expect(ticked(1)).toBe(false);
  });

  it('lets the ticks go from the status bar, where the count stands otherwise', async () => {
    renderOnPhone();
    const user = userEvent.setup();

    await user.click(screen.getAllByRole('checkbox')[1]);
    await user.click(
      screen.getByRole('button', {
        name: /Auswahl aufheben|Clear selection/i,
      }),
    );

    expect(ticked(1)).toBe(false);
    expect(
      screen.queryByRole('button', {
        name: /Auswahl aufheben|Clear selection/i,
      }),
    ).not.toBeInTheDocument();
    // The switch opens the class again.
    expect(
      screen.getByRole('button', { name: /^(Klasse einblenden|Show class)$/i }),
    ).not.toHaveTextContent(/\d/);
  });

  it('shows a single ticked student in the sheet an opened one gets', async () => {
    renderOnPhone();
    const user = userEvent.setup();

    await user.click(screen.getAllByRole('checkbox')[2]);
    await user.click(
      screen.getByRole('button', {
        name: /^(Merkmale einblenden|Show attributes)$/i,
      }),
    );

    const dialog = await screen.findByRole('dialog', {
      name: /Merkmale|Attributes/i,
    });
    expect(within(dialog).getByText('Ben')).toBeInTheDocument();
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

  it('opens the bulk controls as the drawer on a tablet, and closes it with the selection', async () => {
    setWidth(900);
    try {
      renderWithInspector();
      const user = userEvent.setup();

      await tick(user, 1, 2);

      const panel = await screen.findByRole('complementary', {
        name: /Mehrfachbearbeitung|Bulk editing/i,
      });
      // The drawer, not the column that is out of sight below `lg`.
      expect(panel).toHaveAttribute('tabindex', '-1');
      expect(
        within(panel).getByRole('heading', {
          name: /2 ausgewählt|2 selected/i,
        }),
      ).toBeInTheDocument();
      // Ticking another student leaves the drawer open, and the focus on the
      // list's checkbox.
      await tick(user, 3);
      expect(selectionPanel()).toHaveAttribute('tabindex', '-1');
      expect(screen.getAllByRole('checkbox')[3]).toHaveFocus();

      await user.keyboard('{Escape}');
      await user.keyboard('{Escape}');
      expect(selectionPanel()).not.toBeInTheDocument();
    } finally {
      setWidth(LG_WIDTH);
    }
  });

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
      within(panel).getByRole('button', {
        name: /^(Sprachniveau|Language level):/i,
      }),
    );
    // The menu is portalled to the end of the page, outside the panel.
    await user.click(
      await screen.findByRole('button', { name: /^(Fließend|Fluent)$/i }),
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

  it('marks the values a mixed selection holds and sets one for everyone', async () => {
    const updateStudents = vi.fn();
    const students = makeStudents();
    students[0] = { ...students[0], gender: 'girl' };
    students[1] = { ...students[1], gender: 'boy' };
    renderWithInspector({ students, updateStudents });
    const user = userEvent.setup();

    await tick(user, 1, 2);
    const panel = await screen.findByRole('complementary', {
      name: /Mehrfachbearbeitung|Bulk editing/i,
    });
    const girl = within(panel).getByRole('button', {
      name: /^(Weiblich|Female)$/i,
    });
    const boy = within(panel).getByRole('button', {
      name: /^(Männlich|Male)$/i,
    });
    const diverse = within(panel).getByRole('button', {
      name: /^(Divers|Diverse|Non-binary)$/i,
    });
    // Not "nothing set": the two values somebody has are half pressed, the
    // one nobody has is not.
    expect(girl).toHaveAttribute('aria-pressed', 'mixed');
    expect(boy).toHaveAttribute('aria-pressed', 'mixed');
    expect(diverse).toHaveAttribute('aria-pressed', 'false');

    await user.click(girl);

    expect(updateStudents).toHaveBeenCalledExactlyOnceWith(['1', '2'], {
      gender: 'girl',
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

  it('select-all only covers the students the search left visible', async () => {
    const updateStudents = vi.fn();
    renderWithInspector({ updateStudents });
    const user = userEvent.setup();

    await user.type(
      screen.getByRole('searchbox', { name: /suchen|search/i }),
      'an',
    );
    await user.click(
      screen.getByRole('checkbox', { name: /Alle auswählen|Select all/i }),
    );
    const panel = await screen.findByRole('complementary', {
      name: /Mehrfachbearbeitung|Bulk editing/i,
    });
    await user.click(
      within(panel).getByRole('switch', { name: /^(Unruhig|Restless)$/i }),
    );

    expect(updateStudents).toHaveBeenCalledExactlyOnceWith(['1', '4'], {
      restless: true,
    });
  });

  it('keeps the selection when Escape closes the delete dialog', async () => {
    renderWithInspector();
    const user = userEvent.setup();

    await tick(user, 1, 2);
    const panel = await screen.findByRole('complementary', {
      name: /Mehrfachbearbeitung|Bulk editing/i,
    });
    await user.click(
      within(panel).getByRole('button', { name: /^(Löschen|Delete)$/i }),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(selectionPanel()).toBeInTheDocument();
  });

  // With no student open, the inspector shows the class itself.
  it('hands the inspector back to the class when the selection is dropped', async () => {
    renderWithInspector();
    const user = userEvent.setup();

    await tick(user, 1, 2);
    await screen.findByRole('complementary', {
      name: /Mehrfachbearbeitung|Bulk editing/i,
    });

    await user.keyboard('{Escape}');

    await waitFor(() => expect(selectionPanel()).not.toBeInTheDocument());
    expect(
      screen.getByRole('complementary', { name: /^(Klasse|Class)$/i }),
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
      await screen.findByRole('complementary', { name: /^(Klasse|Class)$/i }),
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

describe('StudentInput search opening a student', () => {
  /**
   * The shell's inspector reads the students from the seating-plan store,
   * which these props do not fill, so the probe reports what it was asked
   * to open instead.
   */
  const SelectionProbe = () => {
    const { selection } = useInspector();
    return (
      <output data-testid="inspector-selection">
        {selection?.kind === 'student'
          ? `${selection.id}${selection.keepFocus ? ' keepFocus' : ''}`
          : ''}
      </output>
    );
  };
  const renderWithProbe = () =>
    render(
      <MemoryRouter>
        <SeatingPlanGeneratorProvider>
          <ClassManagementContext.Provider value={classContext()}>
            <InspectorProvider>
              <StudentInput
                {...createMockStudentInputProps({ students: makeStudents() })}
              />
              <SelectionProbe />
            </InspectorProvider>
          </ClassManagementContext.Provider>
        </SeatingPlanGeneratorProvider>
      </MemoryRouter>,
    );
  const opened = () => screen.getByTestId('inspector-selection').textContent;
  const searchBox = () =>
    screen.getByRole('searchbox', { name: /suchen|search/i });

  it('opens the student a search clearly means and keeps typing', async () => {
    renderWithProbe();
    const user = userEvent.setup();

    // "an" is in Anna and Dana, but starts only Anna.
    await user.type(searchBox(), 'an');

    expect(opened()).toBe('1 keepFocus');
    expect(searchBox()).toHaveFocus();
  });

  it('opens nothing while the search could mean several', async () => {
    renderWithProbe();
    const user = userEvent.setup();

    await user.type(searchBox(), 'e');

    expect(opened()).toBe('');
  });

  it('opens the first student found on Enter', async () => {
    renderWithProbe();
    const user = userEvent.setup();

    // Ben, Emil, Greta and Jonas carry an "e"; Ben comes first.
    await user.type(searchBox(), 'e{Enter}');

    expect(opened()).toBe('2');
  });

  it('opens nothing while students are ticked', async () => {
    renderWithProbe();
    const user = userEvent.setup();

    await user.click(screen.getAllByRole('checkbox')[1]);
    await user.type(searchBox(), 'gre{Enter}');

    expect(opened()).toBe('');
  });

  it('leaves a phone to Enter, whose sheet takes the focus', async () => {
    setWidth(600);
    try {
      renderWithProbe();
      const user = userEvent.setup();

      await user.type(searchBox(), 'gre');
      expect(opened()).toBe('');

      await user.type(searchBox(), '{Enter}');
      expect(opened()).toBe('7');
    } finally {
      setWidth(LG_WIDTH);
    }
  });
});

// While no student is open, the class layer's inspector is the class itself,
// as the room's is the room while nothing is selected.
describe('StudentInput showing the class in the inspector', () => {
  /**
   * Stands in for the shell's inspector: its slot, and the two ways a student
   * is opened and put away.
   */
  const Shell = () => {
    const { setSlotNode, selectStudent, clear } = useInspector();
    return (
      <>
        <div ref={setSlotNode} data-testid="inspector-slot" />
        <button type="button" onClick={() => selectStudent('1')}>
          open Anna
        </button>
        <button type="button" onClick={clear}>
          put away
        </button>
      </>
    );
  };
  const slot = () => screen.getByTestId('inspector-slot');

  it('hands the slot to an opened student and takes it back after', async () => {
    render(
      <MemoryRouter>
        <SeatingPlanGeneratorProvider>
          <ClassManagementContext.Provider value={classContext()}>
            <InspectorProvider>
              <StudentInput
                {...createMockStudentInputProps({ students: makeStudents() })}
              />
              <Shell />
            </InspectorProvider>
          </ClassManagementContext.Provider>
        </SeatingPlanGeneratorProvider>
      </MemoryRouter>,
    );
    const user = userEvent.setup();
    const className = () =>
      within(slot()).queryByRole('heading', { name: '5a' });

    expect(className()).toBeInTheDocument();
    // The class's name is its header's, renamed there.
    expect(
      within(className() as HTMLElement).getByRole('button', { name: '5a' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'open Anna' }));
    expect(className()).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'put away' }));
    expect(className()).toBeInTheDocument();
  });
});

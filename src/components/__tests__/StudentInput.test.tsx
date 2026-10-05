// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import React from 'react';
import {
  render,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import '@/i18n'; // Initialize i18n for tests
import StudentInput from '../StudentInput';
import {
  createMockStudent,
  createMockStudentInputProps,
  createMockCsvFile,
  getButton,
  getHeading,
} from '../../__tests__/utils';
import {
  ClassManagementContext,
  type ClassManagementContextValue,
} from '@/contexts/seatingPlan/ClassManagementContext';
import { SeatingPlanGeneratorProvider } from '@/contexts/SeatingPlanContext';
import { InspectorProvider, useInspector } from '@/contexts/InspectorContext';
import { subscribeToToasts } from '@/utils/ui/toast';
import { MAX_STUDENTS } from '@/utils';

vi.mock('@/components/studentInput/StudentList', () => ({
  __esModule: true,
  default: ({
    students,
  }: {
    students: Array<{ id: string; name: string }>;
  }) => (
    <div data-testid="mock-student-list">
      {students.map((student) => (
        <span key={student.id}>{student.name}</span>
      ))}
    </div>
  ),
}));

describe('StudentInput', () => {
  /**
   * Each way of filling a class is its own toolbar entry, and the ones that
   * need a value open a panel — so a test that wants one opens it first.
   */
  const openImportPanel = async () => {
    fireEvent.click(getButton(/Klassenliste importieren|Import class list/i));
    return await screen.findByRole('dialog', {
      name: /Klassenliste importieren|Import class list/i,
    });
  };

  const createMockClassContext = (
    overrides: Partial<ClassManagementContextValue> = {},
  ): ClassManagementContextValue => ({
    classSummaries: [
      {
        id: 'class-1',
        name: 'Testklasse',
        label: '2025/26',
        notes: 'Testnotiz',
        createdAt: '',
        updatedAt: '',
        lastUsedAt: '',
        studentCount: 0,
      },
    ],
    activeClass: {
      id: 'class-1',
      name: 'Testklasse',
      label: '2025/26',
      notes: 'Testnotiz',
    },
    selectClass: vi.fn().mockResolvedValue(true),
    createClass: vi.fn().mockResolvedValue(true),
    updateClassMetadata: vi.fn().mockResolvedValue(true),
    duplicateClass: vi.fn().mockResolvedValue(true),
    deleteClass: vi.fn().mockResolvedValue(true),
    ...overrides,
  });

  const renderWithClassContext = (
    ui: React.ReactElement,
    value?: Partial<ClassManagementContextValue>,
  ) => {
    const contextValue = createMockClassContext(value ?? {});
    // Wrap with MemoryRouter + SeatingPlanGeneratorProvider (for storage/algorithm contexts)
    // then ClassManagementContext (to override specific class management values)
    return render(
      <MemoryRouter>
        <SeatingPlanGeneratorProvider>
          <ClassManagementContext.Provider value={contextValue}>
            {ui}
          </ClassManagementContext.Provider>
        </SeatingPlanGeneratorProvider>
      </MemoryRouter>,
    );
  };

  beforeEach(() => {
    // Suppress console.error for act() warnings in these tests as they are expected due to internal component state updates
    const originalError = console.error;
    vi.stubGlobal('console', {
      ...console,
      error: (...args: Parameters<typeof originalError>) => {
        const [message, ...rest] = args;
        if (
          typeof message === 'string' &&
          message.includes('not wrapped in act')
        ) {
          return;
        }
        originalError(message, ...rest);
      },
    });
  });

  it('offers every way of filling a class in the toolbar', async () => {
    const students = [
      createMockStudent({ id: '1', name: 'Max', gender: 'boy' }),
    ];

    const props = createMockStudentInputProps({ students });

    expect(students[0].restless).toBe(false);
    renderWithClassContext(<StudentInput {...props} />);

    // Filling the class is managing it, next to the class list's export.
    expect(getButton(/Schüler hinzufügen|Add student/i)).toBeInTheDocument();
    expect(
      getButton(/Platzhalter erstellen|Create placeholders/i),
    ).toBeInTheDocument();
    expect(
      getButton(/Klassenliste exportieren|Export class list/i),
    ).toBeInTheDocument();
    const importPanel = await openImportPanel();
    expect(
      within(importPanel).getByText(
        /Klassenliste importieren|Import class list/i,
      ),
    ).toBeInTheDocument();

    // The way on to the classroom lives in the shell's status bar; the side
    // trips live in the foot every toolbar shares.
    fireEvent.click(getButton(/Klassenwerkzeuge|Class tools/i));
    expect(getButton(/Namensspiel|Name game/i)).toBeInTheDocument();
  });

  /** Who the inspector has open, for a test to read. */
  const InspectorProbe = () => {
    const { selection } = useInspector();
    return <output data-testid="inspector-selection">{selection?.id}</output>;
  };

  /** The toasts raised while `run` goes, in order. */
  const collectToasts = async (run: () => void | Promise<void>) => {
    const toasts: Array<{ type: string; message: string }> = [];
    const unsubscribe = subscribeToToasts((event) => {
      if (event.action === 'add') {
        toasts.push({ type: event.toast.type, message: event.toast.message });
      }
    });
    try {
      await run();
    } finally {
      unsubscribe();
    }
    return toasts;
  };

  const openPlaceholderPanel = async () => {
    fireEvent.click(getButton(/Platzhalter erstellen|Create placeholders/i));
    const panel = await screen.findByRole('dialog', {
      name: /Platzhalter erstellen|Create placeholders/i,
    });
    return { panel, field: within(panel).getByRole('spinbutton') };
  };

  // Naming a class is typing and Enter: the first new placeholder opens in
  // the inspector with its name field, and one message says how many there
  // are.
  it('creates placeholders and opens the first of them to be named', async () => {
    const props = createMockStudentInputProps({ students: [] });
    renderWithClassContext(
      <InspectorProvider>
        <StudentInput {...props} />
        <InspectorProbe />
      </InspectorProvider>,
    );

    const { panel, field } = await openPlaceholderPanel();
    fireEvent.change(field, { target: { value: '3' } });
    const toasts = await collectToasts(() => {
      fireEvent.keyDown(field, { key: 'Enter' });
    });

    expect(props.addBulkPlaceholderStudents).toHaveBeenCalledWith(3);
    const [first] = vi.mocked(props.addBulkPlaceholderStudents).mock.results[0]
      .value as Array<{ id: string }>;
    expect(screen.getByTestId('inspector-selection')).toHaveTextContent(
      first.id,
    );
    expect(toasts).toEqual([
      {
        type: 'success',
        message: expect.stringMatching(/^3 (Platzhalter|placeholders)/),
      },
    ]);
    await waitFor(() => expect(panel).not.toBeInTheDocument());
  });

  it('creates only what fits and says so in one message', async () => {
    const students = Array.from({ length: MAX_STUDENTS - 2 }, (_, index) =>
      createMockStudent({ id: `s${index}`, name: `Kind ${index}` }),
    );
    const props = createMockStudentInputProps({ students });
    renderWithClassContext(<StudentInput {...props} />);

    const { field } = await openPlaceholderPanel();
    // The field offers no more than there is room for.
    expect(field).toHaveAttribute('max', '2');
    fireEvent.change(field, { target: { value: '10' } });
    const toasts = await collectToasts(() => {
      fireEvent.keyDown(field, { key: 'Enter' });
    });

    expect(props.addBulkPlaceholderStudents).toHaveBeenCalledWith(2);
    expect(toasts).toEqual([
      {
        type: 'warning',
        message: expect.stringMatching(
          /^(Nur 2 Platzhalter|Only 2 placeholders)/,
        ),
      },
    ]);
  });

  it('offers no placeholders to a full class', () => {
    const students = Array.from({ length: MAX_STUDENTS }, (_, index) =>
      createMockStudent({ id: `s${index}`, name: `Kind ${index}` }),
    );
    renderWithClassContext(
      <StudentInput {...createMockStudentInputProps({ students })} />,
    );

    expect(
      getButton(/Platzhalter erstellen|Create placeholders/i),
    ).toBeDisabled();
  });

  it('zeigt einen klassenbezogenen Leerzustand an', () => {
    const props = createMockStudentInputProps({ students: [] });
    renderWithClassContext(<StudentInput {...props} />);

    const emptyHeading = getHeading(/ist noch leer|is still empty/i, 3);
    expect(emptyHeading).toHaveTextContent(/Testklasse/i);
    expect(
      screen.getByText(
        /Alle Eingaben gelten nur für diese Klasse|All entries apply only to this class/i,
      ),
    ).toBeInTheDocument();
  });

  // The first screen wears the same toolbar as every other: what needs a
  // class is greyed out, and the card sits in the middle of the stage.
  it('keeps the toolbar without a class and greys out what needs one', () => {
    const props = createMockStudentInputProps({ students: [] });
    renderWithClassContext(<StudentInput {...props} />, {
      activeClass: { id: '', name: '', label: '', notes: '' },
    });

    expect(
      screen.getByRole('complementary', { name: /Werkzeugleiste|Toolbar/i }),
    ).toBeInTheDocument();
    for (const name of [
      /^(Klassenliste|Class list)$/i,
      /Schüler hinzufügen|Add student/i,
      /Platzhalter erstellen|Create placeholders/i,
      /Klassenliste importieren|Import class list/i,
      /Klassenliste exportieren|Export class list/i,
    ]) {
      expect(getButton(name)).toBeDisabled();
    }
    // The foot needs no class.
    expect(getButton(/^Backup$/i)).toBeEnabled();

    const card = getButton(/Neue Klasse|New class/i).closest(
      '[data-tour="class-empty-state"]',
    );
    expect(card?.parentElement).toHaveClass('items-center', 'justify-center');
  });

  it('nutzt importCsv für CSV-Uploads', async () => {
    const importCsvMock = vi
      .fn()
      .mockResolvedValue([
        createMockStudent({ id: 'import-1', name: 'Import Max' }),
      ]);
    const props = createMockStudentInputProps({
      students: [],
      importCsv: importCsvMock,
    });

    renderWithClassContext(<StudentInput {...props} />);

    const importPanel = await openImportPanel();
    const input = importPanel.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement | null;
    expect(input).toBeTruthy();

    const file = createMockCsvFile('name\nMax\n');
    await fireEvent.change(input as HTMLInputElement, {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(importCsvMock).toHaveBeenCalledWith(file, undefined);
    });
  });

  it('fragt bei mehrdeutigen Namensspalten nach der Spaltenwahl', async () => {
    const importCsvMock = vi.fn().mockResolvedValue([]);
    const props = createMockStudentInputProps({
      students: [],
      importCsv: importCsvMock,
    });

    renderWithClassContext(<StudentInput {...props} />);

    const importPanel = await openImportPanel();
    const input = importPanel.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;

    // Both a first-name and a last-name column: the import must not silently
    // pick one.
    const file = createMockCsvFile('Vorname,Nachname\nMax,Muster\n');
    await fireEvent.change(input, { target: { files: [file] } });

    const dialog = await screen.findByRole('dialog', {
      name: /Namens-Spalten auswählen|Select name columns/i,
    });
    expect(importCsvMock).not.toHaveBeenCalled();

    await fireEvent.click(
      within(dialog).getByRole('radio', {
        name: /Vorname \+ Nachname|First name \+ last name/i,
      }),
    );
    await fireEvent.click(
      within(dialog).getByRole('button', {
        name: /^(Importieren|Import)$/i,
      }),
    );

    await waitFor(() => {
      expect(importCsvMock).toHaveBeenCalledWith(
        file,
        expect.objectContaining({ mode: 'fullName' }),
      );
    });
  });
});

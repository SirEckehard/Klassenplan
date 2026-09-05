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
  getDialog,
  getField,
  getHeading,
} from '../../__tests__/utils';
import type { Student } from '@/types';
import {
  ClassManagementContext,
  type ClassManagementContextValue,
} from '@/contexts/seatingPlan/ClassManagementContext';
import { SeatingPlanGeneratorProvider } from '@/contexts/SeatingPlanContext';

vi.mock('@/components/studentInput/StudentList', () => ({
  __esModule: true,
  default: ({
    students,
    requestStudentRemoval,
  }: {
    students: Array<{ id: string; name: string }>;
    requestStudentRemoval: (id: string) => void;
  }) => (
    <div data-testid="mock-student-list">
      {students.map((student) => (
        <button
          key={student.id}
          type="button"
          onClick={() => requestStudentRemoval(student.id)}
          aria-label={`${student.name} entfernen`}
        >
          {student.name} entfernen
        </button>
      ))}
    </div>
  ),
}));

describe('StudentInput', () => {
  /**
   * Single names, placeholder rows and CSV import all live behind the add
   * trigger, so a test that wants any of them has to open it first.
   */
  const openAddMenu = async () => {
    fireEvent.click(
      screen.getByRole('button', { name: /^(Hinzufügen|Add)$/i }),
    );
    return await screen.findByRole('dialog', {
      name: /Schüler hinzufügen|Add student/i,
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

  it('renders CSV controls and table preview', async () => {
    const students = [
      createMockStudent({ id: '1', name: 'Max', gender: 'boy' }),
    ];

    const props = createMockStudentInputProps({ students });

    expect(students[0].restless).toBe(false);
    renderWithClassContext(<StudentInput {...props} />);

    // CSV import sits with the other ways of filling a class, not next to
    // Export.
    const addMenu = await openAddMenu();
    expect(
      within(addMenu).getByText(/Klassenliste importieren|Import class list/i),
    ).toBeInTheDocument();

    // Button check is already semantic
    const proceedButton = getButton(
      /Weiter zum Klassenraum|Proceed to Classroom/i,
    );
    expect(proceedButton).toBeInTheDocument();
  });

  it('deletes the class picked in the switcher dropdown', async () => {
    const students = [
      createMockStudent({ id: '1', name: 'Max', gender: 'boy' }),
    ];
    const deleteClass = vi.fn().mockResolvedValue(true);

    renderWithClassContext(
      <StudentInput {...createMockStudentInputProps({ students })} />,
      { deleteClass },
    );

    // Deleting a class sits next to the class it acts on, inside the switcher
    // dropdown. That dropdown is a portal that renders nothing — and so stays
    // out of the a11y tree — until it has measured its position.
    fireEvent.click(getButton(/Klasse wechseln|Switch class/i));
    fireEvent.click(
      await screen.findByRole('button', {
        name: /Klasse löschen Testklasse|Delete class Testklasse/i,
      }),
    );

    const confirmDialog = getDialog(/Klasse löschen|Delete class/i);
    fireEvent.click(
      within(confirmDialog).getByRole('button', {
        name: /Löschen|Delete/i,
      }),
    );

    expect(deleteClass).toHaveBeenCalledWith('class-1');
  });

  it('requires confirmation before removing a single student', async () => {
    const students = [
      createMockStudent({ id: '1', name: 'Max', gender: 'boy' }),
    ];

    const props = createMockStudentInputProps({ students });

    renderWithClassContext(<StudentInput {...props} />);

    const removeButton = await waitFor(() => getButton(/Max entfernen/i));
    fireEvent.click(removeButton);

    const dialog = getDialog(/Schüler entfernen|Remove Student/i);
    expect(dialog).toBeInTheDocument();
    expect(props.removeStudent).not.toHaveBeenCalled();

    const confirmButton = within(dialog).getByRole('button', {
      name: /Entfernen|Delete/i,
    });
    fireEvent.click(confirmButton);

    expect(props.removeStudent).toHaveBeenCalledWith('1');
  });

  it('zeigt die Schnell-Namenerfassung bei fehlenden Namen an', () => {
    const students = [
      createMockStudent({ id: '1', name: '' }),
      createMockStudent({ id: '2', name: 'Alex' }),
    ];

    const props = createMockStudentInputProps({ students });

    renderWithClassContext(<StudentInput {...props} />);

    expect(
      getButton(/Schnell-Namenerfassung starten|Start quick name entry/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Hinweis: Alle weiteren Schülerdetails pflegst du direkt in der Schülerliste|Note: Add all further student details directly in the class list/i,
      ),
    ).toBeInTheDocument();
  });

  it('erklärt am Weiter-Button, warum der Schritt blockiert ist', () => {
    const students = [
      createMockStudent({ id: '1', name: '' }),
      createMockStudent({ id: '2', name: '' }),
      createMockStudent({ id: '3', name: 'Alex' }),
    ];

    const { rerender } = renderWithClassContext(
      <StudentInput {...createMockStudentInputProps({ students })} />,
    );

    const proceedButton = getButton(
      /Weiter zum Klassenraum|Proceed to Classroom/i,
    );
    expect(proceedButton).toHaveAttribute('aria-disabled', 'true');

    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveTextContent(/2/);
    expect(tooltip).toHaveTextContent(/fehlenden Namen|missing names/i);
    expect(proceedButton).toHaveAttribute('aria-describedby', tooltip.id);

    // Once every name is filled in, the notice disappears again.
    const complete = students.map((student, index) => ({
      ...student,
      name: student.name || `Name ${index}`,
    }));
    rerender(
      <MemoryRouter>
        <SeatingPlanGeneratorProvider>
          <ClassManagementContext.Provider value={createMockClassContext()}>
            <StudentInput
              {...createMockStudentInputProps({ students: complete })}
            />
          </ClassManagementContext.Provider>
        </SeatingPlanGeneratorProvider>
      </MemoryRouter>,
    );
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(
      getButton(/Weiter zum Klassenraum|Proceed to Classroom/i),
    ).not.toHaveAttribute('aria-disabled');
  });

  it('schließt die Schnell-Namenerfassung nach erfolgreicher Eingabe', async () => {
    const initialStudents = [
      createMockStudent({ id: '1', name: '' }),
      createMockStudent({ id: '2', name: 'Bea' }),
    ];

    const baseProps = createMockStudentInputProps();

    const Harness: React.FC = () => {
      const [currentStudents, setCurrentStudents] =
        React.useState(initialStudents);

      const updateStudent = React.useCallback(
        (id: string, patch: Partial<Student>) => {
          baseProps.updateStudent(id, patch);
          setCurrentStudents((previous) =>
            previous.map((student) =>
              student.id === id
                ? ({ ...student, ...patch } as Student)
                : student,
            ),
          );
        },
        [],
      );

      return (
        <StudentInput
          {...baseProps}
          students={currentStudents}
          updateStudent={updateStudent}
        />
      );
    };

    renderWithClassContext(<Harness />);

    fireEvent.click(
      getButton(/Schnell-Namenerfassung starten|Start quick name entry/i),
    );

    const dialog = getDialog(/Schnell-Namenerfassung|Quick Name Entry/i);
    expect(dialog).toBeInTheDocument();

    const nameField = await waitFor(() =>
      getField(/Name für Schüler|Name for student/i),
    );
    fireEvent.change(nameField, { target: { value: 'Lena   ' } });

    fireEvent.click(getButton(/Name speichern|Save name/i));

    await waitFor(() => {
      expect(baseProps.updateStudent).toHaveBeenCalledWith('1', {
        name: 'Lena',
      });
    });

    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', {
          name: /Schnell-Namenerfassung|Quick Name Entry/i,
        }),
      ).not.toBeInTheDocument();
    });

    await waitFor(() => {
      expect(
        screen.queryByRole('button', {
          name: /Schnell-Namenerfassung starten|Start quick name entry/i,
        }),
      ).not.toBeInTheDocument();
    });
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

    const addMenu = await openAddMenu();
    const input = addMenu.querySelector(
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

    const addMenu = await openAddMenu();
    const input = addMenu.querySelector(
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
      expect(importCsvMock).toHaveBeenCalledWith(file, 'fullName');
    });
  });
});

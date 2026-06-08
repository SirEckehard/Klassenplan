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

  it('renders CSV controls and table preview', () => {
    const students = [
      createMockStudent({ id: '1', name: 'Max', gender: 'boy' }),
    ];

    const props = createMockStudentInputProps({ students });

    expect(students[0].restless).toBe(false);
    renderWithClassContext(<StudentInput {...props} />);

    // Wizard progress bar shows step label
    const stepLabels = screen.getAllByText(/Klassenliste|Class List/i);
    expect(stepLabels.length).toBeGreaterThan(0);

    // Button check is already semantic
    const proceedButton = getButton(
      /Weiter zum Klassenraum|Proceed to Classroom/i,
    );
    expect(proceedButton).toBeInTheDocument();
  });

  it('clears all students when clear button is clicked', () => {
    const students = [
      createMockStudent({ id: '1', name: 'Max', gender: 'boy' }),
    ];

    const props = createMockStudentInputProps({ students });

    expect(students[0].restless).toBe(false);
    renderWithClassContext(<StudentInput {...props} />);

    // Use semantic helpers
    const clearButton = getButton(
      /Alle Schüler entfernen|Remove all students/i,
    );
    fireEvent.click(clearButton);

    const confirmDialog = getDialog(
      /Alle Schüler entfernen|Remove All Students/i,
    );
    const confirmButton = within(confirmDialog).getByRole('button', {
      name: /Alle Schüler entfernen|Remove all students/i,
    });
    fireEvent.click(confirmButton);

    expect(props.clearStudents).toHaveBeenCalled();
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

    expect(getButton(/Schnell-Namenerfassung starten|Start quick name entry/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /Hinweis: Alle weiteren Schülerdetails pflegst du direkt in der Schülerliste|Note: Add all further student details directly in the class list/i,
      ),
    ).toBeInTheDocument();
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

    fireEvent.click(getButton(/Schnell-Namenerfassung starten|Start quick name entry/i));

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

    const { container } = renderWithClassContext(<StudentInput {...props} />);

    const input = container.querySelector(
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
});

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

    // Insert, in the toolbar's top group.
    expect(getButton(/Schüler hinzufügen|Add student/i)).toBeInTheDocument();
    expect(
      getButton(/Platzhalter erstellen|Create placeholders/i),
    ).toBeInTheDocument();
    const importPanel = await openImportPanel();
    expect(
      within(importPanel).getByText(
        /Klassenliste importieren|Import class list/i,
      ),
    ).toBeInTheDocument();

    // The way on to the classroom lives in the shell's status bar; the side
    // trips live at the bottom of the toolbar.
    expect(getButton(/Namensspiel|Name game/i)).toBeInTheDocument();
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

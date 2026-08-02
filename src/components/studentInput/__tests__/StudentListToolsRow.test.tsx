// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import '@/i18n';
import StudentListToolsRow from '@/components/studentInput/StudentListToolsRow';
import { useStudentListView } from '@/components/studentInput/hooks/useStudentListView';
import { useStudentSelection } from '@/components/studentInput/hooks/useStudentSelection';
import { createMockStudent } from '@/__tests__/utils';
import type { Student } from '@/types';

const NAMES = ['Anna', 'Ben', 'Cem', 'Dana'];

const makeStudents = (): Student[] =>
  NAMES.map((name, index) =>
    createMockStudent({ id: String(index + 1), name }),
  );

/**
 * Drives the row through the real hooks: the mode switch depends on selection
 * and visibility state staying in step, which a stubbed selection would hide.
 */
function Harness({
  students = makeStudents(),
  onBulkApply = vi.fn(),
  onDeleteSelected = vi.fn(),
}: {
  students?: Student[];
  onBulkApply?: (patch: Partial<Student>) => void;
  onDeleteSelected?: () => void;
}) {
  const listView = useStudentListView(students);
  const selection = useStudentSelection(students, listView.visibleStudents);
  const selectedStudents = students.filter((student) =>
    selection.selectedIds.has(student.id),
  );

  return (
    <>
      <StudentListToolsRow
        listView={listView}
        selection={selection}
        selectedStudents={selectedStudents}
        totalCount={students.length}
        onBulkApply={onBulkApply}
        onDeleteSelected={onDeleteSelected}
      />
      {/* Stands in for the list's sticky header, which owns select-all. */}
      <button type="button" onClick={selection.toggleAllVisible}>
        Alle auswählen
      </button>
      <ul>
        {listView.visibleStudents.map((student) => (
          <li key={student.id}>{student.name}</li>
        ))}
      </ul>
    </>
  );
}

const bulkRegion = () =>
  screen.queryByRole('region', { name: /Mehrfachbearbeitung|Bulk editing/i });

const searchbox = () =>
  screen.queryByRole('searchbox', { name: /suchen|search/i });

const filterButton = () =>
  screen.getByRole('button', { name: /Suche und Filter|Search and filter/i });

const visibleNames = () =>
  screen.getAllByRole('listitem').map((item) => item.textContent);

const selectAll = () =>
  screen.getByRole('button', { name: /Alle auswählen|Select all/i });

describe('StudentListToolsRow', () => {
  it('shows the browse controls and no bulk region without a selection', () => {
    render(<Harness />);

    expect(searchbox()).toBeInTheDocument();
    expect(bulkRegion()).not.toBeInTheDocument();
  });

  it('swaps the browse controls for the bulk controls once something is selected', async () => {
    render(<Harness />);
    const user = userEvent.setup();

    await user.click(selectAll());

    expect(bulkRegion()).toBeInTheDocument();
    // The row is a mode, not an extra bar: the search field gives up its place.
    expect(searchbox()).not.toBeInTheDocument();
    expect(filterButton()).toBeInTheDocument();
  });

  it('keeps searching available through the popover while selecting', async () => {
    render(<Harness />);
    const user = userEvent.setup();

    await user.click(selectAll());
    await user.click(filterButton());

    // The popover is a portal that only enters the a11y tree once positioned.
    await user.type(
      await screen.findByRole('searchbox', { name: /suchen|search/i }),
      'an',
    );

    expect(visibleNames()).toEqual(['Anna', 'Dana']);
    // Narrowing the view must not silently drop students from the selection.
    expect(bulkRegion()).toHaveTextContent(/4/);
  });

  it('closes the popover on Escape and keeps the selection', async () => {
    render(<Harness />);
    const user = userEvent.setup();

    await user.click(selectAll());
    await user.click(filterButton());
    await screen.findByRole('dialog', {
      name: /Suche und Filter|Search and filter/i,
    });

    await user.keyboard('{Escape}');

    expect(
      screen.queryByRole('dialog', {
        name: /Suche und Filter|Search and filter/i,
      }),
    ).not.toBeInTheDocument();
    expect(bulkRegion()).toBeInTheDocument();
  });

  it('badges the filter button with the constraints that hide students', async () => {
    render(<Harness />);
    const user = userEvent.setup();

    await user.type(searchbox() as HTMLElement, 'an');
    await user.click(selectAll());

    expect(filterButton()).toHaveAccessibleName(/1/);
  });

  it('returns to the browse controls when the selection is cleared', async () => {
    render(<Harness />);
    const user = userEvent.setup();

    await user.click(selectAll());
    expect(bulkRegion()).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: /Auswahl aufheben|Clear selection/i }),
    );

    expect(bulkRegion()).not.toBeInTheDocument();
    expect(searchbox()).toBeInTheDocument();
  });
});

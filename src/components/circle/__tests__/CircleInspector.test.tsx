// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import Inspector from '@/components/shell/Inspector';
import CircleInspector from '@/components/circle/CircleInspector';
import { InspectorProvider } from '@/contexts/InspectorContext';
import { createMockStudent, getHeading } from '@/__tests__/utils';
import type { Student } from '@/types';
import type { CircleLayout } from '@/types/Circle';

vi.mock('@/contexts/SeatingPlanContext', () => ({
  useSeatingPlanState: () => ({ step: 3, students: [] }),
  useSeatingPlanActions: () => ({
    updateStudent: vi.fn(),
    removeStudent: vi.fn(),
  }),
}));

const ring = (
  students: Student[],
  tablePairs: Array<[string, string]> = [],
): CircleLayout => ({
  students: students.map((student, index) => ({
    student,
    angle: (360 / students.length) * index,
    x: 0,
    y: 0,
    preservedNeighbors: [],
    lostNeighbors: [],
    newNeighbors: [],
  })),
  radius: { horizontal: 200, vertical: 150 },
  center: { x: 450, y: 300 },
  preservedNeighborhoods: 0,
  totalOriginalNeighborhoods: tablePairs.length,
  newNeighborhoods: 0,
  preservationRate: 0,
  mode: 'preserve-neighbors',
  timestamp: 0,
  neighborhoodPairs: tablePairs.map(([student1Id, student2Id]) => ({
    student1Id,
    student2Id,
    strength: 0.5,
    preserved: false,
  })),
});

/**
 * Anna, Ben, Cem, Dana, Emil in a ring of five. Anna and Ben kept their table
 * together, Cem and Emil did not.
 */
const classCircle = ring(
  [
    createMockStudent({ id: 'anna', name: 'Anna' }),
    createMockStudent({ id: 'ben', name: 'Ben' }),
    createMockStudent({ id: 'cem', name: 'Cem' }),
    createMockStudent({ id: 'dana', name: 'Dana' }),
    createMockStudent({ id: 'emil', name: 'Emil' }),
  ],
  [
    ['anna', 'ben'],
    ['cem', 'emil'],
  ],
);

const renderPanel = (layout: CircleLayout | null) =>
  render(
    <InspectorProvider>
      <Inspector />
      <CircleInspector layout={layout} />
    </InspectorProvider>,
  );

afterEach(() => {
  cleanup();
});

describe('CircleInspector', () => {
  it('names the inspector column after the circle', () => {
    renderPanel(classCircle);
    const panel = screen.getByRole('complementary', {
      name: /Sitzkreis|Seating Circle/i,
    });
    expect(
      within(panel).getByRole('heading', {
        level: 2,
        name: /Sitzkreis|Seating Circle/i,
      }),
    ).toBeInTheDocument();
  });

  it('says how many table neighbours stayed together and who was split up', () => {
    renderPanel(classCircle);
    expect(
      screen.getByText(
        /1 von 2 Paaren sitzt auch im Kreis|1 of 2 pairs sits side by side/,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/(Getrennt|Split up): Cem & Emil/),
    ).toBeInTheDocument();
    // The table neighbours are all the panel reports.
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(1);
  });

  it('says so when the seating plan had no table neighbours', () => {
    renderPanel(ring(classCircle.students.map((entry) => entry.student)));
    expect(
      screen.getByText(/keine Tischnachbarn|no table neighbours/),
    ).toBeInTheDocument();
  });

  it('shows only its heading while the circle is still being built', () => {
    renderPanel(null);
    getHeading(/Sitzkreis|Seating Circle/i, 2);
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument();
  });
});

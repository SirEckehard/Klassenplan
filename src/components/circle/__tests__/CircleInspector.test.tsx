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
  useSeatingPlanState: () => ({
    step: 3,
    students: [],
    planName: 'Deutsch',
    activePlanId: null,
    seatingHistory: [],
    // One seat, the shape of the seating: a plan for these tables.
    classroomScene: { tables: [{ seatCount: 1 }], features: [] },
    currentSeating: [[{ id: 'anna', name: 'Anna' }]],
    circleLayout: null,
    seatingMode: 'circle',
    rooms: [],
    activeRoomId: null,
  }),
  useSeatingPlanActions: () => ({
    updateStudent: vi.fn(),
    removeStudent: vi.fn(),
    handleSaveSeatingPlan: vi.fn(),
    handleHistoryLoad: vi.fn(),
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
  // The circle is saved with its plan, so its inspector is the plan's, as
  // the table plan's is.
  it('heads the inspector column with the plan it belongs to', () => {
    renderPanel(classCircle);
    const panel = screen.getByRole('complementary', { name: /^Plan$/ });
    const heading = within(panel).getByRole('heading', {
      level: 2,
      name: 'Deutsch',
    });
    expect(
      within(panel).getByText(/Noch nicht gespeichert|Not saved yet/),
    ).toBeInTheDocument();
    // The plan is named in the header, as in the table plan.
    expect(within(heading).getByRole('button')).toBeInTheDocument();
    expect(
      within(panel).getByRole('button', {
        name: /^(Plan speichern|Save plan)$/,
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
    // Beside the plan, the table neighbours are all the panel reports.
    expect(
      screen
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual([
      expect.stringMatching(/^Plan$/),
      expect.stringMatching(/Tischnachbarn|Table neighbours/i),
    ]);
  });

  it('says so when the seating plan had no table neighbours', () => {
    renderPanel(ring(classCircle.students.map((entry) => entry.student)));
    expect(
      screen.getByText(/keine Tischnachbarn|no table neighbours/),
    ).toBeInTheDocument();
  });

  it('shows only the plan while the circle is still being built', () => {
    renderPanel(null);
    getHeading('Deutsch', 2);
    expect(
      screen
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual([expect.stringMatching(/^Plan$/)]);
  });
});

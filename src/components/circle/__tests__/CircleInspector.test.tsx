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
import type { MixSettings, Student } from '@/types';
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
 * together, Cem and Emil did not; Anna and Ben are both restless; Dana wished
 * for Anna two seats away, Emil for Anna beside him across the join.
 */
const classCircle = ring(
  [
    createMockStudent({
      id: 'anna',
      name: 'Anna',
      gender: 'girl',
      restless: true,
    }),
    createMockStudent({
      id: 'ben',
      name: 'Ben',
      gender: 'boy',
      restless: true,
    }),
    createMockStudent({ id: 'cem', name: 'Cem', gender: 'boy' }),
    createMockStudent({
      id: 'dana',
      name: 'Dana',
      gender: 'girl',
      wishPartnerIds: ['anna'],
    }),
    createMockStudent({
      id: 'emil',
      name: 'Emil',
      gender: 'boy',
      wishPartnerIds: ['anna'],
    }),
  ],
  [
    ['anna', 'ben'],
    ['cem', 'emil'],
  ],
);

const allOn: Partial<MixSettings> = {
  considerWishPartners: 5,
  avoidConflictPartners: 5,
  avoidRestlessTogether: 5,
  preferGenderMix: 5,
};

const renderPanel = (
  layout: CircleLayout | null,
  settings: Partial<MixSettings> = allOn,
) =>
  render(
    <InspectorProvider>
      <Inspector />
      <CircleInspector layout={layout} settings={settings} />
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
  });

  it('checks the criteria a ring can answer, with the names concerned', () => {
    renderPanel(classCircle);
    getHeading(/Im Kreis nebeneinander|Side by side in the circle/i, 3);
    expect(
      screen.getByText(/(Nebeneinander|Side by side): Anna & Ben/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /(Ohne Wunschpartner daneben|No wish partner beside them): Dana/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/^(1 von 2|1 of 2)$/)).toBeInTheDocument();
    expect(screen.getByText(/^(gemischt|mixed)$/)).toBeInTheDocument();
    // Nobody asked for distance, so there is nothing to check.
    expect(
      screen.queryByText(/^(Distanzwünsche|Distance Requests)$/),
    ).not.toBeInTheDocument();
  });

  it('leaves out a criterion that is switched off for the plan', () => {
    renderPanel(classCircle, { ...allOn, preferGenderMix: 0 });
    expect(screen.getByText(/^(Unruhe|Restlessness)$/)).toBeInTheDocument();
    expect(
      screen.queryByText(/^(Geschlechter|Gender)$/),
    ).not.toBeInTheDocument();
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

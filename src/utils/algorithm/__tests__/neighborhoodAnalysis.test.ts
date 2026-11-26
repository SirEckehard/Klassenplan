// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Who the circle keeps side by side: the table neighbours of the plan — the
 * seat partners at a desk, and the two at each join of desks pushed together
 * in a row, which sit as close (decision 0031).
 */
import { describe, expect, it } from 'vitest';
import type {
  ClassroomFeature,
  ClassroomScene,
  ClassroomTable,
  SeatingArrangement,
} from '@/types';
import { createMockStudent } from '@/__tests__/utils';
import { analyzeNeighborhoods } from '../neighborhoodAnalysis';

/** The board on the right: the desks face it, a row runs top to bottom. */
const BOARD: ClassroomFeature = {
  id: 'board',
  type: 'board',
  x: 880,
  y: 200,
  width: 20,
  height: 200,
  anchor: 'free',
  movable: false,
};

const desk = (
  templateType: 'single' | 'double',
  x: number,
  y: number,
): ClassroomTable => ({
  x,
  y,
  width: 55,
  height: templateType === 'single' ? 65 : 130,
  rotation: 0,
  seatCount: templateType === 'single' ? 1 : 2,
  locked: false,
  zIndex: 0,
  templateType,
});

const roomOf = (...tables: ClassroomTable[]): ClassroomScene => ({
  totalStudents: 0,
  tables,
  features: [BOARD],
});

const [ada, ben, cem, dua] = ['ada', 'ben', 'cem', 'dua'].map((id) =>
  createMockStudent({ id, name: id }),
);
const students = [ada!, ben!, cem!, dua!];

const pairsOf = (scene: ClassroomScene, seating: SeatingArrangement) =>
  analyzeNeighborhoods(scene, students, seating)
    .neighborhoodPairs.map(({ student1Id, student2Id }) =>
      [student1Id, student2Id].sort().join('::'),
    )
    .sort();

describe('analyzeNeighborhoods', () => {
  it('counts the two at the join of single desks pushed together', () => {
    const scene = roomOf(
      desk('single', 600, 100),
      desk('single', 600, 165),
      desk('single', 600, 400),
      desk('single', 600, 465),
    );
    const seating = [[ada!], [ben!], [cem!], [dua!]];
    const analysis = analyzeNeighborhoods(scene, students, seating);

    expect(pairsOf(scene, seating)).toEqual(['ada::ben', 'cem::dua']);
    expect(analysis.studentPartnerMap?.get('ada')).toEqual(['ben']);
    expect(analysis.studentNeighborMap.get('ben')).toEqual(['ada']);
    expect(analysis.isolatedStudents).toEqual([]);
  });

  it('counts the join between double desks in a row beside their partners', () => {
    const scene = roomOf(desk('double', 600, 100), desk('double', 600, 230));

    expect(
      pairsOf(scene, [
        [ada!, ben!],
        [cem!, dua!],
      ]),
    ).toEqual(['ada::ben', 'ben::cem', 'cem::dua']);
  });

  it('counts no neighbour across an aisle', () => {
    const scene = roomOf(
      desk('single', 600, 100),
      desk('single', 600, 225),
      desk('single', 600, 400),
      desk('single', 600, 525),
    );

    expect(pairsOf(scene, [[ada!], [ben!], [cem!], [dua!]])).toEqual([]);
  });
});

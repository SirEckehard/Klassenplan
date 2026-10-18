// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, it, expect } from 'vitest';
import type {
  ClassroomFeature,
  ClassroomScene,
  ClassroomTable,
  MixSettings,
  Student,
} from '@/types';
import { neutralSettings } from '../../../mixSettings';
import { findMixHints } from '../feasibility';

const boardRight: ClassroomFeature = {
  id: 'board',
  type: 'board',
  x: 880,
  y: 200,
  width: 20,
  height: 200,
  anchor: 'right',
  movable: false,
};

const desk = (x: number, y: number): ClassroomTable => ({
  x,
  y,
  width: 55,
  height: 130,
  rotation: 0,
  seatCount: 2,
  locked: false,
  zIndex: 0,
  templateType: 'double',
});

/** Two rows of two desks with aisles between them. */
const room: ClassroomScene = {
  totalStudents: 0,
  tables: [desk(700, 60), desk(700, 250), desk(530, 60), desk(530, 250)],
  features: [boardRight],
};

const student = (id: string, extra: Partial<Student> = {}): Student =>
  ({
    id,
    name: id,
    restless: false,
    shy: false,
    concentrationIssues: false,
    needsFrontSeat: false,
    ...extra,
  }) as Student;

const hintsFor = (students: Student[], weights: Partial<MixSettings>) =>
  findMixHints(students, room, { ...neutralSettings, ...weights });

describe('findMixHints', () => {
  it('says nothing about a class the room can take', () => {
    expect(
      hintsFor([student('a', { wishPartnerIds: ['b'] }), student('b')], {
        considerWishPartners: 8,
        avoidConflictPartners: 7,
      }),
    ).toEqual([]);
  });

  it('names more students needing a front seat than the front row has', () => {
    const students = ['a', 'b', 'c', 'd', 'e'].map((id) =>
      student(id, { needsFrontSeat: true }),
    );
    expect(hintsFor(students, { preferFrontForNeedsFrontSeat: 8 })).toEqual([
      { kind: 'frontRow', students: 5, seats: 4 },
    ]);
    // Below "Sehr wichtig" a front seat is a weight like any other.
    expect(hintsFor(students, { preferFrontForNeedsFrontSeat: 5 })).toEqual([]);
  });

  it('names a group avoiding each other larger than the tables in the mix', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    const students = ids.map((id) =>
      student(id, { avoidPartnerIds: ids.filter((other) => other !== id) }),
    );
    const [hint] = hintsFor(students, { avoidConflictPartners: 7 });
    expect(hint).toMatchObject({ kind: 'avoidGroup', tables: 4 });
    expect(hint?.kind === 'avoidGroup' && [...hint.studentIds].sort()).toEqual(
      ids,
    );
  });

  it('names a wish answered with a distance wish', () => {
    const students = [
      student('a', { wishPartnerIds: ['b'] }),
      student('b', { avoidPartnerIds: ['a'] }),
    ];
    expect(
      hintsFor(students, { considerWishPartners: 8, avoidConflictPartners: 7 }),
    ).toEqual([{ kind: 'wishMeetsAvoid', wisherId: 'a', avoiderId: 'b' }]);
  });

  it('names a student wished for by more than can sit around anybody', () => {
    // The desks stand across aisles: the desk partner is all anybody has.
    const students = [
      student('star'),
      ...['a', 'b', 'c', 'd'].map((id) =>
        student(id, { wishPartnerIds: ['star'] }),
      ),
    ];
    expect(hintsFor(students, { considerWishPartners: 8 })).toEqual([
      { kind: 'wishedOften', studentId: 'star', wishers: 4, room: 1 },
    ]);
  });
});

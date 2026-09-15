// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import {
  buildDemoClassroomScene,
  buildDemoStudents,
  findDemoClass,
} from '../demoClass';
import {
  getAvoidPartnerIds,
  getWishPartnerIds,
  hasWishAvoidConflict,
} from '@/utils/student';
import { countSeats } from '@/utils/math/scene';
import { validateStudentsComplete } from '@/utils/validation';
import {
  CLASSROOM_HEIGHT,
  CLASSROOM_WIDTH,
  MAX_PARTNER_WISHES,
  MAX_STUDENTS,
} from '@/utils';
import type { ClassSummary, Student } from '@/types';

const sequentialIds = () => {
  let next = 0;
  return () => {
    next += 1;
    return `demo-${next}`;
  };
};

describe('buildDemoStudents', () => {
  it('builds a complete class within the student limit', () => {
    const students = buildDemoStudents('de');

    expect(students).toHaveLength(24);
    expect(students.length).toBeLessThanOrEqual(MAX_STUDENTS);
    // The wizard refuses to leave step 1 with an empty name.
    expect(validateStudentsComplete(students).emptyNameCount).toBe(0);
    expect(new Set(students.map((student) => student.id)).size).toBe(24);
    expect(new Set(students.map((student) => student.name)).size).toBe(24);
  });

  it('gives both languages the same class, only with other names', () => {
    const withoutNames = (students: Student[]) =>
      students.map((student) => ({ ...student, name: '' }));
    const de = buildDemoStudents('de', sequentialIds());
    const en = buildDemoStudents('en', sequentialIds());

    expect(withoutNames(en)).toEqual(withoutNames(de));
    expect(en.map((student) => student.name)).not.toEqual(
      de.map((student) => student.name),
    );
  });

  it('points every partner wish at a classmate without contradicting another', () => {
    const students = buildDemoStudents('en');
    const ids = new Set(students.map((student) => student.id));

    for (const student of students) {
      const wishes = getWishPartnerIds(student);
      const avoids = getAvoidPartnerIds(student);
      expect(wishes.length).toBeLessThanOrEqual(MAX_PARTNER_WISHES);
      expect(avoids.length).toBeLessThanOrEqual(MAX_PARTNER_WISHES);
      for (const partnerId of [...wishes, ...avoids]) {
        expect(ids.has(partnerId)).toBe(true);
        expect(partnerId).not.toBe(student.id);
      }
      for (const other of students) {
        expect(hasWishAvoidConflict(student, other)).toBe(false);
      }
    }
  });

  it('gives every criterion something to work with', () => {
    const students = buildDemoStudents('de');
    const count = (predicate: (student: Student) => boolean) =>
      students.filter(predicate).length;

    expect(count((student) => student.restless)).toBeGreaterThan(0);
    expect(count((student) => student.shy)).toBeGreaterThan(0);
    expect(count((student) => student.concentrationIssues)).toBeGreaterThan(0);
    expect(count((student) => student.needsFrontSeat)).toBeGreaterThan(0);
    expect(count((student) => Boolean(student.prefersWindow))).toBeGreaterThan(
      0,
    );
    expect(count((student) => Boolean(student.prefersDoor))).toBeGreaterThan(0);
    expect(
      count((student) => Boolean(student.performanceStrong)),
    ).toBeGreaterThan(0);
    expect(
      count((student) => Boolean(student.performanceWeak)),
    ).toBeGreaterThan(0);
    expect(
      count((student) => student.languageSkill !== undefined),
    ).toBeGreaterThan(0);
    expect(
      count((student) => student.socialRole !== undefined),
    ).toBeGreaterThan(0);
    expect(count((student) => student.height !== undefined)).toBe(24);
    expect(new Set(students.map((student) => student.gender))).toEqual(
      new Set(['girl', 'boy', 'diverse']),
    );
    expect(
      count((student) =>
        Boolean(student.performanceStrong && student.performanceWeak),
      ),
    ).toBe(0);
  });

  it('hands out fresh ids on every call', () => {
    const first = buildDemoStudents('de');
    const second = buildDemoStudents('de');

    expect(first[0].id).not.toBe(second[0].id);
  });
});

describe('buildDemoClassroomScene', () => {
  it('seats the whole class at double desks inside the room', () => {
    const scene = buildDemoClassroomScene(24);

    expect(countSeats(scene)).toBeGreaterThanOrEqual(24);
    expect(scene.totalStudents).toBe(24);
    for (const table of scene.tables) {
      expect(table.templateType).toBe('double');
      expect(table.x).toBeGreaterThanOrEqual(0);
      expect(table.y).toBeGreaterThanOrEqual(0);
      expect(table.x + table.width).toBeLessThanOrEqual(CLASSROOM_WIDTH);
      expect(table.y + table.height).toBeLessThanOrEqual(CLASSROOM_HEIGHT);
    }
  });

  it('furnishes the room with board, windows and door', () => {
    const scene = buildDemoClassroomScene(24);

    expect(scene.features?.map((feature) => feature.type)).toEqual(
      expect.arrayContaining(['board', 'window', 'door']),
    );
  });

  it('copies the default features instead of sharing them', () => {
    const first = buildDemoClassroomScene(24);
    const second = buildDemoClassroomScene(24);

    expect(first.features?.[0]).toEqual(second.features?.[0]);
    expect(first.features?.[0]).not.toBe(second.features?.[0]);
  });
});

describe('findDemoClass', () => {
  const summary = (id: string, name: string): ClassSummary => ({
    id,
    name,
    createdAt: '2026-09-15T00:00:00.000Z',
    updatedAt: '2026-09-15T00:00:00.000Z',
    studentCount: 0,
  });
  const names = ['Beispielklasse', 'Sample class'];

  it('finds nothing among the teacher’s own classes', () => {
    expect(
      findDemoClass([summary('a', '7b'), summary('b', '8c')], names),
    ).toBeNull();
  });

  it('matches ignoring case and surrounding spaces', () => {
    expect(
      findDemoClass(
        [summary('a', '7b'), summary('b', ' beispielklasse ')],
        names,
      )?.id,
    ).toBe('b');
  });

  it('matches the name of every language', () => {
    expect(findDemoClass([summary('a', 'Sample class')], names)?.id).toBe('a');
  });

  it('treats a renamed sample class as the teacher’s own', () => {
    expect(findDemoClass([summary('a', 'Beispielklasse 2')], names)).toBeNull();
  });
});

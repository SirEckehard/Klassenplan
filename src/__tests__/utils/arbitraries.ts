// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Generators for property tests (fast-check): students, rooms, seatings and
 * classes in the shapes the app writes. A property holds for every value they
 * produce, so what they produce has to be something the app can produce —
 * students on a seat are the class's own, a table's seats match its template,
 * a lock names a table of the room. Where the app tolerates more (a plan of a
 * room that is gone, a lock without a table id), the generators make that too.
 *
 * A failing property prints its seed and the smallest value it found; run it
 * again with `fc.assert(…, { seed, path })` to step through.
 */
import fc from 'fast-check';
import type {
  ClassRecord,
  ClassroomScene,
  ClassroomTable,
  LockedPositions,
  MixResult,
  MixSettings,
  RoomRecord,
  SavedPlan,
  SeatingArrangement,
  Student,
  TableTemplateType,
} from '@/types';
import {
  DEFAULT_MIX_WEIGHTS,
  MIX_CRITERIA_VERSION,
  TABLE_PRESETS,
} from '@/utils';

const TEMPLATES: readonly TableTemplateType[] = [
  'single',
  'double',
  'group4',
  'group6',
];

const isoDate = fc
  .date({
    min: new Date('2024-01-01T00:00:00.000Z'),
    max: new Date('2027-12-31T23:59:59.000Z'),
    noInvalidDate: true,
  })
  .map((date) => date.toISOString());

/** A name as the app keeps it: trimmed, never empty, any script. */
const nameArb = fc
  .string({ unit: 'grapheme', minLength: 1, maxLength: 40 })
  .map((name) => name.trim())
  .filter((name) => name.length > 0);

const range = (length: number) => Array.from({ length }, (_, index) => index);

/** What a student is, apart from who they wish to sit with. */
const studentShapeArb = fc.record(
  {
    name: nameArb,
    gender: fc.constantFrom('boy', 'girl', 'diverse'),
    height: fc.constantFrom('small', 'tall'),
    restless: fc.boolean(),
    shy: fc.boolean(),
    concentrationIssues: fc.boolean(),
    needsFrontSeat: fc.boolean(),
    prefersWindow: fc.boolean(),
    prefersDoor: fc.boolean(),
    needsFreeNeighbourSeat: fc.boolean(),
    leftHanded: fc.boolean(),
    languageSkill: fc.constantFrom(
      'native',
      'fluent',
      'intermediate',
      'beginner',
      'daz',
    ),
    socialRole: fc.constantFrom('mediator', 'leader', 'loner', 'socialHub'),
    performance: fc.constantFrom('strong', 'weak', 'none'),
    wishes: fc.array(fc.nat(), { maxLength: 3 }),
    avoids: fc.array(fc.nat(), { maxLength: 3 }),
  },
  {
    requiredKeys: [
      'name',
      'restless',
      'shy',
      'concentrationIssues',
      'needsFrontSeat',
      'performance',
      'wishes',
      'avoids',
    ],
  },
);

/** Up to three other students of the class, by id, each once. */
const partnersOf = (
  picks: readonly number[],
  ids: readonly string[],
  self: number,
): string[] => {
  const others = ids.filter((_, index) => index !== self);
  if (others.length === 0) return [];
  return [...new Set(picks.map((pick) => others[pick % others.length]!))];
};

/** A class's students with unique ids, wishes naming classmates only. */
export const studentsArb = ({
  minLength = 0,
  maxLength = 12,
}: { minLength?: number; maxLength?: number } = {}): fc.Arbitrary<Student[]> =>
  fc.uniqueArray(fc.uuid(), { minLength, maxLength }).chain((ids) =>
    fc.tuple(...ids.map(() => studentShapeArb)).map((shapes) =>
      shapes.map((shape, index): Student => {
        const { performance, wishes, avoids, ...rest } = shape;
        const flags =
          performance === 'strong'
            ? { performanceStrong: true as const }
            : performance === 'weak'
              ? { performanceWeak: true as const }
              : {};
        return {
          ...rest,
          ...flags,
          id: ids[index]!,
          wishPartnerIds: partnersOf(wishes, ids, index),
          avoidPartnerIds: partnersOf(avoids, ids, index),
        } as Student;
      }),
    ),
  );

const tableArb = (id: string): fc.Arbitrary<ClassroomTable> =>
  fc
    .record({
      templateType: fc.constantFrom(...TEMPLATES),
      x: fc.integer({ min: 0, max: 740 }),
      y: fc.integer({ min: 0, max: 440 }),
      rotation: fc.oneof(
        fc.constantFrom(0, 90, 180, 270),
        fc.integer({ min: 0, max: 359 }),
      ),
      locked: fc.boolean(),
      zIndex: fc.nat({ max: 40 }),
      inactive: fc.option(fc.boolean(), { nil: undefined }),
    })
    .map(({ templateType, inactive, ...rest }) => {
      const preset = TABLE_PRESETS[templateType];
      return {
        ...rest,
        id,
        templateType,
        width: preset.width,
        height: preset.height,
        seatCount: preset.seatCount,
        ...(inactive === undefined ? {} : { inactive }),
      };
    });

/** A room of one to eight tables, each with an id of its own. */
export const sceneArb = ({
  minTables = 1,
  maxTables = 8,
}: {
  minTables?: number;
  maxTables?: number;
} = {}): fc.Arbitrary<ClassroomScene> =>
  fc
    .uniqueArray(fc.uuid(), { minLength: minTables, maxLength: maxTables })
    .chain((ids) => fc.tuple(...ids.map((id) => tableArb(id))))
    .chain((tables) =>
      fc.record({
        tables: fc.constant(tables),
        totalStudents: fc.nat({ max: 36 }),
        fillFromFront: fc.option(fc.boolean(), { nil: undefined }),
      }),
    )
    .map(({ fillFromFront, ...scene }) =>
      fillFromFront === undefined ? scene : { ...scene, fillFromFront },
    );

/**
 * Some of the students on some of the seats, each at most once, the seats
 * holding the students themselves as the app's live state does.
 */
export const seatingArb = (
  students: readonly Student[],
  scene: ClassroomScene,
): fc.Arbitrary<SeatingArrangement> => {
  const seatCount = scene.tables.reduce(
    (sum, table) => sum + table.seatCount,
    0,
  );
  return fc
    .shuffledSubarray([...students], {
      maxLength: Math.min(students.length, seatCount),
    })
    .chain((seated) =>
      fc
        .shuffledSubarray(range(seatCount), {
          minLength: seated.length,
          maxLength: seated.length,
        })
        .map((slots) => {
          const flat: (Student | null)[] = Array.from(
            { length: seatCount },
            () => null,
          );
          slots.forEach((slot, index) => {
            flat[slot] = seated[index]!;
          });
          let offset = 0;
          return scene.tables.map((table) => {
            const seats = flat.slice(offset, offset + table.seatCount);
            offset += table.seatCount;
            return seats;
          });
        }),
    );
};

/** Locks on some of the seated students, naming their table by id. */
export const locksArb = (
  seating: SeatingArrangement,
  scene: ClassroomScene,
): fc.Arbitrary<LockedPositions> => {
  const seated = seating.flatMap((seats, table) =>
    seats.flatMap((student, seat) =>
      student ? [{ id: student.id, table, seat }] : [],
    ),
  );
  return fc
    .subarray(seated)
    .map((picked) =>
      Object.fromEntries(
        picked.map(({ id, table, seat }) => [
          id,
          { table, seat, tableId: scene.tables[table]!.id },
        ]),
      ),
    );
};

const mixSettingsArb: fc.Arbitrary<MixSettings | null> = fc.option(
  fc.constant({
    ...DEFAULT_MIX_WEIGHTS,
    criteriaVersion: MIX_CRITERIA_VERSION,
  }),
  { nil: null },
);

/**
 * A class as the app keeps it: students, the open room's scene and seating,
 * saved plans and mixes in its rooms or in rooms that are gone, the other
 * rooms parked with their own seating.
 */
export const classRecordArb = (): fc.Arbitrary<ClassRecord> =>
  fc
    .record({
      id: fc.uuid(),
      name: nameArb,
      createdAt: isoDate,
      students: studentsArb(),
      scene: sceneArb(),
      roomIds: fc.uniqueArray(fc.uuid(), { minLength: 1, maxLength: 3 }),
      planCount: fc.nat({ max: 3 }),
      mixCount: fc.nat({ max: 3 }),
    })
    .chain(({ students, scene, roomIds, planCount, mixCount, ...base }) => {
      const roomRef = fc.oneof(
        fc.constantFrom(...roomIds),
        fc.constant('room-that-is-gone'),
        fc.constant(undefined),
      );
      const planArb: fc.Arbitrary<SavedPlan> = fc
        .record({
          id: fc.uuid(),
          name: nameArb,
          date: isoDate.map((date) => date.slice(0, 10)),
          seating: seatingArb(students, scene),
          roomId: roomRef,
        })
        .map(({ roomId, ...plan }) => ({
          ...plan,
          scene,
          ...(roomId ? { roomId } : {}),
        }));
      const mixArb = (id: number): fc.Arbitrary<MixResult> =>
        fc
          .record({
            timestamp: isoDate,
            seating: seatingArb(students, scene),
            roomId: roomRef,
          })
          .map(({ roomId, ...mix }) => ({
            ...mix,
            id,
            mixSettings: { ...DEFAULT_MIX_WEIGHTS },
            ...(roomId ? { roomId } : {}),
          }));
      const parkedArb = fc.option(
        seatingArb(students, scene).map((seating) => ({
          scene,
          seating,
          lockedPositions: {},
          circleLayout: null,
          activePlanId: null,
        })),
        { nil: undefined },
      );
      return fc
        .record({
          currentSeating: seatingArb(students, scene),
          plans: fc.tuple(...range(planCount).map(() => planArb)),
          mixes: fc.tuple(...range(mixCount).map((index) => mixArb(index + 1))),
          parked: fc.tuple(...roomIds.map(() => parkedArb)),
          activeRoomId: fc.option(
            fc.oneof(fc.constantFrom(...roomIds), fc.constant('gone')),
            { nil: undefined },
          ),
          openPlan: fc.nat(),
          mixSettings: mixSettingsArb,
        })
        .chain((parts) =>
          locksArb(parts.currentSeating, scene).map((lockedPositions) => {
            const rooms: RoomRecord[] = roomIds.map((id, index) => ({
              id,
              name: `Raum ${index + 1}`,
              createdAt: base.createdAt,
              ...(parts.parked[index] ? { parked: parts.parked[index] } : {}),
            }));
            const plans = parts.plans as SavedPlan[];
            const record: ClassRecord = {
              ...base,
              updatedAt: base.createdAt,
              students,
              seatingHistory: plans,
              mixHistory: parts.mixes as MixResult[],
              currentSeating: parts.currentSeating,
              lockedPositions,
              mixSettings: parts.mixSettings,
              classroomScene: scene,
              circleLayout: null,
              activePlanId:
                plans.length > 0
                  ? plans[parts.openPlan % plans.length]!.id
                  : null,
              rooms,
              ...(parts.activeRoomId
                ? { activeRoomId: parts.activeRoomId }
                : {}),
            };
            return record;
          }),
        );
    });

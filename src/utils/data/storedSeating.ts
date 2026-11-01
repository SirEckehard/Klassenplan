// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Seating as it is stored: who sits where by id, not a copy of every student
 * (decision 0035).
 *
 * The app works with students on the seats, and so does everything that
 * reads a plan. Storage and the backup keep their ids instead: a plan, a mix,
 * a parked room or a circle copied every student's name, markers and
 * partners, some 13 KB for one mix of 24 students, and kept the class as it
 * was then rather than as it is. `dehydrate…` turns the working form into the
 * stored one where it is written; `hydrate…` turns it back where it is read,
 * against the class's students as they are now — a student deleted since sits
 * nowhere, as loading a plan has always shown it.
 *
 * Reading takes both forms: data written before decision 0035, and by a tab
 * still running an older build, holds whole students, which count by their
 * id like any other seat.
 */
import type {
  ClassCollectionState,
  ClassRecord,
  ExportBundle,
  MixResult,
  RoomRecord,
  RoomWorkingState,
  SavedPlan,
  SeatingArrangement,
  Student,
} from '@/types';
import type {
  CircleExportData,
  CircleLayout,
  CircleStudentPosition,
} from '@/types/Circle';

/** A stored seat: a student's id, or a whole student in older data. */
type StoredSeat = string | Student | null;
type StoredSeating = StoredSeat[][];

type StoredCirclePosition = Omit<CircleStudentPosition, 'student'> & {
  studentId?: string;
  student?: Student;
};
type StoredCircleLayout = Omit<CircleLayout, 'students'> & {
  students: StoredCirclePosition[];
};

/** The class's students by id, to put back on the seats. */
type StudentIndex = ReadonlyMap<string, Student>;

const indexStudents = (students: readonly Student[] | undefined) =>
  new Map((students ?? []).map((student) => [student.id, student]));

/** The id a stored seat names, in either form. */
function seatStudentId(seat: unknown): string | null {
  if (typeof seat === 'string') return seat;
  if (seat && typeof seat === 'object') {
    const { id } = seat as { id?: unknown };
    if (typeof id === 'string') return id;
  }
  return null;
}

// ===== Seating =====

/** Ids for students; a seat stored already stays as it is. */
function dehydrateSeating(seating: SeatingArrangement): StoredSeating {
  if (!Array.isArray(seating)) return seating;
  return seating.map((table) =>
    Array.isArray(table)
      ? table.map((seat: unknown) => seatStudentId(seat))
      : table,
  );
}

/**
 * The seating with the students on it. Every table keeps its number of seats,
 * so a plan still fits the tables it was made for (`hasPlanForScene`).
 */
function hydrateSeating(
  stored: unknown,
  students: StudentIndex,
): SeatingArrangement {
  if (!Array.isArray(stored)) return [];
  return stored.map((table: unknown) =>
    Array.isArray(table)
      ? table.map((seat: unknown) => {
          const id = seatStudentId(seat);
          return id === null ? null : (students.get(id) ?? null);
        })
      : [],
  );
}

// ===== Circle =====

function dehydrateCircleLayout(
  layout: CircleLayout | null | undefined,
): StoredCircleLayout | null | undefined {
  if (!layout || !Array.isArray(layout.students)) return layout;
  return {
    ...layout,
    students: (layout.students as StoredCirclePosition[]).map(
      ({ student, studentId, ...position }) => ({
        ...position,
        studentId: studentId ?? seatStudentId(student) ?? '',
      }),
    ),
  };
}

/** The circle with its students; a place whose student is gone goes too. */
function hydrateCircleLayout(
  stored: unknown,
  students: StudentIndex,
): CircleLayout | null {
  if (!stored || typeof stored !== 'object') return null;
  const layout = stored as StoredCircleLayout;
  if (!Array.isArray(layout.students)) return stored as CircleLayout;
  const positions: CircleStudentPosition[] = [];
  for (const entry of layout.students) {
    const { studentId, student: storedStudent, ...position } = entry;
    const id = studentId ?? seatStudentId(storedStudent);
    const student = id === null ? undefined : students.get(id);
    if (student) positions.push({ ...position, student });
  }
  return { ...layout, students: positions };
}

// ===== Plans, mixes, rooms =====

function dehydratePlan(plan: SavedPlan): SavedPlan {
  const stored = {
    ...plan,
    seating: dehydrateSeating(plan.seating),
  } as unknown as SavedPlan;
  if (plan.circleLayout) {
    stored.circleLayout = dehydrateCircleLayout(
      plan.circleLayout,
    ) as unknown as CircleLayout;
  }
  return stored;
}

function hydratePlan(plan: SavedPlan, students: StudentIndex): SavedPlan {
  const hydrated: SavedPlan = {
    ...plan,
    seating: hydrateSeating(plan.seating, students),
  };
  if (plan.circleLayout) {
    const circle = hydrateCircleLayout(plan.circleLayout, students);
    if (circle) hydrated.circleLayout = circle;
    else delete hydrated.circleLayout;
  }
  return hydrated;
}

function dehydrateMix(mix: MixResult): MixResult {
  return {
    ...mix,
    seating: dehydrateSeating(mix.seating),
  } as unknown as MixResult;
}

function hydrateMix(mix: MixResult, students: StudentIndex): MixResult {
  return { ...mix, seating: hydrateSeating(mix.seating, students) };
}

function dehydrateWorkingState(state: RoomWorkingState): RoomWorkingState {
  return {
    ...state,
    seating: dehydrateSeating(state.seating),
    circleLayout: dehydrateCircleLayout(state.circleLayout) ?? null,
  } as unknown as RoomWorkingState;
}

function hydrateWorkingState(
  state: RoomWorkingState,
  students: StudentIndex,
): RoomWorkingState {
  return {
    ...state,
    seating: hydrateSeating(state.seating, students),
    circleLayout: hydrateCircleLayout(state.circleLayout, students),
  };
}

const mapRooms = (
  rooms: RoomRecord[] | undefined,
  mapParked: (parked: RoomWorkingState) => RoomWorkingState,
) =>
  Array.isArray(rooms)
    ? rooms.map((room) =>
        room?.parked ? { ...room, parked: mapParked(room.parked) } : room,
      )
    : rooms;

// ===== Classes =====

/** The class as it is stored: every seat an id. */
function dehydrateClassRecord(record: ClassRecord): ClassRecord {
  if (!record || typeof record !== 'object') return record;
  const stored: ClassRecord = {
    ...record,
    currentSeating: dehydrateSeating(
      record.currentSeating,
    ) as unknown as SeatingArrangement,
    seatingHistory: Array.isArray(record.seatingHistory)
      ? record.seatingHistory.map(dehydratePlan)
      : record.seatingHistory,
    mixHistory: Array.isArray(record.mixHistory)
      ? record.mixHistory.map(dehydrateMix)
      : record.mixHistory,
    circleLayout: (dehydrateCircleLayout(record.circleLayout) ??
      null) as unknown as CircleLayout | null,
  };
  if (record.rooms)
    stored.rooms = mapRooms(record.rooms, dehydrateWorkingState);
  return stored;
}

/** The class as the app works with it: its students on every seat. */
function hydrateClassRecord(record: ClassRecord): ClassRecord {
  if (!record || typeof record !== 'object') return record;
  const students = indexStudents(record.students);
  const hydrated: ClassRecord = {
    ...record,
    currentSeating: hydrateSeating(record.currentSeating, students),
    seatingHistory: Array.isArray(record.seatingHistory)
      ? record.seatingHistory.map((plan) => hydratePlan(plan, students))
      : record.seatingHistory,
    mixHistory: Array.isArray(record.mixHistory)
      ? record.mixHistory.map((mix) => hydrateMix(mix, students))
      : record.mixHistory,
    circleLayout: hydrateCircleLayout(record.circleLayout, students),
  };
  if (record.rooms) {
    hydrated.rooms = mapRooms(record.rooms, (parked) =>
      hydrateWorkingState(parked, students),
    );
  }
  return hydrated;
}

/** The collection as it is stored. */
export function dehydrateCollection(
  collection: ClassCollectionState,
): ClassCollectionState {
  if (!collection || !Array.isArray(collection.classes)) return collection;
  return {
    ...collection,
    classes: collection.classes.map(dehydrateClassRecord),
  };
}

/** The collection as the app works with it. */
export function hydrateCollection(
  collection: ClassCollectionState,
): ClassCollectionState {
  if (!collection || !Array.isArray(collection.classes)) return collection;
  return {
    ...collection,
    classes: collection.classes.map(hydrateClassRecord),
  };
}

// ===== Backups =====

/**
 * The backup as it is written (export version 3): the open class's plans,
 * mixes and circle, and every class of the collection, by id.
 */
export function dehydrateExportBundle(bundle: ExportBundle): ExportBundle {
  return {
    ...bundle,
    seatingHistory: bundle.seatingHistory.map(dehydratePlan),
    mixHistory: bundle.mixHistory.map(dehydrateMix),
    ...(bundle.currentCircleLayout
      ? {
          currentCircleLayout: dehydrateCircleLayout(
            bundle.currentCircleLayout,
          ) as unknown as CircleLayout,
        }
      : {}),
    ...(bundle.circleLayouts
      ? {
          circleLayouts: bundle.circleLayouts.map((entry) => ({
            ...entry,
            circleLayout: dehydrateCircleLayout(
              entry.circleLayout,
            ) as unknown as CircleLayout,
            ...(entry.tableLayout
              ? {
                  tableLayout: dehydrateSeating(
                    entry.tableLayout,
                  ) as unknown as SeatingArrangement,
                }
              : {}),
          })),
        }
      : {}),
    ...(bundle.classCollection
      ? {
          classCollection: dehydrateCollection(
            bundle.classCollection as ClassCollectionState,
          ) as ExportBundle['classCollection'],
        }
      : {}),
  };
}

/**
 * The backup as the import works with it, from any export version. The open
 * class's plans, mixes and circle take the backup's own students; the global
 * circle exports, which name no class, every student the backup holds.
 */
export function hydrateExportBundle(bundle: ExportBundle): ExportBundle {
  const openClass = indexStudents(bundle.students);
  const everyone = new Map(openClass);
  const classes = (bundle.classCollection?.classes ?? []) as ClassRecord[];
  for (const entry of classes) {
    for (const student of entry.students ?? []) {
      everyone.set(student.id, student);
    }
  }
  return {
    ...bundle,
    seatingHistory: bundle.seatingHistory.map((plan) =>
      hydratePlan(plan, openClass),
    ),
    mixHistory: bundle.mixHistory.map((mix) => hydrateMix(mix, openClass)),
    ...(bundle.currentCircleLayout
      ? {
          currentCircleLayout: hydrateCircleLayout(
            bundle.currentCircleLayout,
            openClass,
          ),
        }
      : {}),
    ...(bundle.circleLayouts
      ? {
          circleLayouts: bundle.circleLayouts.flatMap(
            (entry): CircleExportData[] => {
              const circleLayout = hydrateCircleLayout(
                entry.circleLayout,
                everyone,
              );
              if (!circleLayout) return [];
              return [
                {
                  ...entry,
                  circleLayout,
                  ...(entry.tableLayout
                    ? {
                        tableLayout: hydrateSeating(
                          entry.tableLayout,
                          everyone,
                        ),
                      }
                    : {}),
                },
              ];
            },
          ),
        }
      : {}),
    ...(bundle.classCollection
      ? {
          classCollection: hydrateCollection(
            bundle.classCollection as ClassCollectionState,
          ) as ExportBundle['classCollection'],
        }
      : {}),
  };
}

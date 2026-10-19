// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The one score of a seating arrangement (decision 0031).
 *
 * A context is built once per mix — or once per plan the teacher reads — and
 * holds every term of `criteria.ts` for the students and seats at hand: the
 * pair terms as a matrix per relation kind, the seat terms per student and
 * seat. An arrangement is then a flat list of student indices per seat
 * (`occupantsOf`), and three questions are cheap to answer about it: its total
 * (`scoreArrangement`), what swapping two seats would change
 * (`swapDelta`, exact — it re-reads every relation the two seats take part
 * in) and what placing a student on an empty seat would cost
 * (`placementCost`).
 */
import type {
  ClassroomScene,
  MixSettings,
  SeatingArrangement,
  Student,
} from '@/types';
import type { PreviousPairWeights } from '@/utils/pairs';
import { seatStudentIdentifier } from '@/utils/pairs';
import { getSeatPositions } from '@/utils/math/seatGeometry';
import { getFeatureDistanceMaps } from '../featureDistances';
import {
  isCloseKind,
  languageTerm,
  pairTerm,
  relationWeight,
  resolveCriterionWeights,
  seatTerm,
  studentFacts,
  tableTerm,
  type CriterionWeights,
  type SeatPlace,
  type StudentFacts,
} from './criteria';
import { frontRowsOf, toleratesRowBehind } from './frontPool';
import {
  getSeatLayout,
  SEAT_RELATION_KINDS,
  type SeatLayout,
} from './seatRelations';

export interface ModelInput {
  scene: ClassroomScene;
  /** The class */
  students: Student[];
  settings: Partial<MixSettings>;
  previousPairs: PreviousPairWeights;
  /**
   * Whether a seat counts as taken when the model asks who sits alone: the
   * seats within the tables' targets while mixing, the occupied seats when a
   * plan is read. Every seat when left out.
   */
  usable?: (table: number, seat: number) => boolean;
  /**
   * A plan whose students are taken in as well when the class no longer has
   * them — a student removed after the plan was made still holds a seat.
   */
  arrangement?: SeatingArrangement;
}

export interface ModelContext {
  scene: ClassroomScene;
  layout: SeatLayout;
  weights: CriterionWeights;
  previousPairs: PreviousPairWeights;
  /** The class, then any seated student it no longer has */
  students: Student[];
  facts: StudentFacts[];
  /** Student index by `seatStudentIdentifier` */
  indexOf: Map<string, number>;
  /** Where every seat is, for the seat terms and the fulfilment */
  places: SeatPlace[];
  /** Pair terms: `kind * n * n + i * n + j` */
  pair: Float64Array;
  /** Seat terms: `student * size + seat` */
  seat: Float64Array;
  hasTableTerms: boolean;
  hasLanguage: boolean;
  /** Marks for collecting the seats a change touches, without a Set */
  stamps: Int32Array;
  stamp: number;
}

/** A plan as one student index per seat; -1 is an empty seat. */
export type Occupants = Int32Array;

const scaledDistance = (
  distance: number | undefined,
  maxDistance: number,
): number | null => {
  if (distance === undefined || !Number.isFinite(distance)) return null;
  return maxDistance > 0 ? Math.min(distance / maxDistance, 1) : 1;
};

export const buildModelContext = (input: ModelInput): ModelContext => {
  const { scene, settings, previousPairs } = input;
  const layout = getSeatLayout(scene);
  const weights = resolveCriterionWeights(settings);

  const students = [...input.students];
  const indexOf = new Map<string, number>();
  students.forEach((student, index) => {
    indexOf.set(seatStudentIdentifier(student), index);
  });
  for (const table of input.arrangement ?? []) {
    for (const student of table ?? []) {
      if (!student) continue;
      const key = seatStudentIdentifier(student);
      if (indexOf.has(key)) continue;
      indexOf.set(key, students.length);
      students.push(student);
    }
  }
  const facts = students.map(studentFacts);
  const n = students.length;
  const size = layout.size;

  const usable = new Uint8Array(size);
  for (let seat = 0; seat < size; seat++) {
    usable[seat] =
      !input.usable || input.usable(layout.tableOf[seat]!, layout.seatOf[seat]!)
        ? 1
        : 0;
  }

  const front = frontRowsOf(
    scene,
    layout,
    facts.filter((fact) => fact.needsFront).length,
    (seat) => usable[seat] === 1,
    toleratesRowBehind(weights.front),
  );
  const distances = getFeatureDistanceMaps(scene, getSeatPositions(scene));
  const places: SeatPlace[] = [];
  for (let seat = 0; seat < size; seat++) {
    const key = layout.keys[seat]!;
    places.push({
      depth: layout.depth[seat]!,
      frontRows: front.behind[seat]!,
      frontTolerance: front.tolerance,
      window: scaledDistance(
        distances.window.get(key),
        distances.maxWindowDistance,
      ),
      door: scaledDistance(distances.door.get(key), distances.maxDoorDistance),
      hasCloseNeighbour: layout.relations[seat]!.some(
        (relation) => isCloseKind(relation.kind) && usable[relation.seat] === 1,
      ),
    });
  }

  const kinds = SEAT_RELATION_KINDS.length;
  const pair = new Float64Array(kinds * n * n);
  for (let kind = 0; kind < kinds; kind++) {
    const base = kind * n * n;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const value = pairTerm(
          weights,
          previousPairs,
          facts[i]!,
          facts[j]!,
          kind,
        );
        if (value === 0) continue;
        pair[base + i * n + j] = value;
        pair[base + j * n + i] = value;
      }
    }
  }

  const seatValues = new Float64Array(n * size);
  for (let i = 0; i < n; i++) {
    for (let seat = 0; seat < size; seat++) {
      seatValues[i * size + seat] = seatTerm(weights, facts[i]!, places[seat]!);
    }
  }

  return {
    scene,
    layout,
    weights,
    previousPairs,
    students,
    facts,
    indexOf,
    places,
    pair,
    seat: seatValues,
    hasTableTerms: weights.gender > 0 || weights.roles > 0,
    hasLanguage: weights.language > 0,
    stamps: new Int32Array(size),
    stamp: 0,
  };
};

/** The student index of every seat of an arrangement. */
export const occupantsOf = (
  context: ModelContext,
  arrangement: SeatingArrangement,
): Occupants => {
  const { layout } = context;
  const occupants = new Int32Array(layout.size).fill(-1);
  for (let seat = 0; seat < layout.size; seat++) {
    const student =
      arrangement[layout.tableOf[seat]!]?.[layout.seatOf[seat]!] ?? null;
    if (!student) continue;
    occupants[seat] = context.indexOf.get(seatStudentIdentifier(student)) ?? -1;
  }
  return occupants;
};

/** The arrangement the occupants stand for, shaped like the scene. */
export const arrangementOf = (
  context: ModelContext,
  occupants: Occupants,
): SeatingArrangement =>
  context.scene.tables.map((table, tableIndex) => {
    const first = context.layout.offsets[tableIndex]!;
    return Array.from({ length: table.seatCount }, (_, seatIndex) => {
      const student = occupants[first + seatIndex]!;
      return student >= 0 ? context.students[student]! : null;
    });
  });

/** The facts of whoever sits at a table. */
export const tableMembers = (
  context: ModelContext,
  occupants: Occupants,
  table: number,
): StudentFacts[] => {
  const { offsets } = context.layout;
  const members: StudentFacts[] = [];
  for (let seat = offsets[table]!; seat < offsets[table + 1]!; seat++) {
    const student = occupants[seat]!;
    if (student >= 0) members.push(context.facts[student]!);
  }
  return members;
};

const tableTermAt = (
  context: ModelContext,
  occupants: Occupants,
  table: number,
): number =>
  tableTerm(context.weights, tableMembers(context, occupants, table));

/**
 * How closely the nearest strong speaker sits to the student on `seat`: the
 * weight of the closest relation within the same table or directly beside.
 */
export const strongSpeakerCloseness = (
  context: ModelContext,
  occupants: Occupants,
  seat: number,
): number => {
  let best = 0;
  for (const relation of context.layout.relations[seat]!) {
    if (!isCloseKind(relation.kind)) continue;
    const other = occupants[relation.seat]!;
    if (other < 0 || !context.facts[other]!.languageStrong) continue;
    best = Math.max(best, relationWeight(relation.kind));
  }
  return best;
};

const languageTermAt = (
  context: ModelContext,
  occupants: Occupants,
  seat: number,
): number => {
  const student = occupants[seat]!;
  if (student < 0) return 0;
  const facts = context.facts[student]!;
  if (!facts.languageNeedsSupport) return 0;
  return languageTerm(
    context.weights,
    facts,
    strongSpeakerCloseness(context, occupants, seat),
  );
};

/** The seats whose language term a change at `seats` can move. */
const languageSeatsAround = (
  context: ModelContext,
  seats: readonly number[],
): number[] => {
  context.stamp += 1;
  const mark = context.stamp;
  const touched: number[] = [];
  const add = (seat: number) => {
    if (context.stamps[seat] === mark) return;
    context.stamps[seat] = mark;
    touched.push(seat);
  };
  for (const seat of seats) {
    add(seat);
    for (const relation of context.layout.relations[seat]!) {
      if (isCloseKind(relation.kind)) add(relation.seat);
    }
  }
  return touched;
};

const languageSum = (
  context: ModelContext,
  occupants: Occupants,
  seats: readonly number[],
): number => {
  let sum = 0;
  for (const seat of seats) sum += languageTermAt(context, occupants, seat);
  return sum;
};

/** The score of an arrangement; lower is better. */
export const scoreArrangement = (
  context: ModelContext,
  occupants: Occupants,
): number => {
  const { layout, facts } = context;
  const n = facts.length;
  const nn = n * n;
  const size = layout.size;
  let total = 0;
  for (let a = 0; a < size; a++) {
    const i = occupants[a]!;
    if (i < 0) continue;
    total += context.seat[i * size + a]!;
    for (const relation of layout.relations[a]!) {
      const b = relation.seat;
      if (b <= a) continue;
      const j = occupants[b]!;
      if (j < 0) continue;
      total += context.pair[relation.kind * nn + i * n + j]!;
    }
  }
  if (context.hasTableTerms) {
    for (let table = 0; table < context.scene.tables.length; table++) {
      total += tableTermAt(context, occupants, table);
    }
  }
  if (context.hasLanguage) {
    for (let a = 0; a < size; a++) {
      total += languageTermAt(context, occupants, a);
    }
  }
  return total;
};

/**
 * What swapping the occupants of seats `a` and `b` changes in the score —
 * exactly: every relation of either seat, the tables of both and the language
 * terms around them are read before and after. An empty seat swaps too: the
 * student moves onto it.
 */
export const swapDelta = (
  context: ModelContext,
  occupants: Occupants,
  a: number,
  b: number,
): number => {
  if (a === b) return 0;
  const A = occupants[a]!;
  const B = occupants[b]!;
  if (A === B) return 0;
  const { layout } = context;
  const n = context.facts.length;
  const nn = n * n;
  const size = layout.size;
  let delta = 0;

  if (A >= 0)
    delta += context.seat[A * size + b]! - context.seat[A * size + a]!;
  if (B >= 0)
    delta += context.seat[B * size + a]! - context.seat[B * size + b]!;

  // The pair of `a` and `b` themselves is symmetric and stays as it is.
  for (const relation of layout.relations[a]!) {
    if (relation.seat === b) continue;
    const other = occupants[relation.seat]!;
    if (other < 0) continue;
    const base = relation.kind * nn + other * n;
    if (A >= 0) delta -= context.pair[base + A]!;
    if (B >= 0) delta += context.pair[base + B]!;
  }
  for (const relation of layout.relations[b]!) {
    if (relation.seat === a) continue;
    const other = occupants[relation.seat]!;
    if (other < 0) continue;
    const base = relation.kind * nn + other * n;
    if (B >= 0) delta -= context.pair[base + B]!;
    if (A >= 0) delta += context.pair[base + A]!;
  }

  if (context.hasTableTerms || context.hasLanguage) {
    const tableA = layout.tableOf[a]!;
    const tableB = layout.tableOf[b]!;
    const around = context.hasLanguage
      ? languageSeatsAround(context, [a, b])
      : [];
    const measure = () => {
      let value = 0;
      if (context.hasTableTerms) {
        value += tableTermAt(context, occupants, tableA);
        if (tableB !== tableA) value += tableTermAt(context, occupants, tableB);
      }
      if (context.hasLanguage) value += languageSum(context, occupants, around);
      return value;
    };
    const before = measure();
    occupants[a] = B;
    occupants[b] = A;
    const after = measure();
    occupants[a] = A;
    occupants[b] = B;
    delta += after - before;
  }

  return delta;
};

/** What placing `student` on the empty `seat` adds to the score. */
export const placementCost = (
  context: ModelContext,
  occupants: Occupants,
  student: number,
  seat: number,
): number => {
  const { layout } = context;
  const n = context.facts.length;
  const nn = n * n;
  let cost = context.seat[student * layout.size + seat]!;
  for (const relation of layout.relations[seat]!) {
    const other = occupants[relation.seat]!;
    if (other < 0) continue;
    cost += context.pair[relation.kind * nn + other * n + student]!;
  }
  if (context.hasTableTerms || context.hasLanguage) {
    const table = layout.tableOf[seat]!;
    const around = context.hasLanguage
      ? languageSeatsAround(context, [seat])
      : [];
    const measure = () =>
      (context.hasTableTerms ? tableTermAt(context, occupants, table) : 0) +
      (context.hasLanguage ? languageSum(context, occupants, around) : 0);
    const before = measure();
    occupants[seat] = student;
    const after = measure();
    occupants[seat] = -1;
    cost += after - before;
  }
  return cost;
};

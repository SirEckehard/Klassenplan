// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Pure helpers behind the plan usage record — see `@/types/PlanUsage` for what
 * it is and `@/repositories/planUsageStore` for where it is stored.
 *
 * Nothing here touches storage or the clock, so the merge rules can be asserted
 * exactly instead of statistically.
 */
import type {
  ClassroomScene,
  MixResult,
  PlanFeedback,
  PlanUsage,
  PlanUsageSource,
  SavedPlan,
  SeatingArrangement,
  Student,
} from '@/types';
import { getSeatLayout } from '@/utils/algorithm/model/seatRelations';
import { hasShapeMismatch } from '@/utils/math/scene';
import { seatPairKey, seatStudentIdentifier } from '@/utils/pairs';

/**
 * How much a single action says about a plan really being in use. A record is
 * rated by its strongest signal, not by their sum: presenting a plan twice is
 * not better evidence than presenting it once.
 */
const PLAN_USAGE_SOURCE_CONFIDENCE: Record<PlanUsageSource, number> = {
  presented: 1,
  exported: 1,
  saved: 0.8,
  edited: 0.3,
  marked: 1,
};

/**
 * Retained records per class. A class changes its seating every few weeks, so
 * this covers roughly two school years before the oldest entry drops out.
 */
export const PLAN_USAGE_LIMIT = 40;

/**
 * The room a plan was made in, which says whose tables were pushed together;
 * null where it is not known.
 */
export type PlanRoom = ClassroomScene | null | undefined;

const seatedOnly = (seats: readonly (Student | null | undefined)[]) =>
  seats.filter((seat): seat is Student => Boolean(seat));

/** A seat of an arrangement: its table, and its place at that table. */
export interface SeatAddress {
  tableIndex: number;
  seatIndex: number;
}

/**
 * Who sat together at one place of the room ({@link seatedTogether}), and
 * where that place is: the tables of a group, or the two seats of a join.
 */
export interface SeatedUnit {
  /** Who sat there, in seat order */
  students: Student[];
  /** The tables of a group, by index; none for a join */
  tables: number[];
  /** The two seats at a join of desks pushed together in a row */
  join: [SeatAddress, SeatAddress] | null;
}

/**
 * {@link seatedTogether} with where each unit stands, for whoever draws it on
 * the plan: a group by its tables, a join by its two seats.
 *
 * @param seating The arrangement
 * @param scene The room it was made in
 */
export function seatedUnits(
  seating: SeatingArrangement | null | undefined,
  scene: PlanRoom,
): SeatedUnit[] {
  if (!seating) return [];
  if (!scene || hasShapeMismatch(scene, seating)) {
    return seating.map((table, tableIndex) => ({
      students: seatedOnly(table ?? []),
      tables: [tableIndex],
      join: null,
    }));
  }
  const layout = getSeatLayout(scene);
  const address = (seat: number): SeatAddress => ({
    tableIndex: layout.tableOf[seat]!,
    seatIndex: layout.seatOf[seat]!,
  });
  const occupant = (seat: number) => {
    const { tableIndex, seatIndex } = address(seat);
    return seating[tableIndex]?.[seatIndex];
  };
  // Groups first, so a group and a join starting at one seat keep that order.
  return [
    ...layout.groups.map((seats) => ({
      first: seats[0] ?? 0,
      seats,
      join: false,
    })),
    ...layout.joins.map(([a, b]) => ({ first: a, seats: [a, b], join: true })),
  ]
    .sort((x, y) => x.first - y.first)
    .map(({ seats, join }) => ({
      students: seatedOnly(seats.map(occupant)),
      tables: join
        ? []
        : [...new Set(seats.map((seat) => address(seat).tableIndex))],
      join: join
        ? ([address(seats[0]!), address(seats[1]!)] as [
            SeatAddress,
            SeatAddress,
          ])
        : null,
    }));
}

/**
 * Who sat together in an arrangement, as the mixing reads the room (decision
 * 0031): the students of every table group — a table on its own, or tables
 * pushed together round a corner or face to face — and the two at every join
 * of desks pushed together in a row, which count as a double desk. Each in
 * seat order, ordered by their first seat; a group with nobody seated is
 * empty. Without the room, or for a room the arrangement was not made for,
 * every table on its own, which is all the records knew up to 3.5.0.
 *
 * @param seating The arrangement
 * @param scene The room it was made in
 */
export function seatedTogether(
  seating: SeatingArrangement | null | undefined,
  scene: PlanRoom,
): Student[][] {
  return seatedUnits(seating, scene).map((unit) => unit.students);
}

/**
 * Pair keys of an arrangement, sorted and free of duplicates: every two who
 * sat together ({@link seatedTogether}).
 *
 * @param seating The arrangement
 * @param scene The room it was made in; without it every table on its own
 */
export function collectSeatingPairKeys(
  seating: SeatingArrangement | null | undefined,
  scene: PlanRoom,
): string[] {
  const keys = new Set<string>();
  for (const unit of seatedTogether(seating, scene)) {
    const identifiers = unit.map(seatStudentIdentifier);
    for (let i = 0; i < identifiers.length; i++) {
      for (let j = i + 1; j < identifiers.length; j++) {
        keys.add(seatPairKey(identifiers[i]!, identifiers[j]!));
      }
    }
  }
  return [...keys].sort();
}

/**
 * A plan as its record knows it: who sat together and the fingerprint of
 * that. Where tables were pushed together, also the fingerprint a record
 * written up to 3.5.0 carries for the plan, which counted every table on its
 * own: such a record still finds its plan, and takes the plan's pairs with
 * the next signal, marking or feedback for it.
 */
export interface PlanPairs {
  pairs: string[];
  fingerprint: string;
  formerFingerprint?: string;
}

/**
 * The pairs and fingerprints of an arrangement, or null for one without a
 * pair, which no record holds.
 *
 * @param seating The arrangement
 * @param scene The room it was made in
 */
export function planPairsOf(
  seating: SeatingArrangement | null | undefined,
  scene: PlanRoom,
): PlanPairs | null {
  const pairs = collectSeatingPairKeys(seating, scene);
  if (pairs.length === 0) return null;
  const fingerprint = computePlanFingerprint(pairs);
  const tablePairs = scene ? collectSeatingPairKeys(seating, null) : pairs;
  if (tablePairs.length === 0) return { pairs, fingerprint };
  const formerFingerprint = computePlanFingerprint(tablePairs);
  return formerFingerprint === fingerprint
    ? { pairs, fingerprint }
    : { pairs, fingerprint, formerFingerprint };
}

/** Whether a record is the record of this plan, by either fingerprint. */
export function isRecordOf(
  entry: PlanUsage,
  plan: Pick<PlanPairs, 'fingerprint' | 'formerFingerprint'>,
): boolean {
  return (
    entry.fingerprint === plan.fingerprint ||
    (plan.formerFingerprint !== undefined &&
      entry.fingerprint === plan.formerFingerprint)
  );
}

/**
 * The index of a plan's record, -1 for none: the record with its fingerprint,
 * or else one written before tables pushed together counted.
 */
function indexOfRecord(
  entries: readonly PlanUsage[],
  plan: Pick<PlanPairs, 'fingerprint' | 'formerFingerprint'>,
): number {
  const index = entries.findIndex(
    (entry) => entry.fingerprint === plan.fingerprint,
  );
  if (index !== -1 || plan.formerFingerprint === undefined) return index;
  return entries.findIndex(
    (entry) => entry.fingerprint === plan.formerFingerprint,
  );
}

/**
 * The record of a plan, by its pairs and fingerprints.
 *
 * @param entries Usage records of one class
 * @param plan The plan's pairs, as {@link planPairsOf} gives them
 */
export function findPlanRecord(
  entries: readonly PlanUsage[],
  plan: Pick<PlanPairs, 'fingerprint' | 'formerFingerprint'>,
): PlanUsage | undefined {
  return entries[indexOfRecord(entries, plan)];
}

/**
 * Stable hash over the pair keys. Two arrangements that seat the same people
 * next to each other share a fingerprint even when the tables were moved
 * around, which is exactly the equality the usage record cares about.
 *
 * Two FNV-1a passes with different offsets are concatenated: a single 32-bit
 * hash would be enough for a few dozen records per class, the second pass makes
 * an accidental collision — which would silently merge two plans — implausible.
 */
export function computePlanFingerprint(pairs: readonly string[]): string {
  const input = pairs.join('|');
  const hash = (offset: number): string => {
    let value = offset;
    for (let i = 0; i < input.length; i++) {
      value ^= input.charCodeAt(i);
      value = Math.imul(value, 0x01000193) >>> 0;
    }
    return value.toString(16).padStart(8, '0');
  };
  return `${hash(0x811c9dc5)}${hash(0x9e3779b9)}`;
}

/** Highest confidence among the given sources. */
export function confidenceForSources(
  sources: readonly PlanUsageSource[],
): number {
  return sources.reduce(
    (best, source) => Math.max(best, PLAN_USAGE_SOURCE_CONFIDENCE[source] ?? 0),
    0,
  );
}

/**
 * A record backed by hand-rearranging alone. Editing says the teacher means
 * this arrangement, but not yet that it was used, so such a record is kept
 * around only until the next arrangement shows up.
 */
function isProvisional(entry: PlanUsage): boolean {
  return (
    entry.sources.length === 1 &&
    entry.sources[0] === 'edited' &&
    entry.confirmed !== true
  );
}

/** Keep the newest {@link PLAN_USAGE_LIMIT} records, oldest dropping out first. */
export function trimPlanUsage(entries: PlanUsage[]): PlanUsage[] {
  if (entries.length <= PLAN_USAGE_LIMIT) return entries;
  return [...entries]
    .sort((a, b) => a.firstSeenAt.localeCompare(b.firstSeenAt))
    .slice(entries.length - PLAN_USAGE_LIMIT);
}

export interface PlanUsageSignal extends PlanPairs {
  source: PlanUsageSource;
  /** ISO 8601 timestamp of the action. */
  at: string;
  /** Id for the record this signal creates; ignored when one already exists. */
  id: string;
}

/** A plan marked or rated by hand: its pairs, its date, an id for a record. */
export type PlanMarking = Pick<
  PlanUsageSignal,
  'pairs' | 'fingerprint' | 'formerFingerprint' | 'at' | 'id'
>;

/**
 * A record as its plan reads now. One found by the fingerprint it was written
 * with up to 3.5.0 takes the plan's pairs, which count the tables pushed
 * together as well; the tables of its feedback sat together then as now.
 */
const upToDate = (entry: PlanUsage, plan: PlanPairs): PlanUsage =>
  entry.fingerprint === plan.fingerprint
    ? entry
    : { ...entry, fingerprint: plan.fingerprint, pairs: [...plan.pairs] };

/**
 * Fold one usage signal into the records of a class.
 *
 * A matching fingerprint extends the existing record instead of appending —
 * that is what keeps a plan presented every week from turning into ten entries.
 * A new arrangement drops any provisional record, because a plan that was
 * edited but never used is not evidence of anything.
 */
export function mergePlanUsageSignal(
  entries: readonly PlanUsage[],
  signal: PlanUsageSignal,
): PlanUsage[] {
  const { pairs, fingerprint, source, at, id } = signal;
  const index = indexOfRecord(entries, signal);

  if (index !== -1) {
    const existing = entries[index];
    const sources = existing.sources.includes(source)
      ? existing.sources
      : [...existing.sources, source];
    const next = [...entries];
    next[index] = {
      ...upToDate(existing, signal),
      sources,
      confidence: confidenceForSources(sources),
      firstSeenAt: at < existing.firstSeenAt ? at : existing.firstSeenAt,
      lastSeenAt: at > existing.lastSeenAt ? at : existing.lastSeenAt,
    };
    return next;
  }

  const record: PlanUsage = {
    id,
    fingerprint,
    pairs: [...pairs],
    firstSeenAt: at,
    lastSeenAt: at,
    sources: [source],
    confidence: confidenceForSources([source]),
  };

  return trimPlanUsage([
    ...entries.filter((entry) => !isProvisional(entry)),
    record,
  ]);
}

/**
 * Mark the plan with these pairs as used, or as not used, by hand.
 *
 * An arrangement that has a record keeps it and only takes the answer, so
 * what was detected for it stays readable. One that has none gets a record of
 * its own, dated `at` — the day the plan was made, so marking an old plan does
 * not make it the most recent one. Marking a plan without a record as not used
 * changes nothing: no record already means it does not count.
 */
export function markPlanUsage(
  entries: readonly PlanUsage[],
  signal: PlanMarking,
  used: boolean,
): PlanUsage[] {
  const { pairs, fingerprint, at, id } = signal;
  const index = indexOfRecord(entries, signal);

  if (index !== -1) {
    const next = [...entries];
    next[index] = { ...upToDate(entries[index], signal), confirmed: used };
    return next;
  }
  if (!used) return [...entries];

  return trimPlanUsage([
    ...entries,
    {
      id,
      fingerprint,
      pairs: [...pairs],
      firstSeenAt: at,
      lastSeenAt: at,
      sources: ['marked'],
      confidence: confidenceForSources(['marked']),
      confirmed: true,
    },
  ]);
}

/**
 * Feedback as it is kept (decision 0054). A good plan names no table. A table
 * that did not work is the sorted ids of who sat there, kept only when at
 * least two of them sat together in this arrangement — every pair of it a
 * pair of the record — and each table once, in a fixed order. Normalising
 * twice changes nothing.
 *
 * @param feedback What the teacher said
 * @param pairs The record's pair keys
 */
export function normalizePlanFeedback(
  feedback: PlanFeedback,
  pairs: readonly string[],
): PlanFeedback {
  if (feedback.rating === 'good') return { rating: 'good', at: feedback.at };

  const known = new Set(pairs);
  const tables = new Map<string, string[]>();
  for (const table of feedback.poorTables ?? []) {
    const ids = [...new Set(table)].sort();
    if (ids.length < 2) continue;
    const allSatTogether = ids.every((id, i) =>
      ids.slice(i + 1).every((other) => known.has(seatPairKey(id, other))),
    );
    if (!allSatTogether) continue;
    tables.set(JSON.stringify(ids), ids);
  }

  // Code-unit order, as the ids themselves: the same on every device.
  const poorTables = [...tables.keys()].sort().map((key) => tables.get(key)!);
  return poorTables.length > 0
    ? { rating: 'poor', poorTables, at: feedback.at }
    : { rating: 'poor', at: feedback.at };
}

/** A table where it did not work, as feedback names it: its sorted ids. */
export const poorTableKey = (ids: readonly string[]): string =>
  JSON.stringify([...ids].sort());

/**
 * Feedback "Nicht gut" with a table added or taken out, the tables named
 * before kept: what choosing a table does, on the plan as in a list.
 *
 * @param feedback The feedback so far, if any
 * @param ids Who sat at the table
 * @param on Whether it did not work there
 * @param at When this was said (ISO 8601)
 */
export function withPoorTable(
  feedback: PlanFeedback | null | undefined,
  ids: readonly string[],
  on: boolean,
  at: string,
): PlanFeedback {
  const key = poorTableKey(ids);
  const kept = (
    feedback?.rating === 'poor' ? (feedback.poorTables ?? []) : []
  ).filter((table) => poorTableKey(table) !== key);
  const poorTables = on ? [...kept, [...ids].sort()] : kept;
  return poorTables.length > 0
    ? { rating: 'poor', poorTables, at }
    : { rating: 'poor', at };
}

/**
 * Say how the plan with these pairs went, or take that back (`null`).
 *
 * Feedback is given for a plan in use, so it confirms the record, and a plan
 * without one gets a record of its own with the source `marked`, dated `at` —
 * the day the plan was made, as {@link markPlanUsage} does. Taking it back
 * leaves the record as used. Feedback outlasts every later signal for the
 * same arrangement, since a signal only extends the record.
 *
 * @param entries Records of one class
 * @param signal The plan's pairs, fingerprint, date and an id for a new record
 * @param feedback What the teacher said, or null to take it back
 */
export function withPlanFeedback(
  entries: readonly PlanUsage[],
  signal: PlanMarking,
  feedback: PlanFeedback | null,
): PlanUsage[] {
  const { pairs, fingerprint, at, id } = signal;
  const index = indexOfRecord(entries, signal);

  if (index !== -1) {
    const existing = upToDate(entries[index], signal);
    const next = [...entries];
    if (feedback === null) {
      const rest = { ...existing };
      delete rest.feedback;
      next[index] = rest;
    } else {
      next[index] = {
        ...existing,
        confirmed: true,
        feedback: normalizePlanFeedback(feedback, existing.pairs),
      };
    }
    return next;
  }
  if (feedback === null) return [...entries];

  return trimPlanUsage([
    ...entries,
    {
      id,
      fingerprint,
      pairs: [...pairs],
      firstSeenAt: at,
      lastSeenAt: at,
      sources: ['marked'],
      confidence: confidenceForSources(['marked']),
      confirmed: true,
      feedback: normalizePlanFeedback(feedback, pairs),
    },
  ]);
}

/**
 * The records as they count for a class. With the detection switched off only
 * what the teacher marked as used counts: every record that was never
 * answered reads as not used. The stored records stay as they are, so
 * switching the detection back on lets them count again.
 *
 * Resolving the records once, where they are loaded, keeps every reader —
 * the neighbourhood view, the statistics, the repetition scoring — on the same
 * {@link isCountedUsage}.
 *
 * @param entries Stored records of one class
 * @param manual Whether the class marks its plans by hand
 */
export function resolvePlanUsageMode(
  entries: PlanUsage[],
  manual: boolean,
): PlanUsage[] {
  if (!manual) return entries;
  return entries.map((entry) =>
    entry.confirmed === true ? entry : { ...entry, confirmed: false },
  );
}

/**
 * Whether a record counts towards the neighbourhood evaluation and the
 * repetition scoring. One definition for both, so the number a teacher reads
 * and the number the algorithm optimizes cannot drift apart.
 *
 * A record the teacher took out of the count never counts. Everything else
 * counts once something stronger than a hand edit was seen for it — editing
 * alone says the arrangement was meant, not that it was used.
 */
export function isCountedUsage(entry: PlanUsage): boolean {
  if (entry.confirmed === false) return false;
  if (entry.confirmed === true) return true;
  return entry.sources.some((source) => source !== 'edited');
}

/**
 * Whether a record belongs to a class, judged by whether any of its pairs names
 * somebody in it.
 *
 * A record whose pairs name nobody from the class came from a different one —
 * that is the shape cross-class contamination takes. Judging by "any" rather
 * than "all" is deliberate: a student who left the class must not invalidate
 * the plans they were part of.
 *
 * @param entry Record to test
 * @param knownIdentifiers Student ids of the class, plus names for pair keys
 *   written before students carried ids
 */
export function usageBelongsToClass(
  entry: PlanUsage,
  knownIdentifiers: ReadonlySet<string>,
): boolean {
  return entry.pairs.some((key) => {
    const separator = key.indexOf('::');
    if (separator === -1) return knownIdentifiers.has(key);
    return (
      knownIdentifiers.has(key.slice(0, separator)) ||
      knownIdentifiers.has(key.slice(separator + 2))
    );
  });
}

/**
 * Whether a plan in use of the class carries feedback that counts: then
 * "Erfahrung" has something to weigh, and the criteria panel shows it
 * (decision 0054).
 *
 * @param entries Usage records of one class, resolved for its mode
 */
export function hasPlanFeedback(entries: readonly PlanUsage[]): boolean {
  return entries.some((entry) => entry.feedback && isCountedUsage(entry));
}

/**
 * The record of an arrangement, by its pairs: a plan seating the same people
 * side by side is the same plan in use. None for a plan without a pair.
 *
 * @param entries Usage records of one class
 * @param seating The arrangement to look up
 * @param scene The room it was made in
 */
export function findPlanUsage(
  entries: readonly PlanUsage[],
  seating: SeatingArrangement | null | undefined,
  scene: PlanRoom,
): PlanUsage | undefined {
  const plan = planPairsOf(seating, scene);
  return plan ? findPlanRecord(entries, plan) : undefined;
}

/** One pair of students and how often they were neighbours. */
export interface NeighborPairStat {
  /** Pair key, `"idA::idB"`. */
  key: string;
  studentIdA: string;
  studentIdB: string;
  /** Number of counted seating plans that sat them together. */
  count: number;
  /** ISO 8601 timestamp of the most recent of those plans. */
  lastSeenAt: string;
}

/**
 * Aggregate the usage records into "who sat next to whom", most frequent first.
 *
 * Counting *plans*, not signals, is the point: a plan presented every week for
 * a term is one shared plan, because the record behind it is one record.
 *
 * @param entries Usage records of one class
 */
export function buildNeighborhoodStats(
  entries: readonly PlanUsage[],
): NeighborPairStat[] {
  const stats = new Map<string, NeighborPairStat>();

  for (const entry of entries) {
    if (!isCountedUsage(entry)) continue;

    for (const key of entry.pairs) {
      const existing = stats.get(key);
      if (existing) {
        existing.count += 1;
        if (entry.lastSeenAt > existing.lastSeenAt) {
          existing.lastSeenAt = entry.lastSeenAt;
        }
        continue;
      }

      const [studentIdA = '', studentIdB = ''] = key.split('::');
      stats.set(key, {
        key,
        studentIdA,
        studentIdB,
        count: 1,
        lastSeenAt: entry.lastSeenAt,
      });
    }
  }

  return [...stats.values()].sort(
    (a, b) =>
      b.count - a.count ||
      b.lastSeenAt.localeCompare(a.lastSeenAt) ||
      a.key.localeCompare(b.key),
  );
}

/** Where a record's arrangement came from, as far as the class still knows. */
export interface UsageOrigin {
  /** Names of the saved plans that seat the same people side by side. */
  planNames: string[];
  /** Names of the rooms those plans — or, without one, a mix — were made in. */
  roomNames: string[];
}

/**
 * The saved plans and rooms behind each record, by fingerprint.
 *
 * A record holds pairs, not a plan, so plan and room are read from the plans
 * and mixes of the class that seat the same people side by side — the saved
 * plans first, a mix only for an arrangement no saved plan holds, which gives
 * its room but no name. Each name appears once; an arrangement found nowhere
 * (its plan deleted, its mix trimmed) has no entry.
 *
 * A plan is read in the room it was saved with, a mix in its room's tables
 * as they are, and each is noted under both its fingerprints, so a record
 * written before tables pushed together counted finds it too.
 *
 * @param plans Saved plans of one class
 * @param mixes Recent mixes of that class
 * @param rooms The class's rooms, for their names and tables
 */
export function buildUsageOrigins(
  plans: readonly SavedPlan[],
  mixes: readonly MixResult[],
  rooms: readonly { id: string; name: string; scene?: ClassroomScene }[],
): Map<string, UsageOrigin> {
  const roomsById = new Map(rooms.map((room) => [room.id, room]));
  const origins = new Map<string, UsageOrigin>();
  const addOnce = (list: string[], value: string | undefined) => {
    if (value && !list.includes(value)) list.push(value);
  };

  const note = (
    plan: PlanPairs,
    roomId: string | undefined,
    planName: string | undefined,
  ) => {
    for (const fingerprint of [plan.fingerprint, plan.formerFingerprint]) {
      if (fingerprint === undefined) continue;
      const origin = origins.get(fingerprint) ?? {
        planNames: [],
        roomNames: [],
      };
      addOnce(origin.planNames, planName);
      addOnce(
        origin.roomNames,
        roomId ? roomsById.get(roomId)?.name : undefined,
      );
      origins.set(fingerprint, origin);
    }
  };

  for (const plan of plans) {
    const pairs = planPairsOf(plan.seating, plan.scene);
    if (pairs) note(pairs, plan.roomId, plan.name);
  }
  const fromPlans = new Set(origins.keys());
  for (const mix of mixes) {
    const scene = mix.roomId ? roomsById.get(mix.roomId)?.scene : undefined;
    const pairs = planPairsOf(mix.seating, scene);
    if (!pairs || fromPlans.has(pairs.fingerprint)) continue;
    note(pairs, mix.roomId, undefined);
  }
  return origins;
}

const LEGACY_DATE_PATTERN = /^(\d{2})\.(\d{2})\.(\d{4})$/;
const ISO_DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Turn a stored `SavedPlan.date` into a timestamp. Date-only values are read as
 * local midnight, matching how the rest of the app parses them; the German
 * strings written before the ISO switch are converted rather than dropped.
 * Returns null for anything else so the caller can skip the plan.
 */
export function storedPlanDateToTimestamp(stored: string): string | null {
  if (ISO_DATE_ONLY_PATTERN.test(stored)) {
    const [year, month, day] = stored.split('-').map(Number);
    return new Date(year, month - 1, day).toISOString();
  }

  const legacy = LEGACY_DATE_PATTERN.exec(stored);
  if (legacy) {
    const [, day, month, year] = legacy;
    return new Date(Number(year), Number(month) - 1, Number(day)).toISOString();
  }

  const parsed = new Date(stored);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/**
 * Seed usage records from plans that were saved before the signals existed.
 *
 * Only plans the teacher named count: an auto-save is written when leaving step
 * 3 and says nothing about the plan being used. Plans with the same
 * arrangement collapse into one record.
 *
 * @param plans Saved plans of one class
 * @param createId Id factory, injected so tests stay deterministic
 */
export function buildBackfillUsage(
  plans: readonly SavedPlan[],
  createId: () => string,
): PlanUsage[] {
  let entries: PlanUsage[] = [];

  for (const plan of plans) {
    if (plan.autoSaved === true) continue;
    const at = storedPlanDateToTimestamp(plan.date ?? '');
    if (!at) continue;
    const pairs = planPairsOf(plan.seating, plan.scene);
    if (!pairs) continue;

    entries = mergePlanUsageSignal(entries, {
      ...pairs,
      source: 'saved',
      at,
      id: createId(),
    });
  }

  return entries;
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type {
  MixSettings,
  ClassroomScene,
  SeatingArrangement,
  Student,
  SavedPlan,
  PlanUsage,
} from '@/types';
import { shuffleArray } from './shuffle';
import { buildPreviousPairs, type PreviousPairWeights } from '@/utils/pairs';
import { getWishPartnerIds } from '@/utils/student/partnerUtils';
import { hasActiveWeights, logDebug, logWarn } from '@/utils';
import { importanceOfWeight } from '@/utils/mixImportance';
import { seatTargetsFor, tablesHeldByCount } from './seatTargets';
import { isTableActive } from '../math/scene';
import { createRng, type RandomSource } from './rng';
import {
  runSimulatedAnnealing,
  type AnnealingConfig,
  type RefinementProgressReporter,
  DEFAULT_ANNEALING_CONFIG,
} from './simulatedAnnealing';
import {
  arrangementOf,
  buildModelContext,
  occupantsOf,
  placementCost,
  scoreArrangement,
  swapDelta,
  type ModelContext,
  type Occupants,
} from './model/objective';
import { frontSeatPool } from './model/frontPool';

/**
 * Everything one mix decides by (decisions 0027, 0031): the criterion model
 * of the class in this room, how many students every table takes, who is
 * locked where and which seats the students needing a front seat "Sehr
 * wichtig" are kept to.
 */
interface MixProblem {
  context: ModelContext;
  settings: Partial<MixSettings>;
  /** The students of the class: the first `classSize` of the context */
  classSize: number;
  targets: number[];
  /** Locked students by seat, those of the class whose lock fits the room */
  locks: Map<number, number>;
  /** Students who may sit only in the front pool */
  hardFront: Uint8Array;
  pool: Uint8Array;
  rng: RandomSource;
}

/**
 * The locks that hold: a student of the class, a seat the room has, and the
 * first lock on a seat — a second student locked to the same seat is mixed.
 */
const validLocks = (
  context: ModelContext,
  classSize: number,
  lockedPositions: Record<string, { table: number; seat: number }>,
): Map<number, number> => {
  const { scene, layout } = context;
  const locks = new Map<number, number>();
  const lockedStudents = new Set<number>();
  for (const [id, position] of Object.entries(lockedPositions)) {
    const student = context.students.findIndex((entry) => entry.id === id);
    if (student < 0 || student >= classSize || lockedStudents.has(student)) {
      continue;
    }
    const table = scene.tables[position.table];
    if (!table || position.seat < 0 || position.seat >= table.seatCount) {
      continue;
    }
    const seat = layout.offsets[position.table]! + position.seat;
    if (locks.has(seat)) continue;
    locks.set(seat, student);
    lockedStudents.add(student);
  }
  return locks;
};

/**
 * Builds what a mix decides by. A seat counts as taken when the model asks
 * who sits alone if it lies within its table's target: those are the seats
 * the mix fills.
 */
const buildMixProblem = ({
  students,
  scene,
  settings,
  previousPairs,
  targets,
  lockedPositions,
  rng,
  arrangement,
}: {
  students: Student[];
  scene: ClassroomScene;
  settings: Partial<MixSettings>;
  previousPairs: PreviousPairWeights;
  targets: number[];
  lockedPositions: Record<string, { table: number; seat: number }>;
  rng: RandomSource;
  /** A plan to refine, whose students are taken in as they are seated */
  arrangement?: SeatingArrangement;
}): MixProblem => {
  const context = buildModelContext({
    scene,
    students,
    settings,
    previousPairs,
    usable: (table, seat) => seat < (targets[table] ?? 0),
    arrangement,
  });
  const classSize = students.length;
  const locks = validLocks(context, classSize, lockedPositions);
  const { layout } = context;
  const usable = (seat: number) =>
    layout.seatOf[seat]! < (targets[layout.tableOf[seat]!] ?? 0);

  // Only "Sehr wichtig" holds a student to the front rows (decision 0031);
  // below it the front seat is a weight like any other. A lock wins.
  const hardFront = new Uint8Array(context.students.length);
  const lockedStudents = new Set(locks.values());
  if (
    importanceOfWeight(settings.preferFrontForNeedsFrontSeat ?? 0) ===
    'essential'
  ) {
    context.facts.forEach((facts, student) => {
      if (
        student < classSize &&
        facts.needsFront &&
        !lockedStudents.has(student)
      ) {
        hardFront[student] = 1;
      }
    });
  }
  const pool = frontSeatPool(
    scene,
    layout,
    hardFront.reduce((sum, flag) => sum + flag, 0),
    usable,
    (seat) => usable(seat) && !locks.has(seat),
  );

  return {
    context,
    settings,
    classSize,
    targets,
    locks,
    hardFront,
    pool,
    rng,
  };
};

/**
 * How bound a student is in this mix: how many of the active criteria ask
 * something of them. The construction seats the most bound students first,
 * while most seats are still open to them.
 */
const constraintDegree = (problem: MixProblem, student: number): number => {
  const weights = problem.context.weights;
  const facts = problem.context.facts[student]!;
  let degree = 0;
  if (weights.wish > 0) degree += facts.wishRank.size;
  if (weights.avoid > 0) degree += facts.avoidRank.size;
  if (
    facts.restless &&
    (weights.restless > 0 || weights.concentrationNearRestless > 0)
  ) {
    degree++;
  }
  if (
    facts.concentration &&
    (weights.concentration > 0 || weights.concentrationNearRestless > 0)
  ) {
    degree++;
  }
  if (facts.shy && weights.shy > 0) degree++;
  if (facts.needsFront && weights.front > 0) degree++;
  if (
    (facts.strong || facts.weak) &&
    (weights.peerTutoring > 0 || weights.homogeneous > 0)
  ) {
    degree++;
  }
  if (facts.languageNeedsSupport && weights.language > 0) degree++;
  if (facts.role && weights.roles > 0) degree++;
  if (facts.height && weights.height > 0) degree++;
  return degree;
};

/**
 * Reorders students so that wished-for partners are placed adjacently in the
 * processing queue. Mutual wishes take priority over one-sided wishes;
 * remaining students retain their original order.
 *
 * Pure function — does not touch the arrangement. Returns the input list
 * unchanged when `settings.considerWishPartners` is falsy.
 */
export function reorderByWishPartners(
  ordered: Student[],
  settings: Partial<MixSettings>,
): Student[] {
  if (!settings.considerWishPartners) return ordered;

  const reordered: Student[] = [];
  const seen = new Set<string>();
  const map = new Map(ordered.map((s) => [s.id, s] as const));

  // A wish pointing at the student themselves would pair them with themselves
  // below and push the same student into `reordered` twice — one seat too many
  // for them, none for somebody else. The editor and the CSV import both drop
  // such an id; this is the guard for data that came in another way.
  const getWishIds = (s: Student): string[] =>
    getWishPartnerIds(s).filter((id) => id !== s.id && map.has(id));

  const wishGraph = new Map<string, Set<string>>();
  for (const s of ordered) {
    const wishIds = getWishIds(s);
    for (const wishId of wishIds) {
      if (!wishGraph.has(wishId)) wishGraph.set(wishId, new Set());
      wishGraph.get(wishId)!.add(s.id);
    }
  }

  // Phase 1: mutual wishes first (highest priority)
  //
  // Every wish is checked, in the order the student ranked them, and the first
  // mutual one wins. Looking at the primary wish alone let a genuinely mutual
  // pair further down the list lose to a one-sided pairing in phase 2 — since
  // wishes became a list, that is no longer the rare case.
  const mutualPairs: [Student, Student][] = [];
  for (const s of ordered) {
    if (seen.has(s.id)) continue;

    for (const wishId of getWishIds(s)) {
      const partner = map.get(wishId)!;
      if (seen.has(partner.id)) continue;
      if (!getWishIds(partner).includes(s.id)) continue;

      mutualPairs.push([s, partner]);
      reordered.push(s, partner);
      seen.add(s.id);
      seen.add(partner.id);
      break;
    }
  }

  // Phase 2: one-sided wishes with first-come conflict resolution
  const conflicts = new Map<string, string[]>();
  for (const s of ordered) {
    if (seen.has(s.id)) continue;
    const wishIds = getWishIds(s);
    if (wishIds.length === 0) continue;

    for (const wishId of wishIds) {
      const partner = map.get(wishId)!;
      if (seen.has(partner.id)) continue;

      const wishers = wishGraph.get(wishId);
      if (wishers && wishers.size > 1) {
        if (!conflicts.has(wishId)) conflicts.set(wishId, []);
        conflicts.get(wishId)!.push(s.id);
      }
      reordered.push(s, partner);
      seen.add(s.id);
      seen.add(partner.id);
      break;
    }
  }

  // Phase 3: remaining students keep original order
  for (const s of ordered) {
    if (!seen.has(s.id)) {
      reordered.push(s);
      seen.add(s.id);
    }
  }

  const totalWishes = reordered.filter((s) => getWishIds(s).length > 0).length;
  logDebug(
    'Wish partner processing completed',
    {
      totalWishes,
      mutualPairs: mutualPairs.length,
      conflicts: conflicts.size,
      conflictDetails: Array.from(conflicts.entries()).map(
        ([targetId, wisherIds]) => {
          const targetName = map.get(targetId)?.name ?? 'Unknown';
          const wisherNames = wisherIds
            .map((id) => map.get(id)?.name ?? 'Unknown')
            .join(', ');
          return `${targetName} wanted by: ${wisherNames}`;
        },
      ),
    },
    'seatingAlgorithm',
  );

  return reordered;
}

/** Ties within this distance count as one score. */
const SCORE_EPSILON = 1e-9;

/**
 * How many starts a mix with criteria takes. One annealing comes close to its
 * best; three from different starts settle what one leaves to chance, at a
 * time a teacher does not notice (docs/PERFORMANCE.md).
 */
const MIX_STARTS = 3;

/**
 * Seats a student on the seat `accept` allows that costs the least, a tie
 * falling to each tied seat alike: the n-th tie replaces the choice with
 * probability 1/n. Picking the last tie half the time put the first students
 * at the tables added last. `lookahead` adds what a seat still promises for
 * the students to come.
 */
const placeBest = (
  problem: MixProblem,
  occupants: Occupants,
  student: number,
  accept: (seat: number) => boolean,
  lookahead: (student: number, seat: number) => number = () => 0,
): number => {
  const { context, rng } = problem;
  let best = -1;
  let bestCost = Number.POSITIVE_INFINITY;
  let ties = 0;
  for (let seat = 0; seat < context.layout.size; seat++) {
    if (!accept(seat)) continue;
    const cost =
      placementCost(context, occupants, student, seat) +
      lookahead(student, seat);
    if (cost < bestCost - SCORE_EPSILON) {
      best = seat;
      bestCost = cost;
      ties = 1;
    } else if (cost <= bestCost + SCORE_EPSILON) {
      ties += 1;
      if (rng() * ties < 1) best = seat;
    }
  }
  return best;
};

/**
 * The construction: locked students first, then — while no criterion carries
 * weight — everybody else spread over the seats the tables take at random,
 * every order equally likely; otherwise the students needing a front seat
 * "Sehr wichtig" within the front rows, then the others, the most bound
 * first, each on the seat that costs the plan least so far.
 */
const construct = (problem: MixProblem): Occupants => {
  const { context, targets, rng } = problem;
  const { layout } = context;
  const occupants: Occupants = new Int32Array(layout.size).fill(-1);
  const seated = new Int32Array(context.scene.tables.length);
  const place = (seat: number, student: number) => {
    occupants[seat] = student;
    seated[layout.tableOf[seat]!]! += 1;
  };
  for (const [seat, student] of problem.locks) place(seat, student);

  const lockedStudents = new Set(problem.locks.values());
  const waiting: number[] = [];
  for (let student = 0; student < problem.classSize; student++) {
    if (!lockedStudents.has(student)) waiting.push(student);
  }
  const open = (seat: number) => {
    const table = layout.tableOf[seat]!;
    return (
      occupants[seat]! < 0 &&
      layout.seatOf[seat]! < (targets[table] ?? 0) &&
      seated[table]! < (targets[table] ?? 0)
    );
  };

  // The students still to come whom a student would gladly sit with: a wish
  // either way, a tutoring or a same-level pair. The first of two is seated
  // where the other still finds room beside them — the score cannot see a
  // classmate who is not seated yet.
  const n = context.facts.length;
  const nn = n * n;
  const kinds = context.pair.length / Math.max(1, nn);
  const attracted: number[][] = context.facts.map((_, i) => {
    const partners: number[] = [];
    for (let j = 0; j < problem.classSize; j++) {
      if (j === i) continue;
      for (let kind = 0; kind < kinds; kind++) {
        if (context.pair[kind * nn + i * n + j]! < 0) {
          partners.push(j);
          break;
        }
      }
    }
    return partners;
  });
  const waitingFlag = new Uint8Array(n);
  const lookahead = (student: number, seat: number) => {
    const table = layout.tableOf[seat]!;
    let promise = 0;
    for (const relation of layout.relations[seat]!) {
      const other = relation.seat;
      const otherTable = layout.tableOf[other]!;
      const room =
        occupants[other]! < 0 &&
        layout.seatOf[other]! < (targets[otherTable] ?? 0) &&
        seated[otherTable]! + (otherTable === table ? 1 : 0) <
          (targets[otherTable] ?? 0);
      if (!room) continue;
      const base = relation.kind * nn + student * n;
      for (const partner of attracted[student]!) {
        if (waitingFlag[partner] !== 1) continue;
        const value = context.pair[base + partner]!;
        if (value < promise) promise = value;
      }
    }
    return promise;
  };

  if (!hasActiveWeights(problem.settings)) {
    // The seats a table takes, its lowest ones; the students in a random
    // order onto them — so nobody is placed by anything but chance.
    const slots: number[] = [];
    context.scene.tables.forEach((_, table) => {
      let room = (targets[table] ?? 0) - seated[table]!;
      for (
        let seat = layout.offsets[table]!;
        seat < layout.offsets[table + 1]! && room > 0;
        seat++
      ) {
        if (open(seat)) {
          slots.push(seat);
          room -= 1;
        }
      }
    });
    shuffleArray(waiting, rng).forEach((student, index) => {
      const seat = slots[index];
      if (seat !== undefined) place(seat, student);
    });
  } else {
    for (const student of waiting) waitingFlag[student] = 1;
    const seatStudent = (student: number, seat: number) => {
      if (seat < 0) return;
      place(seat, student);
      waitingFlag[student] = 0;
    };
    const hard = shuffleArray(
      waiting.filter((student) => problem.hardFront[student] === 1),
      rng,
    );
    for (const student of hard) {
      waitingFlag[student] = 0;
      const inPool = placeBest(
        problem,
        occupants,
        student,
        (candidate) => problem.pool[candidate] === 1 && open(candidate),
        lookahead,
      );
      seatStudent(
        student,
        inPool >= 0
          ? inPool
          : placeBest(problem, occupants, student, open, lookahead),
      );
    }

    const others = shuffleArray(
      waiting.filter((student) => problem.hardFront[student] !== 1),
      rng,
    )
      .map((student, position) => ({
        student,
        position,
        degree: constraintDegree(problem, student),
      }))
      .sort((a, b) => b.degree - a.degree || a.position - b.position)
      .map(({ student }) => context.students[student]!);
    for (const student of reorderByWishPartners(others, problem.settings)) {
      const index = context.students.indexOf(student);
      waitingFlag[index] = 0;
      seatStudent(index, placeBest(problem, occupants, index, open, lookahead));
    }
  }

  // Nobody is left without a seat: past the targets if it has to be.
  const placed = new Set(occupants);
  const unplaced = waiting.filter((student) => !placed.has(student));
  if (unplaced.length > 0) {
    logWarn(
      'Students left over after the construction; seating them past the targets',
      { count: unplaced.length },
      'seatingAlgorithm',
    );
    const inMix = (seat: number) => {
      const table = context.scene.tables[layout.tableOf[seat]!];
      return table ? isTableActive(table) : false;
    };
    for (const student of unplaced) {
      let seat = -1;
      for (let candidate = 0; candidate < layout.size; candidate++) {
        if (occupants[candidate]! >= 0) continue;
        if (inMix(candidate)) {
          seat = candidate;
          break;
        }
        if (seat < 0) seat = candidate;
      }
      if (seat >= 0) place(seat, student);
    }
  }
  return occupants;
};

/**
 * The refinement: Simulated Annealing over the occupants, by the exact swap
 * delta of the model. A swap keeps every seat at or beyond its table's target
 * empty and — on the tables `held` names — no table above its count, never
 * moves a locked student, and keeps a student needing a front seat "Sehr
 * wichtig" within the front pool.
 */
const refine = (
  problem: MixProblem,
  occupants: Occupants,
  fixed: Uint8Array,
  held: boolean[] | null,
  config: AnnealingConfig,
  onProgress?: RefinementProgressReporter,
): Occupants => {
  const { context, targets, hardFront, pool, rng } = problem;
  const { layout } = context;
  const seated = new Int32Array(context.scene.tables.length);
  const movers: number[] = [];
  for (let seat = 0; seat < layout.size; seat++) {
    const student = occupants[seat]!;
    if (student < 0) continue;
    seated[layout.tableOf[seat]!]! += 1;
    if (fixed[seat] !== 1) movers.push(student);
  }

  const canSwap = (a: number, b: number): boolean => {
    if (a === b || fixed[a] === 1 || fixed[b] === 1) return false;
    const A = occupants[a]!;
    const B = occupants[b]!;
    if (A < 0 && B < 0) return false;
    const tableA = layout.tableOf[a]!;
    const tableB = layout.tableOf[b]!;
    if (B >= 0 && layout.seatOf[a]! >= (targets[tableA] ?? 0)) return false;
    if (A >= 0 && layout.seatOf[b]! >= (targets[tableB] ?? 0)) return false;
    if (tableA !== tableB && A < 0 !== B < 0) {
      // One student moves onto an empty seat of another table; a table
      // already above its count (a student put there by hand) may lose one.
      const destination = A >= 0 ? tableB : tableA;
      if (
        held?.[destination] &&
        seated[destination]! >= targets[destination]!
      ) {
        return false;
      }
    }
    if (A >= 0 && hardFront[A] === 1 && pool[b] !== 1) return false;
    if (B >= 0 && hardFront[B] === 1 && pool[a] !== 1) return false;
    return true;
  };

  const onSwap = (a: number, b: number) => {
    const tableA = layout.tableOf[a]!;
    const tableB = layout.tableOf[b]!;
    if (tableA === tableB) return;
    // After the swap: the seat holding a student gained one.
    if (occupants[a]! >= 0 && occupants[b]! < 0) {
      seated[tableA]! += 1;
      seated[tableB]! -= 1;
    } else if (occupants[b]! >= 0 && occupants[a]! < 0) {
      seated[tableB]! += 1;
      seated[tableA]! -= 1;
    }
  };

  const result = runSimulatedAnnealing(
    {
      occupants,
      movers,
      canSwap,
      delta: (a, b) => swapDelta(context, occupants, a, b),
      onSwap,
      score: () => scoreArrangement(context, occupants),
      rng,
    },
    config,
    onProgress,
  );
  return result.occupants;
};

/** The pairs of the plans in use, which a mix avoids (decision 0032). */
const previousPairsFor = (
  students: Student[],
  seatingHistory: SavedPlan[],
  settings: Partial<MixSettings>,
  options: {
    planUsage?: PlanUsage[];
    planUsageSince?: string | null;
    planUsageManual?: boolean;
  },
): PreviousPairWeights =>
  settings.avoidPreviousPairs
    ? buildPreviousPairs(seatingHistory, {
        planUsage: options.planUsage,
        since: options.planUsageSince,
        manual: options.planUsageManual,
        studentCount: students.length,
      })
    : new Map<string, number>();

const lockSeats = (problem: MixProblem): Uint8Array => {
  const fixed = new Uint8Array(problem.context.layout.size);
  for (const seat of problem.locks.keys()) fixed[seat] = 1;
  return fixed;
};

/**
 * Generates a seating arrangement by the construction alone: the students
 * placed one by one, each on the seat that costs the plan least so far — or,
 * while no criterion carries weight, spread at random.
 *
 * @param students - Current student roster that needs to be seated
 * @param seatingHistory - Saved plans, read for repetition while no usage
 *   record counts
 * @param lockedPositions - Mapping of student ids to fixed table/seat positions
 * @param settings - Mix settings controlling weights for every constraint
 * @param scene - Classroom layout including tables, seats, and geometry helpers
 * @param options - Optional overrides; `rng` seeds the run for reproducible output
 * @returns Seating arrangement with per-table assignments
 */
export function generateSeatingPlan(
  students: Student[],
  seatingHistory: SavedPlan[],
  lockedPositions: Record<string, { table: number; seat: number }>,
  settings: Partial<MixSettings>,
  scene: ClassroomScene,
  options?: {
    rng?: RandomSource;
    /** Records of plans that were really in use; see `buildPreviousPairs`. */
    planUsage?: PlanUsage[];
    /** When the neighbourhoods were last reset; see `buildPreviousPairs`. */
    planUsageSince?: string | null;
    /** Whether the class marks its plans by hand; see `buildPreviousPairs`. */
    planUsageManual?: boolean;
  },
): SeatingArrangement {
  const startTime = performance.now();
  const rng = options?.rng ?? Math.random;
  const problem = buildMixProblem({
    students,
    scene,
    settings,
    previousPairs: previousPairsFor(
      students,
      seatingHistory,
      settings,
      options ?? {},
    ),
    targets: seatTargetsFor(students, scene, lockedPositions, rng),
    lockedPositions,
    rng,
  });
  const arrangement = arrangementOf(problem.context, construct(problem));
  logDebug(
    'Seating plan generation completed',
    {
      studentCount: students.length,
      duration: `${(performance.now() - startTime).toFixed(1)}ms`,
    },
    'seatingAlgorithm',
  );
  return arrangement;
}

/**
 * One "Mischen": the construction and, while a criterion asks for it, its
 * refinement, as one session that decides by one set of facts (decision
 * 0027) and one score (decision 0031). Both phases take the tables' targets
 * the construction drew, and both weigh the pairs of the plans in use — never
 * an earlier mix, never the plan on screen as such (decision 0032), never the
 * pairs the construction itself just made — by recency and by kind. Within
 * the session every table is held to the construction's count.
 *
 * @param options.refine - Whether the refinement runs; without it the
 *   construction stands
 * @returns The arrangement the session settled on
 */
export function runMixSession(
  students: Student[],
  seatingHistory: SavedPlan[],
  lockedPositions: Record<string, { table: number; seat: number }>,
  settings: Partial<MixSettings>,
  scene: ClassroomScene,
  options?: {
    rng?: RandomSource;
    /** Records of plans that were really in use; see `buildPreviousPairs`. */
    planUsage?: PlanUsage[];
    /** When the neighbourhoods were last reset; see `buildPreviousPairs`. */
    planUsageSince?: string | null;
    /** Whether the class marks its plans by hand; see `buildPreviousPairs`. */
    planUsageManual?: boolean;
    refine?: boolean;
    /** Custom Simulated Annealing configuration */
    annealingConfig?: Partial<AnnealingConfig>;
    /** The refinement's progress; see `RefineOptions.onProgress`. */
    onProgress?: RefinementProgressReporter;
  },
): SeatingArrangement {
  const rng = options?.rng ?? Math.random;
  const problem = buildMixProblem({
    students,
    scene,
    settings,
    previousPairs: previousPairsFor(
      students,
      seatingHistory,
      settings,
      options ?? {},
    ),
    targets: seatTargetsFor(students, scene, lockedPositions, rng),
    lockedPositions,
    rng,
  });
  if (!options?.refine) {
    return arrangementOf(problem.context, construct(problem));
  }

  // Several starts, each a construction and its refinement from a random
  // stream of its own, and the best plan by the one score wins — never one
  // worse than a construction (decision 0031).
  const fixed = lockSeats(problem);
  const held = scene.tables.map(() => true);
  const config = { ...DEFAULT_ANNEALING_CONFIG, ...options.annealingConfig };
  let best: Occupants | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let start = 0; start < MIX_STARTS; start++) {
    const startProblem = {
      ...problem,
      rng: createRng(Math.floor(rng() * 0x100000000)),
    };
    const constructed = construct(startProblem);
    const constructedScore = scoreArrangement(problem.context, constructed);
    const refined = refine(
      startProblem,
      constructed.slice(),
      fixed,
      held,
      config,
      options.onProgress &&
        ((fraction) => options.onProgress!((start + fraction) / MIX_STARTS)),
    );
    const refinedScore = scoreArrangement(problem.context, refined);
    const [candidate, score] =
      refinedScore <= constructedScore
        ? [refined, refinedScore]
        : [constructed, constructedScore];
    if (score < bestScore - SCORE_EPSILON) {
      best = candidate;
      bestScore = score;
    }
  }
  return arrangementOf(problem.context, best!);
}

/**
 * What the two phases of a mix session share: the students each table takes
 * and the weights of the pairs that sat together before (`runMixSession`).
 */
export interface MixSessionContext {
  targets: number[];
  previousPairs: PreviousPairWeights;
}

/** How `refineSeatingLocal` runs. */
export interface RefineOptions {
  /** Custom Simulated Annealing configuration */
  annealingConfig?: Partial<AnnealingConfig>;
  /** Random source; pass a seeded one for reproducible refinement */
  rng?: RandomSource;
  /** Records of plans that were really in use; see `buildPreviousPairs`. */
  planUsage?: PlanUsage[];
  /** When the neighbourhoods were last reset; see `buildPreviousPairs`. */
  planUsageSince?: string | null;
  /** Whether the class marks its plans by hand; see `buildPreviousPairs`. */
  planUsageManual?: boolean;
  /**
   * Called with a 0..1 fraction as the refinement advances. Injected by the
   * worker layer, never sent through the request payload — a function does
   * not survive structured cloning.
   */
  onProgress?: RefinementProgressReporter;
  /**
   * What the construction of the same mix decided by, to refine by the same:
   * its targets and its earlier pairs (decision 0027).
   */
  session?: MixSessionContext;
}

/**
 * Refines an existing seating arrangement by Simulated Annealing on the score
 * of the criterion model (decision 0031).
 *
 * The app refines only within "Mischen" (`runMixSession`); this is the same
 * refinement for an arrangement on its own — a test, the benchmark. It does
 * not count the arrangement it refines as an earlier plan (decision 0027),
 * and draws targets of its own unless a session hands over the
 * construction's: then every table is held to its count, otherwise only the
 * tables `tablesHeldByCount` names.
 *
 * @param students - Students contained in the active seating arrangement
 * @param seatingHistory - Saved plans, read for repetition while no usage
 *   record counts
 * @param lockedPositions - Students that must keep their current seat assignment
 * @param currentSeating - Active arrangement that should be improved
 * @param settings - Mix settings that define scoring weights for refinement
 * @param scene - Classroom layout describing seat geometry and adjacency
 * @param options - Random source, history and progress
 * @param start - Optional custom arrangement to use as the refinement baseline
 * @returns Enhanced seating arrangement, never worse by the score than the
 *   baseline
 */
export function refineSeatingLocal(
  students: Student[],
  seatingHistory: SavedPlan[],
  lockedPositions: Record<string, { table: number; seat: number }>,
  currentSeating: SeatingArrangement,
  settings: Partial<MixSettings>,
  scene: ClassroomScene,
  options?: RefineOptions,
  start?: SeatingArrangement,
): SeatingArrangement {
  const refineStartTime = performance.now();
  const base = start ?? currentSeating;
  if (!base || base.length === 0) return base;

  const rng = options?.rng ?? Math.random;
  const session = options?.session;
  const problem = buildMixProblem({
    students,
    scene,
    settings,
    previousPairs:
      session?.previousPairs ??
      previousPairsFor(students, seatingHistory, settings, {
        planUsage: options?.planUsage,
        planUsageSince: options?.planUsageSince,
        planUsageManual: options?.planUsageManual,
      }),
    targets:
      session?.targets ?? seatTargetsFor(students, scene, lockedPositions, rng),
    lockedPositions,
    rng,
    arrangement: base,
  });
  const occupants = occupantsOf(problem.context, base);

  // A student counts as locked where the lock and the seat agree.
  const fixed = new Uint8Array(problem.context.layout.size);
  for (let seat = 0; seat < fixed.length; seat++) {
    const student = occupants[seat]!;
    if (student < 0) continue;
    const position = lockedPositions[problem.context.students[student]!.id];
    const table = position ? scene.tables[position.table] : undefined;
    if (
      position &&
      table &&
      position.seat >= 0 &&
      position.seat < table.seatCount &&
      problem.context.layout.offsets[position.table]! + position.seat === seat
    ) {
      fixed[seat] = 1;
    }
  }

  const refined = refine(
    problem,
    occupants,
    fixed,
    session ? scene.tables.map(() => true) : tablesHeldByCount(scene),
    { ...DEFAULT_ANNEALING_CONFIG, ...options?.annealingConfig },
    options?.onProgress,
  );

  logDebug(
    'Seating refinement completed',
    { duration: `${(performance.now() - refineStartTime).toFixed(1)}ms` },
    'seatingAlgorithm',
  );
  return arrangementOf(problem.context, refined);
}

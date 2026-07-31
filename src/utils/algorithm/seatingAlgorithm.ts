// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type {
  MixSettings,
  ClassroomScene,
  SeatingArrangement,
  Student,
  SavedPlan,
  MixResult,
  NeighborWeightSettings,
} from '@/types';
import { evenTargetsFor } from '@/utils/distribution';
import { shuffleArray } from './shuffle';
import { buildPreviousPairs } from '@/utils/pairs';
import {
  DEFAULT_TRIES_PER_PASS,
  DEFAULT_PASSES,
  DEFAULT_NEIGHBOR_WEIGHTS,
  REFINEMENT_TABLE_SELECTION,
  logDebug,
} from '@/utils';
import {
  getSeatPositions,
  getSeatNeighborhoods,
  type SeatNeighborDirection,
} from '../math/seatGeometry';
import { getFeatureDistanceMaps } from './featureDistances';
import { randomInt, type RandomSource } from './rng';
import {
  scoreTable,
  scoreTablePair,
  globalGenderDiff as globalArrangementGenderDiff,
  type ArrangementScoringContext,
} from './scoring/arrangementScoring';
import {
  runSimulatedAnnealing,
  type AnnealingConfig,
  type AnnealingContext,
  DEFAULT_ANNEALING_CONFIG,
} from './simulatedAnnealing';
import {
  type ScoringContext,
  scoreGenderMix,
  scorePartners,
  scoreSpecialNeeds,
  scoreHistory,
  scorePerformance,
  scoreHeightPlacement,
  scoreEnvironment,
  scoreLanguageMixing,
  scoreSocialRoles,
  isRestless,
  isShy,
  requiresFront,
  countSpecialFlags,
  emptyCounts,
  isSeatAvailable,
  isTableFull,
  tableStats as getTableStats,
} from './scoring';
import { determineFrontDirection } from './orientationUtils';

const buildDirectionalWeights = (
  settings: Partial<MixSettings>,
  category: keyof NeighborWeightSettings,
): Record<SeatNeighborDirection, number> => ({
  direct:
    settings.neighborWeights?.[category]?.direct ??
    DEFAULT_NEIGHBOR_WEIGHTS[category].direct ??
    1,
  side:
    settings.neighborWeights?.[category]?.side ??
    DEFAULT_NEIGHBOR_WEIGHTS[category].side ??
    1,
  front:
    settings.neighborWeights?.[category]?.front ??
    DEFAULT_NEIGHBOR_WEIGHTS[category].front ??
    1,
  back:
    settings.neighborWeights?.[category]?.back ??
    DEFAULT_NEIGHBOR_WEIGHTS[category].back ??
    1,
});

/**
 * Carries shared state across the four phases of `generateSeatingPlan`
 * (`initializeAssignment` → `runPass` → `finalize`). Created in phase 1
 * and mutated in place by phase 2.
 */
export type AssignmentContext = {
  students: Student[];
  scene: ClassroomScene;
  settings: Partial<MixSettings>;
  lockedPositions: Record<string, { table: number; seat: number }>;
  arrangement: SeatingArrangement;
  ordered: Student[];
  validLockedIds: Set<string>;
  seatCounts: number[];
  tableCount: number;
  seatNeighborhoods: ReturnType<typeof getSeatNeighborhoods>;
  behavioralNeighborWeights: Record<SeatNeighborDirection, number>;
  genderNeighborWeights: Record<SeatNeighborDirection, number>;
  seatPositions: Map<string, { x: number; y: number }>;
  windowSeatDistances: Map<string, number>;
  doorSeatDistances: Map<string, number>;
  maxWindowDistance: number;
  maxDoorDistance: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  orientation: ReturnType<typeof determineFrontDirection>;
  studentById: Map<string, Student>;
  previousPairs: Map<string, number>;
  targets: number[];
  globalCounts: ReturnType<typeof emptyCounts>;
  /** Random source of this run; seeded in tests, `Math.random` in production */
  rng: RandomSource;
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

  const getWishIds = (s: Student): string[] => {
    if (s.wishPartnerIds && s.wishPartnerIds.length > 0) {
      return s.wishPartnerIds.filter((id) => map.has(id));
    }
    if (s.wishPartnerId && map.has(s.wishPartnerId)) {
      return [s.wishPartnerId];
    }
    return [];
  };

  const wishGraph = new Map<string, Set<string>>();
  for (const s of ordered) {
    const wishIds = getWishIds(s);
    for (const wishId of wishIds) {
      if (!wishGraph.has(wishId)) wishGraph.set(wishId, new Set());
      wishGraph.get(wishId)!.add(s.id);
    }
  }

  // Phase 1: mutual wishes first (highest priority)
  const mutualPairs: [Student, Student][] = [];
  for (const s of ordered) {
    if (seen.has(s.id)) continue;
    const wishIds = getWishIds(s);
    if (wishIds.length === 0) continue;

    const primaryWishId = wishIds[0]!;
    const partner = map.get(primaryWishId)!;
    const partnerWishIds = getWishIds(partner);

    if (partnerWishIds.includes(s.id) && !seen.has(partner.id)) {
      mutualPairs.push([s, partner]);
      reordered.push(s, partner);
      seen.add(s.id);
      seen.add(partner.id);
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

/**
 * Phase 1 — Build the assignment context, classify students, place locked and
 * front-row students into the empty arrangement, and compute the processing
 * order including wish-partner reordering. Returns a fresh `AssignmentContext`
 * ready for `runPass`.
 */
export function initializeAssignment(
  students: Student[],
  seatingHistory: SavedPlan[],
  mixHistory: MixResult[],
  lockedPositions: Record<string, { table: number; seat: number }>,
  settings: Partial<MixSettings>,
  scene: ClassroomScene,
  currentSeating?: SeatingArrangement,
  rng: RandomSource = Math.random,
): AssignmentContext {
  const previousPairs = settings.avoidPreviousPairs
    ? buildPreviousPairs(seatingHistory, {
        mixHistory,
        currentSeating,
        studentCount: students.length,
      })
    : new Map<string, number>();

  const frontRow: Student[] = [];
  const restless: Student[] = [];
  const shy: Student[] = [];
  const rest: Student[] = [];

  students.forEach((s) => {
    if (countSpecialFlags(s) > 1) frontRow.push(s);
    else if (isRestless(s)) restless.push(s);
    else if (isShy(s)) shy.push(s);
    else if (requiresFront(s, settings)) frontRow.push(s);
    else rest.push(s);
  });

  const seatCounts = scene.tables.map((t) => t.seatCount);
  const tableCount = seatCounts.length;
  const seatNeighborhoods = getSeatNeighborhoods(scene);
  const behavioralNeighborWeights = buildDirectionalWeights(
    settings,
    'behavioral',
  );
  const genderNeighborWeights = buildDirectionalWeights(settings, 'gender');
  const seatPositions = getSeatPositions(scene);
  const {
    window: windowSeatDistances,
    door: doorSeatDistances,
    maxWindowDistance,
    maxDoorDistance,
  } = getFeatureDistanceMaps(scene, seatPositions);
  const xs = Array.from(seatPositions.values()).map((p) => p.x);
  const ys = Array.from(seatPositions.values()).map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const orientation = determineFrontDirection(scene);

  const arrangement: SeatingArrangement = Array.from(
    { length: tableCount },
    (_, t) => Array.from({ length: seatCounts[t] ?? 0 }, () => null),
  );

  const studentById = new Map(students.map((s) => [s.id, s] as const));
  const studentIdSet = new Set(students.map((s) => s.id));
  const validLockedIds: Set<string> = new Set();
  for (const [sid, pos] of Object.entries(lockedPositions)) {
    if (!studentIdSet.has(sid)) continue;
    const stu = studentById.get(sid)!;
    if (
      pos.table < 0 ||
      pos.table >= tableCount ||
      pos.seat < 0 ||
      pos.seat >= seatCounts[pos.table]!
    )
      continue;
    if (arrangement[pos.table]![pos.seat] !== null) continue;
    arrangement[pos.table]![pos.seat] = stu;
    validLockedIds.add(sid);
  }

  const frontStudents = students.filter(
    (s) => requiresFront(s, settings) && !validLockedIds.has(s.id),
  );
  if (frontStudents.length > 0) {
    // Sort seats by front position (respecting board orientation and dominant axis).
    // Random tie-breaker keeps fair distribution among equidistant seats.
    const sortedSeats = Array.from(seatPositions.entries()).sort((a, b) => {
      let diff: number;
      if (orientation.dominantAxis === 'x') {
        diff = orientation.frontIsHighX ? b[1].x - a[1].x : a[1].x - b[1].x;
      } else {
        diff = orientation.frontIsHighY ? b[1].y - a[1].y : a[1].y - b[1].y;
      }
      return diff !== 0 ? diff : rng() - 0.5;
    });
    let idx = 0;
    for (const fs of frontStudents) {
      while (idx < sortedSeats.length) {
        const [key] = sortedSeats[idx++];
        const [tStr, sStr] = key.split('-');
        const t = Number(tStr);
        const seat = Number(sStr);
        if (arrangement[t]![seat] === null) {
          arrangement[t]![seat] = fs;
          validLockedIds.add(fs.id);
          break;
        }
      }
    }
  }

  const total = students.length;
  const targets = evenTargetsFor(total, seatCounts, rng);

  const orderedAll: Student[] = [
    ...shuffleArray(frontRow, rng),
    ...shuffleArray(restless, rng),
    ...shuffleArray(shy, rng),
    ...shuffleArray(rest, rng),
  ];
  const orderedFiltered = orderedAll.filter((s) => !validLockedIds.has(s.id));
  const ordered = reorderByWishPartners(orderedFiltered, settings);

  const globalCounts = emptyCounts();
  for (let i = 0; i < arrangement.length; i++) {
    const t = arrangement[i]!;
    for (let j = 0; j < t.length; j++) {
      const s = t[j];
      if (s?.gender) {
        globalCounts[s.gender]++;
      }
    }
  }

  return {
    students,
    scene,
    settings,
    lockedPositions,
    arrangement,
    ordered,
    validLockedIds,
    seatCounts,
    tableCount,
    seatNeighborhoods,
    behavioralNeighborWeights,
    genderNeighborWeights,
    seatPositions,
    windowSeatDistances,
    doorSeatDistances,
    maxWindowDistance,
    maxDoorDistance,
    minX,
    maxX,
    minY,
    maxY,
    orientation,
    studentById,
    previousPairs,
    targets,
    globalCounts,
    rng,
  };
}

/** Build the per-seat scoring context for a candidate placement. */
function buildScoringContext(
  ctx: AssignmentContext,
  stu: Student,
  tIdx: number,
  seatIdx: number,
): ScoringContext {
  return {
    student: stu,
    tableIndex: tIdx,
    seatIndex: seatIdx,
    arrangement: ctx.arrangement,
    settings: ctx.settings,
    scene: ctx.scene,
    seatCounts: ctx.seatCounts,
    targets: ctx.targets,
    seatNeighborhoods: ctx.seatNeighborhoods,
    seatPositions: ctx.seatPositions,
    minX: ctx.minX,
    maxX: ctx.maxX,
    minY: ctx.minY,
    maxY: ctx.maxY,
    frontIsHighX: ctx.orientation.frontIsHighX,
    frontIsHighY: ctx.orientation.frontIsHighY,
    dominantAxis: ctx.orientation.dominantAxis,
    globalCounts: ctx.globalCounts,
    studentById: ctx.studentById,
    validLockedIds: ctx.validLockedIds,
    previousPairs: ctx.previousPairs,
    lockedPositions: ctx.lockedPositions,
    behavioralNeighborWeights: ctx.behavioralNeighborWeights,
    genderNeighborWeights: ctx.genderNeighborWeights,
    featureDistances: {
      window: ctx.windowSeatDistances,
      door: ctx.doorSeatDistances,
    },
    maxWindowDistance: ctx.maxWindowDistance,
    maxDoorDistance: ctx.maxDoorDistance,
  };
}

/**
 * Score a seat placement using all modular scoring strategies.
 * Returns `POSITIVE_INFINITY` when the seat is unavailable or the table is full.
 */
function scorePlacement(
  ctx: AssignmentContext,
  stu: Student,
  tIdx: number,
  seatIdx: number,
): number {
  const context = buildScoringContext(ctx, stu, tIdx, seatIdx);

  if (!isSeatAvailable(context)) {
    return Number.POSITIVE_INFINITY;
  }
  if (isTableFull(context)) {
    return Number.POSITIVE_INFINITY;
  }

  return (
    scoreGenderMix(context) +
    scorePartners(context) +
    scoreSpecialNeeds(context) +
    scoreHistory(context) +
    scorePerformance(context) +
    scoreHeightPlacement(context) +
    scoreEnvironment(context) +
    scoreLanguageMixing(context) +
    scoreSocialRoles(context)
  );
}

/**
 * Phase 2 — Greedy placement pass: for each ordered student, find the best-
 * scoring open seat across all tables. Falls back to round-robin filling when
 * no seat scores finitely. Mutates `ctx.arrangement` and `ctx.globalCounts`
 * in place and returns the same context for chaining.
 */
export function runPass(ctx: AssignmentContext): AssignmentContext {
  const tableStats = (tIdx: number) => getTableStats(tIdx, ctx.arrangement);

  for (const stu of ctx.ordered) {
    let best: { t: number; s: number; score: number } | null = null;

    for (let t = 0; t < ctx.tableCount; t++) {
      for (let s = 0; s < ctx.seatCounts[t]!; s++) {
        const sc = scorePlacement(ctx, stu, t, s);
        if (!Number.isFinite(sc)) continue;
        if (
          best === null ||
          sc < best.score ||
          (sc === best.score && ctx.rng() < 0.5)
        ) {
          best = { t, s, score: sc };
        }
      }
    }

    if (best) {
      ctx.arrangement[best.t]![best.s] = stu;
      if (stu.gender) {
        ctx.globalCounts[stu.gender]++;
      }
    } else {
      outer: for (let t = 0; t < ctx.tableCount; t++) {
        const { seated } = tableStats(t);
        if (seated >= ctx.targets[t]!) continue;
        for (
          let s = 0;
          s < Math.min(ctx.seatCounts[t]!, ctx.targets[t]!);
          s++
        ) {
          if (ctx.arrangement[t]![s] === null) {
            ctx.arrangement[t]![s] = stu;
            if (stu.gender) {
              ctx.globalCounts[stu.gender]++;
            }
            break outer;
          }
        }
      }
    }
  }

  return ctx;
}

/** Phase 3 — Trivial finalize hook for the four-phase pipeline. */
export function finalize(arrangement: SeatingArrangement): SeatingArrangement {
  return arrangement;
}

/**
 * Generates an optimized seating arrangement that balances behavioral, social, and spatial constraints.
 *
 * Internally chains four phases:
 * 1. {@link initializeAssignment} — build context, classify students, place locked + front-row
 * 2. {@link reorderByWishPartners} — wish-partner reordering (called from phase 1)
 * 3. {@link runPass} — greedy score-based placement
 * 4. {@link finalize} — trailing hook (currently identity)
 *
 * @param students - Current student roster that needs to be seated
 * @param seatingHistory - Previously saved plans used to avoid repeating pairings
 * @param mixHistory - Last algorithm runs for cache-aware adjacency penalties
 * @param lockedPositions - Mapping of student ids to fixed table/seat positions
 * @param settings - Mix settings controlling weights for every constraint
 * @param scene - Classroom layout including tables, seats, and geometry helpers
 * @param currentSeating - Optional reference arrangement to warm-start the algorithm
 * @param options - Optional overrides; `rng` seeds the run for reproducible output
 * @returns Optimized seating arrangement with per-table assignments
 *
 * @complexity O(n^2 * passes * tries) with n = students.length
 * @performance Typical: 50-200 ms for 30 students across 5 passes and 8 tries per pass
 *
 * @example
 * const arrangement = generateSeatingPlan(
 *   students,
 *   seatingHistory,
 *   mixHistory,
 *   lockedPositions,
 *   { preferGenderMix: 6, avoidRestlessTogether: 4 },
 *   classroomScene,
 *   currentSeating,
 * );
 */
export function generateSeatingPlan(
  students: Student[],
  seatingHistory: SavedPlan[],
  mixHistory: MixResult[],
  lockedPositions: Record<string, { table: number; seat: number }>,
  settings: Partial<MixSettings>,
  scene: ClassroomScene,
  currentSeating?: SeatingArrangement,
  options?: { rng?: RandomSource },
): SeatingArrangement {
  const startTime = performance.now();
  logDebug(
    'Starting seating plan generation',
    {
      studentCount: students.length,
      lockedCount: Object.keys(lockedPositions).length,
    },
    'seatingAlgorithm',
  );

  const ctx = initializeAssignment(
    students,
    seatingHistory,
    mixHistory,
    lockedPositions,
    settings,
    scene,
    currentSeating,
    options?.rng,
  );
  runPass(ctx);

  logDebug(
    'Seating plan generation completed',
    { duration: `${(performance.now() - startTime).toFixed(1)}ms` },
    'seatingAlgorithm',
  );
  return finalize(ctx.arrangement);
}

/**
 * Refines an existing seating arrangement through targeted swap heuristics to reduce constraint violations.
 *
 * This function supports two optimization strategies:
 * 1. **Greedy Refinement (Default)**: Fast, deterministic, hill-climbing approach. Accepts only improvements.
 *    Good for standard cases and minor adjustments.
 * 2. **Simulated Annealing**: Probabilistic approach that can escape local optima.
 *    Good for complex constraints and heavily locked layouts.
 *
 * @see {@link ../../../docs/ALGORITHM.md} for detailed strategy comparison.
 *
 * @param students - Students contained in the active seating arrangement
 * @param seatingHistory - Previously persisted plans for pair avoidance checks
 * @param mixHistory - History of mix operations for recent pairing penalties
 * @param lockedPositions - Students that must keep their current seat assignment
 * @param currentSeating - Active arrangement that should be improved
 * @param settings - Mix settings that define scoring weights for refinement
 * @param scene - Classroom layout describing seat geometry and adjacency
 * @param options - Configuration options including strategy selection (Greedy vs SA)
 * @param start - Optional custom arrangement to use as the refinement baseline
 * @returns Enhanced seating arrangement attempting to improve the provided baseline
 *
 * @complexity Greedy: O(n * passes * tries), SA: O(iterations * cooling_steps)
 *
 * @example
 * // Standard Greedy Refinement
 * const fast = refineSeatingLocal(students, ..., { triesPerPass: 5 });
 *
 * // Deep Optimization with Simulated Annealing
 * const best = refineSeatingLocal(students, ..., {
 *   useAnnealing: true,
 *   annealingConfig: { initialTemp: 15, coolingRate: 0.98 }
 * });
 */
export function refineSeatingLocal(
  students: Student[],
  seatingHistory: SavedPlan[],
  mixHistory: MixResult[],
  lockedPositions: Record<string, { table: number; seat: number }>,
  currentSeating: SeatingArrangement,
  settings: Partial<MixSettings>,
  scene: ClassroomScene,
  options?: {
    triesPerPass?: number;
    passes?: number;
    /** Use Simulated Annealing instead of greedy refinement */
    useAnnealing?: boolean;
    /** Custom Simulated Annealing configuration */
    annealingConfig?: Partial<AnnealingConfig>;
    /** Random source; pass a seeded one for reproducible refinement */
    rng?: RandomSource;
  },
  start?: SeatingArrangement,
): SeatingArrangement {
  const refineStartTime = performance.now();
  logDebug(
    'Starting seating refinement',
    { triesPerPass: options?.triesPerPass, passes: options?.passes },
    'seatingAlgorithm',
  );
  const triesPerPass = options?.triesPerPass ?? DEFAULT_TRIES_PER_PASS;
  const passes = options?.passes ?? DEFAULT_PASSES;
  const rng = options?.rng ?? Math.random;

  const base = start ?? currentSeating;
  if (!base || base.length === 0) return base;

  const seatCounts = scene.tables.map((t) => t.seatCount);
  const tableCount = seatCounts.length;
  const total = students.length;
  const targets = evenTargetsFor(total, seatCounts, rng);
  const referenceSeating = start ?? currentSeating;
  const previousPairs = settings.avoidPreviousPairs
    ? buildPreviousPairs(seatingHistory, {
        mixHistory,
        currentSeating: referenceSeating,
        studentCount: students.length,
      })
    : new Map<string, number>();
  const arr: SeatingArrangement = base.map((t) => [...t]);
  const seatNeighborhoods = getSeatNeighborhoods(scene);
  const behavioralNeighborWeights = buildDirectionalWeights(
    settings,
    'behavioral',
  );
  const genderNeighborWeights = buildDirectionalWeights(settings, 'gender');
  const seatPositions = getSeatPositions(scene);
  const featureDistances = getFeatureDistanceMaps(scene, seatPositions);
  const xs = Array.from(seatPositions.values()).map((p) => p.x);
  const ys = Array.from(seatPositions.values()).map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  // Determine front direction based on board position
  const orientation = determineFrontDirection(scene);

  // Table scoring lives in `scoring/arrangementScoring`. The context holds
  // `arr` by reference, so a candidate swap is evaluated by mutating the
  // arrangement and re-reading the two affected tables — no rebuild per try.
  const scoringContext: ArrangementScoringContext = {
    arrangement: arr,
    settings,
    seatCounts,
    targets,
    seatNeighborhoods,
    seatPositions,
    minX,
    maxX,
    minY,
    maxY,
    orientation,
    previousPairs,
    featureDistances,
    behavioralNeighborWeights,
    genderNeighborWeights,
  };

  const tableScore = (tableIndex: number): number =>
    scoreTable(scoringContext, tableIndex);
  const globalGenderDiff = (): number =>
    globalArrangementGenderDiff(scoringContext);
  const tablesScore = (a: number, b: number): number =>
    scoreTablePair(scoringContext, a, b);

  const frontRequired = students.filter((s) => requiresFront(s, settings));
  const sortedSeatEntries = Array.from(seatPositions.entries()).sort(
    (a, b) => b[1].x - a[1].x,
  );
  const frontSeatSet = new Set<string>();
  for (const [key] of sortedSeatEntries) {
    if (frontSeatSet.size >= frontRequired.length) break;
    const [tStr, sStr] = key.split('-');
    const t = Number(tStr);
    const seat = Number(sStr);
    const occupant = arr[t]?.[seat];
    if (occupant && requiresFront(occupant, settings)) frontSeatSet.add(key);
  }

  const seatHasLocked = (t: number, s: number): boolean => {
    const stu = arr[t]?.[s] as Student | null | undefined;
    if (!stu) return false;
    const lp = lockedPositions[stu.id];
    if (lp && lp.table === t && lp.seat === s) return true;
    return requiresFront(stu, settings) && frontSeatSet.has(`${t}-${s}`);
  };

  // MT-1: Simulated Annealing mode (optional)
  // If enabled, use SA instead of greedy refinement for better global optimization
  if (options?.useAnnealing) {
    const annealingConfig: AnnealingConfig = {
      ...DEFAULT_ANNEALING_CONFIG,
      ...options.annealingConfig,
    };

    const annealingContext: AnnealingContext = {
      rng,
      arrangement: arr,
      seatCounts,
      tableCount,
      targets,
      settings,
      scene,
      lockedPositions,
      scoreTable: tableScore,
      isLocked: seatHasLocked,
    };

    const result = runSimulatedAnnealing(annealingContext, annealingConfig);

    const refineEndTime = performance.now();
    logDebug(
      'Seating refinement (SA) completed',
      {
        duration: `${(refineEndTime - refineStartTime).toFixed(1)}ms`,
        iterations: result.iterations,
        improvements: result.improvements,
      },
      'seatingAlgorithm',
    );

    return result.arrangement;
  }

  // Greedy refinement (default)
  for (let p = 0; p < passes; p++) {
    // QW-2: Calculate table scores and identify problem tables
    // This allows us to prioritize swaps from tables with worst scores
    const tableScores: { index: number; score: number }[] = [];
    for (let t = 0; t < tableCount; t++) {
      tableScores.push({ index: t, score: tableScore(t) });
    }

    // Sort by score descending (worst/highest score first)
    tableScores.sort((a, b) => b.score - a.score);

    // Pick a table, biased towards the worst-scoring ones — a uniform pick
    // would spend most tries on tables that are already fine.
    const pickProblemBiasedTable = (): number => {
      const {
        problemTableBias,
        candidateCount,
        firstChoiceThreshold,
        secondChoiceThreshold,
      } = REFINEMENT_TABLE_SELECTION;
      if (rng() < problemTableBias && tableScores.length > 0) {
        const r = rng();
        const worstCount = Math.min(candidateCount, tableScores.length);
        if (r < firstChoiceThreshold || worstCount === 1) {
          return tableScores[0]!.index;
        } else if (r < secondChoiceThreshold || worstCount === 2) {
          return tableScores[1]!.index;
        } else {
          return tableScores[2]!.index;
        }
      }
      return randomInt(rng, tableCount);
    };

    for (let k = 0; k < triesPerPass; k++) {
      // Use heuristic: first table from problem bias, second table random
      // This targets improvements for the worst tables
      const t1 = pickProblemBiasedTable();
      const s1 = randomInt(rng, seatCounts[t1]!);
      const t2 = randomInt(rng, tableCount);
      const s2 = randomInt(rng, seatCounts[t2]!);

      if (t1 === t2 && s1 === s2) continue;
      const A = arr[t1]?.[s1] as Student | null | undefined;
      const B = arr[t2]?.[s2] as Student | null | undefined;
      if (!A && !B) continue;

      if (seatHasLocked(t1, s1) || seatHasLocked(t2, s2)) continue;

      const before = tablesScore(t1, t2);
      const globalBefore = settings.preferGenderMix ? globalGenderDiff() : 0;

      if ((B && s1 >= targets[t1]!) || (A && s2 >= targets[t2]!)) {
        continue;
      }

      arr[t1]![s1] = B ?? null;
      arr[t2]![s2] = A ?? null;

      const after = tablesScore(t1, t2);
      const globalAfter = settings.preferGenderMix ? globalGenderDiff() : 0;
      if (after > before || globalAfter > globalBefore) {
        arr[t1]![s1] = A ?? null;
        arr[t2]![s2] = B ?? null;
      }
    }
  }

  const refineEndTime = performance.now();
  logDebug(
    'Seating refinement completed',
    { duration: `${(refineEndTime - refineStartTime).toFixed(1)}ms` },
    'seatingAlgorithm',
  );
  return arr;
}

import type {
  MixSettings,
  ClassroomScene,
  SeatingArrangement,
  Student,
  SavedPlan,
  MixResult,
  NeighborWeightSettings,
  ClassroomFeature,
} from '@/types';
import { evenTargetsFor } from '@/utils/distribution';
import { shuffleArray } from './shuffle';
import { buildPreviousPairs } from '@/utils/pairs';
import {
  DEFAULT_TRIES_PER_PASS,
  DEFAULT_PASSES,
  DEFAULT_NEIGHBOR_WEIGHTS,
  logDebug,
  CLASSROOM_WIDTH,
  CLASSROOM_HEIGHT,
} from '@/utils';
import {
  seatPairsFor,
  getSeatPositions,
  getSeatNeighborhoods,
  type SeatNeighborDirection,
} from '../math/seatGeometry';
import { calculateGenderImbalance } from './genderBalance';
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
  scoreTableComposition,
  HEIGHT_PLACEMENT_AMPLIFICATION,
  isRestless,
  isShy,
  isHighPerf,
  isLowPerf,
  isConcentration,
  hasNeedsFrontSeat,
  requiresFront,
  countSpecialFlags,
  specialWeight,
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

type FeatureDistanceMaps = {
  window: Map<string, number>;
  door: Map<string, number>;
  maxWindowDistance: number;
  maxDoorDistance: number;
};

const buildSceneSignature = (scene: ClassroomScene): string => {
  const tableSignature = scene.tables
    .map((table, index) =>
      [
        index,
        table.x,
        table.y,
        table.width,
        table.height,
        table.rotation,
        table.seatCount,
      ].join(':'),
    )
    .join('|');

  const featureSignature = (scene.features ?? [])
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((feature) =>
      [
        feature.id,
        feature.type,
        feature.x,
        feature.y,
        feature.width,
        feature.height,
        feature.rotation ?? 0,
      ].join(':'),
    )
    .join('|');

  return `${tableSignature}#${featureSignature}`;
};

const MAX_FEATURE_DISTANCE_CACHE_SIZE = 100;
const featureDistanceCache = new Map<string, FeatureDistanceMaps>();

const getFeatureDistanceMaps = (
  scene: ClassroomScene,
  seatPositions: Map<string, { x: number; y: number }>,
): FeatureDistanceMaps => {
  const signature = buildSceneSignature(scene);
  const cached = featureDistanceCache.get(signature);
  if (cached) return cached;
  const distances = computeFeatureDistanceMaps(scene, seatPositions);
  featureDistanceCache.set(signature, distances);
  if (featureDistanceCache.size > MAX_FEATURE_DISTANCE_CACHE_SIZE) {
    const firstKey = featureDistanceCache.keys().next().value;
    if (firstKey) {
      featureDistanceCache.delete(firstKey);
    }
  }
  return distances;
};

const distanceToFeature = (x: number, y: number, feature: ClassroomFeature) => {
  const dx = Math.max(feature.x - x, 0, x - (feature.x + feature.width));
  const dy = Math.max(feature.y - y, 0, y - (feature.y + feature.height));
  return Math.hypot(dx, dy);
};

const computeFeatureDistanceMaps = (
  scene: ClassroomScene,
  seatPositions: Map<string, { x: number; y: number }>,
): FeatureDistanceMaps => {
  const features = scene.features ?? [];
  const windowFeatures = features.filter(
    (feature) => feature.type === 'window',
  );
  const doorFeatures = features.filter((feature) => feature.type === 'door');
  const windowDistances = new Map<string, number>();
  const doorDistances = new Map<string, number>();
  let maxWindowDistance = 0;
  let maxDoorDistance = 0;

  const defaultFallbackDistance = Math.hypot(CLASSROOM_WIDTH, CLASSROOM_HEIGHT);

  for (const [seatKey, position] of seatPositions.entries()) {
    if (windowFeatures.length > 0) {
      let minDistance = Number.POSITIVE_INFINITY;
      for (const feature of windowFeatures) {
        const distance = distanceToFeature(position.x, position.y, feature);
        if (distance < minDistance) {
          minDistance = distance;
        }
      }
      windowDistances.set(seatKey, minDistance);
      if (Number.isFinite(minDistance)) {
        maxWindowDistance = Math.max(maxWindowDistance, minDistance);
      }
    } else {
      windowDistances.set(seatKey, Number.POSITIVE_INFINITY);
    }

    if (doorFeatures.length > 0) {
      let minDistance = Number.POSITIVE_INFINITY;
      for (const feature of doorFeatures) {
        const distance = distanceToFeature(position.x, position.y, feature);
        if (distance < minDistance) {
          minDistance = distance;
        }
      }
      doorDistances.set(seatKey, minDistance);
      if (Number.isFinite(minDistance)) {
        maxDoorDistance = Math.max(maxDoorDistance, minDistance);
      }
    } else {
      doorDistances.set(seatKey, Number.POSITIVE_INFINITY);
    }
  }

  return {
    window: windowDistances,
    door: doorDistances,
    maxWindowDistance:
      maxWindowDistance > 0 ? maxWindowDistance : defaultFallbackDistance,
    maxDoorDistance:
      maxDoorDistance > 0 ? maxDoorDistance : defaultFallbackDistance,
  };
};

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

  const totalWishes = reordered.filter(
    (s) => getWishIds(s).length > 0,
  ).length;
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
      return diff !== 0 ? diff : Math.random() - 0.5;
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
  const targets = evenTargetsFor(total, seatCounts);

  const orderedAll: Student[] = [
    ...shuffleArray(frontRow),
    ...shuffleArray(restless),
    ...shuffleArray(shy),
    ...shuffleArray(rest),
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
          (sc === best.score && Math.random() < 0.5)
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
        for (let s = 0; s < Math.min(ctx.seatCounts[t]!, ctx.targets[t]!); s++) {
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

  const base = start ?? currentSeating;
  if (!base || base.length === 0) return base;

  const seatCounts = scene.tables.map((t) => t.seatCount);
  const tableCount = seatCounts.length;
  const total = students.length;
  const targets = evenTargetsFor(total, seatCounts);
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

  // Determine front direction based on board position
  const orientation = determineFrontDirection(scene);

  const preferWindowWeight = settings.preferWindowSeats ?? 0;
  const preferDoorWeight = settings.preferDoorSeats ?? 0;

  const buildSeatKey = (tableIndex: number, seatIndex: number): string =>
    `${tableIndex}-${seatIndex}`;

  const normalizeFeatureDistance = (
    distance: number,
    maxDistance: number,
  ): number => {
    if (!Number.isFinite(distance) || maxDistance <= 0) {
      return 1;
    }
    return Math.min(distance / maxDistance, 1);
  };

  const tableScore = (tIndex: number): number => {
    const t = arr[tIndex] ?? [];
    const members = t.filter(Boolean) as Student[];
    const seatCount = seatCounts[tIndex]!;
    let score = 0;

    const seated = members.length;
    const target = targets[tIndex]!;
    if (seated > target) score += (seated - target) * 0.5;

    const pairs = seatPairsFor(seatCount);
    for (const [a, b] of pairs) {
      const A = t[a];
      const B = t[b];
      if (
        settings.avoidRestlessTogether &&
        A &&
        B &&
        isRestless(A) &&
        isRestless(B)
      ) {
        score +=
          settings.avoidRestlessTogether *
          Math.max(specialWeight(A), specialWeight(B));
      }
      if (settings.avoidShyAlone) {
        if (A && isShy(A) && !B)
          score += settings.avoidShyAlone * specialWeight(A);
        if (B && isShy(B) && !A)
          score += settings.avoidShyAlone * specialWeight(B);
      }
      // Avoid partner logic (higher priority) - now supports arrays
      if (settings.avoidConflictPartners) {
        const getAvoidIds = (s: Student): string[] =>
          s.avoidPartnerIds?.length
            ? s.avoidPartnerIds
            : s.avoidPartnerId
              ? [s.avoidPartnerId]
              : [];

        const avoidIdsA = A ? getAvoidIds(A) : [];
        const avoidIdsB = B ? getAvoidIds(B) : [];
        const avoidA = A && B && avoidIdsA.includes(B.id);
        const avoidB = B && A && avoidIdsB.includes(A.id);
        if (avoidA || avoidB) {
          // High penalty for sitting together
          score += settings.avoidConflictPartners * 2;
        }
      }
      if (settings.considerWishPartners) {
        const getWishIds = (s: Student): string[] =>
          s.wishPartnerIds?.length
            ? s.wishPartnerIds
            : s.wishPartnerId
              ? [s.wishPartnerId]
              : [];
        const getAvoidIds = (s: Student): string[] =>
          s.avoidPartnerIds?.length
            ? s.avoidPartnerIds
            : s.avoidPartnerId
              ? [s.avoidPartnerId]
              : [];

        const wishIdsA = A ? getWishIds(A) : [];
        const wishIdsB = B ? getWishIds(B) : [];
        const avoidIdsA = A ? getAvoidIds(A) : [];
        const avoidIdsB = B ? getAvoidIds(B) : [];

        const wishA = A && B && wishIdsA.includes(B.id);
        const wishB = B && A && wishIdsB.includes(A.id);
        // Check for conflicts (A wishes B, but B avoids A)
        const conflictA =
          A && B && wishIdsA.includes(B.id) && avoidIdsB.includes(A.id);
        const conflictB =
          B && A && wishIdsB.includes(A.id) && avoidIdsA.includes(B.id);
        if ((conflictA || conflictB) && settings.avoidConflictPartners) {
          // Conflict: avoid wins over wish
          score += settings.avoidConflictPartners;
        } else if (wishA || wishB) {
          score -= settings.considerWishPartners;
        } else if (wishIdsA.length > 0 || wishIdsB.length > 0) {
          score += settings.considerWishPartners;
        }
      }
      // Performance-based pairing logic (mutually exclusive options)
      const peerTutoringWeight = settings.peerTutoring ?? 0;
      const homogeneousWeight = settings.homogeneousPerformanceGroups ?? 0;
      const usePeerTutoring = peerTutoringWeight > homogeneousWeight;

      if (usePeerTutoring && peerTutoringWeight > 0) {
        // Heterogeneous performance pairing (peer tutoring)
        const highA = A && isHighPerf(A);
        const highB = B && isHighPerf(B);
        const lowA = A && isLowPerf(A);
        const lowB = B && isLowPerf(B);
        if ((highA && lowB) || (lowA && highB)) {
          score -= peerTutoringWeight;
        } else if (highA || highB || lowA || lowB) {
          score += peerTutoringWeight;
        }
      } else if (homogeneousWeight > 0) {
        // Homogeneous performance grouping
        const highA = A && isHighPerf(A);
        const highB = B && isHighPerf(B);
        const lowA = A && isLowPerf(A);
        const lowB = B && isLowPerf(B);
        const bothHigh = highA && highB;
        const bothLow = lowA && lowB;
        if (bothHigh || bothLow) {
          score -= homogeneousWeight;
        } else if ((highA && lowB) || (lowA && highB)) {
          score += homogeneousWeight;
        }
      }
    }

    if (settings.avoidConcentrationTogether) {
      for (let i = 0; i < members.length; i++) {
        const A = members[i]!;
        if (!isConcentration(A)) continue;
        for (let j = i + 1; j < members.length; j++) {
          const B = members[j]!;
          if (isConcentration(B)) {
            score +=
              settings.avoidConcentrationTogether *
              Math.max(specialWeight(A), specialWeight(B));
          }
        }
      }
    }

    if (settings.preferGenderMix && members.length > 1 && seatCount > 1) {
      const counts = emptyCounts();
      for (const m of members) {
        if (m.gender) {
          counts[m.gender]++;
        }
      }
      score += calculateGenderImbalance(counts) * settings.preferGenderMix;
    }

    if (settings.avoidConcentrationNearRestless || settings.preferGenderMix) {
      for (let sIdx = 0; sIdx < t.length; sIdx++) {
        const seatKey = buildSeatKey(tIndex, sIdx);
        const neighbors = seatNeighborhoods.get(seatKey) ?? [];
        if (neighbors.length === 0) continue;

        const current = t[sIdx];
        if (!current) continue;

        for (const neighbor of neighbors) {
          const {
            tableIndex: nt,
            seatIndex: ns,
            strengthFactor,
            direction,
          } = neighbor;
          if (nt < tIndex || (nt === tIndex && ns <= sIdx)) continue;

          const other = arr[nt]?.[ns];
          if (!other) continue;

          if (
            settings.avoidConcentrationNearRestless &&
            isConcentration(current) &&
            isRestless(other)
          ) {
            score +=
              settings.avoidConcentrationNearRestless *
              Math.max(specialWeight(current), specialWeight(other)) *
              strengthFactor *
              behavioralNeighborWeights[direction];
          }

          if (
            settings.preferGenderMix &&
            current.gender &&
            other.gender &&
            current.gender === other.gender
          ) {
            score +=
              settings.preferGenderMix *
              strengthFactor *
              genderNeighborWeights[direction];
          }
        }
      }
    }

    if (settings.avoidPreviousPairs && previousPairs.size > 0) {
      for (let i = 0; i < members.length; i++) {
        const mi = members[i]!;
        for (let j = i + 1; j < members.length; j++) {
          const mj = members[j]!;
          const pairKey = [mi.id, mj.id].sort().join('::');
          const wishPair =
            settings.considerWishPartners && mi.wishPartnerId === mj.id;
          if (!wishPair && previousPairs.has(pairKey))
            score += settings.avoidPreviousPairs;
        }
      }
    }

    for (let sIdx = 0; sIdx < t.length; sIdx++) {
      const stu = t[sIdx];
      if (!stu) continue;
      const seatKey = buildSeatKey(tIndex, sIdx);
      const pos = seatPositions.get(seatKey);

      if (pos) {
        // Calculate relative front position (0 = back, 1 = front), respecting dominant axis
        let rel = 0.5;
        if (orientation.dominantAxis === 'x' && maxX > minX) {
          const rawRel = (pos.x - minX) / (maxX - minX);
          rel = orientation.frontIsHighX ? rawRel : 1 - rawRel;
        } else if (orientation.dominantAxis === 'y' && maxY > minY) {
          const rawRel = (pos.y - minY) / (maxY - minY);
          rel = orientation.frontIsHighY ? rawRel : 1 - rawRel;
        }

        if (settings.preferFrontForNeedsFrontSeat && hasNeedsFrontSeat(stu)) {
          score -=
            rel * settings.preferFrontForNeedsFrontSeat * specialWeight(stu);
        }
        const heightWeight = settings.preferFrontForSmallerStudents ?? 0;
        if (heightWeight > 0 && stu.height && stu.height !== 'medium') {
          if (stu.height === 'small') {
            score -= rel * heightWeight * HEIGHT_PLACEMENT_AMPLIFICATION;
          } else if (stu.height === 'tall') {
            score -= (1 - rel) * heightWeight * HEIGHT_PLACEMENT_AMPLIFICATION;
          }
        }
      }

      if (preferWindowWeight > 0 && stu.prefersWindow) {
        const distance = windowSeatDistances.get(seatKey);
        if (distance !== undefined) {
          const normalized = normalizeFeatureDistance(
            distance,
            maxWindowDistance,
          );
          score += normalized * preferWindowWeight;
        }
      }

      if (preferDoorWeight > 0 && stu.prefersDoor) {
        const distance = doorSeatDistances.get(seatKey);
        if (distance !== undefined) {
          const normalized = normalizeFeatureDistance(
            distance,
            maxDoorDistance,
          );
          score += normalized * preferDoorWeight;
        }
      }
    }

    // Language skill mixing scoring
    const languageWeight = settings.preferLanguageMixing ?? 0;
    if (languageWeight > 0) {
      const languageLevels = members
        .map((m) => m.languageSkill)
        .filter(Boolean);
      if (languageLevels.length >= 2) {
        // Check for heterogeneous mixing (good) vs homogeneous (less ideal)
        const hasStrong = languageLevels.some(
          (l) => l === 'native' || l === 'fluent',
        );
        const hasWeak = languageLevels.some(
          (l) => l === 'beginner' || l === 'daz',
        );
        if (hasStrong && hasWeak) {
          score -= languageWeight * 0.5; // Reward heterogeneous mixing
        }
        // Penalize multiple students needing support together without strong speaker
        const weakCount = languageLevels.filter(
          (l) => l === 'beginner' || l === 'daz',
        ).length;
        if (weakCount > 1 && !hasStrong) {
          score += languageWeight * 0.4 * (weakCount - 1);
        }
      }
    }

    // Social role distribution scoring
    const socialRoleWeight = settings.distributeSocialRoles ?? 0;
    if (socialRoleWeight > 0) {
      const roles = members.map((m) => m.socialRole).filter(Boolean);
      if (roles.length > 0) {
        const roleCounts = new Map<string, number>();
        for (const role of roles) {
          roleCounts.set(role!, (roleCounts.get(role!) ?? 0) + 1);
        }
        // Penalize clustering of same roles (except mediators)
        for (const [role, count] of roleCounts) {
          if (count > 1 && role !== 'mediator') {
            score += socialRoleWeight * 0.5 * (count - 1);
          }
        }
        // Penalize multiple loners together
        const lonerCount = roleCounts.get('loner') ?? 0;
        if (lonerCount > 1) {
          score += socialRoleWeight * 0.6 * (lonerCount - 1);
        }
        // Reward loner with mediator/socialHub
        if (lonerCount > 0) {
          const hasSupport =
            roleCounts.has('mediator') || roleCounts.has('socialHub');
          if (hasSupport) {
            score -= socialRoleWeight * 0.4;
          }
        }
      }
    }

    // Table-level composition scoring for large tables (4+ students)
    // This catches issues that pair-based scoring misses
    if (members.length >= 4) {
      score += scoreTableComposition({
        members,
        tableIndex: tIndex,
        settings,
      });
    }

    return score;
  };

  const tableGenderDiff = (tIndex: number): number => {
    const t = arr[tIndex] ?? [];
    const counts = emptyCounts();
    let occupied = 0;
    for (const stu of t) {
      if (!stu) continue;
      if (stu.gender) {
        counts[stu.gender]++;
      }
      occupied++;
    }
    if (occupied <= 1) return 0;
    return calculateGenderImbalance(counts);
  };

  const globalGenderDiff = (): number => {
    let total = 0;
    for (let i = 0; i < tableCount; i++) {
      total += tableGenderDiff(i);
    }
    return total;
  };

  const tablesScore = (a: number, b: number): number => {
    let sc = tableScore(a) + (a === b ? 0 : tableScore(b));
    if (settings.preferGenderMix)
      sc += globalGenderDiff() * settings.preferGenderMix;
    return sc;
  };

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
    return requiresFront(stu, settings) && frontSeatSet.has(buildSeatKey(t, s));
  };

  // MT-1: Simulated Annealing mode (optional)
  // If enabled, use SA instead of greedy refinement for better global optimization
  if (options?.useAnnealing) {
    const annealingConfig: AnnealingConfig = {
      ...DEFAULT_ANNEALING_CONFIG,
      ...options.annealingConfig,
    };

    const annealingContext: AnnealingContext = {
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

    // Helper: Pick a table with bias towards problem tables
    // 70% chance to pick from top 3 worst tables, 30% random
    const pickProblemBiasedTable = (): number => {
      if (Math.random() < 0.7 && tableScores.length > 0) {
        // Weighted selection from top 3 worst tables
        // Weight: 1st = 50%, 2nd = 30%, 3rd = 20%
        const r = Math.random();
        const worstCount = Math.min(3, tableScores.length);
        if (r < 0.5 || worstCount === 1) {
          return tableScores[0]!.index;
        } else if (r < 0.8 || worstCount === 2) {
          return tableScores[1]!.index;
        } else {
          return tableScores[2]!.index;
        }
      }
      return Math.floor(Math.random() * tableCount);
    };

    for (let k = 0; k < triesPerPass; k++) {
      // Use heuristic: first table from problem bias, second table random
      // This targets improvements for the worst tables
      const t1 = pickProblemBiasedTable();
      const s1 = Math.floor(Math.random() * seatCounts[t1]!);
      const t2 = Math.floor(Math.random() * tableCount);
      const s2 = Math.floor(Math.random() * seatCounts[t2]!);

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

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * What every criterion costs, in one place (decision 0031).
 *
 * A criterion is written down once here, in up to four shapes: a `pair` term
 * for two students in a given seat relation, a `seat` term for a student on a
 * seat, a `table` term for who shares a table, and the language term, which
 * asks who sits around a student. The construction, the refinement and the
 * fulfilment the teacher reads (`fulfilment.ts`) all go through these
 * functions — none of them keeps a definition of its own. Lower is better:
 * a penalty is positive, a reward negative.
 */
import type { MixSettings, SocialRole, Student } from '@/types';
import { CRITERION_WEIGHTS, RELATION_WEIGHTS } from '@/utils';
import {
  seatPairKey,
  seatStudentIdentifier,
  type PreviousPairWeights,
} from '@/utils/pairs';
import {
  getAvoidPartnerIds,
  getWishPartnerIds,
} from '@/utils/student/partnerUtils';
import { resolvePerformanceCriterion } from '../../mixSettings';
import { toleratesRowBehind } from './frontPool';
import { SEAT_RELATION_KINDS, kindIndex } from './seatRelations';

/** The weight every criterion carries in a mix; 0 where it is off. */
export interface CriterionWeights {
  wish: number;
  avoid: number;
  previous: number;
  restless: number;
  concentration: number;
  concentrationNearRestless: number;
  shy: number;
  gender: number;
  peerTutoring: number;
  homogeneous: number;
  front: number;
  height: number;
  window: number;
  door: number;
  language: number;
  roles: number;
}

/**
 * The weights of the settings. Only one performance criterion applies — the
 * one `resolvePerformanceCriterion` picks (decision 0013).
 */
export const resolveCriterionWeights = (
  settings: Partial<MixSettings>,
): CriterionWeights => {
  const performance = resolvePerformanceCriterion(settings);
  return {
    wish: settings.considerWishPartners ?? 0,
    avoid: settings.avoidConflictPartners ?? 0,
    previous: settings.avoidPreviousPairs ?? 0,
    restless: settings.avoidRestlessTogether ?? 0,
    concentration: settings.avoidConcentrationTogether ?? 0,
    concentrationNearRestless: settings.avoidConcentrationNearRestless ?? 0,
    shy: settings.avoidShyAlone ?? 0,
    gender: settings.preferGenderMix ?? 0,
    peerTutoring:
      performance === 'peerTutoring' ? (settings.peerTutoring ?? 0) : 0,
    homogeneous:
      performance === 'homogeneousPerformanceGroups'
        ? (settings.homogeneousPerformanceGroups ?? 0)
        : 0,
    front: settings.preferFrontForNeedsFrontSeat ?? 0,
    height: settings.preferFrontForSmallerStudents ?? 0,
    window: settings.preferWindowSeats ?? 0,
    door: settings.preferDoorSeats ?? 0,
    language: settings.preferLanguageMixing ?? 0,
    roles: settings.distributeSocialRoles ?? 0,
  };
};

/** Gender codes: every gender is one of its own; -1 is "not stated". */
const GENDER_CODES = { boy: 0, girl: 1, diverse: 2 } as const;
export const GENDER_COUNT = 3;

/** What the terms ask of a student, read once per mix. */
export interface StudentFacts {
  /** The identifier history pair keys are built from */
  key: string;
  id: string;
  /** Index into the genders, -1 when none is stated */
  gender: number;
  restless: boolean;
  shy: boolean;
  concentration: boolean;
  needsFront: boolean;
  strong: boolean;
  weak: boolean;
  height: 'small' | 'tall' | null;
  prefersWindow: boolean;
  prefersDoor: boolean;
  languageStrong: boolean;
  languageNeedsSupport: boolean;
  role: SocialRole | null;
  /** 1 plus a half for every special need: weighs a clash at this student */
  special: number;
  /** Place in the wish list, by the other student's id */
  wishRank: Map<string, number>;
  /** Place in the distance list, by the other student's id */
  avoidRank: Map<string, number>;
}

const rankMap = (ids: string[], self: string): Map<string, number> => {
  const ranks = new Map<string, number>();
  ids.forEach((id, index) => {
    if (id !== self && !ranks.has(id)) ranks.set(id, index);
  });
  return ranks;
};

export const studentFacts = (student: Student): StudentFacts => {
  let special = 1;
  if (student.restless) special += 0.5;
  if (student.shy) special += 0.5;
  if (student.concentrationIssues) special += 0.5;
  if (student.needsFrontSeat) special += 0.5;
  const level = student.languageSkill;
  return {
    key: seatStudentIdentifier(student),
    id: student.id,
    gender: student.gender ? GENDER_CODES[student.gender] : -1,
    restless: Boolean(student.restless),
    shy: Boolean(student.shy),
    concentration: Boolean(student.concentrationIssues),
    needsFront: Boolean(student.needsFrontSeat),
    strong: Boolean(student.performanceStrong),
    weak: Boolean(student.performanceWeak) && !student.performanceStrong,
    height:
      student.height === 'small' || student.height === 'tall'
        ? student.height
        : null,
    prefersWindow: Boolean(student.prefersWindow),
    prefersDoor: Boolean(student.prefersDoor),
    languageStrong: level === 'native' || level === 'fluent',
    languageNeedsSupport: level === 'beginner' || level === 'daz',
    role: student.socialRole ?? null,
    special,
    wishRank: rankMap(getWishPartnerIds(student), student.id),
    avoidRank: rankMap(getAvoidPartnerIds(student), student.id),
  };
};

const RELATION_WEIGHT_BY_KIND = SEAT_RELATION_KINDS.map(
  (kind) => RELATION_WEIGHTS[kind],
);

/** How closely a relation kind ties two seats; see `RELATION_WEIGHTS`. */
export const relationWeight = (kind: number): number =>
  RELATION_WEIGHT_BY_KIND[kind] ?? 0;

const PARTNER = kindIndex('partner');
const CORNER = kindIndex('corner');
const OPPOSITE = kindIndex('opposite');
const TABLE = kindIndex('table');
const BESIDE = kindIndex('beside');

/** The kinds that make two students table mates: a pair the history keeps. */
export const isTableKind = (kind: number): boolean =>
  kind === PARTNER || kind === CORNER || kind === OPPOSITE || kind === TABLE;

/** The kinds within which somebody does not sit alone or gets support. */
export const isCloseKind = (kind: number): boolean =>
  isTableKind(kind) || kind === BESIDE;

const rankFactor = (factors: readonly number[], rank: number): number =>
  factors[rank] ?? factors[factors.length - 1] ?? 1;

/** Whether either of the two wishes the other — the wish belongs to the pair. */
const factsWishEachOther = (a: StudentFacts, b: StudentFacts) =>
  a.wishRank.has(b.id) || b.wishRank.has(a.id);

/**
 * The reward one directed wish earns: none while the wished classmate keeps a
 * distance from the wisher and distance wishes count — then avoiding wins.
 */
const directedWish = (
  weights: CriterionWeights,
  from: StudentFacts,
  to: StudentFacts,
): number => {
  const rank = from.wishRank.get(to.id);
  if (rank === undefined) return 0;
  if (weights.avoid > 0 && to.avoidRank.has(from.id)) return 0;
  return rankFactor(CRITERION_WEIGHTS.wishRank, rank);
};

const directedAvoid = (from: StudentFacts, to: StudentFacts): number => {
  const rank = from.avoidRank.get(to.id);
  return rank === undefined ? 0 : rankFactor(CRITERION_WEIGHTS.avoidRank, rank);
};

/**
 * Whether the history counts a pair: not while wishes count and the two wish
 * each other, since a pair the class asked for is no repetition to break up.
 */
export const historyCounts = (
  weights: CriterionWeights,
  a: StudentFacts,
  b: StudentFacts,
): boolean => !(weights.wish > 0 && factsWishEachOther(a, b));

/** The history weight of a pair, see `buildPreviousPairs`. */
export const historyWeight = (
  previousPairs: PreviousPairWeights,
  a: StudentFacts,
  b: StudentFacts,
): number => previousPairs.get(seatPairKey(a.key, b.key)) ?? 0;

/**
 * The pair term: what it costs that `a` and `b` sit in relation `kind`.
 * Symmetric in `a` and `b`, which is what lets the refinement count every
 * relation once and still compute a swap exactly.
 */
export const pairTerm = (
  weights: CriterionWeights,
  previousPairs: PreviousPairWeights,
  a: StudentFacts,
  b: StudentFacts,
  kind: number,
): number => {
  const closeness = relationWeight(kind);
  if (closeness === 0) return 0;
  let score = 0;

  if (weights.wish > 0) {
    score -=
      weights.wish *
      closeness *
      (directedWish(weights, a, b) + directedWish(weights, b, a));
  }
  if (weights.avoid > 0) {
    score +=
      weights.avoid *
      CRITERION_WEIGHTS.avoid *
      closeness *
      (directedAvoid(a, b) + directedAvoid(b, a));
  }

  const special = Math.max(a.special, b.special);
  if (weights.restless > 0 && a.restless && b.restless) {
    score += weights.restless * closeness * special;
  }
  if (weights.concentration > 0 && a.concentration && b.concentration) {
    score += weights.concentration * closeness * special;
  }
  if (
    weights.concentrationNearRestless > 0 &&
    ((a.concentration && b.restless) || (b.concentration && a.restless))
  ) {
    score += weights.concentrationNearRestless * closeness * special;
  }

  if (
    weights.gender > 0 &&
    (kind === PARTNER || kind === CORNER || kind === BESIDE) &&
    a.gender >= 0 &&
    a.gender === b.gender
  ) {
    score += weights.gender * CRITERION_WEIGHTS.gender.samePair * closeness;
  }

  if (isTableKind(kind)) {
    if (weights.previous > 0 && historyCounts(weights, a, b)) {
      score +=
        weights.previous * historyWeight(previousPairs, a, b) * closeness;
    }
    const mixed = (a.strong && b.weak) || (a.weak && b.strong);
    const sameLevel = (a.strong && b.strong) || (a.weak && b.weak);
    if (weights.peerTutoring > 0) {
      if (mixed) score -= weights.peerTutoring * closeness;
      else if (sameLevel) score += weights.peerTutoring * closeness;
    }
    if (weights.homogeneous > 0) {
      if (sameLevel) score -= weights.homogeneous * closeness;
      else if (mixed) score += weights.homogeneous * closeness;
    }
  }

  return score;
};

/** Where a seat is, for the terms that ask where a student sits. */
export interface SeatPlace {
  /** 0 at the back to 1 at the front; see `SeatLayout.depth` */
  depth: number;
  /** Rows behind the front rows, 0 within them; see `frontRowsOf` */
  frontRows: number;
  /** How many of those rows still count as front seats */
  frontTolerance: number;
  /** Distance to the nearest window and door, scaled to 0..1, or null */
  window: number | null;
  door: number | null;
  /** Whether a seat of the same table or directly beside counts as taken */
  hasCloseNeighbour: boolean;
}

/**
 * What a seat costs a student needing a front seat below "Sehr wichtig", by
 * the rows it lies behind the front rows: nothing within them, a little in
 * the row that still counts as a front seat, then steeply more.
 */
export const frontSeatCost = ({
  frontRows,
  frontTolerance,
}: Pick<SeatPlace, 'frontRows' | 'frontTolerance'>): number => {
  if (frontRows <= 0) return 0;
  if (frontRows <= frontTolerance) return CRITERION_WEIGHTS.front.toleratedRow;
  return (
    1 + CRITERION_WEIGHTS.front.furtherRow * (frontRows - frontTolerance - 1)
  );
};

/**
 * The seat term: what it costs that a student sits on this seat — the front
 * seats a student needs, body height, window and door, and sitting alone.
 */
export const seatTerm = (
  weights: CriterionWeights,
  student: StudentFacts,
  place: SeatPlace,
): number => {
  let score = 0;
  if (weights.front > 0 && student.needsFront) {
    // "Sehr wichtig" holds the student to the front rows (`frontPool.ts`) and
    // draws them to the board within them; below it the rows decide.
    if (toleratesRowBehind(weights.front)) {
      score += weights.front * frontSeatCost(place) * student.special;
    } else {
      score -= weights.front * place.depth * student.special;
    }
  }
  if (weights.height > 0 && student.height) {
    const towardsTheirEnd =
      student.height === 'small' ? place.depth : 1 - place.depth;
    score -= weights.height * CRITERION_WEIGHTS.height * towardsTheirEnd;
  }
  if (weights.window > 0 && student.prefersWindow && place.window !== null) {
    score += weights.window * place.window;
  }
  if (weights.door > 0 && student.prefersDoor && place.door !== null) {
    score += weights.door * place.door;
  }
  if (weights.shy > 0 && student.shy && !place.hasCloseNeighbour) {
    score += weights.shy * student.special;
  }
  return score;
};

/** Students with a stated gender, by gender, and how far the largest leads. */
export const genderExcess = (counts: readonly number[]): number => {
  let known = 0;
  let largest = 0;
  for (const count of counts) {
    known += count;
    if (count > largest) largest = count;
  }
  if (known < 2) return 0;
  return Math.max(0, largest - Math.ceil(known / 2));
};

/** Role counts at a table, in the order the role terms read them. */
export interface RoleCounts {
  mediator: number;
  leader: number;
  loner: number;
  socialHub: number;
}

const roleTerm = (weights: CriterionWeights, roles: RoleCounts): number => {
  const w = weights.roles;
  const factors = CRITERION_WEIGHTS.socialRole;
  let score = 0;
  if (roles.leader > 1) score += w * factors.leaderCluster * (roles.leader - 1);
  if (roles.socialHub > 1) {
    score += w * factors.socialHubCluster * (roles.socialHub - 1);
  }
  if (roles.loner > 1) score += w * factors.lonerCluster * (roles.loner - 1);
  if (roles.mediator > 1) {
    score += w * factors.mediatorSpread * (roles.mediator - 1);
  }
  if (roles.loner > 0 && (roles.mediator > 0 || roles.socialHub > 0)) {
    score -= w * factors.lonerSupport;
  }
  if (roles.leader > 0 && roles.mediator > 0) {
    score -= w * factors.leaderWithMediator;
  }
  return score;
};

/**
 * The table term: what the composition of one table costs — no gender holds
 * more than half of it, and the social roles spread out.
 */
export const tableTerm = (
  weights: CriterionWeights,
  members: readonly StudentFacts[],
): number => {
  if (members.length < 2) return 0;
  let score = 0;
  if (weights.gender > 0) {
    const counts = [0, 0, 0];
    for (const member of members) {
      if (member.gender >= 0) counts[member.gender]!++;
    }
    score +=
      weights.gender *
      CRITERION_WEIGHTS.gender.tableExcess *
      genderExcess(counts);
  }
  if (weights.roles > 0) {
    const roles: RoleCounts = {
      mediator: 0,
      leader: 0,
      loner: 0,
      socialHub: 0,
    };
    for (const member of members) {
      if (member.role) roles[member.role]++;
    }
    score += roleTerm(weights, roles);
  }
  return score;
};

/**
 * The language term of a student needing support: a reward by how closely the
 * nearest strong speaker sits — seat partner, the same table, directly beside.
 * `closeness` is the weight of the closest such relation, 0 without one.
 */
export const languageTerm = (
  weights: CriterionWeights,
  student: StudentFacts,
  closeness: number,
): number =>
  weights.language > 0 && student.languageNeedsSupport
    ? -weights.language * CRITERION_WEIGHTS.languageSupport * closeness
    : 0;

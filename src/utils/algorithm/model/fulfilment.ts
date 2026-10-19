// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * How well a plan meets each criterion, read from the same terms the mixing
 * optimises (decision 0031).
 *
 * Every criterion is a set of cases — a student who needs something, a wish,
 * a table — and every case gets a credit from 0 to 1 by the same relation
 * weights the score uses: a restless student whose restless seat partner
 * costs the plan the most gets 0, one with a restless classmate directly
 * behind gets 0.7. The percentage is the mean credit, so a plan the mixing
 * could not improve on a criterion reads as 100 %: where the class's make-up
 * or the room caps a criterion (more boys than girls, fewer strong than weak
 * students, single desks with no seat partner to give), the cases are counted
 * against what they allow.
 */
import type { ScalarMixSettingKey } from '@/types';
import { isTableActive } from '@/utils/math/scene';
import {
  genderExcess,
  historyCounts,
  historyWeight,
  isCloseKind,
  isTableKind,
  relationWeight,
  GENDER_COUNT,
} from './criteria';
import { frontRowsOf, toleratesRowBehind } from './frontPool';
import {
  strongSpeakerCloseness,
  tableMembers,
  type ModelContext,
  type Occupants,
} from './objective';

/** The cases of one criterion in a plan. */
export interface CriterionCases {
  /** How many cases the criterion is about */
  total: number;
  /** The sum of their credits, each from 0 to 1 */
  credit: number;
  /** How many cases got full credit */
  full: number;
  /** The lowest credit of the cases each seat (flat index) takes part in */
  seats: Map<number, number>;
  /**
   * The credit is a measure, not a tally — how near the window a seat is — so
   * there is no count of fulfilled cases to show.
   */
  measured?: boolean;
}

export type CriteriaCases = Partial<
  Record<ScalarMixSettingKey, CriterionCases>
>;

class CaseCollector {
  total = 0;
  credit = 0;
  full = 0;
  seats = new Map<number, number>();
  constructor(private readonly measured = false) {}

  add(credit: number, seats: readonly number[]) {
    const bounded = Math.min(1, Math.max(0, credit));
    this.total += 1;
    this.credit += bounded;
    if (bounded >= 1 - 1e-9) this.full += 1;
    this.mark(bounded, seats);
  }

  mark(credit: number, seats: readonly number[]) {
    for (const seat of seats) {
      const known = this.seats.get(seat);
      this.seats.set(
        seat,
        known === undefined ? credit : Math.min(known, credit),
      );
    }
  }

  result(): CriterionCases {
    return {
      total: this.total,
      credit: this.credit,
      full: this.full,
      seats: this.seats,
      ...(this.measured && { measured: true }),
    };
  }
}

/** The closest relation from `seat` to a seat whose student passes `test`. */
const closestTo = (
  context: ModelContext,
  occupants: Occupants,
  seat: number,
  test: (student: number) => boolean,
): number => {
  let closest = 0;
  for (const relation of context.layout.relations[seat]!) {
    const other = occupants[relation.seat]!;
    if (other < 0 || !test(other)) continue;
    closest = Math.max(closest, relationWeight(relation.kind));
  }
  return closest;
};

/**
 * The closest relation the room offers between two seats of tables in the
 * mix, among the kinds `include` accepts: 1 where there are seat partners,
 * 0.5 in a room of single desks set side by side, 0 where nobody sits near
 * anybody. A wish fulfilled as well as the room allows is fulfilled.
 */
const closestTheRoomOffers = (
  context: ModelContext,
  include: (kind: number) => boolean,
): number => {
  const { layout, scene } = context;
  const inMix = (seat: number) => {
    const table = scene.tables[layout.tableOf[seat]!];
    return table ? isTableActive(table) : false;
  };
  let best = 0;
  for (let seat = 0; seat < layout.size; seat++) {
    if (!inMix(seat)) continue;
    for (const relation of layout.relations[seat]!) {
      if (!include(relation.kind) || !inMix(relation.seat)) continue;
      best = Math.max(best, relationWeight(relation.kind));
    }
  }
  return best;
};

/**
 * The cases of every criterion in the plan `occupants` stands for. The context
 * decides which apply: wishes give way to distance wishes while those count,
 * and a pair that wishes to sit together is no repetition while wishes count.
 */
export function evaluateCriteria(
  context: ModelContext,
  occupants: Occupants,
): CriteriaCases {
  const { layout, facts, weights } = context;
  const size = layout.size;
  const seatOf = new Int32Array(facts.length).fill(-1);
  for (let seat = 0; seat < size; seat++) {
    const student = occupants[seat]!;
    if (student >= 0) seatOf[student] = seat;
  }
  const seated: number[] = [];
  for (let student = 0; student < facts.length; student++) {
    if (seatOf[student]! >= 0) seated.push(student);
  }
  const indexById = new Map(facts.map((fact, index) => [fact.id, index]));
  const kindBetween = (a: number, b: number) =>
    layout.kindBetween[a * size + b]!;
  const closenessBetween = (a: number, b: number) => {
    const kind = kindBetween(a, b);
    return kind >= 0 ? relationWeight(kind) : 0;
  };

  const wishReach = closestTheRoomOffers(context, () => true);
  const languageReach = closestTheRoomOffers(context, isCloseKind);

  const wish = new CaseCollector();
  const avoid = new CaseCollector();
  const restless = new CaseCollector();
  const concentration = new CaseCollector();
  const nearRestless = new CaseCollector();
  const shy = new CaseCollector();
  const front = new CaseCollector();
  const height = new CaseCollector();
  const windowSeats = new CaseCollector(true);
  const doorSeats = new CaseCollector(true);
  const language = new CaseCollector();

  for (const student of seated) {
    const fact = facts[student]!;
    const seat = seatOf[student]!;
    const place = context.places[seat]!;

    // One case per student with wishes: the wish met best. A student has one
    // seat partner, so a second wish can never count as fully as the first.
    let wished = false;
    let bestWish = 0;
    let bestWishSeat = -1;
    for (const [id] of fact.wishRank) {
      const other = indexById.get(id);
      if (other === undefined || seatOf[other]! < 0) continue;
      // A wish the other answers with a distance wish is the distance wish's
      // case while those count: avoiding wins, the wish cannot be met.
      if (weights.avoid > 0 && facts[other]!.avoidRank.has(fact.id)) continue;
      wished = true;
      const closeness = closenessBetween(seat, seatOf[other]!);
      if (closeness > bestWish) {
        bestWish = closeness;
        bestWishSeat = seatOf[other]!;
      }
    }
    if (wished && wishReach > 0) {
      wish.add(
        bestWish / wishReach,
        bestWishSeat >= 0 ? [seat, bestWishSeat] : [seat],
      );
    }
    for (const [id] of fact.avoidRank) {
      const other = indexById.get(id);
      if (other === undefined || seatOf[other]! < 0) continue;
      avoid.add(1 - closenessBetween(seat, seatOf[other]!), [
        seat,
        seatOf[other]!,
      ]);
    }
    if (fact.restless) {
      restless.add(
        1 - closestTo(context, occupants, seat, (o) => facts[o]!.restless),
        [seat],
      );
    }
    if (fact.concentration) {
      concentration.add(
        1 - closestTo(context, occupants, seat, (o) => facts[o]!.concentration),
        [seat],
      );
      nearRestless.add(
        1 - closestTo(context, occupants, seat, (o) => facts[o]!.restless),
        [seat],
      );
    }
    if (fact.shy) shy.add(place.hasCloseNeighbour ? 1 : 0, [seat]);
    if (fact.height === 'small') height.add(place.depth > 0.5 ? 1 : 0, [seat]);
    if (fact.height === 'tall') height.add(place.depth < 0.5 ? 1 : 0, [seat]);
    if (fact.prefersWindow && place.window !== null) {
      windowSeats.add(1 - place.window, [seat]);
    }
    if (fact.prefersDoor && place.door !== null) {
      doorSeats.add(1 - place.door, [seat]);
    }
    if (fact.languageNeedsSupport && languageReach > 0) {
      language.add(
        strongSpeakerCloseness(context, occupants, seat) / languageReach,
        [seat],
      );
    }
  }

  // Front seats: the front rows that hold every student needing one, and
  // below "Sehr wichtig" the row behind them.
  const needFront = seated.filter((student) => facts[student]!.needsFront);
  if (needFront.length > 0) {
    const rows = frontRowsOf(
      context.scene,
      layout,
      needFront.length,
      (seat) => occupants[seat]! >= 0,
      toleratesRowBehind(weights.front),
    );
    for (const student of needFront) {
      const seat = seatOf[student]!;
      front.add(rows.behind[seat]! <= rows.tolerance ? 1 : 0, [seat]);
    }
  }

  // Repetition: the pairs at one table, by the history's weight.
  const previous = new CaseCollector();
  for (let a = 0; a < size; a++) {
    const i = occupants[a]!;
    if (i < 0) continue;
    for (const relation of layout.relations[a]!) {
      const b = relation.seat;
      if (b <= a || !isTableKind(relation.kind)) continue;
      const j = occupants[b]!;
      if (j < 0 || !historyCounts(weights, facts[i]!, facts[j]!)) continue;
      const weight = historyWeight(context.previousPairs, facts[i]!, facts[j]!);
      previous.add(1 - Math.min(1, weight) * relationWeight(relation.kind), [
        a,
        b,
      ]);
    }
  }

  // Per table: gender, performance and social roles.
  const tableCount = context.scene.tables.length;
  const genderTotals = new Array<number>(GENDER_COUNT).fill(0);
  const genderTables: Array<{ seats: number[]; known: number; ok: boolean }> =
    [];
  let strongSeated = 0;
  let weakSeated = 0;
  // Pairs the occupied tables can hold at all: none at single desks.
  let pairRoom = 0;
  let tutoringPairs = 0;
  let sameLevelPairs = 0;
  const tutoringSeats: Array<[number, number]> = [];
  const sameLevelSeats: Array<[number, number]> = [];
  const roles = new CaseCollector();

  for (let table = 0; table < tableCount; table++) {
    const seats: number[] = [];
    for (
      let seat = layout.offsets[table]!;
      seat < layout.offsets[table + 1]!;
      seat++
    ) {
      if (occupants[seat]! >= 0) seats.push(seat);
    }
    if (seats.length === 0) continue;
    pairRoom += Math.floor(seats.length / 2);
    const members = tableMembers(context, occupants, table);

    const counts = new Array<number>(GENDER_COUNT).fill(0);
    for (const member of members) {
      if (member.gender >= 0) {
        counts[member.gender]!++;
        genderTotals[member.gender]!++;
      }
    }
    const known = counts.reduce((sum, count) => sum + count, 0);
    if (known >= 2) {
      genderTables.push({ seats, known, ok: genderExcess(counts) === 0 });
    }

    const strong = members.filter((member) => member.strong).length;
    const weak = members.filter((member) => member.weak).length;
    strongSeated += strong;
    weakSeated += weak;
    tutoringPairs += Math.min(strong, weak);
    sameLevelPairs += Math.floor(strong / 2) + Math.floor(weak / 2);
    for (const seat of seats) {
      const fact = facts[occupants[seat]!]!;
      if (!fact.strong && !fact.weak) continue;
      const complement = fact.strong ? weak : strong;
      const peers = (fact.strong ? strong : weak) - 1;
      tutoringSeats.push([seat, complement > 0 ? 1 : 0]);
      sameLevelSeats.push([seat, peers > 0 ? 1 : 0]);
    }

    const roleSeats = seats.filter(
      (seat) => facts[occupants[seat]!]!.role !== null,
    );
    if (roleSeats.length > 0) {
      const seen = new Map<string, number>();
      for (const seat of roleSeats) {
        const role = facts[occupants[seat]!]!.role!;
        seen.set(role, (seen.get(role) ?? 0) + 1);
      }
      const balanced = [...seen.values()].every((count) => count <= 1);
      roles.add(balanced ? 1 : 0, roleSeats);
    }
  }

  // Gender, against what the class allows: a balanced table holds at least
  // half of its seats' worth of students outside the largest gender of the
  // class, so the smallest tables can be balanced first.
  const gender = new CaseCollector();
  if (genderTables.length > 0) {
    const knownTotal = genderTotals.reduce((sum, count) => sum + count, 0);
    let others = knownTotal - Math.max(...genderTotals);
    let reachable = 0;
    for (const need of genderTables
      .map(({ known }) => Math.floor(known / 2))
      .sort((x, y) => x - y)) {
      if (need > others) break;
      others -= need;
      reachable += 1;
    }
    const balanced = genderTables.filter(({ ok }) => ok).length;
    for (let k = 0; k < reachable; k++) {
      gender.add(k < balanced ? 1 : 0, []);
    }
    for (const { seats, ok } of genderTables) gender.mark(ok ? 1 : 0, seats);
  }

  // Performance, as pairs formed against the pairs the class has in it.
  const peerTutoring = new CaseCollector();
  const tutoringPossible = Math.min(strongSeated, weakSeated, pairRoom);
  for (let k = 0; k < tutoringPossible; k++) {
    peerTutoring.add(k < tutoringPairs ? 1 : 0, []);
  }
  for (const [seat, credit] of tutoringSeats) peerTutoring.mark(credit, [seat]);
  const homogeneous = new CaseCollector();
  const sameLevelPossible = Math.min(
    Math.floor(strongSeated / 2) + Math.floor(weakSeated / 2),
    pairRoom,
  );
  for (let k = 0; k < sameLevelPossible; k++) {
    homogeneous.add(k < sameLevelPairs ? 1 : 0, []);
  }
  for (const [seat, credit] of sameLevelSeats) homogeneous.mark(credit, [seat]);

  return {
    considerWishPartners: wish.result(),
    avoidConflictPartners: avoid.result(),
    avoidPreviousPairs: previous.result(),
    avoidRestlessTogether: restless.result(),
    avoidConcentrationTogether: concentration.result(),
    avoidConcentrationNearRestless: nearRestless.result(),
    avoidShyAlone: shy.result(),
    preferGenderMix: gender.result(),
    peerTutoring: peerTutoring.result(),
    homogeneousPerformanceGroups: homogeneous.result(),
    preferFrontForNeedsFrontSeat: front.result(),
    preferFrontForSmallerStudents: height.result(),
    preferWindowSeats: windowSeats.result(),
    preferDoorSeats: doorSeats.result(),
    preferLanguageMixing: language.result(),
    distributeSocialRoles: roles.result(),
  };
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * What a run of plans comes to (decision 0033): six plans one after the
 * other, each mixed with the ones before as the plans in use, in three rooms,
 * thirty seeds each — how often wishes are met, whether a student with two
 * wishes takes them in turn, whether friends who wish each other stay
 * together, whether a classmate wished one-sidedly sits with the same wisher
 * again, and how many other pairs repeat, counted by the seats alone, so it
 * reads the same whatever the weights; and every criterion's mean
 * fulfilment over the run. Not part of the normal run — it measures, it does
 * not check:
 *
 *   MIX_RUNS=1 npx vitest run mixRuns
 */
import { describe, expect, it } from 'vitest';
import type {
  ClassroomFeature,
  ClassroomScene,
  MixSettings,
  SavedPlan,
  SeatingArrangement,
  Student,
} from '@/types';
import { seatPairsFor } from '@/utils/math/seatGeometry';
import { createRng, type RandomSource } from '../rng';
import { shuffleArray } from '../shuffle';
import arrangeTables from '../autoArrange';
import { runMixSession } from '../seatingAlgorithm';
import {
  calculateCriteriaWeightedScore,
  calculateSeatingStatistics,
  getTopFulfilledCriteria,
} from '../seatingStatistics';
import {
  normalizeMixSettings,
  withoutUnavailableWeights,
} from '../../mixSettings';

const SEEDS = 30;
const PLANS = 6;

const board: ClassroomFeature = {
  id: 'board',
  type: 'board',
  x: 880,
  y: 200,
  width: 20,
  height: 200,
  anchor: 'right',
  movable: false,
};

/**
 * A class with six friendships that wish each other, eight one-sided first
 * wishes and a second wish for about half of those who wish, the rest
 * drawn from a seed.
 */
const buildClass = (count: number, rng: RandomSource): Student[] => {
  const ids = shuffleArray(
    Array.from({ length: count }, (_, index) => `s${index}`),
    rng,
  );
  const wishes = new Map<string, string[]>(ids.map((id) => [id, []]));
  for (let pair = 0; pair < 6; pair++) {
    wishes.get(ids[2 * pair]!)!.push(ids[2 * pair + 1]!);
    wishes.get(ids[2 * pair + 1]!)!.push(ids[2 * pair]!);
  }
  for (let index = 12; index < 20; index++) {
    const others = ids.filter((id) => id !== ids[index]);
    wishes.get(ids[index]!)!.push(others[Math.floor(rng() * others.length)]!);
  }
  for (let index = 0; index < 20; index++) {
    if (rng() < 0.5) continue;
    const own = wishes.get(ids[index]!)!;
    const others = ids.filter((id) => id !== ids[index] && !own.includes(id));
    own.push(others[Math.floor(rng() * others.length)]!);
  }
  const pick = <T>(items: readonly T[]) =>
    items[Math.floor(rng() * items.length)]!;
  return ids.map((id, index): Student => ({
    id,
    name: `Student ${index}`,
    gender: pick(['boy', 'girl'] as const),
    restless: rng() < 0.2,
    shy: rng() < 0.15,
    concentrationIssues: rng() < 0.2,
    needsFrontSeat: false,
    ...(index % 6 === 0
      ? { performanceStrong: true as const }
      : index % 6 === 1 || index % 6 === 3
        ? { performanceWeak: true as const }
        : {}),
    languageSkill: index % 9 === 3 ? 'daz' : 'native',
    wishPartnerIds: wishes.get(id)!,
    avoidPartnerIds: [],
  }));
};

const fixtures = [
  { name: 'Sechsertische', tables: arrangeTables('group6', 5), students: 28 },
  { name: 'Vierertische', tables: arrangeTables('group4', 7), students: 26 },
  { name: 'Doppeltische', tables: arrangeTables('double', 14), students: 26 },
];

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** Where everybody sits: the table, the seat partner and the table pairs. */
const readPlan = (seating: SeatingArrangement) => {
  const tableOf = new Map<string, number>();
  const partnerOf = new Map<string, string>();
  const pairs = new Set<string>();
  seating.forEach((row, tableIndex) => {
    row.forEach((seated) => {
      if (seated) tableOf.set(seated.id, tableIndex);
    });
    for (const [a, b] of seatPairsFor(row.length)) {
      const first = row[a];
      const second = row[b];
      if (first && second) {
        partnerOf.set(first.id, second.id);
        partnerOf.set(second.id, first.id);
      }
    }
    for (let a = 0; a < row.length; a++) {
      for (let b = a + 1; b < row.length; b++) {
        const first = row[a];
        const second = row[b];
        if (first && second) pairs.add(pairKey(first.id, second.id));
      }
    }
  });
  return { tableOf, partnerOf, pairs };
};

describe.skipIf(!process.env.MIX_RUNS)('mix runs', () => {
  it('measures every room', () => {
    const lines: string[] = [];
    for (const fixture of fixtures) {
      const scene: ClassroomScene = {
        totalStudents: 0,
        tables: fixture.tables,
        features: [board],
      };
      const students = buildClass(
        fixture.students,
        createRng(2000 + fixture.students),
      );
      const wishesOf = new Map(
        students.map((entry) => [entry.id, entry.wishPartnerIds ?? []]),
      );
      const wishes = (id: string) => wishesOf.get(id) ?? [];
      const mutual = (a: string, b: string) =>
        wishes(a).includes(b) && wishes(b).includes(a);
      const settings: MixSettings = withoutUnavailableWeights(
        normalizeMixSettings({}),
        students,
      );

      const fulfilment = new Map<string, number>();
      let overall = 0;
      const counts = new Map<string, number>();
      const add = (key: string) => counts.set(key, (counts.get(key) ?? 0) + 1);
      const count = (key: string) => counts.get(key) ?? 0;
      for (let seed = 1; seed <= SEEDS; seed++) {
        const rng = createRng(seed);
        const history: SavedPlan[] = [];
        let before: ReturnType<typeof readPlan> | null = null;
        for (let plan = 0; plan < PLANS; plan++) {
          const seating = runMixSession(
            students,
            history,
            {},
            settings,
            scene,
            {
              rng,
              refine: true,
            },
          );
          const now = readPlan(seating);
          const met = (id: string, at: ReturnType<typeof readPlan>) =>
            wishes(id).filter((w) => at.tableOf.get(w) === at.tableOf.get(id));
          if (before) {
            add('plans');
            const criteria = getTopFulfilledCriteria(
              calculateSeatingStatistics(
                seating,
                students,
                settings,
                history,
                scene,
              ),
              settings,
            );
            for (const criterion of criteria) {
              fulfilment.set(
                criterion.label,
                (fulfilment.get(criterion.label) ?? 0) + criterion.percentage,
              );
            }
            overall += calculateCriteriaWeightedScore(criteria);
            for (const { id } of students) {
              const own = wishes(id);
              if (own.length === 0) continue;
              const metNow = met(id, now);
              add('wishers');
              if (metNow.length > 0) add('wishersMet');
              if (own.includes(now.partnerOf.get(id) ?? '')) {
                add('wishersPartner');
              }
              if (own.length === 1) {
                add('single');
                if (metNow.length > 0) add('singleMet');
              }
              if (own.length >= 2 && !own.some((w) => mutual(id, w))) {
                const metBefore = met(id, before);
                if (metNow.length > 0 && metBefore.length > 0) {
                  add('multiTwice');
                  if (metNow.some((w) => metBefore.includes(w))) {
                    add('multiSame');
                  }
                }
              }
              for (const wished of own) {
                const key = pairKey(id, wished);
                if (mutual(id, wished)) {
                  if (id > wished) continue;
                  add('mutual');
                  if (now.pairs.has(key)) add('mutualTogether');
                } else if (wishes(wished).length === 0) {
                  add('unasked');
                  if (now.pairs.has(key) && before.pairs.has(key)) {
                    add('unaskedAgain');
                  }
                }
              }
            }
            for (const key of now.pairs) {
              const [a, b] = key.split('|') as [string, string];
              if (wishes(a).includes(b) || wishes(b).includes(a)) continue;
              if (before.pairs.has(key)) add('otherAgain');
            }
          }
          before = now;
          history.push({
            id: `plan-${plan}`,
            name: `Plan ${plan}`,
            date: `2026-09-${String(plan + 1).padStart(2, '0')}`,
            seating,
            scene,
          });
        }
      }
      const share = (part: string, whole: string) =>
        `${((100 * count(part)) / Math.max(1, count(whole))).toFixed(0)} %`;
      lines.push(
        `${fixture.name} (${fixture.students}, plans 2–${PLANS}, ${SEEDS} seeds):`,
        `  wish met at the table      ${share('wishersMet', 'wishers')}, as seat partner ${share('wishersPartner', 'wishers')}`,
        `  one wish met               ${share('singleMet', 'single')}`,
        `  two wishes: same twice     ${share('multiSame', 'multiTwice')}`,
        `  mutual wishes together     ${share('mutualTogether', 'mutual')}`,
        `  wished one-sidedly, again  ${share('unaskedAgain', 'unasked')}`,
        `  other pairs again per plan ${(count('otherAgain') / count('plans')).toFixed(2)}`,
        `  fulfilment over the run: overall ${(overall / count('plans')).toFixed(1)} %`,
      );
      for (const [label, sum] of fulfilment) {
        lines.push(
          `    ${label.padEnd(24)} ${(sum / count('plans')).toFixed(1).padStart(6)} %`,
        );
      }
    }
    console.log(lines.join('\n'));
    expect(lines.length).toBeGreaterThan(0);
  }, 900_000);
});

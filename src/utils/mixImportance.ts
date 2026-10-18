// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { MixSettings, ScalarMixSettingKey } from '@/types';
import {
  DEFAULT_MIX_WEIGHTS,
  MIX_CRITERIA_VERSION,
  criterionWeight,
} from './mixSettings';

/**
 * How important a criterion is, in words. The algorithm keeps working in
 * weights from 0 to 10 — this is the scale the teacher sets them on.
 *
 * "Wie wichtig ist dir Unruhe?" has an answer; "Wie viel von zehn ist dir
 * Unruhe wert?" has not. Four named steps are what a teacher can decide
 * between; the weight behind them is the algorithm's business, and only a
 * recipe still sets one inside a band (decision 0018).
 */
export type MixImportance = 'off' | 'consider' | 'important' | 'essential';

/** Off first, then rising — the order the chips are drawn in. */
export const MIX_IMPORTANCE_LEVELS: readonly MixImportance[] = [
  'off',
  'consider',
  'important',
  'essential',
] as const;

/**
 * The band of weights each level stands for. Chosen so that every recommended
 * weight (`DEFAULT_MIX_WEIGHTS`) keeps the meaning it had: the two partner
 * criteria (8 and 7) are essential, separating and front seats (5, 6, 4)
 * important, the softer ones (2, 3) worth considering.
 */
const IMPORTANCE_BANDS: Record<
  Exclude<MixImportance, 'off'>,
  { min: number; max: number }
> = {
  consider: { min: 1, max: 3 },
  important: { min: 4, max: 6 },
  essential: { min: 7, max: 10 },
};

/** The weight a level sets when there is no weight of its own to keep. */
export const MIX_IMPORTANCE_WEIGHTS: Record<MixImportance, number> = {
  off: 0,
  consider: 3,
  important: 5,
  essential: 8,
};

/** Which level a weight reads as. Anything above the scale counts as the top. */
export const importanceOfWeight = (weight: number): MixImportance => {
  if (weight <= 0) return 'off';
  if (weight <= IMPORTANCE_BANDS.consider.max) return 'consider';
  if (weight <= IMPORTANCE_BANDS.important.max) return 'important';
  return 'essential';
};

/**
 * The weight to store for a level. A weight already inside the band survives
 * untouched: a recipe (or an older version's fine tuning) that set "Unruhe" to
 * 6 must not turn into a different plan because the level it is already on
 * was pressed again.
 */
export const weightForImportance = (
  level: MixImportance,
  currentWeight = 0,
): number =>
  importanceOfWeight(currentWeight) === level
    ? currentWeight
    : MIX_IMPORTANCE_WEIGHTS[level];

/** The level one criterion's control shows; see {@link criterionWeight}. */
export const criterionImportance = (
  settings: Readonly<MixSettings>,
  key: ScalarMixSettingKey,
): MixImportance => importanceOfWeight(criterionWeight(settings, key));

/**
 * Brings stored weights to what they mean now (`MIX_CRITERIA_VERSION`).
 * Before decision 0031 every level of "Vordere Plätze" kept the students
 * needing a front seat in the front rows; now only "Sehr wichtig" does. A
 * stored level below it is lifted to the recommended weight once, so a class
 * keeps the plans it had — the teacher can lower it again afterwards. Runs
 * where stored settings come in: the browser's last settings, a class
 * opened, a backup restored, a mix of the history opened.
 */
export const migrateStoredMixSettings = <
  T extends Partial<MixSettings> | null | undefined,
>(
  stored: T,
): T => {
  if (!stored || typeof stored !== 'object') return stored;
  if ((stored.criteriaVersion ?? 1) >= MIX_CRITERIA_VERSION) return stored;
  const front = stored.preferFrontForNeedsFrontSeat;
  const lift =
    typeof front === 'number' &&
    front > 0 &&
    importanceOfWeight(front) !== 'essential';
  return {
    ...stored,
    ...(lift && {
      preferFrontForNeedsFrontSeat:
        DEFAULT_MIX_WEIGHTS.preferFrontForNeedsFrontSeat,
    }),
    criteriaVersion: MIX_CRITERIA_VERSION,
  };
};

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { ScalarMixSettingKey } from './SeatingPlan';

/**
 * The teacher's own presets and their changes to the shipped ones (decision
 * 0038). Kept once for every class in a store of their own
 * (`DB_KEYS.mixPresets`): a preset answers what kind of lesson it is, which
 * is the same question in every class.
 */

/** The shipped presets; `standard` is the way back and cannot be changed. */
export type BuiltinMixRecipeId =
  'standard' | 'quietWork' | 'groupWork' | 'exam' | 'newClass';

/** A shipped preset the teacher may change. */
export type EditableMixRecipeId = Exclude<BuiltinMixRecipeId, 'standard'>;

/** Every criterion weight a preset sets, 0–10. */
export type MixPresetWeights = Record<ScalarMixSettingKey, number>;

/** A shipped preset as the teacher changed it. */
export interface MixPresetOverride {
  weights: MixPresetWeights;
  /** What the weights mean (decision 0031), as on stored mix settings. */
  criteriaVersion: number;
}

/** A preset of the teacher's own. */
export interface OwnMixPreset {
  id: string;
  name: string;
  weights: MixPresetWeights;
  criteriaVersion: number;
  /** ISO 8601. */
  createdAt: string;
}

/** What the store holds and a backup carries. */
export interface MixPresetData {
  version: 1;
  overrides: Partial<Record<EditableMixRecipeId, MixPresetOverride>>;
  presets: OwnMixPreset[];
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { dataFamilyClass, type DataFamily, type MixImportance } from '@/utils';

/**
 * How tall each level's bar stands. "Off" is the step before the first: a
 * dash on the baseline, so the scale reads as one run from nothing to much —
 * and "Beachten" stands taller than wide, or it reads as a dot.
 */
export const LEVEL_BAR_CLASS: Record<MixImportance, string> = {
  off: 'h-1',
  consider: 'h-2.5',
  important: 'h-3.5',
  essential: 'h-4.5',
};

const LEVELS: readonly MixImportance[] = [
  'off',
  'consider',
  'important',
  'essential',
];

/** The steps that are bars; "Aus" is the scale left empty. */
const BARS: readonly MixImportance[] = ['consider', 'important', 'essential'];

/**
 * A criterion's importance as the criteria panel draws it, to be read and
 * not set: three bars rising to "Sehr wichtig", filled up to the level in the
 * family's ink, all empty for "Aus". The panel's dash for "Aus" is a step to
 * press there; here nothing is pressed, and beside three filled bars an empty
 * dash read as a level missing. A card shows the word beside the bars, so
 * they need no name of their own.
 */
export default function ImportanceMeter({
  value,
  family,
}: {
  value: MixImportance;
  family: DataFamily;
}) {
  const valueIndex = LEVELS.indexOf(value);
  return (
    <span
      aria-hidden="true"
      className={`${dataFamilyClass[family]} inline-flex h-4.5 items-end gap-0.5`}
    >
      {BARS.map((level) => (
        <span
          key={level}
          className={`block w-1.5 rounded-xs ${LEVEL_BAR_CLASS[level]} ${
            LEVELS.indexOf(level) <= valueIndex
              ? 'bg-(--data-chip-accent)'
              : 'bg-(--scale-empty)'
          }`}
        />
      ))}
    </span>
  );
}

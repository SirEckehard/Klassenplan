// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
//
// The icon weights the app draws, and the build step that ships only those.
//
// Every Phosphor icon is a module of its own (`dist/defs/<Name>.es.js`) that
// holds a `Map` of all six weights — thin, light, regular, bold, fill and
// duotone — as React elements. The app draws two of them: `regular`, set for
// every icon in `src/index.tsx`, and `bold` where an icon says so — and the
// table cards' motifs two more. The other four were a good third of the entry
// chunk's icon bytes for nothing.
// `src/__tests__/iconWeights.test.ts` fails on a weight outside the list, so
// an icon can never ask for one the build took away.
import type { Plugin } from 'vite';

export const ICON_WEIGHTS = ['regular', 'bold'] as const;

/**
 * The table cards' motifs (decision 0047, `src/utils/ui/tableCardMotifs.ts`)
 * are drawn in two more weights: duotone on a card, light as an outline to
 * colour in. Only their definitions keep them.
 */
export const MOTIF_WEIGHTS = ['duotone', 'light'] as const;

export const MOTIF_ICON_NAMES: readonly string[] = [
  'Acorn',
  'Airplane',
  'Alien',
  'Anchor',
  'Avocado',
  'Balloon',
  'Bicycle',
  'Bird',
  'Boat',
  'Bug',
  'Bus',
  'Butterfly',
  'Cactus',
  'Car',
  'Carrot',
  'Cat',
  'Cherries',
  'Cloud',
  'Cookie',
  'Cow',
  'Dog',
  'Fish',
  'Flower',
  'FlowerTulip',
  'FlyingSaucer',
  'Ghost',
  'Gift',
  'Guitar',
  'Hamburger',
  'Heart',
  'Horse',
  'IceCream',
  'Leaf',
  'Moon',
  'Orange',
  'PaintBrush',
  'PawPrint',
  'Pizza',
  'Planet',
  'Popcorn',
  'PuzzlePiece',
  'Rabbit',
  'Rainbow',
  'Robot',
  'Rocket',
  'Sailboat',
  'Scooter',
  'Snowflake',
  'SoccerBall',
  'Star',
  'Sun',
  'Tent',
  'Tractor',
  'Train',
  'Tree',
  'Truck',
  'Umbrella',
];

/** Where the Map of a Phosphor definition module starts. */
const MAP_START = 'new Map([';

/**
 * The index just past the bracket that closes the one opening at `start`,
 * skipping string literals; -1 when it never closes.
 */
function closingIndex(code: string, start: number): number {
  let depth = 0;
  for (let index = start; index < code.length; index += 1) {
    const char = code[index];
    if (char === '"' || char === "'" || char === '`') {
      const end = code.indexOf(char, index + 1);
      if (end < 0) return -1;
      index = end;
    } else if (char === '[' || char === '(' || char === '{') {
      depth += 1;
    } else if (char === ']' || char === ')' || char === '}') {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
  }
  return -1;
}

/**
 * A Phosphor definition module with only the entries of `keep` left in its
 * Map. Code of any other shape comes back unchanged, so a new release of the
 * package that writes its modules differently costs bytes, never an icon.
 */
export function keepIconWeights(
  code: string,
  keep: readonly string[] = ICON_WEIGHTS,
): string {
  const mapAt = code.indexOf(MAP_START);
  if (mapAt < 0) return code;
  const arrayAt = mapAt + MAP_START.length - 1;
  const arrayEnd = closingIndex(code, arrayAt);
  if (arrayEnd < 0) return code;

  const entries: string[] = [];
  let index = arrayAt + 1;
  while (index < arrayEnd - 1) {
    const entryAt = code.indexOf('[', index);
    if (entryAt < 0 || entryAt >= arrayEnd - 1) break;
    const entryEnd = closingIndex(code, entryAt);
    if (entryEnd < 0) return code;
    entries.push(code.slice(entryAt, entryEnd));
    index = entryEnd;
  }

  const kept = entries.filter((entry) => {
    const weight = /^\[\s*["']([a-z]+)["']/.exec(entry)?.[1];
    return weight !== undefined && keep.includes(weight);
  });
  // Nothing recognised, or a weight missing: leave the module as it is.
  if (kept.length !== keep.length) return code;

  return `${code.slice(0, arrayAt + 1)}${kept.join(',')}${code.slice(arrayEnd - 1)}`;
}

/** The weights a definition keeps: a motif's four, every other icon's two. */
export function weightsFor(id: string): readonly string[] {
  const name = /[\\/]defs[\\/](\w+)\.es\.js/.exec(id)?.[1];
  return name && MOTIF_ICON_NAMES.includes(name)
    ? [...ICON_WEIGHTS, ...MOTIF_WEIGHTS]
    : ICON_WEIGHTS;
}

/** The build step: every Phosphor definition with only the drawn weights. */
export const iconWeightsPlugin = (): Plugin => ({
  name: 'klassenplan:icon-weights',
  apply: 'build',
  transform(code, id) {
    if (!/[\\/]@phosphor-icons[\\/]react[\\/]dist[\\/]defs[\\/]/.test(id)) {
      return null;
    }
    const trimmed = keepIconWeights(code, weightsFor(id));
    return trimmed === code ? null : { code: trimmed, map: null };
  },
});

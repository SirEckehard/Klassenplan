// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The build ships only the icon weights in `ICON_WEIGHTS`
 * (`scripts/utils/iconWeights.ts`). An icon asking for another one would draw
 * nothing in production while it looks fine in the dev server, which serves
 * the package untouched — so the source may name no other weight.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ICON_WEIGHTS,
  keepIconWeights,
  MOTIF_ICON_NAMES,
  MOTIF_WEIGHTS,
  weightsFor,
} from '../../scripts/utils/iconWeights';
import { CARD_MOTIF_ICONS } from '@/utils/ui/tableCardMotifs';

/** The files that draw the table cards' motifs (decision 0047). */
const MOTIF_FILES = [
  path.join('components', 'scene', 'TableCardsSheet.tsx'),
  path.join('components', 'SeatingPlanGenerator', 'TableCardsInspector.tsx'),
];

const SRC = path.resolve(__dirname, '..');

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) {
      return name === '__tests__' ? [] : sourceFiles(full);
    }
    return /\.tsx?$/.test(name) ? [full] : [];
  });

const PHOSPHOR_DEF = `import * as a from "react";
const e = /* @__PURE__ */ new Map([
  [
    "bold",
    /* @__PURE__ */ a.createElement("path", { d: "M1,2Z" })
  ],
  [
    "duotone",
    /* @__PURE__ */ a.createElement(a.Fragment, null, a.createElement("path", { d: "M3,4Z", opacity: "0.2" }))
  ],
  [
    "regular",
    /* @__PURE__ */ a.createElement("path", { d: "M5,6Z" })
  ]
]);
export {
  e as default
};
`;

describe('icon weights', () => {
  it('names no weight the build takes away', () => {
    const named = new Set<string>();
    for (const file of sourceFiles(SRC)) {
      const code = readFileSync(file, 'utf8');
      // The table cards draw their motifs, and only those, in two more.
      const allowed = MOTIF_FILES.some((motifFile) => file.endsWith(motifFile))
        ? MOTIF_WEIGHTS
        : [];
      for (const match of code.matchAll(/\bweight=["'{]\s*['"]?(\w+)/g)) {
        if (!allowed.includes(match[1] as never)) named.add(match[1]);
      }
      for (const match of code.matchAll(
        /IconContext\.Provider value=\{\{[^}]*weight:\s*['"](\w+)['"]/g,
      )) {
        named.add(match[1]);
      }
    }

    expect(named.size).toBeGreaterThan(0);
    expect(
      [...named].filter((weight) => !ICON_WEIGHTS.includes(weight as never)),
    ).toEqual([]);
  });

  it('keeps a motif of the table cards in its two weights more', () => {
    const names = CARD_MOTIF_ICONS.map((icon) =>
      (icon.displayName ?? '').replace(/Icon$/, ''),
    );
    expect(names.filter((name) => !MOTIF_ICON_NAMES.includes(name))).toEqual(
      [],
    );
    expect(weightsFor('/x/@phosphor-icons/react/dist/defs/Cat.es.js')).toEqual([
      'regular',
      'bold',
      'duotone',
      'light',
    ]);
    expect(weightsFor('/x/@phosphor-icons/react/dist/defs/Lock.es.js')).toEqual(
      ICON_WEIGHTS,
    );
  });

  it('keeps only those weights of a definition', () => {
    const trimmed = keepIconWeights(PHOSPHOR_DEF);

    expect(trimmed).toContain('"bold"');
    expect(trimmed).toContain('"regular"');
    expect(trimmed).not.toContain('"duotone"');
    expect(trimmed).toContain('export {');
  });

  it('leaves a module it does not recognise as it is', () => {
    const missing = PHOSPHOR_DEF.replace('"regular"', '"thin"');

    expect(keepIconWeights(missing)).toBe(missing);
    expect(keepIconWeights('export default 1;')).toBe('export default 1;');
  });
});

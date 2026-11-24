// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
//
// Ratchet for unused exports.
//
// `ts-unused-exports` on this codebase reports a standing set of modules that
// are *not* dead code: re-export barrels whose names are consumed through the
// top-level `@/utils` barrel, default exports reached only through
// `lazyWithRetry`'s dynamic import, and shared test helpers. Failing CI on the
// raw number would mean failing every build; ignoring the tool means new dead
// code lands unnoticed.
//
// So this checks the *count* against a committed baseline: the number may fall
// (lower it in the same commit) but never rise. Adding an export that nothing
// imports fails the build; deleting dead code is rewarded rather than punished.
//
// Type-only exports are excluded via `--allowUnusedTypes`: Props interfaces and
// exported types are a deliberate convention here, not an accident.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logError, logInfo, logWarn } from './utils/logger.mjs';

const SOURCE = 'check-unused-exports';
const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

/**
 * Highest number of modules with unused exports that this repository accepts.
 *
 * Lower it whenever a cleanup drops the real count — that is what makes the
 * ratchet tighten. An export the tool misses because it is reached only
 * through `import()` goes into `REACHED_BY_IMPORT` below, never into a higher
 * baseline.
 *
 * 20 (2026-11-24): the exports reached only through `import()` are named in
 * `REACHED_BY_IMPORT` and no longer counted; the baseline had risen to 24 for
 * `compareClassFacts` (review of 2026-11-22, K34).
 *
 * 25 (2026-10-29): the cleanup removed what nothing called (the dead modules
 * `useIndexedDBState` and `responsiveViewBox`, functions only their tests
 * called, unused re-exports and defaults, the shared test helpers no test
 * used) and the `export` of names only their own file uses.
 *
 * 50 (2026-10-18): the scorers of `utils/algorithm/scoring/` and their unused
 * helpers (`getLanguageSkillDifference`, `hasPositiveSocialRole`, …) went with
 * the criterion model (decision 0031), and with them `circleArrangement.ts`.
 *
 * 52 (2026-10-03): `ClearAllDataDialog` in
 * `components/ui/navigation/AppSettingsItems.tsx` is reached only through the
 * module that `loadOnDemand` imports for both settings menus, and the tool
 * does not follow `import()`. It left the menu so that it no longer closes
 * with it.
 *
 * 51 (2026-09-29): `BREAKPOINTS` in `hooks/ui/useBreakpoint.ts` is no longer
 * exported; `InspectorContext`, which folds the column on a touch screen below
 * `xl`, asks `isBreakpointUp` instead.
 *
 * 53 (2026-09-19): `utils/data/studentMigration.ts` removed — nothing called
 * it, the readers normalize the legacy partner fields through
 * `utils/student/partnerUtils.ts` instead.
 *
 * 54 (2026-09-16): `services/backup/dataBackup.ts` moved behind a dynamic
 * import to leave the initial bundle, and the tool does not follow `import()`;
 * `exportAllAsJson` is the one export of it no test imports statically.
 */
const BASELINE = 20;

const IGNORE_FILES = 'vite-env.d.ts|index.tsx|App.tsx';

/**
 * Exports the app reaches only through a dynamic `import()` of their module,
 * which the tool does not follow — by file below `src/`, the names checked
 * against the code: each import names it in destructuring.
 */
const REACHED_BY_IMPORT = {
  // `useDataBackup`, for the question before "Stand vor dem Update …".
  'components/ui/modals/confirmFacts.ts': ['compareClassFacts'],
  // `AppSettingsMenu`, through the module both settings menus load on demand.
  'components/ui/navigation/AppSettingsItems.tsx': [
    'InstallGuideDialog',
    'ClearAllDataDialog',
  ],
  // `Duties`, for the roster's PDF.
  'services/export/pdfExportFunctions.ts': ['exportDutyRosterToPdf'],
  // `Export`, for PNG and SVG.
  'utils/export/imageExportFunctions.ts': ['exportSvgAsPng', 'exportSvgAsFile'],
};

/**
 * The modules with unused exports in the tool's output, less those whose
 * every unused export is reached through `import()`.
 */
const countUnused = (output) =>
  output
    .split('\n')
    .map((line) => /^(.+\.tsx?): (.+)$/.exec(line.trim()))
    .filter((match) => match !== null)
    .filter(([, file, names]) => {
      const relative = path.relative(path.join(rootDir, 'src'), file);
      const reached = new Set(REACHED_BY_IMPORT[relative] ?? []);
      return names.split(', ').some((name) => !reached.has(name.trim()));
    }).length;

const run = () => {
  const result = spawnSync(
    'npx',
    [
      'ts-unused-exports',
      'tsconfig.ts-unused.json',
      '--allowUnusedTypes',
      `--ignoreFiles=${IGNORE_FILES}`,
    ],
    { cwd: rootDir, encoding: 'utf8' },
  );

  if (result.error) {
    logError(
      'Could not run ts-unused-exports',
      { message: result.error.message },
      SOURCE,
    );
    process.exitCode = 1;
    return;
  }

  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  // The tool exits non-zero whenever it finds anything, so the exit code says
  // nothing on its own — the first line carries the number.
  const match = /^(\d+) modules with unused exports/m.exec(output);

  if (!match) {
    if (/^No unused exports/m.test(output)) {
      logInfo('No unused exports at all', { baseline: BASELINE }, SOURCE);
      if (BASELINE > 0) {
        logWarn(
          'Baseline can be lowered to 0 in scripts/check-unused-exports.mjs',
          undefined,
          SOURCE,
        );
      }
      return;
    }
    logError(
      'Could not read the module count from ts-unused-exports',
      { output: output.slice(0, 500) },
      SOURCE,
    );
    process.exitCode = 1;
    return;
  }

  const count = countUnused(output);

  if (count > BASELINE) {
    logError(
      'More modules with unused exports than the baseline allows',
      {
        count,
        baseline: BASELINE,
        // The full list is 50+ lines; printing it here would bury the number.
        list: `npx ts-unused-exports tsconfig.ts-unused.json --allowUnusedTypes --ignoreFiles='${IGNORE_FILES}'`,
        hint: 'Remove the new unused export, or raise BASELINE in scripts/check-unused-exports.mjs with a reason',
      },
      SOURCE,
    );
    process.exitCode = 1;
    return;
  }

  if (count < BASELINE) {
    logWarn(
      'Fewer unused exports than the baseline — lower it to keep the ratchet tight',
      { count, baseline: BASELINE },
      SOURCE,
    );
    return;
  }

  logInfo(
    'Unused exports at the baseline',
    { count, baseline: BASELINE },
    SOURCE,
  );
};

run();

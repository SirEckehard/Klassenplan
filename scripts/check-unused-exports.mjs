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
 * ratchet tighten. Raising it needs a reason in the same commit.
 */
const BASELINE = 54;

const IGNORE_FILES = 'vite-env.d.ts|index.tsx|App.tsx';

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

  const count = Number(match[1]);

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

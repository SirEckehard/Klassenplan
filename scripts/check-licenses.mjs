// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
//
// Licences of the runtime dependencies, without building.
//
// The build writes the licence texts of what it bundles to
// dist/third-party-licenses.txt and fails on a licence outside
// ALLOWED_LICENSES (scripts/utils/thirdPartyLicenses.ts). This check asks the
// same of every package the lockfile installs for production, so a dependency
// under an incompatible licence is caught before anything is built — the
// moment Dependabot or `npm install` brings it in.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logError, logInfo } from './utils/logger.mjs';
import { isLicenseAllowed } from './utils/thirdPartyLicenses.ts';

const SOURCE = 'check-licenses';
const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

const run = () => {
  const lockfile = JSON.parse(
    readFileSync(path.join(rootDir, 'package-lock.json'), 'utf8'),
  );
  const packages = Object.entries(lockfile.packages).filter(
    ([location, entry]) => location !== '' && !entry.dev && !entry.devOptional,
  );
  const problems = packages
    .map(([location, entry]) => ({
      name: location.replace(/^.*node_modules\//, ''),
      license: entry.license ?? 'UNKNOWN',
    }))
    .filter(({ license }) => !isLicenseAllowed(license));

  if (problems.length > 0) {
    for (const { name, license } of problems) {
      logError('Licence not allowed', { name, license }, SOURCE);
    }
    logError(
      'Runtime dependencies under licences outside ALLOWED_LICENSES ' +
        '(scripts/utils/thirdPartyLicenses.ts)',
      { problems: problems.length, packages: packages.length },
      SOURCE,
    );
    process.exitCode = 1;
    return;
  }

  logInfo(
    'Runtime dependency licences allowed',
    { packages: packages.length },
    SOURCE,
  );
};

run();

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
//
// Runs the export sheet snapshots (the Playwright project "visual",
// e2e/export-sheets.spec.ts) in Docker, in the Linux image of the Playwright
// version the project uses. Chromium draws text a little differently on every
// system, and CI runs Linux, so that is where the snapshots are drawn.
//
// Usage:
//   npm run test:visual           compare the sheets with the snapshots
//   npm run test:visual:update    draw the snapshots anew; look at the changed
//                                 files in e2e/__screenshots__ before committing
//
// Needs a running Docker: Docker Desktop, or Colima
// (`colima start --vm-type vz --vz-rosetta`). The image is linux/amd64, as
// CI's runner is; on Apple silicon Rosetta runs it. The Mac's node_modules
// carry macOS binaries, so the container keeps its own in a volume
// (`klassenplan-visual-modules`) and installs them again when
// package-lock.json changes. The image's Node is older than the project's;
// the Node this script runs on is fetched once into a second volume
// (`klassenplan-visual-node`).
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logError, logInfo } from './utils/logger.mjs';

const SOURCE = 'visual-snapshots';
const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

const lock = JSON.parse(
  readFileSync(path.join(projectRoot, 'package-lock.json'), 'utf8'),
);
const playwrightVersion =
  lock.packages?.['node_modules/@playwright/test']?.version;
if (!playwrightVersion) {
  logError('No @playwright/test in package-lock.json', {}, SOURCE);
  process.exit(1);
}
const nodeVersion = process.versions.node;
const image = `mcr.microsoft.com/playwright:v${playwrightVersion}-noble`;
const update = process.argv.includes('--update');

const inner = `
set -euo pipefail
node_dir=/node/node-v${nodeVersion}-linux-x64
if [ ! -x "$node_dir/bin/node" ]; then
  echo "Fetching Node ${nodeVersion} …"
  node -e "fetch(process.argv[1]).then((r) => { if (!r.ok) throw new Error(r.statusText); return r.arrayBuffer(); }).then((b) => require('fs').writeFileSync('/tmp/node.tar.gz', Buffer.from(b)))" \\
    "https://nodejs.org/dist/v${nodeVersion}/node-v${nodeVersion}-linux-x64.tar.gz"
  tar -xzf /tmp/node.tar.gz -C /node
fi
export PATH="$node_dir/bin:$PATH"
lock_hash=$(sha256sum package-lock.json | cut -d' ' -f1)
if [ "$(cat node_modules/.lock-hash 2>/dev/null)" != "$lock_hash" ]; then
  echo "Installing packages for Linux …"
  npm ci --no-audit --no-fund
  echo "$lock_hash" > node_modules/.lock-hash
fi
CI=1 npx playwright test --project visual ${update ? '--update-snapshots' : ''}
`;

logInfo(
  `${update ? 'Drawing' : 'Comparing'} the export sheet snapshots in ${image}`,
  {},
  SOURCE,
);
const result = spawnSync(
  'docker',
  [
    'run',
    '--rm',
    '--init',
    '--ipc=host',
    '--platform',
    'linux/amd64',
    '-v',
    `${projectRoot}:/work`,
    '-v',
    'klassenplan-visual-modules:/work/node_modules',
    '-v',
    'klassenplan-visual-node:/node',
    '-w',
    '/work',
    image,
    'bash',
    '-c',
    inner,
  ],
  { stdio: 'inherit' },
);
if (result.error) {
  logError(
    'Docker could not be started; is it running?',
    { error: result.error.message },
    SOURCE,
  );
  process.exit(1);
}
process.exit(result.status ?? 1);

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
//
// Generates the downscaled start page screenshots that HeroMockup serves
// through `srcset`.
//
// The PNGs in public/preview/ are the lossless masters. For each master this
// writes `<name>-<width>.avif` and `<name>-<width>.webp` for every width in
// src/data/previewImages.json that is smaller than the master itself. The
// full-size .avif/.webp files next to them are left alone: the lightbox and the
// web app manifest use those.
//
// Why: the carousel slot is at most 488 CSS px wide, but every visitor
// downloaded the 2990 px originals — PageSpeed Insights counted 357 KiB of it
// as wasted.
//
// Needs libwebp (cwebp, dwebp) and libavif (avifenc) on the PATH:
//   macOS:          brew install webp libavif
//   Debian/Ubuntu:  apt install webp libavif-bin
// avifenc cannot resize, so each master is first scaled losslessly by cwebp and
// decoded back to PNG by dwebp.
//
// Usage: npm run generate:preview-images [-- --force]
// Without --force, variants newer than their master are skipped.
import { spawnSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logError, logInfo } from './utils/logger.mjs';

const SOURCE = 'generate-preview-images';
const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const previewDir = path.join(projectRoot, 'public', 'preview');
const configPath = path.join(projectRoot, 'src', 'data', 'previewImages.json');

// Picked against the existing full-size files (≈ AVIF q55 / WebP q80) and
// raised slightly: downscaled screenshots carry small text that blurs first.
const AVIF_QUALITY = '60';
const AVIF_SPEED = '6';
const WEBP_QUALITY = '82';

const force = process.argv.includes('--force');

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf-8' });
  if (result.error?.code === 'ENOENT') {
    throw new Error(
      `${command} not found — install libwebp and libavif (see the header of this script)`,
    );
  }
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed: ${result.stderr || result.stdout}`,
    );
  }
}

/** Width and height from the IHDR chunk, which always follows the signature. */
async function readPngSize(file) {
  const handle = await fs.open(file, 'r');
  try {
    const { buffer } = await handle.read(Buffer.alloc(24), 0, 24, 0);
    if (buffer.toString('ascii', 12, 16) !== 'IHDR') {
      throw new Error(`${path.basename(file)} is not a PNG`);
    }
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  } finally {
    await handle.close();
  }
}

async function isUpToDate(output, masterMtime) {
  try {
    return (await fs.stat(output)).mtimeMs >= masterMtime;
  } catch {
    return false;
  }
}

async function main() {
  const { variantWidths } = JSON.parse(await fs.readFile(configPath, 'utf-8'));
  const masters = (await fs.readdir(previewDir))
    .filter((name) => name.endsWith('.png'))
    .sort();

  if (masters.length === 0) {
    throw new Error(`no PNG masters in ${previewDir}`);
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kp-preview-'));
  let written = 0;
  let skipped = 0;

  try {
    for (const master of masters) {
      const masterPath = path.join(previewDir, master);
      const base = master.slice(0, -'.png'.length);
      const { width } = await readPngSize(masterPath);
      const { mtimeMs } = await fs.stat(masterPath);

      for (const target of variantWidths.filter((w) => w < width)) {
        const avif = path.join(previewDir, `${base}-${target}.avif`);
        const webp = path.join(previewDir, `${base}-${target}.webp`);

        if (
          !force &&
          (await isUpToDate(avif, mtimeMs)) &&
          (await isUpToDate(webp, mtimeMs))
        ) {
          skipped += 1;
          continue;
        }

        const scaledWebp = path.join(tmpDir, `${base}-${target}.webp`);
        const scaledPng = path.join(tmpDir, `${base}-${target}.png`);

        // Height 0 keeps the aspect ratio.
        run('cwebp', [
          '-quiet',
          '-lossless',
          '-z',
          '0',
          '-resize',
          String(target),
          '0',
          masterPath,
          '-o',
          scaledWebp,
        ]);
        run('dwebp', ['-quiet', scaledWebp, '-o', scaledPng]);
        run('avifenc', [
          '-q',
          AVIF_QUALITY,
          '-s',
          AVIF_SPEED,
          '--jobs',
          'all',
          scaledPng,
          avif,
        ]);
        run('cwebp', [
          '-quiet',
          '-q',
          WEBP_QUALITY,
          '-m',
          '6',
          '-resize',
          String(target),
          '0',
          masterPath,
          '-o',
          webp,
        ]);

        written += 1;
      }
    }
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }

  logInfo('Preview variants ready', { written, skipped }, SOURCE);
}

main().catch((error) => {
  logError(
    'Generating preview variants failed',
    { error: error.message },
    SOURCE,
  );
  process.exitCode = 1;
});

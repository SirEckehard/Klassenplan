// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
//
// Encodes the start page screenshots that HeroMockup serves through `srcset`
// and shows in its lightbox, and the close-ups beside the sections
// (`PreviewDetail`).
//
// The PNGs in assets/preview/ are the lossless masters, usually written by
// capture-preview-screenshots.mjs; they stay out of public/, so no build ships
// them. For each master this writes into public/preview/ the full-size
// `<name>.avif`, which the lightbox and the web app manifest use, and
// `<name>-<width>.avif` for every width in src/data/previewImages.json that is
// smaller than the master itself. A close-up (`detail_*`) is shown at half
// its master's size or smaller, as a picture of twice the density: it gets
// the full-size AVIF and WebP alone, at the qualities of the copies, since
// what it shows is small text.
//
// WebP is only the fallback for a browser without AVIF — among the supported
// ones Safari 16.4 to 17 on macOS 11 and 12, where AVIF depends on the system.
// It comes in one width (`webpWidth`, `<name>-960.webp`; the full size for a
// narrower master), since a copy per width doubled the screenshots in every
// image and archive for a handful of visitors.
//
// Why: the carousel slot is at most 488 CSS px wide, but every visitor
// downloaded the 2990 px originals — PageSpeed Insights counted 357 KiB of it
// as wasted.
//
// Needs libwebp (cwebp, dwebp) and libavif (avifenc) on the PATH:
//   macOS:          brew install webp libavif
//   Debian/Ubuntu:  apt install webp libavif-bin
// avifenc cannot resize, so each master is first scaled losslessly by cwebp and
// decoded back to PNG by dwebp. The full-size files take the same detour: an
// opaque RGBA master comes back as RGB, so the AVIF carries no alpha plane.
//
// Usage: npm run generate:preview-images [-- --force]
// Without --force, files newer than their master are skipped.
//
// Last, it stamps a hash of the finished files into previewImages.json as
// `version`, which HeroMockup appends to every image URL — the file names stay
// the same across re-shoots, so without it the caches kept the old pictures
// (see scripts/utils/previewVersion.mjs).
import { spawnSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logError, logInfo } from './utils/logger.mjs';
import {
  computePreviewVersion,
  writePreviewVersion,
} from './utils/previewVersion.mjs';

const SOURCE = 'generate-preview-images';
const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const masterDir = path.join(projectRoot, 'assets', 'preview');
const previewDir = path.join(projectRoot, 'public', 'preview');
const configPath = path.join(projectRoot, 'src', 'data', 'previewImages.json');

// The full-size files use the qualities the original ones were encoded with.
// The downscaled copies are raised slightly: their small text blurs first.
const FULL_SIZE_QUALITY = { avif: '55', webp: '80' };
const VARIANT_QUALITY = { avif: '60', webp: '82' };
const AVIF_SPEED = '6';

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
  const { variantWidths, webpWidth } = JSON.parse(
    await fs.readFile(configPath, 'utf-8'),
  );
  const masters = (await fs.readdir(masterDir))
    .filter((name) => name.endsWith('.png'))
    .sort();

  if (masters.length === 0) {
    throw new Error(`no PNG masters in ${masterDir}`);
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kp-preview-'));
  let written = 0;
  let skipped = 0;
  const webpFiles = new Set();

  try {
    for (const master of masters) {
      const masterPath = path.join(masterDir, master);
      const base = master.slice(0, -'.png'.length);
      const { width } = await readPngSize(masterPath);
      const { mtimeMs } = await fs.stat(masterPath);
      const isDetail = base.startsWith('detail_');

      // The full-size file first (no suffix, no resize), then one per width.
      const outputs = [
        {
          suffix: '',
          resize: [],
          quality: isDetail ? VARIANT_QUALITY : FULL_SIZE_QUALITY,
        },
        ...(isDetail ? [] : variantWidths)
          .filter((w) => w < width)
          .map((w) => ({
            suffix: `-${w}`,
            // Height 0 keeps the aspect ratio.
            resize: ['-resize', String(w), '0'],
            quality: VARIANT_QUALITY,
          })),
      ];

      // The one WebP: at `webpWidth`, or full-size for a narrower master
      // and for a close-up.
      const webpSuffix = !isDetail && webpWidth < width ? `-${webpWidth}` : '';
      webpFiles.add(`${base}${webpSuffix}.webp`);

      for (const { suffix, resize, quality } of outputs) {
        const avif = path.join(previewDir, `${base}${suffix}.avif`);
        const webp =
          suffix === webpSuffix
            ? path.join(previewDir, `${base}${suffix}.webp`)
            : null;

        if (
          !force &&
          (await isUpToDate(avif, mtimeMs)) &&
          (webp === null || (await isUpToDate(webp, mtimeMs)))
        ) {
          skipped += 1;
          continue;
        }

        const scaledWebp = path.join(tmpDir, `${base}${suffix}.webp`);
        const scaledPng = path.join(tmpDir, `${base}${suffix}.png`);

        run('cwebp', [
          '-quiet',
          '-lossless',
          '-z',
          '0',
          ...resize,
          masterPath,
          '-o',
          scaledWebp,
        ]);
        run('dwebp', ['-quiet', scaledWebp, '-o', scaledPng]);
        run('avifenc', [
          '-q',
          quality.avif,
          '-s',
          AVIF_SPEED,
          '--jobs',
          'all',
          scaledPng,
          avif,
        ]);
        if (webp !== null) {
          run('cwebp', [
            '-quiet',
            '-q',
            quality.webp,
            '-m',
            '6',
            ...resize,
            masterPath,
            '-o',
            webp,
          ]);
        }

        written += 1;
      }
    }
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }

  // A WebP no slide asks for any more — another width, a screenshot gone.
  let removed = 0;
  for (const name of await fs.readdir(previewDir)) {
    if (name.endsWith('.webp') && !webpFiles.has(name)) {
      await fs.rm(path.join(previewDir, name));
      removed += 1;
    }
  }

  // Always recomputed, even when every file was skipped: a screenshot replaced
  // by hand is only picked up here.
  const version = await computePreviewVersion(previewDir);
  const versionChanged = await writePreviewVersion(configPath, version);

  logInfo(
    'Preview variants ready',
    { written, skipped, removed, version, versionChanged },
    SOURCE,
  );
}

main().catch((error) => {
  logError(
    'Generating preview variants failed',
    { error: error.message },
    SOURCE,
  );
  process.exitCode = 1;
});

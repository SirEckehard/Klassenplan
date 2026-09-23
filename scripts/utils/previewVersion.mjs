// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
//
// The version stamp of the start page screenshots.
//
// The screenshots keep their file names when they are re-shot, but every cache
// in front of them treats a name as a promise that the content never changes:
// nginx serves images `immutable` for a year, and the service worker answers
// /preview/ cache-first. A new screenshot under an old name therefore never
// reached a returning visitor. HeroMockup appends this stamp to every image URL
// instead (`?v=…`), so a new set of screenshots is a new set of URLs and every
// cache fetches it once, while an unchanged set stays cached as long as ever.
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

/** A short hash over the name and content of every served AVIF and WebP. */
export async function computePreviewVersion(previewDir) {
  const names = (await fs.readdir(previewDir))
    .filter((name) => /\.(avif|webp)$/.test(name))
    .sort();
  const hash = createHash('sha256');
  for (const name of names) {
    hash.update(name);
    hash.update('\0');
    hash.update(await fs.readFile(path.join(previewDir, name)));
  }
  return hash.digest('hex').slice(0, 10);
}

/**
 * Writes the stamp into src/data/previewImages.json, laid out the way Prettier
 * formats it so a regenerated file differs by the stamp alone. Returns whether
 * the file changed.
 */
export async function writePreviewVersion(configPath, version) {
  const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
  if (config.version === version) {
    return false;
  }
  const content =
    '{\n' +
    `  "variantWidths": [${config.variantWidths.join(', ')}],\n` +
    `  "version": "${version}"\n` +
    '}\n';
  await fs.writeFile(configPath, content);
  return true;
}

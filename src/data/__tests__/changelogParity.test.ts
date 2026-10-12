// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  changelogVersions,
  type ChangeCategory,
} from '@/data/changelogEntries';
import enChangelog from '@/i18n/locales/en/changelog.json';
import deChangelog from '@/i18n/locales/de/changelog.json';
import packageJson from '../../../package.json';

/**
 * The release notes on GitHub are cut out of docs/CHANGELOG.md, while the
 * post-update notice and /changelog read the in-app entries. From this
 * version on the two say the same thing, item by item, in the same order;
 * earlier releases were worded apart and stay as they were published.
 */
const FIRST_ALIGNED_VERSION = '3.1.2';

const HEADING_CATEGORY: Record<string, ChangeCategory> = {
  Added: 'feature',
  Improved: 'improvement',
  Fixed: 'bugfix',
  'Known Issues': 'knownissue',
};

const CATEGORY_ORDER: ChangeCategory[] = [
  'feature',
  'improvement',
  'bugfix',
  'knownissue',
];

type Texts = Record<string, Record<string, string> | unknown>;

const compareVersions = (a: string, b: string): number => {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
};

const markdown = readFileSync(
  resolve(process.cwd(), 'docs/CHANGELOG.md'),
  'utf8',
);

/** The `## [X.Y.Z] - date` section as the release workflow's awk cuts it. */
function readMarkdownSection(version: string) {
  const lines = markdown.split('\n');
  const start = lines.findIndex((line) => line.startsWith(`## [${version}]`));
  if (start === -1) return null;
  const date = /- (\d{4}-\d{2}-\d{2})$/.exec(lines[start] ?? '')?.[1];
  const items: { type: ChangeCategory | undefined; text: string }[] = [];
  let heading: string | undefined;
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('## ')) break;
    if (line.startsWith('### ')) heading = line.slice(4).trim();
    else if (line.startsWith('- ')) {
      items.push({
        type: heading ? HEADING_CATEGORY[heading] : undefined,
        text: line.slice(2).trim(),
      });
    }
  }
  return { date, items };
}

const stripPeriod = (text: string) => text.replace(/\.$/, '');

const textOf = (texts: Texts, textKey: string | undefined) => {
  if (!textKey) return undefined;
  const [group, index] = textKey.split('.');
  const entries = texts[group ?? ''] as Record<string, string> | undefined;
  return entries?.[index ?? ''];
};

const alignedVersions = changelogVersions.filter(
  (entry) => compareVersions(entry.version, FIRST_ALIGNED_VERSION) >= 0,
);

describe('changelog parity', () => {
  it('lists the running version first', () => {
    expect(changelogVersions[0]?.version).toBe(packageJson.version);
  });

  it.each(alignedVersions.map((entry) => [entry.version, entry] as const))(
    'docs/CHANGELOG.md and the in-app entries of %s agree',
    (version, entry) => {
      const section = readMarkdownSection(version);
      expect(section, `docs/CHANGELOG.md has no ## [${version}]`).not.toBe(
        null,
      );
      expect(section!.date).toBe(entry.date);

      // The page and the notice group by kind in this order, so the entries
      // have to be written in it for the notice's highlights to be the first
      // items of the release notes.
      const order = entry.changes.map((change) =>
        CATEGORY_ORDER.indexOf(change.type),
      );
      expect(order).toEqual([...order].sort((a, b) => a - b));

      expect(
        entry.changes.map((change) => ({
          type: change.type,
          text: stripPeriod(
            change.text ?? textOf(enChangelog, change.textKey) ?? '',
          ),
        })),
      ).toEqual(
        section!.items.map((item) => ({
          type: item.type,
          text: stripPeriod(item.text),
        })),
      );

      for (const change of entry.changes) {
        expect(
          textOf(deChangelog, change.textKey),
          `${change.textKey} has no German text`,
        ).toBeTruthy();
      }
    },
  );
});

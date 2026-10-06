// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import {
  changelogVersions,
  type ChangeCategory,
} from '@/data/changelogEntries';

export interface ChangelogSection {
  titleKey: string;
  items: string[];
}

export interface LatestChangelogEntry {
  version: string;
  date?: string;
  sections: ChangelogSection[];
}

export const CHANGELOG_ROUTE = '/changelog';

/**
 * The release that rebuilt the app around three layers, rooms and
 * "Bibliothek". A teacher arriving from an earlier one gets a summary of the
 * new layout instead of the usual post-update notice.
 */
const REDESIGN_MAJOR = 3;

const majorOf = (version: string): number =>
  Number.parseInt(version.split('.')[0] ?? '', 10);

/**
 * Whether the step from `previous` to `current` crosses the redesign — the
 * last version seen predates it, the running one has it. An empty or unreadable
 * `previous` is a first visit, which has nothing to compare with.
 */
export function isRedesignUpgrade(previous: string, current: string): boolean {
  const from = majorOf(previous);
  const to = majorOf(current);
  return (
    Number.isFinite(from) &&
    Number.isFinite(to) &&
    from < REDESIGN_MAJOR &&
    to >= REDESIGN_MAJOR
  );
}

let cachedLatestEntry: LatestChangelogEntry | null | undefined;
const SECTION_TITLES: Record<ChangeCategory, string> = {
  feature: 'types.feature',
  improvement: 'types.improvement',
  bugfix: 'types.bugfix',
  knownissue: 'types.knownissue',
};
const SECTION_ORDER: ChangeCategory[] = [
  'feature',
  'improvement',
  'bugfix',
  'knownissue',
];

/**
 * Returns the latest changelog entry.
 */
export function getLatestChangelogEntry(): LatestChangelogEntry | null {
  if (cachedLatestEntry !== undefined) {
    return cachedLatestEntry;
  }

  const latestVersion = changelogVersions[0];
  if (!latestVersion) {
    cachedLatestEntry = null;
    return cachedLatestEntry;
  }

  const groupedChanges = latestVersion.changes.reduce<
    Partial<Record<ChangeCategory, string[]>>
  >((acc, change) => {
    if (!acc[change.type]) {
      acc[change.type] = [];
    }
    acc[change.type]!.push(change.text || change.textKey || '');
    return acc;
  }, {});

  const sections: ChangelogSection[] = SECTION_ORDER.reduce<ChangelogSection[]>(
    (result, type) => {
      const items = groupedChanges[type];
      if (items && items.length > 0) {
        result.push({
          titleKey: SECTION_TITLES[type],
          items,
        });
      }
      return result;
    },
    [],
  );

  cachedLatestEntry = {
    version: latestVersion.version,
    date: latestVersion.date,
    sections,
  };
  return cachedLatestEntry;
}

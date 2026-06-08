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

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
export type ChangeCategory =
  | 'feature'
  | 'improvement'
  | 'bugfix'
  | 'knownissue';

export interface ChangeItem {
  textKey?: string;
  text?: string;
  type: ChangeCategory;
}

export interface ChangelogVersion {
  version: string;
  date: string;
  changes: ChangeItem[];
}

export const changelogVersions: ChangelogVersion[] = [
  {
    version: '1.5.0',
    date: '10. Mai 2026',
    changes: [
      { textKey: 'v1_5_0.0', type: 'feature' },
      { textKey: 'v1_5_0.1', type: 'feature' },
      { textKey: 'v1_5_0.2', type: 'feature' },
      { textKey: 'v1_5_0.3', type: 'improvement' },
      { textKey: 'v1_5_0.4', type: 'improvement' },
      { textKey: 'v1_5_0.5', type: 'improvement' },
      { textKey: 'v1_5_0.6', type: 'bugfix' },
      { textKey: 'v1_5_0.7', type: 'bugfix' },
    ],
  },
  {
    version: '1.4.2',
    date: '2. Mai 2026',
    changes: [
      { textKey: 'v1_4_2.0', type: 'improvement' },
      { textKey: 'v1_4_2.1', type: 'improvement' },
      { textKey: 'v1_4_2.2', type: 'improvement' },
    ],
  },
  {
    version: '1.4.1',
    date: '29. März 2026',
    changes: [
      { textKey: 'v1_4_1.0', type: 'improvement' },
    ],
  },
  {
    version: '1.4.0',
    date: '23. Januar 2026',
    changes: [
      { textKey: 'v1_4_0.0', type: 'feature' },
      { textKey: 'v1_4_0.1', type: 'feature' },
      { textKey: 'v1_4_0.2', type: 'improvement' },
      { textKey: 'v1_4_0.3', type: 'improvement' },
      { textKey: 'v1_4_0.4', type: 'improvement' },
      { textKey: 'v1_4_0.5', type: 'improvement' },
    ],
  },
  {
    version: '1.3.0',
    date: '4. Januar 2026',
    changes: [
      { textKey: 'v1_3_0.0', type: 'feature' },
      { textKey: 'v1_3_0.1', type: 'feature' },
      { textKey: 'v1_3_0.2', type: 'feature' },
      { textKey: 'v1_3_0.3', type: 'improvement' },
      { textKey: 'v1_3_0.4', type: 'improvement' },
      { textKey: 'v1_3_0.5', type: 'improvement' },
      { textKey: 'v1_3_0.6', type: 'improvement' },
      { textKey: 'v1_3_0.7', type: 'improvement' },
      { textKey: 'v1_3_0.8', type: 'improvement' },
    ],
  },
  {
    version: '1.2.1',
    date: '31. Dezember 2025',
    changes: [
      {
        textKey: 'v1_2_1.0',
        type: 'bugfix',
      },
      {
        textKey: 'v1_2_1.1',
        type: 'improvement',
      },
    ],
  },
  {
    version: '1.2.0',
    date: '13. Dezember 2025',
    changes: [
      { textKey: 'v1_2_0.0', type: 'feature' },
      { textKey: 'v1_2_0.1', type: 'feature' },
      { textKey: 'v1_2_0.2', type: 'feature' },
      { textKey: 'v1_2_0.3', type: 'improvement' },
      { textKey: 'v1_2_0.4', type: 'improvement' },
      { textKey: 'v1_2_0.5', type: 'improvement' },
    ],
  },
  {
    version: '1.1.3',
    date: '08. November 2025',
    changes: [
      { textKey: 'v1_1_3.0', type: 'improvement' },
      { textKey: 'v1_1_3.1', type: 'improvement' },
      { textKey: 'v1_1_3.2', type: 'improvement' },
      { textKey: 'v1_1_3.3', type: 'improvement' },
      { textKey: 'v1_1_3.4', type: 'improvement' },
      { textKey: 'v1_1_3.5', type: 'improvement' },
    ],
  },
  {
    version: '1.1.2',
    date: '31. Oktober 2025',
    changes: [
      { textKey: 'v1_1_2.0', type: 'feature' },
      { textKey: 'v1_1_2.1', type: 'feature' },
      { textKey: 'v1_1_2.2', type: 'improvement' },
      { textKey: 'v1_1_2.3', type: 'bugfix' },
      { textKey: 'v1_1_2.4', type: 'knownissue' },
    ],
  },
  {
    version: '1.1.1',
    date: '25. Oktober 2025',
    changes: [
      { textKey: 'v1_1_1.0', type: 'feature' },
      { textKey: 'v1_1_1.1', type: 'improvement' },
      { textKey: 'v1_1_1.2', type: 'improvement' },
      { textKey: 'v1_1_1.3', type: 'knownissue' },
      { textKey: 'v1_1_1.4', type: 'knownissue' },
    ],
  },
  {
    version: '1.1.0',
    date: '22. Oktober 2025',
    changes: [
      { textKey: 'v1_1_0.0', type: 'feature' },
      { textKey: 'v1_1_0.1', type: 'feature' },
      { textKey: 'v1_1_0.2', type: 'improvement' },
      { textKey: 'v1_1_0.3', type: 'improvement' },
      { textKey: 'v1_1_0.4', type: 'improvement' },
      { textKey: 'v1_1_0.5', type: 'improvement' },
      { textKey: 'v1_1_0.6', type: 'improvement' },
      { textKey: 'v1_1_0.7', type: 'knownissue' },
      { textKey: 'v1_1_0.8', type: 'knownissue' },
    ],
  },
  {
    version: '1.0.3',
    date: '16. Oktober 2025',
    changes: [
      { textKey: 'v1_0_3.0', type: 'feature' },
      { textKey: 'v1_0_3.1', type: 'feature' },
      { textKey: 'v1_0_3.2', type: 'feature' },
      { textKey: 'v1_0_3.3', type: 'improvement' },
      { textKey: 'v1_0_3.4', type: 'improvement' },
      { textKey: 'v1_0_3.5', type: 'improvement' },
      { textKey: 'v1_0_3.6', type: 'improvement' },
      { textKey: 'v1_0_3.7', type: 'improvement' },
      { textKey: 'v1_0_3.8', type: 'bugfix' },
    ],
  },
  {
    version: '1.0.2',
    date: '5. Oktober 2025',
    changes: [
      { textKey: 'v1_0_2.0', type: 'feature' },
      { textKey: 'v1_0_2.1', type: 'feature' },
      { textKey: 'v1_0_2.2', type: 'feature' },
      { textKey: 'v1_0_2.3', type: 'improvement' },
      { textKey: 'v1_0_2.4', type: 'bugfix' },
    ],
  },
  {
    version: '1.0.1',
    date: '28. September 2025',
    changes: [
      { textKey: 'v1_0_1.0', type: 'feature' },
      { textKey: 'v1_0_1.1', type: 'feature' },
      { textKey: 'v1_0_1.2', type: 'improvement' },
      { textKey: 'v1_0_1.3', type: 'bugfix' },
    ],
  },
  {
    version: '1.0.0',
    date: '30. August 2025',
    changes: [
      { textKey: 'v1_0_0.0', type: 'feature' },
      { textKey: 'v1_0_0.1', type: 'feature' },
      { textKey: 'v1_0_0.2', type: 'feature' },
      { textKey: 'v1_0_0.3', type: 'feature' },
      { textKey: 'v1_0_0.4', type: 'feature' },
    ],
  },
];

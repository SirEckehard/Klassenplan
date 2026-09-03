// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
export type ChangeCategory =
  'feature' | 'improvement' | 'bugfix' | 'knownissue';

export interface ChangeItem {
  textKey?: string;
  text?: string;
  type: ChangeCategory;
}

export interface ChangelogVersion {
  version: string;
  /** Release date in ISO 8601 (`YYYY-MM-DD`); rendered via `formatLongDate`. */
  date: string;
  changes: ChangeItem[];
}

export const changelogVersions: ChangelogVersion[] = [
  {
    version: '2.0.0',
    date: '2026-09-03',
    changes: [
      { textKey: 'v2_0_0.0', type: 'feature' },
      { textKey: 'v2_0_0.1', type: 'feature' },
      { textKey: 'v2_0_0.2', type: 'feature' },
      { textKey: 'v2_0_0.3', type: 'feature' },
      { textKey: 'v2_0_0.4', type: 'feature' },
      { textKey: 'v2_0_0.5', type: 'feature' },
      { textKey: 'v2_0_0.6', type: 'feature' },
      { textKey: 'v2_0_0.7', type: 'feature' },
      { textKey: 'v2_0_0.8', type: 'feature' },
      { textKey: 'v2_0_0.9', type: 'feature' },
      { textKey: 'v2_0_0.10', type: 'improvement' },
      { textKey: 'v2_0_0.11', type: 'improvement' },
      { textKey: 'v2_0_0.12', type: 'improvement' },
      { textKey: 'v2_0_0.13', type: 'improvement' },
      { textKey: 'v2_0_0.14', type: 'improvement' },
      { textKey: 'v2_0_0.15', type: 'improvement' },
      { textKey: 'v2_0_0.16', type: 'improvement' },
      { textKey: 'v2_0_0.17', type: 'improvement' },
      { textKey: 'v2_0_0.18', type: 'improvement' },
      { textKey: 'v2_0_0.19', type: 'improvement' },
      { textKey: 'v2_0_0.20', type: 'bugfix' },
      { textKey: 'v2_0_0.21', type: 'bugfix' },
      { textKey: 'v2_0_0.22', type: 'bugfix' },
    ],
  },
  {
    version: '1.9.0',
    date: '2026-07-29',
    changes: [
      { textKey: 'v1_9_0.0', type: 'feature' },
      { textKey: 'v1_9_0.1', type: 'feature' },
      { textKey: 'v1_9_0.2', type: 'improvement' },
      { textKey: 'v1_9_0.3', type: 'improvement' },
      { textKey: 'v1_9_0.4', type: 'improvement' },
      { textKey: 'v1_9_0.5', type: 'bugfix' },
    ],
  },
  {
    version: '1.8.0',
    date: '2026-07-18',
    changes: [
      { textKey: 'v1_8_0.0', type: 'feature' },
      { textKey: 'v1_8_0.1', type: 'feature' },
      { textKey: 'v1_8_0.2', type: 'feature' },
      { textKey: 'v1_8_0.3', type: 'feature' },
      { textKey: 'v1_8_0.4', type: 'improvement' },
      { textKey: 'v1_8_0.5', type: 'improvement' },
      { textKey: 'v1_8_0.6', type: 'improvement' },
      { textKey: 'v1_8_0.7', type: 'improvement' },
      { textKey: 'v1_8_0.8', type: 'improvement' },
      { textKey: 'v1_8_0.9', type: 'bugfix' },
      { textKey: 'v1_8_0.10', type: 'bugfix' },
    ],
  },
  {
    version: '1.7.0',
    date: '2026-07-09',
    changes: [
      { textKey: 'v1_7_0.0', type: 'feature' },
      { textKey: 'v1_7_0.1', type: 'feature' },
      { textKey: 'v1_7_0.2', type: 'feature' },
      { textKey: 'v1_7_0.3', type: 'feature' },
      { textKey: 'v1_7_0.4', type: 'improvement' },
      { textKey: 'v1_7_0.5', type: 'improvement' },
      { textKey: 'v1_7_0.6', type: 'improvement' },
      { textKey: 'v1_7_0.7', type: 'improvement' },
      { textKey: 'v1_7_0.8', type: 'improvement' },
      { textKey: 'v1_7_0.9', type: 'bugfix' },
      { textKey: 'v1_7_0.10', type: 'bugfix' },
      { textKey: 'v1_7_0.11', type: 'bugfix' },
    ],
  },
  {
    version: '1.6.0',
    date: '2026-06-08',
    changes: [
      { textKey: 'v1_6_0.0', type: 'feature' },
      { textKey: 'v1_6_0.1', type: 'feature' },
      { textKey: 'v1_6_0.2', type: 'improvement' },
      { textKey: 'v1_6_0.3', type: 'improvement' },
    ],
  },
  {
    version: '1.5.0',
    date: '2026-05-10',
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
    date: '2026-05-02',
    changes: [
      { textKey: 'v1_4_2.0', type: 'improvement' },
      { textKey: 'v1_4_2.1', type: 'improvement' },
      { textKey: 'v1_4_2.2', type: 'improvement' },
    ],
  },
  {
    version: '1.4.1',
    date: '2026-03-29',
    changes: [{ textKey: 'v1_4_1.0', type: 'improvement' }],
  },
  {
    version: '1.4.0',
    date: '2026-01-23',
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
    date: '2026-01-04',
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
    date: '2025-12-31',
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
    date: '2025-12-13',
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
    date: '2025-11-08',
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
    date: '2025-10-31',
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
    date: '2025-10-25',
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
    date: '2025-10-22',
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
    date: '2025-10-16',
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
    date: '2025-10-05',
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
    date: '2025-09-28',
    changes: [
      { textKey: 'v1_0_1.0', type: 'feature' },
      { textKey: 'v1_0_1.1', type: 'feature' },
      { textKey: 'v1_0_1.2', type: 'improvement' },
      { textKey: 'v1_0_1.3', type: 'bugfix' },
    ],
  },
  {
    version: '1.0.0',
    date: '2025-08-30',
    changes: [
      { textKey: 'v1_0_0.0', type: 'feature' },
      { textKey: 'v1_0_0.1', type: 'feature' },
      { textKey: 'v1_0_0.2', type: 'feature' },
      { textKey: 'v1_0_0.3', type: 'feature' },
      { textKey: 'v1_0_0.4', type: 'feature' },
    ],
  },
];

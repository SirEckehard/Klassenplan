// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { describe, expect, it } from 'vitest';
import {
  autoBackupFileName,
  autoBackupFilesToRemove,
  isAutoBackupDue,
} from '../autoBackup';

const at = (iso: string) => new Date(iso);

describe('when an automatic backup is due', () => {
  it('is due before the first file', () => {
    expect(
      isAutoBackupDue({
        lastWrittenAt: null,
        lastChangeAt: null,
        now: at('2026-11-20T10:00:00'),
      }),
    ).toBe(true);
  });

  it('waits for the next day, whatever changed today', () => {
    expect(
      isAutoBackupDue({
        lastWrittenAt: '2026-11-20T08:00:00',
        lastChangeAt: '2026-11-20T09:00:00',
        now: at('2026-11-20T18:00:00'),
      }),
    ).toBe(false);
  });

  it('is due on a later day after a change since the last file', () => {
    expect(
      isAutoBackupDue({
        lastWrittenAt: '2026-11-19T15:00:00',
        lastChangeAt: '2026-11-19T16:00:00',
        now: at('2026-11-20T07:30:00'),
      }),
    ).toBe(true);
  });

  it('writes nothing when nothing changed since', () => {
    expect(
      isAutoBackupDue({
        lastWrittenAt: '2026-11-19T15:00:00',
        lastChangeAt: '2026-11-19T14:00:00',
        now: at('2026-11-24T07:30:00'),
      }),
    ).toBe(false);
  });
});

describe('the files of the automatic backup', () => {
  it('are named by the local day', () => {
    expect(autoBackupFileName(at('2026-11-03T23:30:00'))).toBe(
      'klassenplan-auto-2026-11-03.klassenplan',
    );
  });

  it('keep the newest seven and none of the teacher’s own', () => {
    const days = Array.from(
      { length: 9 },
      (_, day) => `klassenplan-auto-2026-11-${String(day + 10)}.klassenplan`,
    );
    const names = [
      ...days,
      'backup-2026-11-01.klassenplan',
      'Notizen.txt',
      'klassenplan-auto-2026-11-01 (1).klassenplan',
    ];

    expect(autoBackupFilesToRemove(names)).toEqual([
      'klassenplan-auto-2026-11-11.klassenplan',
      'klassenplan-auto-2026-11-10.klassenplan',
    ]);
  });
});

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The rules of the automatic backup (decision 0050), apart from the browser:
 * when a file is due, what it is called, which ones go.
 */

/** How many files the folder keeps; the oldest beyond go. */
const AUTO_BACKUP_KEEP = 7;

const FILE_PATTERN = /^klassenplan-auto-\d{4}-\d{2}-\d{2}\.klassenplan$/;

const localDay = (date: Date) => {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/** One file per day, named by the day it was written on, local time. */
export const autoBackupFileName = (now: Date): string =>
  `klassenplan-auto-${localDay(now)}.klassenplan`;

/**
 * Whether a file is due: something changed since the last one, and the last
 * one was not written today. Before the first file one is always due.
 */
export function isAutoBackupDue({
  lastWrittenAt,
  lastChangeAt,
  now,
}: {
  lastWrittenAt: string | null;
  lastChangeAt: string | null;
  now: Date;
}): boolean {
  if (lastWrittenAt === null) return true;
  const written = new Date(lastWrittenAt);
  if (Number.isNaN(written.getTime())) return true;
  if (localDay(written) === localDay(now)) return false;
  if (lastChangeAt === null) return false;
  const changed = new Date(lastChangeAt);
  return !Number.isNaN(changed.getTime()) && changed > written;
}

/**
 * The automatic files beyond the newest `keep`, to remove. Names alone tell
 * them — a file of the teacher's own in the folder is never among them.
 */
export function autoBackupFilesToRemove(
  names: readonly string[],
  keep = AUTO_BACKUP_KEEP,
): string[] {
  return names
    .filter((name) => FILE_PATTERN.test(name))
    .sort()
    .reverse()
    .slice(keep);
}

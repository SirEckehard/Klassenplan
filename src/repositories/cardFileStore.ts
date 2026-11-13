// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The teacher's own files for the table cards (decision 0047): one font and
 * one picture, each a file's name, its type and its contents.
 *
 * They lie in the default keyval store under keys of their own
 * (`DB_KEYS.cardFont`, `DB_KEYS.cardImage`), so writing a class never writes
 * them again and "delete all data" takes them with everything else. A backup
 * carries them as data URLs (`cardFiles`).
 *
 * They are the teacher's, not a child's — unless the teacher puts a child into
 * the picture; the inventory in PRIVACY.md says so.
 */
import type { BackupCardFiles } from '@/types';
import { DB_KEYS } from '@/utils/data/storageKeys';
import { hasIndexedDB } from '@/utils/data/indexedDb';
import { logError } from '@/utils';
import { blobToDataUrl } from '@/utils/image/processStudentPhoto';
import type { Result } from './types';
import { ResultHelpers, RepositoryErrorType } from './types';
import { tryDeleteValue, tryReadValue, tryWriteValue } from './idbClient';

export type CardFileKind = 'font' | 'image';

/**
 * One stored file. Its contents are kept as bytes, which every browser's
 * IndexedDB and every structured clone carry alike.
 */
export type CardFile = {
  /** The name it had on the teacher's device, shown in the inspector. */
  name: string;
  /** Its media type: `font/woff2`, `image/png` … */
  type: string;
  data: ArrayBuffer;
};

const CARD_FILE_KINDS: readonly CardFileKind[] = ['font', 'image'];

const KEYS: Record<CardFileKind, string> = {
  font: DB_KEYS.cardFont,
  image: DB_KEYS.cardImage,
};

type CardFileListener = (kind: CardFileKind) => void;
const listeners = new Set<CardFileListener>();

/**
 * Watch for a file that changed — loaded, removed or brought back by a
 * restore — so the export page shows the cards with it.
 *
 * @returns Unsubscribe function
 */
export function subscribeToCardFiles(listener: CardFileListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify(kind: CardFileKind): void {
  for (const listener of [...listeners]) listener(kind);
}

const unavailable = () =>
  ResultHelpers.failure({
    type: RepositoryErrorType.STORAGE_ERROR,
    message: 'IndexedDB is not available in this browser',
  });

const isCardFile = (value: unknown): value is CardFile =>
  !!value &&
  typeof value === 'object' &&
  typeof (value as CardFile).name === 'string' &&
  typeof (value as CardFile).type === 'string' &&
  // By its tag: a structured clone may come from another realm.
  Object.prototype.toString.call((value as CardFile).data) ===
    '[object ArrayBuffer]';

/** The stored file of a kind; `undefined` when there is none. */
export async function getCardFile(
  kind: CardFileKind,
): Promise<Result<CardFile | undefined>> {
  if (!hasIndexedDB()) return unavailable();
  const result = await tryReadValue<unknown>(KEYS[kind]);
  if (!result.success) return result;
  return ResultHelpers.success(
    isCardFile(result.data) ? result.data : undefined,
  );
}

/** Keep a file of a kind, in place of the one before it. */
export async function setCardFile(
  kind: CardFileKind,
  file: CardFile,
): Promise<Result<void>> {
  if (!hasIndexedDB()) return unavailable();
  const result = await tryWriteValue(KEYS[kind], file);
  if (result.success) notify(kind);
  return result;
}

/** Remove the file of a kind (nothing happens where there is none). */
export async function deleteCardFile(
  kind: CardFileKind,
): Promise<Result<void>> {
  if (!hasIndexedDB()) return unavailable();
  const result = await tryDeleteValue(KEYS[kind]);
  if (result.success) notify(kind);
  return result;
}

/**
 * The files for a backup (decision 0047, choice E7), as data URLs; undefined
 * when there are none or they cannot be read.
 */
export async function getCardFilesForBackup(): Promise<
  BackupCardFiles | undefined
> {
  const files: BackupCardFiles = {};
  for (const kind of CARD_FILE_KINDS) {
    const stored = await getCardFile(kind);
    if (!stored.success || !stored.data) continue;
    files[kind] = {
      name: stored.data.name,
      type: stored.data.type,
      dataUrl: await blobToDataUrl(
        new Blob([stored.data.data], { type: stored.data.type }),
      ),
    };
  }
  return Object.keys(files).length > 0 ? files : undefined;
}

/** The bytes of a base64 data URL, as a backup carries a file. */
function dataUrlBytes(dataUrl: string): ArrayBuffer {
  const binary = atob(dataUrl.slice(dataUrl.indexOf(',') + 1));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

/**
 * Restore the files from a backup. A full import replaces them, so a backup
 * without them leaves none; a merge only fills a kind this device has none of.
 */
export async function restoreCardFiles(
  value: BackupCardFiles | undefined,
  options?: { merge?: boolean },
): Promise<void> {
  for (const kind of CARD_FILE_KINDS) {
    const incoming = value?.[kind];
    if (options?.merge) {
      if (!incoming) continue;
      const present = await getCardFile(kind);
      if (!present.success || present.data) continue;
    }
    let written: Result<void>;
    try {
      written = incoming
        ? await setCardFile(kind, {
            name: incoming.name,
            type: incoming.type,
            data: dataUrlBytes(incoming.dataUrl),
          })
        : await deleteCardFile(kind);
    } catch (error) {
      logError(
        'A card file in the backup is unreadable',
        { kind, error },
        'cardFileStore',
      );
      continue;
    }
    if (!written.success) {
      logError(
        'Failed to restore a card file',
        { kind, error: written.error },
        'cardFileStore',
      );
    }
  }
}

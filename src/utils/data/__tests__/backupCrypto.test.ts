// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The automatic backup encrypts with a key derived once (decision 0050). Its
 * files must open with the password like any backup, and the key it keeps
 * must not open them.
 */
import { describe, expect, it } from 'vitest';
import { webCrypto } from '@/utils';
import {
  decryptJson,
  deriveStoredBackupKey,
  encryptJson,
  encryptJsonWithKey,
} from '../backupCrypto';

const PASSWORD = 'klassenbuch-2026';
const JSON_TEXT = JSON.stringify({ version: 3, students: ['Mia'] });

describe('backup encryption', () => {
  it('opens a backup written with the password', async () => {
    const file = JSON.parse(await encryptJson(JSON_TEXT, PASSWORD));
    expect(await decryptJson(file, PASSWORD)).toBe(JSON_TEXT);
  });

  it('opens an automatic backup with the password it was set up with', async () => {
    const stored = await deriveStoredBackupKey(PASSWORD);
    const first = JSON.parse(await encryptJsonWithKey(JSON_TEXT, stored));
    const second = JSON.parse(await encryptJsonWithKey(JSON_TEXT, stored));

    expect(await decryptJson(first, PASSWORD)).toBe(JSON_TEXT);
    expect(await decryptJson(second, PASSWORD)).toBe(JSON_TEXT);
    // A fresh IV every time, one salt per set-up.
    expect(first.iv).not.toBe(second.iv);
    expect(first.salt).toBe(second.salt);
    await expect(decryptJson(first, 'ein-anderes-passwort')).rejects.toThrow();
  });

  it('keeps a key that encrypts and nothing else, and never hands it out', async () => {
    const { key } = await deriveStoredBackupKey(PASSWORD);

    expect(key.usages).toEqual(['encrypt']);
    expect(key.extractable).toBe(false);
    await expect(
      webCrypto.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(12) },
        key,
        new Uint8Array(32),
      ),
    ).rejects.toThrow();
  });
});

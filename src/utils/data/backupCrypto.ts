// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The encryption of a backup file: AES-GCM 256 under a key derived from the
 * teacher's password with PBKDF2-SHA256, the parameters in the envelope
 * (docs/backup-format.md). The backup that asks for its password every time
 * and the automatic one, whose key was derived once (decision 0050), write
 * the same envelope, and one password opens either.
 */
import { webCrypto } from '@/utils';
import type { EncryptedBackupPayload } from '@/utils/validation/backupValidation';

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const aad = encoder.encode('klassenplan-backup-v1');

const KDF_HASH = 'SHA-256';
const KDF_ITERATIONS = 600000;
// Backups written before the KDF parameters were stored in the envelope
// were derived with this fixed iteration count and must stay importable.
const LEGACY_KDF_ITERATIONS = 250000;

/**
 * Chunk size for the Base64 conversion below. Well under the argument limit of
 * every engine, and large enough that the loop runs a few hundred times for a
 * full-size backup instead of a few million.
 */
const BASE64_CHUNK_BYTES = 0x8000;

function bufferToBase64(buffer: ArrayBuffer | Uint8Array) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  // A byte-at-a-time concatenation ran into the millions of string operations
  // at the allowed backup size and blocked the main thread for seconds;
  // `fromCharCode` takes a whole chunk in one call.
  const parts: string[] = [];
  for (
    let offset = 0;
    offset < bytes.byteLength;
    offset += BASE64_CHUNK_BYTES
  ) {
    parts.push(
      String.fromCharCode(
        ...bytes.subarray(offset, offset + BASE64_CHUNK_BYTES),
      ),
    );
  }
  return btoa(parts.join(''));
}

function base64ToBuffer(base64: string): Uint8Array<ArrayBuffer> {
  // Decode Base64 string to Uint8Array
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations: number,
  usages: KeyUsage[] = ['encrypt', 'decrypt'],
) {
  const keyMaterial = await webCrypto.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return webCrypto.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations,
      hash: KDF_HASH,
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    usages,
  );
}

export async function encryptJson(json: string, password: string) {
  const iv = webCrypto.getRandomValues(new Uint8Array(12));
  const salt = webCrypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(password, salt, KDF_ITERATIONS);
  const data = await webCrypto.encrypt(
    { name: 'AES-GCM', iv, additionalData: aad },
    key,
    encoder.encode(json),
  );
  return JSON.stringify({
    encrypted: true,
    kdf: { name: 'PBKDF2', hash: KDF_HASH, iterations: KDF_ITERATIONS },
    iv: bufferToBase64(iv),
    salt: bufferToBase64(salt),
    data: bufferToBase64(data),
  });
}

export async function decryptJson(
  payload: EncryptedBackupPayload,
  password: string,
) {
  const iv = base64ToBuffer(payload.iv);
  const salt = base64ToBuffer(payload.salt);
  const iterations = payload.kdf?.iterations ?? LEGACY_KDF_ITERATIONS;
  const key = await deriveKey(password, salt, iterations);
  const decrypted = await webCrypto.decrypt(
    { name: 'AES-GCM', iv, additionalData: aad },
    key,
    base64ToBuffer(payload.data),
  );
  return decoder.decode(decrypted);
}

/**
 * The key the automatic backup keeps (decision 0050), derived once from its
 * password: it encrypts and nothing else, and the browser never hands it out
 * (`extractable: false`). Whoever reaches the browser profile can write a
 * backup with it, never read one.
 */
export interface StoredBackupKey {
  key: CryptoKey;
  /** Base64, written into every envelope so the password derives it again. */
  salt: string;
  iterations: number;
}

export async function deriveStoredBackupKey(
  password: string,
): Promise<StoredBackupKey> {
  const salt = webCrypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(password, salt, KDF_ITERATIONS, ['encrypt']);
  return { key, salt: bufferToBase64(salt), iterations: KDF_ITERATIONS };
}

/** The envelope `encryptJson` writes, under a key derived before. */
export async function encryptJsonWithKey(
  json: string,
  { key, salt, iterations }: StoredBackupKey,
) {
  const iv = webCrypto.getRandomValues(new Uint8Array(12));
  const data = await webCrypto.encrypt(
    { name: 'AES-GCM', iv, additionalData: aad },
    key,
    encoder.encode(json),
  );
  return JSON.stringify({
    encrypted: true,
    kdf: { name: 'PBKDF2', hash: KDF_HASH, iterations },
    iv: bufferToBase64(iv),
    salt,
    data: bufferToBase64(data),
  });
}

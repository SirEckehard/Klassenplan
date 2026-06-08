import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  webCrypto,
  isWebCryptoAvailable,
  WebCryptoUnavailableError,
  setWebCryptoImplementation,
  resetWebCryptoImplementation,
} from '../crypto/webCrypto';

const encoder = new TextEncoder();

describe('webCrypto', () => {
  beforeEach(() => {
    resetWebCryptoImplementation();
  });

  afterEach(() => {
    resetWebCryptoImplementation();
  });

  it('delegates calls to the configured crypto implementation', async () => {
    const getRandomValues = vi.fn((array: Uint8Array) => {
      const filled = new Uint8Array(array.length).fill(7);
      array.set(filled);
      return array;
    });
    const subtle = {
      importKey: vi.fn().mockResolvedValue({} as CryptoKey),
      deriveKey: vi.fn().mockResolvedValue({} as CryptoKey),
      encrypt: vi
        .fn()
        .mockResolvedValue(encoder.encode('encrypted').buffer as ArrayBuffer),
      decrypt: vi
        .fn()
        .mockResolvedValue(encoder.encode('decrypted').buffer as ArrayBuffer),
    } as unknown as SubtleCrypto;

    setWebCryptoImplementation({
      getRandomValues: getRandomValues as Crypto['getRandomValues'],
      subtle,
    } as Crypto);

    const random = webCrypto.getRandomValues(new Uint8Array(3));
    expect(getRandomValues).toHaveBeenCalledTimes(1);
    expect(Array.from(random)).toEqual([7, 7, 7]);

    const keyMaterial = await webCrypto.importKey(
      'raw',
      new Uint8Array([1, 2]),
      'PBKDF2',
      false,
      ['deriveKey'],
    );
    expect(subtle.importKey).toHaveBeenCalledTimes(1);

    await webCrypto.deriveKey(
      {
        name: 'PBKDF2',
        salt: new Uint8Array().buffer,
        iterations: 1,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
    expect(subtle.deriveKey).toHaveBeenCalledTimes(1);

    await webCrypto.encrypt(
      { name: 'AES-GCM', iv: new Uint8Array(12) },
      keyMaterial,
      new Uint8Array([1]),
    );
    expect(subtle.encrypt).toHaveBeenCalledTimes(1);

    await webCrypto.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(12) },
      keyMaterial,
      new Uint8Array([1]),
    );
    expect(subtle.decrypt).toHaveBeenCalledTimes(1);
  });

  it('reports unavailable state when crypto is missing', () => {
    setWebCryptoImplementation(null);

    expect(isWebCryptoAvailable()).toBe(false);
    expect(() => webCrypto.getRandomValues(new Uint8Array(2))).toThrow(
      WebCryptoUnavailableError,
    );
  });
});

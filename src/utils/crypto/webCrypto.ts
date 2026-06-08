// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
const WEB_CRYPTO_ERROR_MESSAGE =
  'Web Crypto API is not available in this environment.';
const SUBTLE_CRYPTO_ERROR_MESSAGE =
  'SubtleCrypto API is not available in this environment.';

export class WebCryptoUnavailableError extends Error {
  constructor(message = WEB_CRYPTO_ERROR_MESSAGE) {
    super(message);
    this.name = 'WebCryptoUnavailableError';
  }
}

let cryptoOverride: Crypto | null | undefined;

function getCandidateCrypto(): Crypto | null {
  if (cryptoOverride !== undefined) {
    return cryptoOverride;
  }
  if (typeof globalThis === 'undefined') {
    return null;
  }
  const candidate = (globalThis as { crypto?: Crypto }).crypto;
  return candidate ?? null;
}

function hasRequiredSubtleMethods(
  subtle: SubtleCrypto | undefined,
): subtle is SubtleCrypto {
  if (!subtle) {
    return false;
  }
  return (
    typeof subtle.importKey === 'function' &&
    typeof subtle.deriveKey === 'function' &&
    typeof subtle.encrypt === 'function' &&
    typeof subtle.decrypt === 'function'
  );
}

function ensureCrypto(): Crypto {
  const candidate = getCandidateCrypto();
  if (!candidate || typeof candidate.getRandomValues !== 'function') {
    throw new WebCryptoUnavailableError();
  }
  if (!hasRequiredSubtleMethods(candidate.subtle)) {
    throw new WebCryptoUnavailableError(SUBTLE_CRYPTO_ERROR_MESSAGE);
  }
  return candidate;
}

function ensureSubtle(): SubtleCrypto {
  return ensureCrypto().subtle;
}

type ImportKeyArgs = Parameters<SubtleCrypto['importKey']>;
type DeriveKeyArgs = Parameters<SubtleCrypto['deriveKey']>;
type EncryptArgs = Parameters<SubtleCrypto['encrypt']>;
type DecryptArgs = Parameters<SubtleCrypto['decrypt']>;

type ImportKeyReturn = ReturnType<SubtleCrypto['importKey']>;
type DeriveKeyReturn = ReturnType<SubtleCrypto['deriveKey']>;
type EncryptReturn = ReturnType<SubtleCrypto['encrypt']>;
type DecryptReturn = ReturnType<SubtleCrypto['decrypt']>;

export function isWebCryptoAvailable(): boolean {
  try {
    ensureSubtle();
    return true;
  } catch {
    return false;
  }
}

export function setWebCryptoImplementation(implementation: Crypto | null) {
  cryptoOverride = implementation;
}

export function resetWebCryptoImplementation() {
  cryptoOverride = undefined;
}

export const webCrypto = {
  getRandomValues<T extends ArrayBufferView<ArrayBuffer>>(array: T): T {
    const crypto = ensureCrypto();
    return crypto.getRandomValues(array) as T;
  },
  importKey(...args: ImportKeyArgs): ImportKeyReturn {
    const subtle = ensureSubtle();
    return subtle.importKey(...args);
  },
  deriveKey(...args: DeriveKeyArgs): DeriveKeyReturn {
    const subtle = ensureSubtle();
    return subtle.deriveKey(...args);
  },
  encrypt(...args: EncryptArgs): EncryptReturn {
    const subtle = ensureSubtle();
    return subtle.encrypt(...args);
  },
  decrypt(...args: DecryptArgs): DecryptReturn {
    const subtle = ensureSubtle();
    return subtle.decrypt(...args);
  },
} as const;

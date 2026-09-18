// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Build-time configuration of the contact address, shared by `vite.config.ts`
 * and the runtime constant in `src/config/links.ts`.
 *
 * klassenplan.de ships the maintainer's address. Someone who builds and
 * publishes their own instance sets `CONTACT_EMAIL` to their own, so the
 * contact page and the error reports reach whoever runs that instance
 * (see `.env.example` and decision 0012 in docs/decisions).
 *
 * This module has no imports and does not touch `import.meta`: `vite.config.ts`
 * evaluates it before any Vite transform exists.
 */

export const DEFAULT_CONTACT_EMAIL = 'webmaster@klassenplan.de';

/**
 * Read and validate the contact address from the environment.
 *
 * An unusable value throws instead of being ignored: falling back silently
 * would send somebody else's bug reports to the maintainer of klassenplan.de.
 *
 * @returns The configured address, or the default where none is set
 */
export const readContactEmail = (
  env: Readonly<Record<string, string | undefined>>,
): string => {
  const value = env.CONTACT_EMAIL?.trim();
  if (!value) return DEFAULT_CONTACT_EMAIL;

  // Deliberately loose: one @, something on both sides, no whitespace. A
  // stricter pattern rejects addresses that work.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new Error(`CONTACT_EMAIL must be an email address: "${value}"`);
  }
  return value;
};

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * Build-time configuration of the legal pages, shared by `vite.config.ts` and
 * the SEO build scripts.
 *
 * klassenplan.de ships its own Impressum and Datenschutzerklärung. Someone who
 * builds and publishes their own instance sets `IMPRINT_URL` and `PRIVACY_URL`
 * to their own pages (see `.env.example` and decision 0012 in docs/decisions).
 *
 * This module has no imports and does not touch `import.meta`: the build
 * scripts load it with Node's type stripping, and `vite.config.ts` evaluates it
 * before any Vite transform exists.
 */

export type LegalPageRoute = '/impressum' | '/datenschutz';

export type LegalPageUrls = Readonly<Record<LegalPageRoute, string | null>>;

const parseLegalPageUrl = (
  variable: string,
  raw: string | undefined,
): string | null => {
  const value = raw?.trim();
  if (!value) return null;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${variable} must be an absolute http(s) URL: "${value}"`);
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`${variable} must be an absolute http(s) URL: "${value}"`);
  }
  return url.toString();
};

/**
 * Read and validate the external legal page URLs from the environment.
 *
 * An invalid value throws instead of being ignored: falling back silently would
 * publish klassenplan.de's legal pages on somebody else's instance.
 *
 * @returns The URL per route, or `null` where the bundled page applies
 */
export const readLegalPageUrls = (
  env: Readonly<Record<string, string | undefined>>,
): LegalPageUrls => ({
  '/impressum': parseLegalPageUrl('IMPRINT_URL', env.IMPRINT_URL),
  '/datenschutz': parseLegalPageUrl('PRIVACY_URL', env.PRIVACY_URL),
});

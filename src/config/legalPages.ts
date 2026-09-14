// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { LegalPageRoute } from './legalPageUrls';

export type { LegalPageRoute };

/**
 * The operator's own legal pages for this build, or `null` where the bundled
 * klassenplan.de page applies. `vite.config.ts` validates `IMPRINT_URL` and
 * `PRIVACY_URL` and bakes them in through `define`.
 */
const EXTERNAL_LEGAL_PAGE_URLS: Readonly<
  Record<LegalPageRoute, string | null>
> = {
  '/impressum': import.meta.env.VITE_IMPRINT_URL || null,
  '/datenschutz': import.meta.env.VITE_PRIVACY_URL || null,
};

export const getExternalLegalPageUrl = (route: LegalPageRoute): string | null =>
  EXTERNAL_LEGAL_PAGE_URLS[route];

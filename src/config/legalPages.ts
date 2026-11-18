// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { LegalPageRoute } from './legalPageUrls';

export type { LegalPageRoute };

/**
 * The URL a build or an image start gave, or `null` for the placeholder that
 * stands where neither did (`LEGAL_PAGE_URL_TOKENS`). A pattern rather than a
 * comparison, so the minifier cannot fold the placeholder away: the start
 * script has to find it in the bundle.
 */
const UNSET = /^__KP_[A-Z_]+__$/;
const configured = (value: string | undefined): string | null =>
  value && !UNSET.test(value) ? value : null;

/**
 * The operator's own legal pages, or `null` where the bundled klassenplan.de
 * page applies. `vite.config.ts` validates `IMPRINT_URL` and `PRIVACY_URL` and
 * bakes them in through `define`; where they were not set, the published
 * image's start script may put them in place of the placeholder (decision
 * 0048).
 */
const EXTERNAL_LEGAL_PAGE_URLS: Readonly<
  Record<LegalPageRoute, string | null>
> = {
  '/impressum': configured(import.meta.env.VITE_IMPRINT_URL),
  '/datenschutz': configured(import.meta.env.VITE_PRIVACY_URL),
};

export const getExternalLegalPageUrl = (route: LegalPageRoute): string | null =>
  EXTERNAL_LEGAL_PAGE_URLS[route];

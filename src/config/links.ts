// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { DEFAULT_CONTACT_EMAIL } from './contactEmail';

// Central place for external project links so they stay in sync across pages.
export const GITHUB_REPO_URL = 'https://github.com/SirEckehard/Klassenplan';

/**
 * Where the contact page and the error reports write to. `vite.config.ts`
 * validates `CONTACT_EMAIL` and bakes it in through `define`; an instance that
 * sets none keeps the maintainer's address.
 */
export const CONTACT_EMAIL: string =
  import.meta.env.VITE_CONTACT_EMAIL || DEFAULT_CONTACT_EMAIL;

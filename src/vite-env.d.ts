// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** Canonical site origin, injected by `define` in vite.config.ts. */
  readonly VITE_SITE_URL?: string;
  /** The operator's own Impressum (`IMPRINT_URL`), or empty; see vite.config.ts. */
  readonly VITE_IMPRINT_URL?: string;
  /** The operator's own Datenschutzerklärung (`PRIVACY_URL`), or empty. */
  readonly VITE_PRIVACY_URL?: string;
}

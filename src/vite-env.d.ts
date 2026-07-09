// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** Canonical site origin, injected by `define` in vite.config.ts. */
  readonly VITE_SITE_URL?: string;
}

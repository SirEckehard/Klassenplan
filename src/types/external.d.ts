// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
declare const __APP_VERSION__: string;
declare module '*.md?raw' {
  const content: string;
  export default content;
}

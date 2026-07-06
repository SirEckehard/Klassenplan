// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer

/**
 * Promise-based confirmation gate for file downloads.
 *
 * Non-React code (e.g. `downloadBlob`, the PDF export functions) calls
 * {@link confirmDownload} before writing a file; the dialog UI is provided by
 * `DownloadConfirmationHost`, which registers itself here at app start. When
 * no host is mounted (unit tests, SSR), downloads proceed unprompted.
 */

export type DownloadConfirmationHandler = (
  filename: string,
) => Promise<boolean>;

let activeHandler: DownloadConfirmationHandler | null = null;

/** Register the UI handler; returns an unregister cleanup. */
export function registerDownloadConfirmationHandler(
  handler: DownloadConfirmationHandler,
): () => void {
  activeHandler = handler;
  return () => {
    if (activeHandler === handler) {
      activeHandler = null;
    }
  };
}

/** Resolves `true` when the user confirms (or no confirmation UI is mounted). */
export function confirmDownload(filename: string): Promise<boolean> {
  if (!activeHandler) {
    return Promise.resolve(true);
  }
  return activeHandler(filename);
}

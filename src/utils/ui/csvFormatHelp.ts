// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer

/**
 * Opens the "this is what a class list looks like" dialog from anywhere.
 *
 * The CSV import runs in a service, so a failed import cannot render a dialog
 * itself. It calls {@link openCsvFormatHelp} instead; `CsvFormatHelpHost`
 * registers the UI at app start (same pattern as `downloadConfirmation.ts`).
 * With no host mounted (unit tests, SSR) the call is a no-op.
 */

export type CsvFormatHelpHandler = () => void;

let activeHandler: CsvFormatHelpHandler | null = null;

/** Register the dialog; returns an unregister cleanup. */
export function registerCsvFormatHelpHandler(
  handler: CsvFormatHelpHandler,
): () => void {
  activeHandler = handler;
  return () => {
    if (activeHandler === handler) {
      activeHandler = null;
    }
  };
}

/** Show the CSV format example. Does nothing when no host is mounted. */
export function openCsvFormatHelp(): void {
  activeHandler?.();
}

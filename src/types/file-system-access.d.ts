// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
export {};

declare global {
  // File type filter for the file picker
  interface FilePickerAcceptType {
    description?: string;
    accept: Record<string, string[]>;
  }

  // Options for window.showSaveFilePicker
  interface SaveFilePickerOptions {
    suggestedName?: string;
    types?: FilePickerAcceptType[];
  }

  // File Handling API: what an installed app is opened with
  interface LaunchParams {
    readonly targetURL?: string;
    readonly files: readonly FileSystemHandle[];
  }

  interface LaunchQueue {
    setConsumer(consumer: (params: LaunchParams) => void): void;
  }

  // File System Access API method for choosing a file to save
  interface Window {
    showSaveFilePicker: (
      options?: SaveFilePickerOptions,
    ) => Promise<FileSystemFileHandle>;
    /** Chromium on the desktop, in an installed app only. */
    launchQueue?: LaunchQueue;
  }
}

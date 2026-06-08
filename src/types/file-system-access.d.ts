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

  // File System Access API method for choosing a file to save
  interface Window {
    showSaveFilePicker: (
      options?: SaveFilePickerOptions,
    ) => Promise<FileSystemFileHandle>;
  }
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useState, useCallback } from 'react';
import type { Student } from '@/types';
import type { CsvImportSelection, NameColumnInfo } from '@/utils/data/csvUtils';
import type { CsvPreset } from '@/utils/csv/csvPresets';
import { logError } from '@/utils';
import { analyzeCsvFile as analyzeCsvFileService } from '@/services/csvImportService';

type CsvImportState = {
  showDialog: boolean;
  nameInfo: NameColumnInfo | null;
  previewData: Array<Record<string, unknown>>;
  currentFile: File | null;
  /** The recognised export format, shown in the dialog and revocable there. */
  preset: CsvPreset | null;
  /** Class names to choose from; empty when the file holds a single class. */
  classOptions: string[];
  classKey?: string;
};

const EMPTY_STATE: CsvImportState = {
  showDialog: false,
  nameInfo: null,
  previewData: [],
  currentFile: null,
  preset: null,
  classOptions: [],
  classKey: undefined,
};

/**
 * Hook to manage CSV import with the pre-import dialog.
 *
 * The dialog opens for either of two reasons: the file has more than one usable
 * name column, or it holds more than one class. Everything it collects travels
 * back as a single {@link CsvImportSelection}.
 */
export function useCsvImportWithDialog(
  importHandler: (
    file: File,
    selection?: CsvImportSelection,
  ) => Promise<Student[]>,
) {
  const [importState, setImportState] = useState<CsvImportState>(EMPTY_STATE);

  /**
   * Import CSV file with the selection the dialog produced.
   * Errors are logged here and surfaced as toasts by the import service, so
   * callers (change handlers, dialog buttons) never have to handle them.
   */
  const importWithSelection = useCallback(
    async (file: File, selection?: CsvImportSelection): Promise<void> => {
      try {
        await importHandler(file, selection);
      } catch (error) {
        logError('CSV import failed', { error }, 'useCsvImportWithDialog');
      }
    },
    [importHandler],
  );

  /**
   * Analyze CSV file and determine if dialog is needed
   */
  const analyzeCsvFile = useCallback(
    async (file: File): Promise<void> => {
      let analysis: Awaited<ReturnType<typeof analyzeCsvFileService>>;
      try {
        analysis = await analyzeCsvFileService(file);
      } catch (error) {
        logError('CSV analysis failed', { error }, 'useCsvImportWithDialog');
        return;
      }

      if (analysis.requiresNameSelection || analysis.classOptions.length > 0) {
        setImportState({
          showDialog: true,
          nameInfo: analysis.nameInfo,
          previewData: analysis.previewData,
          currentFile: file,
          preset: analysis.preset,
          classOptions: analysis.classOptions,
          classKey: analysis.classKey,
        });
        return;
      }

      await importWithSelection(file);
    },
    [importWithSelection],
  );

  /**
   * Handle dialog confirmation
   */
  const handleDialogConfirm = useCallback(
    (selection: CsvImportSelection) => {
      const file = importState.currentFile;
      if (!file) return;

      setImportState(EMPTY_STATE);
      void importWithSelection(file, selection);
    },
    [importState.currentFile, importWithSelection],
  );

  /**
   * Handle dialog cancel
   */
  const handleDialogCancel = useCallback(() => {
    setImportState(EMPTY_STATE);
  }, []);

  return {
    importState,
    analyzeCsvFile,
    handleDialogConfirm,
    handleDialogCancel,
  };
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useState, useCallback } from 'react';
import type { Student } from '@/types';
import type { NameColumnInfo, NameColumnMode } from '@/utils/data/csvUtils';
import { logError } from '@/utils';
import { analyzeCsvFile as analyzeCsvFileService } from '@/services/csvImportService';

type CsvImportState = {
  showDialog: boolean;
  nameInfo: NameColumnInfo | null;
  previewData: Array<Record<string, unknown>>;
  currentFile: File | null;
};

/**
 * Hook to manage CSV import with name column selection dialog
 */
export function useCsvImportWithDialog(
  importHandler: (file: File, mode?: NameColumnMode) => Promise<Student[]>,
) {
  const [importState, setImportState] = useState<CsvImportState>({
    showDialog: false,
    nameInfo: null,
    previewData: [],
    currentFile: null,
  });

  /**
   * Import CSV file with specified name column mode
   */
  const importWithMode = useCallback(
    async (file: File, mode?: NameColumnMode): Promise<void> => {
      try {
        await importHandler(file, mode);
      } catch (error) {
        logError('CSV import failed', { error }, 'useCsvImportWithDialog');
        throw error;
      }
    },
    [importHandler],
  );

  /**
   * Analyze CSV file and determine if dialog is needed
   */
  const analyzeCsvFile = useCallback(
    async (file: File): Promise<void> => {
      try {
        const analysis = await analyzeCsvFileService(file);

        if (analysis.requiresNameSelection) {
          setImportState({
            showDialog: true,
            nameInfo: analysis.nameInfo,
            previewData: analysis.previewData,
            currentFile: file,
          });
          return;
        }

        await importWithMode(file);
      } catch (error) {
        logError('CSV analysis failed', { error }, 'useCsvImportWithDialog');
        throw error;
      }
    },
    [importWithMode],
  );

  /**
   * Handle dialog confirmation
   */
  const handleDialogConfirm = useCallback(
    async (mode: NameColumnMode) => {
      if (!importState.currentFile) return;

      setImportState({
        showDialog: false,
        nameInfo: null,
        previewData: [],
        currentFile: null,
      });

      await importWithMode(importState.currentFile, mode);
    },
    [importState.currentFile, importWithMode],
  );

  /**
   * Handle dialog cancel
   */
  const handleDialogCancel = useCallback(() => {
    setImportState({
      showDialog: false,
      nameInfo: null,
      previewData: [],
      currentFile: null,
    });
  }, []);

  return {
    importState,
    analyzeCsvFile,
    handleDialogConfirm,
    handleDialogCancel,
  };
}

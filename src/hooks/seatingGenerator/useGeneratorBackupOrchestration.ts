// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import useDataBackup from '../useDataBackup';
import type { BackupImportOutcome } from '@/services/backup/dataBackup';

/**
 * Parameters for the backup orchestration hook
 */
interface BackupOrchestrationParams {
  exportAllAsJson: () => Promise<string>;
  importAllFromJson: (
    payload: string,
    opts?: { merge?: boolean },
  ) => Promise<BackupImportOutcome>;
}

/**
 * Return type for the backup orchestration hook
 */
export interface BackupOrchestrationReturn {
  importInputRef: React.RefObject<HTMLInputElement | null>;
  triggerImport: () => void;
  handleExportAll: () => Promise<void>;
  handleImportFile: React.ChangeEventHandler<HTMLInputElement>;
}

/**
 * Backup import and export for the generator. A restore brings the plans back
 * as they were saved: nothing is mixed or refined after it (decision 0027).
 *
 * @param params - Export/import functions
 * @returns Backup actions
 */
export function useGeneratorBackupOrchestration(
  params: BackupOrchestrationParams,
): BackupOrchestrationReturn {
  const { exportAllAsJson, importAllFromJson } = params;
  const { importInputRef, triggerImport, handleExportAll, handleImportFile } =
    useDataBackup({ exportAllAsJson, importAllFromJson });

  return {
    importInputRef,
    triggerImport,
    handleExportAll,
    handleImportFile,
  };
}

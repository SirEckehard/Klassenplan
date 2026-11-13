// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import useDataBackup from '../useDataBackup';
import { useShareFiles } from '../library/useShareFiles';
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
  importBackupFile: (file: File) => void;
}

/**
 * Backup import and export for the generator. A restore brings the plans back
 * as they were saved: nothing is mixed or refined after it (decision 0027).
 * A room template's or a preset's file opened the same way is added beside
 * what is here (decision 0046).
 *
 * @param params - Export/import functions
 * @returns Backup actions
 */
export function useGeneratorBackupOrchestration(
  params: BackupOrchestrationParams,
): BackupOrchestrationReturn {
  const { exportAllAsJson, importAllFromJson } = params;
  const { openSharedFile } = useShareFiles();
  const {
    importInputRef,
    triggerImport,
    handleExportAll,
    handleImportFile,
    importBackupFile,
  } = useDataBackup({ exportAllAsJson, importAllFromJson, openSharedFile });

  return {
    importInputRef,
    triggerImport,
    handleExportAll,
    handleImportFile,
    importBackupFile,
  };
}

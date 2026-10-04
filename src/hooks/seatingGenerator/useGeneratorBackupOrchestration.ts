// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback } from 'react';
import useDataBackup from '../useDataBackup';
import type { AutoMixTriggerHandler } from '../algorithm/useAutoMixTriggers';
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
  triggerAutoMixEvent: AutoMixTriggerHandler;
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
 * Orchestrates backup import/export with auto-mix trigger coordination.
 *
 * Wraps useDataBackup and injects auto-mix trigger after a backup replaced
 * everything, to refresh the seating arrangement. A merge leaves the open
 * class as it was, so its plan is not mixed again.
 *
 * @param params - Export/import functions and auto-mix trigger
 * @returns Backup actions
 */
export function useGeneratorBackupOrchestration(
  params: BackupOrchestrationParams,
): BackupOrchestrationReturn {
  const { exportAllAsJson, importAllFromJson, triggerAutoMixEvent } = params;

  // Wrap import to trigger auto-mix after a successful full import
  const importAllFromJsonWithTrigger = useCallback(
    async (payload: string, opts?: { merge?: boolean }) => {
      const outcome = await importAllFromJson(payload, opts);
      if (!outcome.merge) {
        triggerAutoMixEvent('ci-import', { source: 'backup-import' });
      }
      return outcome;
    },
    [importAllFromJson, triggerAutoMixEvent],
  );

  // Use the data backup hook with the wrapped import
  const { importInputRef, triggerImport, handleExportAll, handleImportFile } =
    useDataBackup({
      exportAllAsJson,
      importAllFromJson: importAllFromJsonWithTrigger,
    });

  return {
    importInputRef,
    triggerImport,
    handleExportAll,
    handleImportFile,
  };
}

import { useCallback } from 'react';
import useDataBackup from '../useDataBackup';
import type { AutoMixTriggerHandler } from '../algorithm/useAutoMixTriggers';

/**
 * Parameters for the backup orchestration hook
 */
interface BackupOrchestrationParams {
  exportAllAsJson: () => Promise<string>;
  importAllFromJson: (
    payload: string,
    opts?: { merge?: boolean },
  ) => Promise<void>;
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
 * Wraps useDataBackup and injects auto-mix trigger on successful import
 * to refresh the seating arrangement.
 *
 * @param params - Export/import functions and auto-mix trigger
 * @returns Backup actions
 */
export function useGeneratorBackupOrchestration(
  params: BackupOrchestrationParams,
): BackupOrchestrationReturn {
  const { exportAllAsJson, importAllFromJson, triggerAutoMixEvent } = params;

  // Wrap import to trigger auto-mix after successful import
  const importAllFromJsonWithTrigger = useCallback(
    async (payload: string, opts?: { merge?: boolean }) => {
      await importAllFromJson(payload, opts);
      triggerAutoMixEvent('ci-import', { source: 'backup-import' });
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

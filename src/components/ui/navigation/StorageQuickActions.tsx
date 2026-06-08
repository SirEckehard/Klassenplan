import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { DownloadIcon, UploadIcon, ClockCounterClockwiseIcon, HardDrivesIcon } from '@phosphor-icons/react';
import { useSeatingPlanActions } from '@/contexts/SeatingPlanContext';
import { secondaryButtonClass } from '@/utils';
import { showToast } from '@/utils/ui/toast';

interface StorageQuickActionsProps {
  /** Whether the component is in expanded mode (shows labels) */
  isExpanded?: boolean;
  /** Callback after successful action (e.g., to close popover) */
  onActionComplete?: () => void;
  /** Show only icons without any text */
  iconOnly?: boolean;
  /** Callback to open the full history modal */
  onOpenHistoryModal?: () => void;
}

/**
 * Reusable storage quick actions component.
 * Used in both the Popover (Step 1) and Sidebar Section (Steps 2-3).
 */
export default function StorageQuickActions({
  isExpanded = true,
  onActionComplete,
  iconOnly = false,
  onOpenHistoryModal,
}: StorageQuickActionsProps) {
  const { t } = useTranslation('generator');
  const { handleExportAll, triggerImport } = useSeatingPlanActions();

  // Export backup
  const handleExport = useCallback(() => {
    handleExportAll();
    showToast('success', t('storage.backupExported', 'Backup exportiert.'));
    onActionComplete?.();
  }, [handleExportAll, t, onActionComplete]);

  // Import backup
  const handleImport = useCallback(() => {
    triggerImport();
    // File dialog handles itself, no need to close
  }, [triggerImport]);

  // Open history modal
  const handleShowAllPlans = useCallback(() => {
    onOpenHistoryModal?.();
    onActionComplete?.();
  }, [onOpenHistoryModal, onActionComplete]);

  // Collapsed mode (icon-only grid)
  if (!isExpanded || iconOnly) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={handleExport}
          className={collapsedButtonClass}
          title={t('storage.exportBackup', 'Backup exportieren')}
          aria-label={t('storage.exportBackup', 'Backup exportieren')}
        >
          <DownloadIcon size={18} className="text-green-600" />
        </button>

        <button
          type="button"
          onClick={handleImport}
          className={collapsedButtonClass}
          title={t('storage.importBackup', 'Backup importieren')}
          aria-label={t('storage.importBackup', 'Backup importieren')}
        >
          <UploadIcon size={18} className="text-blue-600" />
        </button>

        {onOpenHistoryModal && (
          <button
            type="button"
            onClick={handleShowAllPlans}
            className={collapsedButtonClass}
            title={t('storage.showAllPlans', 'Alle Pläne anzeigen')}
            aria-label={t('storage.showAllPlans', 'Alle Pläne anzeigen')}
          >
            <ClockCounterClockwiseIcon size={18} className="text-purple-600" />
          </button>
        )}
      </div>
    );
  }

  // Expanded mode (full buttons with labels)
  return (
    <div className="flex flex-col gap-2">
      {/* Show All Plans (opens modal) - at top for quick access */}
      {onOpenHistoryModal && (
        <button
          type="button"
          onClick={handleShowAllPlans}
          className={`${secondaryButtonClass} justify-start gap-3 px-4 py-3 text-sm`}
        >
          <ClockCounterClockwiseIcon size={16} className="text-purple-600" />
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {t('storage.showAllPlans', 'Alle Pläne anzeigen')}
          </span>
        </button>
      )}

      {onOpenHistoryModal && (
        <div className="my-1 h-px bg-gray-200 dark:bg-gray-700" />
      )}

      {/* Export Backup */}
      <button
        type="button"
        onClick={handleExport}
        className={`${secondaryButtonClass} justify-start gap-3 px-4 py-3 text-sm`}
      >
        <DownloadIcon size={16} className="text-green-600" />
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {t('storage.exportBackup', 'Backup exportieren')}
        </span>
      </button>

      {/* Import Backup */}
      <button
        type="button"
        onClick={handleImport}
        className={`${secondaryButtonClass} justify-start gap-3 px-4 py-3 text-sm`}
      >
        <UploadIcon size={16} className="text-blue-600" />
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {t('storage.importBackup', 'Backup importieren')}
        </span>
      </button>
    </div>
  );
}

// Collapsed button style
const collapsedButtonClass =
  'inline-flex h-10 w-10 items-center justify-center rounded-full border border-blue-200/70 bg-white text-gray-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-blue-900/40 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-blue-700 dark:hover:bg-gray-800 cursor-pointer disabled:cursor-not-allowed';

// Re-export icon for use in triggers
export { HardDrivesIcon as StorageIcon };

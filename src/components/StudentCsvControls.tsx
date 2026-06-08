// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { FileArrowUpIcon, FileArrowDownIcon } from '@phosphor-icons/react';
import type { Student } from '@/types';
import type { NameColumnMode } from '@/utils/data/csvUtils';
import { useCsvImportWithDialog } from '@/hooks/csv/useCsvImportWithDialog';
import NameColumnSelectionDialog from './students/NameColumnSelectionDialog';
import { logError, primaryButtonClass, secondaryButtonClass } from '@/utils';

export type StudentCsvControlsProps = {
  onImport: (file: File, mode?: NameColumnMode) => Promise<Student[]>;
  onExport?: () => void;
  variant?: 'default' | 'compact' | 'icon';
};

// Handles CSV import and template download
export default function StudentCsvControls({
  onImport,
  onExport,
  variant = 'default',
}: StudentCsvControlsProps) {
  const {
    importState,
    analyzeCsvFile,
    handleDialogConfirm,
    handleDialogCancel,
  } = useCsvImportWithDialog(onImport);

  // Handle CSV file upload from user
  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await analyzeCsvFile(file);
    } catch (err) {
      logError('CSV upload failed', { error: err }, 'StudentCsvControls');
    } finally {
      e.target.value = '';
    }
  };

  const isCompact = variant === 'compact';
  const isIconOnly = variant === 'icon';
  const uploadLabelClass = isCompact
    ? 'inline-flex h-9 items-center gap-2 rounded-full border border-blue-200/70 bg-white px-3 text-sm font-semibold text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:border-blue-900/40 dark:bg-gray-900 dark:text-blue-100 dark:hover:border-blue-700 dark:hover:bg-gray-800'
    : isIconOnly
      ? 'inline-flex h-11 w-11 items-center justify-center rounded-full border border-blue-200/70 bg-white text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-blue-900/40 dark:bg-gray-900 dark:text-blue-100 dark:hover:border-blue-700 dark:hover:bg-gray-800'
      : `${primaryButtonClass} w-full cursor-pointer justify-center gap-2 sm:w-auto sm:justify-start`;
  const exportButtonClass = isCompact
    ? 'inline-flex h-9 items-center gap-2 rounded-full border border-green-200/70 bg-white px-3 text-sm font-semibold text-green-700 shadow-sm transition hover:border-green-300 hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 disabled:opacity-50 dark:border-green-900/40 dark:bg-gray-900 dark:text-green-200 dark:hover:border-green-700 dark:hover:bg-gray-800'
    : isIconOnly
      ? 'inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-green-200/70 bg-white text-green-700 shadow-sm transition hover:border-green-300 hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:opacity-50 dark:border-green-900/40 dark:bg-gray-900 dark:text-green-200 dark:hover:border-green-700 dark:hover:bg-gray-800'
      : `${secondaryButtonClass} h-11 w-full justify-center gap-2 text-green-700 dark:text-green-400 sm:w-11 sm:justify-center sm:px-0`;

  return (
    <>
      <div
        className={
          isCompact
            ? 'flex flex-wrap items-center gap-2'
            : isIconOnly
              ? 'flex flex-wrap items-center gap-2'
              : 'flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center'
        }
      >
        <label
          className={uploadLabelClass}
          title="Klassenliste als .csv-Datei hochladen"
        >
          <FileArrowUpIcon size={14} />
          {isIconOnly ? (
            <span className="sr-only">Klassenliste hochladen</span>
          ) : null}
          {isCompact ? 'CSV hochladen' : isIconOnly ? null : 'Klassenliste'}
          <input
            type="file"
            accept=".csv"
            onChange={handleCsvUpload}
            className="hidden"
          />
        </label>
        {onExport ? (
          <button
            type="button"
            onClick={onExport}
            className={exportButtonClass}
            title="Klassenliste exportieren"
            aria-label="Klassenliste exportieren"
          >
            <FileArrowDownIcon size={14} />
            {isIconOnly ? (
              <span className="sr-only">Klassenliste exportieren</span>
            ) : null}
            {!isCompact || isIconOnly ? null : <span>Export</span>}
          </button>
        ) : null}
      </div>

      {/* Name Column Selection Dialog */}
      {importState.showDialog && importState.nameInfo && (
        <NameColumnSelectionDialog
          nameInfo={importState.nameInfo}
          previewData={importState.previewData}
          onConfirm={handleDialogConfirm}
          onCancel={handleDialogCancel}
        />
      )}
    </>
  );
}

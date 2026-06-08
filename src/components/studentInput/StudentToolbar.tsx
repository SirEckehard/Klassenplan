// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { ChangeEvent, KeyboardEvent } from 'react';
import { InfoIcon, PlusIcon } from '@phosphor-icons/react';
import StudentCsvControls, {
  type StudentCsvControlsProps,
} from '@/components/StudentCsvControls';
import QuickClassSetup from '@/components/ui/controls/QuickClassSetup';
import { inputFieldClass, isNameTruncated, successButtonClass } from '@/utils';

type StudentToolbarProps = {
  showQuickSetup: boolean;
  newStudentName: string;
  onNameChange: (value: string) => void;
  onAddStudent: () => void;
  isAddDisabled: boolean;
  onImportCsv: StudentCsvControlsProps['onImport'];
  onExportCsv?: StudentCsvControlsProps['onExport'];
  onQuickSetup: (count: number) => void;
  variant?: 'default' | 'compact';
};

const StudentToolbar = ({
  showQuickSetup,
  newStudentName,
  onNameChange,
  onAddStudent,
  isAddDisabled,
  onImportCsv,
  onExportCsv,
  onQuickSetup,
  variant = 'default',
}: StudentToolbarProps) => {
  const trimmedName = newStudentName.trim();
  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    onNameChange(event.target.value);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      onAddStudent();
    }
  };

  if (variant === 'compact') {
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-blue-900/80 dark:text-blue-100/80">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newStudentName}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Schülername..."
            className="h-9 w-48 rounded-full border border-blue-200/70 bg-white px-3 text-sm text-gray-800 shadow-sm transition focus:border-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:border-blue-900/40 dark:bg-gray-900 dark:text-gray-100"
          />
          <button
            type="button"
            onClick={onAddStudent}
            disabled={isAddDisabled}
            className="inline-flex h-9 items-center gap-2 rounded-full bg-green-600 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 disabled:cursor-not-allowed disabled:opacity-60"
            title="Schüler hinzufügen"
          >
            <PlusIcon size={14} />
            Hinzufügen
          </button>
        </div>
        <StudentCsvControls
          variant="compact"
          onImport={onImportCsv}
          onExport={onExportCsv}
        />
      </div>
    );
  }

  return (
    <div className="mb-4 flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end md:items-center">
        {showQuickSetup && (
          <div className="w-full sm:w-auto">
            <QuickClassSetup onCreateClass={onQuickSetup} />
          </div>
        )}
        <div className={showQuickSetup ? 'flex-1 min-w-55' : 'w-full'}>
          <input
            type="text"
            value={newStudentName}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Name des Schülers eingeben..."
            className={`${inputFieldClass} w-full`}
          />
          {trimmedName && isNameTruncated(trimmedName) && (
            <p className="mt-1 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
              <InfoIcon size={10} />
              Name wird in Sitzplanansicht automatisch gekürzt.
            </p>
          )}
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onAddStudent}
            disabled={isAddDisabled}
            title="Schüler hinzufügen (Enter)"
            className={`${successButtonClass} w-full justify-center gap-2 sm:w-auto`}
          >
            <PlusIcon size={16} /> Hinzufügen
          </button>
          <StudentCsvControls onImport={onImportCsv} onExport={onExportCsv} />
        </div>
      </div>
    </div>
  );
};

export default StudentToolbar;

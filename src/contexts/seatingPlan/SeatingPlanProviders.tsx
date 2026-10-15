// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import {
  SeatingPlanStoreProvider,
  useSeatingPlanActions,
} from '@/contexts/seatingPlan/store';
import { StudentManagementProvider } from '@/contexts/seatingPlan/StudentManagementContext';
import { ClassroomLayoutProvider } from '@/contexts/seatingPlan/ClassroomLayoutContext';
import { SeatingAlgorithmProvider } from '@/contexts/seatingPlan/SeatingAlgorithmContext';
import { ClassManagementProvider } from '@/contexts/seatingPlan/ClassManagementContext';
import { CanvasPreferencesProvider } from '@/contexts/seatingPlan/CanvasPreferencesContext';
import { BACKUP_FILE_ACCEPT } from '@/config/backupFile';
import { useBackupFileLaunch } from '@/hooks/pwa/useBackupFileLaunch';

/**
 * Hidden file input for backup import, and the way in for a backup the
 * installed app was opened with. Must be rendered inside the provider tree to
 * access the context.
 */
function BackupFileInput() {
  const { importInputRef, handleImportFile, importBackupFile } =
    useSeatingPlanActions();
  useBackupFileLaunch(importBackupFile);
  return (
    <input
      ref={importInputRef}
      type="file"
      accept={BACKUP_FILE_ACCEPT}
      onChange={handleImportFile}
      className="hidden"
      aria-hidden="true"
    />
  );
}

export function SeatingPlanGeneratorProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SeatingPlanStoreProvider>
      <ClassManagementProvider>
        <StudentManagementProvider>
          <ClassroomLayoutProvider>
            <SeatingAlgorithmProvider>
              <CanvasPreferencesProvider>
                {children}
                <BackupFileInput />
              </CanvasPreferencesProvider>
            </SeatingAlgorithmProvider>
          </ClassroomLayoutProvider>
        </StudentManagementProvider>
      </ClassManagementProvider>
    </SeatingPlanStoreProvider>
  );
}

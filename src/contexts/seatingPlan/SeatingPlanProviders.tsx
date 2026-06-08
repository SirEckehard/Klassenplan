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

/**
 * Hidden file input for backup import.
 * Must be rendered inside the provider tree to access the context.
 */
function BackupFileInput() {
  const { importInputRef, handleImportFile } = useSeatingPlanActions();
  return (
    <input
      ref={importInputRef}
      type="file"
      accept=".json"
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
              {children}
              <BackupFileInput />
            </SeatingAlgorithmProvider>
          </ClassroomLayoutProvider>
        </StudentManagementProvider>
      </ClassManagementProvider>
    </SeatingPlanStoreProvider>
  );
}

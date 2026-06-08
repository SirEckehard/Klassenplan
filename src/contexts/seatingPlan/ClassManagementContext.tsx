// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import {
  shallowEqual,
  useSeatingPlanSelector,
  type SeatingPlanSnapshot,
} from '@/contexts/seatingPlan/store';
import type { ClassSummary } from '@/types';

export interface ClassManagementContextValue {
  classSummaries: ClassSummary[];
  activeClass: SeatingPlanSnapshot['state']['activeClass'];
  selectClass: SeatingPlanSnapshot['actions']['selectClass'];
  createClass: SeatingPlanSnapshot['actions']['createClass'];
  updateClassMetadata: SeatingPlanSnapshot['actions']['updateClassMetadata'];
  duplicateClass: SeatingPlanSnapshot['actions']['duplicateClass'];
  deleteClass: SeatingPlanSnapshot['actions']['deleteClass'];
}

export const ClassManagementContext =
  React.createContext<ClassManagementContextValue | null>(null);

export const selectClassManagementContext = ({
  state,
  actions,
}: SeatingPlanSnapshot): ClassManagementContextValue => ({
  classSummaries: state.classSummaries,
  activeClass: state.activeClass,
  selectClass: actions.selectClass,
  createClass: actions.createClass,
  updateClassMetadata: actions.updateClassMetadata,
  duplicateClass: actions.duplicateClass,
  deleteClass: actions.deleteClass,
});

export function ClassManagementProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const value = useSeatingPlanSelector(
    selectClassManagementContext,
    shallowEqual,
  );

  return (
    <ClassManagementContext.Provider value={value}>
      {children}
    </ClassManagementContext.Provider>
  );
}

/**
 * Provides access to class management operations.
 * Use this hook for class CRUD operations like create, select, delete, and duplicate.
 *
 * @returns ClassManagementContextValue with class summaries and management actions
 * @throws Error if used outside SeatingPlanGeneratorProvider
 *
 * @example
 * ```tsx
 * const { classSummaries, selectClass, createClass } = useClassManagementContext();
 * ```
 */
export function useClassManagementContext(): ClassManagementContextValue {
  const context = React.useContext(ClassManagementContext);
  if (!context) {
    throw new Error(
      'useClassManagementContext must be used within a SeatingPlanGeneratorProvider',
    );
  }
  return context;
}

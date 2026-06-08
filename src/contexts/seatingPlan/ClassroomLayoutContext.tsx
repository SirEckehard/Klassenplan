import React from 'react';
import {
  shallowEqual,
  useSeatingPlanSelector,
  type SeatingPlanSnapshot,
} from '@/contexts/seatingPlan/store';

export interface ClassroomLayoutContextValue {
  classroomScene: SeatingPlanSnapshot['state']['classroomScene'];
  seatCount: SeatingPlanSnapshot['state']['seatCount'];
  classroomEdited: SeatingPlanSnapshot['state']['classroomEdited'];
  updateClassroomScene: SeatingPlanSnapshot['actions']['updateClassroomScene'];
  removeTables: SeatingPlanSnapshot['actions']['removeTables'];
  saveTemplate: SeatingPlanSnapshot['actions']['saveTemplate'];
  updateTemplate: SeatingPlanSnapshot['actions']['updateTemplate'];
  loadTemplate: SeatingPlanSnapshot['actions']['loadTemplate'];
  deleteTemplate: SeatingPlanSnapshot['actions']['deleteTemplate'];
  renameTemplate: SeatingPlanSnapshot['actions']['renameTemplate'];
  circleLayout: SeatingPlanSnapshot['state']['circleLayout'];
  circleGenerationInProgress: SeatingPlanSnapshot['state']['circleGenerationInProgress'];
  circleGenerationStatus: SeatingPlanSnapshot['state']['circleGenerationStatus'];
  generateCircleSeating: SeatingPlanSnapshot['actions']['generateCircleSeating'];
  regenerateCircle: SeatingPlanSnapshot['actions']['regenerateCircle'];
  clearCircleLayout: SeatingPlanSnapshot['actions']['clearCircleLayout'];
  updateStudentPosition: SeatingPlanSnapshot['actions']['updateStudentPosition'];
  swapStudentPositions: SeatingPlanSnapshot['actions']['swapStudentPositions'];
  batchSwapStudentPositions: SeatingPlanSnapshot['actions']['batchSwapStudentPositions'];
  syncCircleFromTable: SeatingPlanSnapshot['actions']['syncCircleFromTable'];
  seatingMode: SeatingPlanSnapshot['state']['seatingMode'];
  setSeatingMode: SeatingPlanSnapshot['actions']['setSeatingMode'];
}

const ClassroomLayoutContext =
  React.createContext<ClassroomLayoutContextValue | null>(null);

/**
 * selectClassroomLayoutContext exposes only layout specific state and actions
 * which keeps classroom consumers decoupled from student or algorithm updates.
 */
export const selectClassroomLayoutContext = ({
  state,
  actions,
}: SeatingPlanSnapshot): ClassroomLayoutContextValue => ({
  classroomScene: state.classroomScene,
  seatCount: state.seatCount,
  classroomEdited: state.classroomEdited,
  updateClassroomScene: actions.updateClassroomScene,
  removeTables: actions.removeTables,
  saveTemplate: actions.saveTemplate,
  updateTemplate: actions.updateTemplate,
  loadTemplate: actions.loadTemplate,
  deleteTemplate: actions.deleteTemplate,
  renameTemplate: actions.renameTemplate,
  circleLayout: state.circleLayout,
  circleGenerationInProgress: state.circleGenerationInProgress,
  circleGenerationStatus: state.circleGenerationStatus,
  generateCircleSeating: actions.generateCircleSeating,
  regenerateCircle: actions.regenerateCircle,
  clearCircleLayout: actions.clearCircleLayout,
  updateStudentPosition: actions.updateStudentPosition,
  swapStudentPositions: actions.swapStudentPositions,
  batchSwapStudentPositions: actions.batchSwapStudentPositions,
  syncCircleFromTable: actions.syncCircleFromTable,
  seatingMode: state.seatingMode,
  setSeatingMode: actions.setSeatingMode,
});

export function ClassroomLayoutProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const value = useSeatingPlanSelector(
    selectClassroomLayoutContext,
    shallowEqual,
  );

  return (
    <ClassroomLayoutContext.Provider value={value}>
      {children}
    </ClassroomLayoutContext.Provider>
  );
}

/**
 * Provides access to classroom layout and scene operations.
 * Use this hook for table management, templates, and circle seating.
 *
 * @returns ClassroomLayoutContextValue with scene data and layout actions
 * @throws Error if used outside SeatingPlanGeneratorProvider
 *
 * @example
 * ```tsx
 * const { classroomScene, updateClassroomScene, circleLayout } = useClassroomLayoutContext();
 * ```
 */
export function useClassroomLayoutContext(): ClassroomLayoutContextValue {
  const context = React.useContext(ClassroomLayoutContext);
  if (!context) {
    throw new Error(
      'useClassroomLayoutContext must be used within a SeatingPlanGeneratorProvider',
    );
  }
  return context;
}

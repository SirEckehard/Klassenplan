import React from 'react';
import {
  shallowEqual,
  useSeatingPlanSelector,
  type SeatingPlanSnapshot,
} from '@/contexts/seatingPlan/store';

export interface SeatingAlgorithmContextValue {
  step: SeatingPlanSnapshot['state']['step'];
  currentSeating: SeatingPlanSnapshot['state']['currentSeating'];
  mixSettings: SeatingPlanSnapshot['state']['mixSettings'];
  setMixSettings: SeatingPlanSnapshot['actions']['setMixSettings'];
  generateSeatingPlan: SeatingPlanSnapshot['actions']['generateSeatingPlan'];
  refineSeatingLocal: SeatingPlanSnapshot['actions']['refineSeatingLocal'];
  onMix: SeatingPlanSnapshot['actions']['onMix'];
  moveStudent: SeatingPlanSnapshot['actions']['moveStudent'];
  isSeatLocked: SeatingPlanSnapshot['actions']['isSeatLocked'];
  toggleLock: SeatingPlanSnapshot['actions']['toggleLock'];
  seatingHistory: SeatingPlanSnapshot['state']['seatingHistory'];
  handleHistoryLoad: SeatingPlanSnapshot['actions']['handleHistoryLoad'];
  deleteSeatingPlan: SeatingPlanSnapshot['actions']['deleteSeatingPlan'];
  renameSeatingPlan: SeatingPlanSnapshot['actions']['renameSeatingPlan'];
  mixHistory: SeatingPlanSnapshot['state']['mixHistory'];
  handleMixLoad: SeatingPlanSnapshot['actions']['handleMixLoad'];
  deleteMixResult: SeatingPlanSnapshot['actions']['deleteMixResult'];
  planName: SeatingPlanSnapshot['state']['planName'];
  setPlanName: SeatingPlanSnapshot['actions']['setPlanName'];
  planNameError: SeatingPlanSnapshot['state']['planNameError'];
  setPlanNameError: SeatingPlanSnapshot['actions']['setPlanNameError'];
  planNameInputRef: SeatingPlanSnapshot['state']['planNameInputRef'];
  handleSaveSeatingPlan: SeatingPlanSnapshot['actions']['handleSaveSeatingPlan'];
  lastStatistics: SeatingPlanSnapshot['state']['lastStatistics'];
  setLastStatistics: SeatingPlanSnapshot['actions']['setLastStatistics'];
  showStatisticsBadge: SeatingPlanSnapshot['state']['showStatisticsBadge'];
  setShowStatisticsBadge: SeatingPlanSnapshot['actions']['setShowStatisticsBadge'];
  statisticsHighlight: SeatingPlanSnapshot['state']['statisticsHighlight'];
  setStatisticsHighlight: SeatingPlanSnapshot['actions']['setStatisticsHighlight'];
  setStatisticsHighlightMode: SeatingPlanSnapshot['actions']['setStatisticsHighlightMode'];
  clearStatisticsHighlight: SeatingPlanSnapshot['actions']['clearStatisticsHighlight'];
}

const SeatingAlgorithmContext =
  React.createContext<SeatingAlgorithmContextValue | null>(null);

/**
 * selectSeatingAlgorithmContext narrows the store snapshot to algorithm specific
 * state so the consumers only update when actual algorithm data changes.
 */
export const selectSeatingAlgorithmContext = ({
  state,
  actions,
}: SeatingPlanSnapshot): SeatingAlgorithmContextValue => ({
  step: state.step,
  currentSeating: state.currentSeating,
  mixSettings: state.mixSettings,
  setMixSettings: actions.setMixSettings,
  generateSeatingPlan: actions.generateSeatingPlan,
  refineSeatingLocal: actions.refineSeatingLocal,
  onMix: actions.onMix,
  moveStudent: actions.moveStudent,
  isSeatLocked: actions.isSeatLocked,
  toggleLock: actions.toggleLock,
  seatingHistory: state.seatingHistory,
  handleHistoryLoad: actions.handleHistoryLoad,
  deleteSeatingPlan: actions.deleteSeatingPlan,
  renameSeatingPlan: actions.renameSeatingPlan,
  mixHistory: state.mixHistory,
  handleMixLoad: actions.handleMixLoad,
  deleteMixResult: actions.deleteMixResult,
  planName: state.planName,
  setPlanName: actions.setPlanName,
  planNameError: state.planNameError,
  setPlanNameError: actions.setPlanNameError,
  planNameInputRef: state.planNameInputRef,
  handleSaveSeatingPlan: actions.handleSaveSeatingPlan,
  lastStatistics: state.lastStatistics,
  setLastStatistics: actions.setLastStatistics,
  showStatisticsBadge: state.showStatisticsBadge,
  setShowStatisticsBadge: actions.setShowStatisticsBadge,
  statisticsHighlight: state.statisticsHighlight,
  setStatisticsHighlight: actions.setStatisticsHighlight,
  setStatisticsHighlightMode: actions.setStatisticsHighlightMode,
  clearStatisticsHighlight: actions.clearStatisticsHighlight,
});

export function SeatingAlgorithmProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const value = useSeatingPlanSelector(
    selectSeatingAlgorithmContext,
    shallowEqual,
  );

  return (
    <SeatingAlgorithmContext.Provider value={value}>
      {children}
    </SeatingAlgorithmContext.Provider>
  );
}

/**
 * Provides access to seating algorithm and mix operations.
 * Use this hook for generating seating plans, managing mix settings, and history.
 *
 * @returns SeatingAlgorithmContextValue with algorithm state and actions
 * @throws Error if used outside SeatingPlanGeneratorProvider
 *
 * @example
 * ```tsx
 * const { currentSeating, mixSettings, generateSeatingPlan, onMix } = useSeatingAlgorithmContext();
 * ```
 */
export function useSeatingAlgorithmContext(): SeatingAlgorithmContextValue {
  const context = React.useContext(SeatingAlgorithmContext);
  if (!context) {
    throw new Error(
      'useSeatingAlgorithmContext must be used within a SeatingPlanGeneratorProvider',
    );
  }
  return context;
}

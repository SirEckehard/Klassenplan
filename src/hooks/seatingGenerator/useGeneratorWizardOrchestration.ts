// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useMemo } from 'react';
import { useSeatingWizard } from '../wizard/useSeatingWizard';
import { useCircleAfterMix } from '../circle/useCircleAfterMix';
import { neutralSettings, SCALAR_MIX_SETTING_KEYS } from '@/utils';
import type {
  ClassroomScene,
  MixSettings,
  SaveSeatingPlanOptions,
  SeatingArrangement,
  Student,
} from '@/types';
import type { CircleLayout } from '@/types/Circle';
import type { SyncSnapshotOptions } from './useUnsavedSeatingTracker';

/**
 * Parameters for the wizard orchestration hook
 */
interface WizardOrchestrationParams {
  // State from useSeatingState
  students: Student[];
  currentSeating: SeatingArrangement;
  classroomScene: ClassroomScene;
  mixSettings: MixSettings;
  circleLayout: CircleLayout | null;
  planName: string;
  /** See `WizardConfig.openPlanIsAutoSave`. */
  openPlanIsAutoSave: boolean;
  classroomEdited: boolean;
  hasUnsavedSeatingChanges: boolean;

  // Actions from persistence/algorithm
  saveSeatingPlan: (
    name: string,
    scene: ClassroomScene,
    circleLayout?: CircleLayout | null,
    options?: SaveSeatingPlanOptions,
  ) => boolean;
  generateSeatingPlan: (
    settings: MixSettings,
    scene: ClassroomScene,
  ) => Promise<SeatingArrangement>;
  regenerateCircle: () => Promise<CircleLayout | null>;

  // Setters
  setPlanName: React.Dispatch<React.SetStateAction<string>>;
  setMixSettings: React.Dispatch<React.SetStateAction<MixSettings>>;
  setClassroomEdited: (edited: boolean) => void;

  // Scene sync callback
  markClassroomSynced: (scene: ClassroomScene) => void;
  syncSeatingSnapshot: (options?: SyncSnapshotOptions) => void;
}

/**
 * Return type for the wizard orchestration hook
 */
export interface WizardOrchestrationReturn {
  // Wizard state
  step: number;
  autoMixing: boolean;
  autoMixError: string | null;
  planNameError: boolean;
  planNameInputRef: React.RefObject<HTMLInputElement | null>;

  // Wizard actions
  handleStepChange: (step: number) => void;
  setStep: (step: number) => void;
  setPlanNameError: (error: boolean) => void;

  // Mix actions
  /** What a mix calls when it is done: the circle follows the new plan. */
  handleMix: () => void;
  setShouldRegenerateCircle: (value: boolean) => void;

  // Derived state
  intelligentMix: boolean;
  settingsForRun: MixSettings;
}

/**
 * Orchestrates wizard navigation and what follows a mix.
 *
 * Extracts wizard logic from useSeatingGenerator for better testability and
 * separation of concerns. A mix refines within its own session (decision
 * 0027), so nothing here refines afterwards.
 *
 * @param params - State and actions needed for wizard orchestration
 * @returns Wizard state, actions, and the mix's follow-up
 */
export function useGeneratorWizardOrchestration(
  params: WizardOrchestrationParams,
): WizardOrchestrationReturn {
  const {
    students,
    currentSeating,
    classroomScene,
    mixSettings,
    circleLayout,
    planName,
    openPlanIsAutoSave,
    classroomEdited,
    hasUnsavedSeatingChanges,
    saveSeatingPlan,
    generateSeatingPlan,
    regenerateCircle,
    setPlanName,
    setMixSettings,
    setClassroomEdited,
    markClassroomSynced,
    syncSeatingSnapshot,
  } = params;

  // Derived state: check if any intelligent mix setting is enabled
  const intelligentMix = useMemo(
    () => SCALAR_MIX_SETTING_KEYS.some((key) => (mixSettings[key] ?? 0) > 0),
    [mixSettings],
  );

  // Settings to use for algorithm runs
  const settingsForRun = useMemo(
    () => (intelligentMix ? mixSettings : neutralSettings),
    [intelligentMix, mixSettings],
  );

  // Wizard navigation hook
  const {
    step,
    planNameError,
    planNameInputRef,
    autoMixing,
    autoMixError,
    handleStepChange,
    setStep,
    setPlanNameError,
  } = useSeatingWizard({
    students,
    currentSeating,
    planName,
    openPlanIsAutoSave,
    hasUnsavedSeatingChanges,
    classroomScene,
    mixSettings,
    saveSeatingPlan,
    circleLayout,
    setPlanName,
    setMixSettings,
    generateSeatingPlan,
    classroomEdited,
    setClassroomEdited,
    markClassroomSynced,
    syncSeatingSnapshot,
  });

  const { setShouldRegenerateCircle, handleMix } = useCircleAfterMix({
    currentSeating,
    circleLayout,
    regenerateCircle,
  });

  return {
    // Wizard state
    step,
    autoMixing,
    autoMixError,
    planNameError,
    planNameInputRef,

    // Wizard actions
    handleStepChange,
    setStep,
    setPlanNameError,

    // Mix actions
    handleMix,
    setShouldRegenerateCircle,

    // Derived state
    intelligentMix,
    settingsForRun,
  };
}

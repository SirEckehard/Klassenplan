// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSeatingWizard } from '../wizard/useSeatingWizard';
import { useAutoMixTrigger } from '../wizard/useAutoMixTrigger';
import type { AutoMixTriggerHandler } from '../algorithm/useAutoMixTriggers';
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
    forceNew?: boolean,
  ) => Promise<SeatingArrangement>;
  refineSeatingLocal: (
    settings: MixSettings,
    scene: ClassroomScene,
    options: { triesPerPass: number; passes: number },
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
  handleMixWithAutoRefine: () => void;
  triggerAutoMixEvent: AutoMixTriggerHandler;
  setShouldRegenerateCircle: (value: boolean) => void;

  // Derived state
  intelligentMix: boolean;
  settingsForRun: MixSettings;
}

/**
 * Orchestrates wizard navigation and auto-mix trigger coordination.
 *
 * Extracts wizard + auto-mix logic from useSeatingGenerator for better
 * testability and separation of concerns.
 *
 * @param params - State and actions needed for wizard orchestration
 * @returns Wizard state, actions, and auto-mix handlers
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
    classroomEdited,
    hasUnsavedSeatingChanges,
    saveSeatingPlan,
    generateSeatingPlan,
    refineSeatingLocal,
    regenerateCircle,
    setPlanName,
    setMixSettings,
    setClassroomEdited,
    markClassroomSynced,
    syncSeatingSnapshot,
  } = params;

  // Track current step for auto-mix trigger context
  const latestStepRef = useRef(1);
  const autoMixTriggerHandlerRef = useRef<AutoMixTriggerHandler>(() => false);

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

  // Callback for wizard to trigger auto-mix
  const handleAutoMixTriggered = useCallback(() => {
    autoMixTriggerHandlerRef.current('wizard-auto-mix', {
      source: 'wizard',
      step: latestStepRef.current,
    });
  }, []);

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
    hasUnsavedSeatingChanges,
    classroomScene,
    mixSettings,
    saveSeatingPlan,
    circleLayout,
    setPlanName,
    setMixSettings,
    generateSeatingPlan,
    onAutoMixTriggered: handleAutoMixTriggered,
    classroomEdited,
    setClassroomEdited,
    markClassroomSynced,
    syncSeatingSnapshot,
  });

  useEffect(() => {
    latestStepRef.current = step;
  }, [step]);

  // Auto-mix trigger hook for handling refine requests
  const autoMixTriggerOverrides = useMemo(
    () => ({
      'ci-import': { enabled: true, requireIntelligentMix: false },
    }),
    [],
  );

  const autoMixTrigger = useAutoMixTrigger(
    {
      step,
      currentSeating,
      classroomScene,
      mixSettings: settingsForRun,
      intelligentMix,
      circleLayout,
      refineSeatingLocal,
      regenerateCircle,
    },
    {
      loggerContext: 'useGeneratorWizardOrchestration',
      triggerOverrides: autoMixTriggerOverrides,
    },
  );

  const { setShouldRegenerateCircle, handleMix, triggerAutoMixEvent } =
    autoMixTrigger;

  useEffect(() => {
    autoMixTriggerHandlerRef.current = triggerAutoMixEvent;
  }, [triggerAutoMixEvent]);

  // Combined mix handler that triggers auto-refine
  const handleMixWithAutoRefine = useCallback(() => {
    triggerAutoMixEvent('manual-mix', { source: 'manual-mix' });
    handleMix();
  }, [handleMix, triggerAutoMixEvent]);

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
    handleMixWithAutoRefine,
    triggerAutoMixEvent,
    setShouldRegenerateCircle,

    // Derived state
    intelligentMix,
    settingsForRun,
  };
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback, useRef, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  announcePlanSaved,
  createTimestampPlanName,
  showToast,
  TOAST_MESSAGES,
  hasPlanForScene,
  logError,
  withoutUnavailableWeights,
} from '@/utils';
import { confirmDialog } from '@/services/ui/dialogs';
import i18n from '@/i18n';
import { countActiveSeats } from '@/utils/math/scene';
import { triggerScrollToTop } from '@/utils/ui/scroll';
import {
  validateStudentsComplete,
  getStudentValidationMessage,
} from '@/utils/validation';
import type {
  Student,
  ClassroomScene,
  MixSettings,
  SaveSeatingPlanOptions,
  SeatingArrangement,
} from '@/types';
import type { CircleLayout } from '@/types/Circle';
import { useAlgorithmStore } from '@/stores/algorithmStore';
import { shallow } from 'zustand/shallow';

export interface WizardState {
  step: number;
  classroomEdited: boolean;
  planNameError: boolean;
  planNameInputRef: React.RefObject<HTMLInputElement | null>;
  autoMixing: boolean;
  autoMixError: string | null;
}

export interface WizardConfig {
  students: Student[];
  currentSeating: SeatingArrangement;
  planName: string;
  /**
   * Whether the open plan is the room's auto-save, still under the name the
   * auto-save gave it — a name the teacher did not choose.
   */
  openPlanIsAutoSave?: boolean;
  hasUnsavedSeatingChanges: boolean;
  classroomScene: ClassroomScene;
  classroomEdited: boolean;
  mixSettings: MixSettings;
  saveSeatingPlan: (
    name: string,
    scene: ClassroomScene,
    circleLayout?: CircleLayout | null,
    options?: SaveSeatingPlanOptions,
  ) => boolean;
  circleLayout: CircleLayout | null;
  setPlanName: (name: string) => void;
  setMixSettings: (settings: MixSettings) => void;
  generateSeatingPlan: (
    settings: MixSettings,
    scene: ClassroomScene,
  ) => Promise<SeatingArrangement>;
  setClassroomEdited: (edited: boolean) => void;
  markClassroomSynced: (scene: ClassroomScene) => void;
  syncSeatingSnapshot: () => void;
}

export interface WizardActions {
  handleStepChange: (n: number) => Promise<void>;
  setStep: (step: number) => void;
  setClassroomEdited: (edited: boolean) => void;
  setPlanNameError: (error: boolean) => void;
}

/**
 * Hook for managing wizard step navigation and validation
 */
export function useSeatingWizard(
  config: WizardConfig,
): WizardState & WizardActions {
  const location = useLocation();
  const {
    students,
    currentSeating,
    planName,
    openPlanIsAutoSave = false,
    hasUnsavedSeatingChanges,
    classroomScene,
    classroomEdited,
    mixSettings,
    saveSeatingPlan,
    circleLayout,
    setPlanName,
    setMixSettings,
    generateSeatingPlan,
    setClassroomEdited,
    markClassroomSynced,
    syncSeatingSnapshot,
  } = config;

  const { step, setStep, planNameError, setPlanNameError } = useAlgorithmStore(
    (state) => ({
      step: state.step,
      setStep: state.setStep,
      planNameError: state.planNameError,
      setPlanNameError: state.setPlanNameError,
    }),
    shallow,
  );
  const locationStep =
    typeof location.state?.step === 'number' ? location.state.step : null;
  const lastAppliedLocationStep = useRef<number | null>(null);
  const autoMixTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [autoMixing, setAutoMixing] = useState(false);
  const [autoMixError, setAutoMixError] = useState<string | null>(null);
  useEffect(() => {
    if (locationStep === null) {
      lastAppliedLocationStep.current = null;
      return;
    }

    // Already applied this location step
    if (lastAppliedLocationStep.current === locationStep) {
      return;
    }

    // Mark as applied even if step already matches to prevent
    // the effect from reverting manual step changes later
    lastAppliedLocationStep.current = locationStep;

    // Only actually change step if it differs
    if (locationStep !== step) {
      setStep(locationStep);
    }
  }, [locationStep, step, setStep]);
  const planNameInputRef = useRef<HTMLInputElement>(null);

  // Scroll to top on step change
  useEffect(() => {
    triggerScrollToTop();
  }, [step]);

  useEffect(() => {
    return () => {
      if (autoMixTimeoutRef.current) {
        clearTimeout(autoMixTimeoutRef.current);
        autoMixTimeoutRef.current = null;
      }
    };
  }, []);

  /**
   * Handle backward navigation with auto-save logic.
   * When navigating back from step 3 with unsaved changes, auto-saves the plan.
   */
  const handleBackwardNavigation = useCallback(
    async (targetStep: number): Promise<boolean> => {
      // A plan made for other tables is not saved: it would store the seats
      // of tables that are gone under the room as it now stands.
      if (
        step === 3 &&
        hasPlanForScene(classroomScene, currentSeating) &&
        hasUnsavedSeatingChanges
      ) {
        setPlanNameError(false);
        const trimmed = planName.trim();
        // The name the last auto-save generated is no name either: the plan
        // stays in the room's auto-save slot until it is named, saved on
        // purpose or used — exporting and presenting keep it as a plan.
        const hasCustomName = trimmed.length > 0 && !openPlanIsAutoSave;
        const finalName = hasCustomName ? trimmed : createTimestampPlanName();

        if (!hasCustomName) {
          setPlanName(finalName);
        }

        const ok = saveSeatingPlan(finalName, classroomScene, circleLayout, {
          // Only a generated name marks this as a throwaway auto-save; a name
          // the user typed makes it a real plan.
          autoSave: !hasCustomName,
        });

        if (ok) {
          announcePlanSaved(finalName);
          syncSeatingSnapshot();
          markClassroomSynced(classroomScene);
        } else {
          showToast('error', TOAST_MESSAGES.PLAN_SAVE_FAILED);
          const shouldContinue = await confirmDialog(
            i18n.t('dialogs.savePlanFailedConfirm', { ns: 'common' }),
          );
          if (!shouldContinue) {
            return false;
          }
        }
      }
      setStep(targetStep);
      return true;
    },
    [
      step,
      currentSeating,
      hasUnsavedSeatingChanges,
      planName,
      openPlanIsAutoSave,
      classroomScene,
      circleLayout,
      saveSeatingPlan,
      setPlanName,
      setPlanNameError,
      syncSeatingSnapshot,
      markClassroomSynced,
      setStep,
    ],
  );

  /**
   * Validate and navigate to step 2 (classroom layout).
   * @returns true if navigation succeeded
   */
  const validateAndNavigateToStep2 = useCallback((): boolean => {
    if (students.length === 0) {
      showToast('error', TOAST_MESSAGES.STUDENT_ADD_FIRST);
      return false;
    }

    const validation = validateStudentsComplete(students);
    const nameMessage = getStudentValidationMessage(validation);
    if (nameMessage) {
      showToast('error', nameMessage);
      return false;
    }
    setStep(2);
    return true;
  }, [students, setStep]);

  /**
   * Trigger automatic seating plan generation on first entry to step 3 — a
   * mix like any other, refined in its own session while a criterion is on.
   * It mixes by the teacher's weights as they are; which criteria the class
   * has data for is `useAutoMixSettings`' business, and the weights of the
   * others are cleared here as everywhere (decision 0016).
   */
  const triggerAutoMix = useCallback(() => {
    const autoSettings: MixSettings = withoutUnavailableWeights(
      mixSettings,
      students,
    );

    if (autoSettings !== mixSettings) setMixSettings(autoSettings);
    setAutoMixError(null);

    if (autoMixTimeoutRef.current) {
      clearTimeout(autoMixTimeoutRef.current);
    }

    // Set with the step, not when the timer fires: the plan view mixes a
    // stale arrangement on its own and stands aside only while this runs —
    // otherwise both mix the first plan, and the second overwrites the first.
    setAutoMixing(true);
    autoMixTimeoutRef.current = setTimeout(() => {
      void (async () => {
        try {
          await generateSeatingPlan(autoSettings, classroomScene);
          setAutoMixError(null);
        } catch (error) {
          // Dropped because another class opened meanwhile: nothing failed.
          if (error instanceof DOMException && error.name === 'AbortError') {
            return;
          }
          logError(
            'Automatic seating plan generation failed on step entry',
            { error },
            'useSeatingWizard',
          );
          showToast('error', TOAST_MESSAGES.GENERATION_ERROR);
          const errorMessage =
            error instanceof Error && error.message
              ? error.message
              : TOAST_MESSAGES.GENERATION_ERROR;
          setAutoMixError(errorMessage);
        } finally {
          setAutoMixing(false);
          autoMixTimeoutRef.current = null;
        }
      })();
    }, 50);
  }, [
    students,
    mixSettings,
    classroomScene,
    setMixSettings,
    generateSeatingPlan,
  ]);

  /**
   * Validate and navigate to step 3 (seating algorithm).
   * @returns true if navigation succeeded
   */
  const validateAndNavigateToStep3 = useCallback((): boolean => {
    if (students.length === 0) {
      showToast('error', TOAST_MESSAGES.STUDENT_ADD_FIRST);
      return false;
    }

    if (classroomScene.tables.length === 0) {
      showToast('error', TOAST_MESSAGES.CLASSROOM_NOT_SETUP);
      return false;
    }

    const currentSeatCount = countActiveSeats(classroomScene);
    if (currentSeatCount < students.length) {
      showToast('error', TOAST_MESSAGES.SEATS_INSUFFICIENT);
      return false;
    }

    setStep(3);

    // Auto-generate seating plan on first entry to step 3
    if (currentSeating.length === 0) {
      triggerAutoMix();
    }
    return true;
  }, [
    students,
    classroomScene,
    currentSeating.length,
    setStep,
    triggerAutoMix,
  ]);

  /**
   * Main step change handler - orchestrates navigation between wizard steps.
   */
  const handleStepChange = useCallback(
    async (n: number) => {
      if (n === step) return;

      // Backward navigation
      if (n < step) {
        await handleBackwardNavigation(n);
        return;
      }

      // Forward navigation
      if (n === 2) {
        validateAndNavigateToStep2();
      } else if (n === 3) {
        validateAndNavigateToStep3();
      }
    },
    [
      step,
      handleBackwardNavigation,
      validateAndNavigateToStep2,
      validateAndNavigateToStep3,
    ],
  );

  return {
    step,
    classroomEdited,
    planNameError,
    planNameInputRef,
    autoMixing,
    autoMixError,
    handleStepChange,
    setStep,
    setPlanNameError,
    setClassroomEdited,
  };
}

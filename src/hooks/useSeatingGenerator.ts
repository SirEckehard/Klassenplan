import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useSeatingState } from './useSeatingState';
import { useSeatingPersistence } from './useSeatingPersistence';
import { useSeatingAlgorithm } from './useSeatingAlgorithm';
import { useSeatingStatisticsUpdater } from './useSeatingStatisticsUpdater';
import { useSeatingRepository } from './useSeatingRepository';
import { usePlanPersistenceHandlers } from './seatingGenerator/usePlanPersistenceHandlers';
import { useHomeNavigationHandler } from './seatingGenerator/useHomeNavigationHandler';
import { usePostUpdateNotice } from './seatingGenerator/usePostUpdateNotice';
import { useUnsavedSeatingTracker } from './seatingGenerator/useUnsavedSeatingTracker';
import { useGeneratorWizardOrchestration } from './seatingGenerator/useGeneratorWizardOrchestration';
import { useGeneratorCircleOrchestration } from './seatingGenerator/useGeneratorCircleOrchestration';
import { useGeneratorBackupOrchestration } from './seatingGenerator/useGeneratorBackupOrchestration';
import { useClassManagement } from './domains/useClassManagement';
import type { ClassroomScene as ClassroomSceneT } from '@/types';

/**
 * Composes seating state, persistence, algorithm utilities, and UI orchestration into a single generator hook.
 *
 * @returns Memoized bundle with `state`, `actions`, and flattened helpers for the seating plan workflow
 *
 * @example
 * const { state, actions } = useSeatingGenerator();
 * actions.generateSeatingPlan(state.mixSettings, state.classroomScene);
 */
export function useSeatingGenerator() {
  const navigate = useNavigate();
  const [isClassReloading, setIsClassReloading] = useState(false);
  const {
    currentAppVersion,
    latestChangelogEntry,
    showPostUpdateNotice,
    acknowledgePostUpdateNotice,
  } = usePostUpdateNotice();

  // Compose the base hooks directly so SeatingPlanStoreProvider can expose a stable snapshot
  const seatingState = useSeatingState();
  const repository = useSeatingRepository();
  const persistence = useSeatingPersistence(seatingState);
  const algorithm = useSeatingAlgorithm(seatingState);

  // Destructure all needed values from the composed hooks
  const {
    studentState: {
      students,
      setStudents,
      hasPendingStudentUpdates,
      acknowledgeStudentUpdates,
      addStudent,
      addBulkPlaceholderStudents,
      removeStudent,
      clearStudents,
      updateStudent,
      importCsv,
      moveStudent,
    },
    historyState: { seatingHistory, mixHistory, deleteMixResult },
    planState: { currentSeating, setCurrentSeating, planName, setPlanName },
    algorithmState: {
      mixSettings,
      setMixSettings,
      lastStatistics,
      setLastStatistics,
      showStatisticsBadge,
      setShowStatisticsBadge,
      statisticsHighlight,
      setStatisticsHighlight,
      setStatisticsHighlightMode,
      clearStatisticsHighlight,
      isSeatLocked,
      toggleLock,
      lockedPositions,
    },
    sceneState: {
      classroomScene,
      seatCount,
      classroomEdited,
      setClassroomEdited,
      seatingMode,
      setSeatingMode,
      circleLayout,
      setCircleLayout,
      circleGenerationInProgress,
      circleGenerationStatus,
      setClassroomScene,
      removeTables,
    },
    classState: { classSummaries, activeClass, setActiveClass },
  } = seatingState;

  const {
    saveSeatingPlan,
    loadSeatingPlan,
    deleteSeatingPlan,
    renameSeatingPlan,
    saveTemplate,
    updateTemplate,
    loadTemplate,
    deleteTemplate,
    renameTemplate,
    downloadStudentsCsv,
    exportAllAsJson,
    importAllFromJson,
    clearAllData,
    reloadCurrentClassData,
    prepareClassSwitch,
  } = persistence;

  const { generateSeatingPlan: generateSeatingPlanBase, refineSeatingLocal } =
    algorithm;

  const handleSeatingModeChange = useCallback(
    (mode: 'table' | 'circle') => {
      setSeatingMode(mode);
    },
    [setSeatingMode],
  );

  // Wrap generateSeatingPlan to acknowledge student updates
  const generateSeatingPlan = useCallback(
    async (
      settings: Parameters<typeof generateSeatingPlanBase>[0],
      scene: Parameters<typeof generateSeatingPlanBase>[1],
      forceNew: Parameters<typeof generateSeatingPlanBase>[2] = true,
    ) => {
      const arrangement = await generateSeatingPlanBase(
        settings,
        scene,
        forceNew,
      );
      acknowledgeStudentUpdates();
      return arrangement;
    },
    [generateSeatingPlanBase, acknowledgeStudentUpdates],
  );

  // Unsaved changes tracking
  const { hasUnsavedSeatingChanges, syncSeatingSnapshot } =
    useUnsavedSeatingTracker({
      currentSeating,
      circleLayout,
      planName,
      lockedPositions,
      activeClassId: activeClass?.id,
      trackingEnabled: !isClassReloading,
    });

  // Class reload handler
  const applyClassReload = useCallback(async () => {
    setIsClassReloading(true);
    try {
      const snapshot = await reloadCurrentClassData();
      syncSeatingSnapshot({
        seating: snapshot.currentSeating,
        circleLayout: snapshot.circleLayout,
        planName: snapshot.planName,
        lockedPositions: snapshot.lockedPositions,
      });
    } finally {
      setIsClassReloading(false);
    }
  }, [reloadCurrentClassData, syncSeatingSnapshot]);

  // Class management
  const {
    selectClass,
    createClass,
    updateClassMetadata,
    duplicateClass,
    deleteClass,
  } = useClassManagement({
    repository,
    classSummaries,
    activeClass,
    setActiveClass,
    hasPendingStudentUpdates,
    hasUnsavedSeatingChanges,
    applyClassReload,
    prepareClassSwitch,
  });

  // Ref for scene sync callback
  const markClassroomSceneSyncedRef = useRef<
    ((scene: ClassroomSceneT) => void) | null
  >(null);

  const markClassroomSceneSynced = useCallback(() => {
    setClassroomEdited(false);
  }, [setClassroomEdited]);

  useEffect(() => {
    markClassroomSceneSyncedRef.current = markClassroomSceneSynced;
  }, [markClassroomSceneSynced]);

  // Circle orchestration (called first to provide regenerateCircle)
  const circleOrchestration = useGeneratorCircleOrchestration({
    seatingState,
    currentSeating,
  });

  const {
    generateCircleSeating,
    regenerateCircle,
    updateStudentPosition,
    swapStudentPositions,
    batchSwapStudentPositions,
    clearCircleLayout,
    syncCircleFromTable,
    cancelCircleGeneration,
  } = circleOrchestration;

  // Wizard orchestration (step navigation, auto-mix)
  const wizardOrchestration = useGeneratorWizardOrchestration({
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
    markClassroomSynced: (scene) =>
      markClassroomSceneSyncedRef.current?.(scene),
    syncSeatingSnapshot,
  });

  const {
    step,
    autoMixing,
    autoMixError,
    planNameError,
    planNameInputRef,
    handleStepChange,
    setStep,
    setPlanNameError,
    handleMixWithAutoRefine,
    triggerAutoMixEvent,
    setShouldRegenerateCircle,
  } = wizardOrchestration;

  // Enhanced student move handler that triggers circle regeneration
  const handleStudentMove = useCallback(
    (fromTable: number, fromSeat: number, toTable: number, toSeat: number) => {
      const moved = moveStudent(fromTable, fromSeat, toTable, toSeat);
      if (moved && circleLayout) {
        setShouldRegenerateCircle(true);
      }
      return moved;
    },
    [moveStudent, circleLayout, setShouldRegenerateCircle],
  );

  // Backup orchestration (import/export with auto-mix trigger)
  const backupOrchestration = useGeneratorBackupOrchestration({
    exportAllAsJson,
    importAllFromJson,
    triggerAutoMixEvent,
  });

  const { importInputRef, triggerImport, handleExportAll, handleImportFile } =
    backupOrchestration;

  // Auto-update statistics when seating changes
  useSeatingStatisticsUpdater({
    currentSeating,
    students,
    mixSettings,
    seatingHistory,
    mixHistory,
    classroomScene,
    setLastStatistics,
    enabled: step === 3 && currentSeating.length > 0,
  });

  // Scene update handler
  const updateClassroomScene = useCallback(
    (next: React.SetStateAction<ClassroomSceneT>) => {
      setClassroomScene((prev) => {
        const result =
          typeof next === 'function'
            ? (next as (p: ClassroomSceneT) => ClassroomSceneT)(prev)
            : next;
        return result;
      });
    },
    [setClassroomScene],
  );

  // Plan persistence handlers
  const { handleSaveSeatingPlan, handleHistoryLoad, handleMixLoad } =
    usePlanPersistenceHandlers({
      currentSeatingLength: currentSeating.length,
      circleLayout,
      saveSeatingPlan,
      loadSeatingPlan,
      setPlanName,
      setPlanNameError,
      updateClassroomScene,
      setCircleLayout,
      setStep,
      step,
      setCurrentSeating,
      setMixSettings,
      markClassroomSynced: markClassroomSceneSynced,
      syncSeatingSnapshot,
    });

  // Home navigation handler
  const handleHomeClick = useHomeNavigationHandler({
    step,
    currentSeatingLength: currentSeating.length,
    planName,
    saveSeatingPlan,
    classroomScene,
    navigate,
    hasUnsavedSeatingChanges,
    syncSeatingSnapshot,
  });

  // Aggregate state for consumers
  const generatorState = useMemo(
    () => ({
      students,
      classroomScene,
      currentSeating,
      mixSettings,
      step,
      seatCount,
      classroomEdited,
      hasUnsavedSeatingChanges,
      planName,
      planNameError,
      planNameInputRef,
      autoMixing,
      autoMixError,
      seatingHistory,
      mixHistory,
      circleLayout,
      circleGenerationInProgress,
      circleGenerationStatus,
      lastStatistics,
      showStatisticsBadge,
      statisticsHighlight,
      seatingMode,
      hasPendingStudentUpdates,
      showPostUpdateNotice,
      latestChangelogEntry,
      currentAppVersion,
      classSummaries,
      activeClass,
    }),
    [
      students,
      classroomScene,
      currentSeating,
      mixSettings,
      step,
      seatCount,
      classroomEdited,
      hasUnsavedSeatingChanges,
      planName,
      planNameError,
      planNameInputRef,
      autoMixing,
      autoMixError,
      seatingHistory,
      mixHistory,
      circleLayout,
      circleGenerationInProgress,
      circleGenerationStatus,
      lastStatistics,
      showStatisticsBadge,
      statisticsHighlight,
      seatingMode,
      hasPendingStudentUpdates,
      showPostUpdateNotice,
      latestChangelogEntry,
      currentAppVersion,
      classSummaries,
      activeClass,
    ],
  );

  // Aggregate actions for consumers
  const actions = useMemo(
    () => ({
      handleStepChange,
      addStudent,
      addBulkPlaceholderStudents,
      removeStudent,
      clearStudents,
      updateStudent,
      setStudents,
      importCsv,
      downloadStudentsCsv,
      updateClassroomScene,
      removeTables,
      generateSeatingPlan,
      moveStudent: handleStudentMove,
      refineSeatingLocal,
      onMix: handleMixWithAutoRefine,
      setPlanName,
      setPlanNameError,
      handleSaveSeatingPlan,
      isSeatLocked,
      toggleLock,
      saveTemplate,
      updateTemplate,
      loadTemplate,
      deleteTemplate,
      renameTemplate,
      handleHistoryLoad,
      deleteSeatingPlan,
      renameSeatingPlan,
      handleMixLoad,
      deleteMixResult,
      setMixSettings,
      setCurrentSeating,
      handleHomeClick,
      importInputRef,
      triggerImport,
      handleExportAll,
      handleImportFile,
      clearAllData,
      generateCircleSeating,
      regenerateCircle,
      updateStudentPosition,
      swapStudentPositions,
      batchSwapStudentPositions,
      clearCircleLayout,
      syncCircleFromTable,
      setCircleLayoutValue: setCircleLayout,
      cancelCircleGeneration,
      setLastStatistics,
      setShowStatisticsBadge,
      setStatisticsHighlight,
      setStatisticsHighlightMode,
      clearStatisticsHighlight,
      setSeatingMode: handleSeatingModeChange,
      acknowledgePostUpdateNotice,
      acknowledgeStudentUpdates,
      selectClass,
      createClass,
      updateClassMetadata,
      duplicateClass,
      deleteClass,
    }),
    [
      handleStepChange,
      addStudent,
      addBulkPlaceholderStudents,
      removeStudent,
      clearStudents,
      updateStudent,
      setStudents,
      importCsv,
      downloadStudentsCsv,
      updateClassroomScene,
      removeTables,
      generateSeatingPlan,
      handleStudentMove,
      refineSeatingLocal,
      handleMixWithAutoRefine,
      setPlanName,
      setPlanNameError,
      handleSaveSeatingPlan,
      isSeatLocked,
      toggleLock,
      saveTemplate,
      updateTemplate,
      loadTemplate,
      deleteTemplate,
      renameTemplate,
      handleHistoryLoad,
      deleteSeatingPlan,
      renameSeatingPlan,
      handleMixLoad,
      deleteMixResult,
      setMixSettings,
      setCurrentSeating,
      handleHomeClick,
      importInputRef,
      triggerImport,
      handleExportAll,
      handleImportFile,
      clearAllData,
      generateCircleSeating,
      regenerateCircle,
      updateStudentPosition,
      swapStudentPositions,
      batchSwapStudentPositions,
      clearCircleLayout,
      syncCircleFromTable,
      setCircleLayout,
      cancelCircleGeneration,
      setLastStatistics,
      setShowStatisticsBadge,
      setStatisticsHighlight,
      setStatisticsHighlightMode,
      clearStatisticsHighlight,
      handleSeatingModeChange,
      acknowledgePostUpdateNotice,
      acknowledgeStudentUpdates,
      selectClass,
      createClass,
      updateClassMetadata,
      duplicateClass,
      deleteClass,
    ],
  );

  return useMemo(
    () => ({
      ...generatorState,
      ...actions,
      state: generatorState,
      actions,
    }),
    [actions, generatorState],
  );
}

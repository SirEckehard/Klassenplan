// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useSeatingState } from './useSeatingState';
import { useSeatingPersistence } from './useSeatingPersistence';
import { useSeatingAlgorithm } from './useSeatingAlgorithm';
import { useSeatingStatisticsUpdater } from './useSeatingStatisticsUpdater';
import { useSeatingRepository } from './useSeatingRepository';
import { usePlanPersistenceHandlers } from './seatingGenerator/usePlanPersistenceHandlers';
import { usePostUpdateNotice } from './seatingGenerator/usePostUpdateNotice';
import { useUnsavedSeatingTracker } from './seatingGenerator/useUnsavedSeatingTracker';
import { useGeneratorWizardOrchestration } from './seatingGenerator/useGeneratorWizardOrchestration';
import { useGeneratorCircleOrchestration } from './seatingGenerator/useGeneratorCircleOrchestration';
import { useGeneratorBackupOrchestration } from './seatingGenerator/useGeneratorBackupOrchestration';
import { useClassManagement } from './domains/useClassManagement';
import { useRoomManagement } from './domains/useRoomManagement';
import {
  useSeatingHistory,
  type SeatingSnapshot,
} from './plan/useSeatingHistory';
import { usePlanUsageTracking } from './plan/usePlanUsageTracking';
import { usePlanUsageRecords } from './plan/usePlanUsageRecords';
import { useStudentHistory } from './student/useStudentHistory';
import type {
  ClassRecord,
  ClassroomScene as ClassroomSceneT,
  SeatingArrangement,
  Student,
} from '@/types';
import { hasPlanForScene, logError, syncSeatingWithStudents } from '@/utils';
import { heldLocks, locksFollowingStudents } from '@/utils/data/classRooms';

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
  const [isClassReloading, setIsClassReloading] = useState(false);
  const [reloadGeneration, setReloadGeneration] = useState(0);
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
  // Records of the plans that were really in use. They feed the repetition
  // scoring, so they are loaded once here and handed to everything that needs
  // them rather than being read per consumer.
  const { planUsage, planUsageSince, planUsageManual } = usePlanUsageRecords(
    seatingState.classState.activeClass.id,
  );
  const algorithm = useSeatingAlgorithm(
    seatingState,
    planUsage,
    planUsageSince,
    planUsageManual,
  );

  // Destructure all needed values from the composed hooks
  const {
    studentState: {
      students,
      getStudents,
      setStudents,
      hasPendingStudentUpdates,
      acknowledgeStudentUpdates,
      addStudent: addStudentBase,
      addBulkPlaceholderStudents: addBulkPlaceholderStudentsBase,
      removeStudent: removeStudentBase,
      removeStudents: removeStudentsBase,
      clearStudents,
      updateStudent: updateStudentBase,
      updateStudents: updateStudentsBase,
      importCsv: importCsvBase,
      moveStudent,
    },
    historyState: { seatingHistory, mixHistory, deleteMixResult },
    planState: {
      currentSeating,
      setCurrentSeating,
      planName,
      setPlanName,
      activePlanId,
    },
    roomState: { rooms, activeRoomId },
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
      setLockedPositions,
    },
    sceneState: {
      classroomScene,
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
    classState: {
      classSummaries,
      activeClass,
      setClassSummaries,
      setActiveClass,
    },
  } = seatingState;

  const {
    saveSeatingPlan,
    loadSeatingPlan,
    deleteSeatingPlan,
    releaseOpenPlan,
    restoreOpenPlan,
    duplicateSeatingPlan,
    renameSeatingPlan,
    saveTemplate,
    updateTemplate,
    loadTemplate,
    deleteTemplate,
    renameTemplate,
    downloadStudentsCsv,
    exportAllAsJson,
    importAllFromJson: importAllFromJsonBase,
    clearAllData,
    reloadCurrentClassData,
  } = persistence;

  const { generateSeatingPlan: generateSeatingPlanBase } = algorithm;

  const handleSeatingModeChange = useCallback(
    (mode: 'table' | 'circle') => {
      setSeatingMode(mode);
    },
    [setSeatingMode],
  );

  // Undo/redo for seating actions. Every action below that rewrites who sits
  // where records a snapshot first; the layout editor has its own history
  // (useSceneHistory) for the room itself.
  // The snapshot as the class is now: a student renamed or deleted since the
  // step was recorded sits there as they are, or not at all (the circle
  // follows the list on its own, `useCircleSeating`).
  const applySeatingSnapshot = useCallback(
    (snapshot: SeatingSnapshot) => {
      const seating = syncSeatingWithStudents(snapshot.seating, getStudents());
      setCurrentSeating(seating);
      setLockedPositions(heldLocks(snapshot.lockedPositions, seating));
      setCircleLayout(snapshot.circleLayout);
    },
    [getStudents, setCurrentSeating, setLockedPositions, setCircleLayout],
  );

  // An undo or redo of the room puts back the tables and the seating, not the
  // locks that removing a table shifted; they follow their students instead.
  const followLockedStudents = useCallback(
    (seating: SeatingArrangement) => {
      setLockedPositions((prev) => locksFollowingStudents(prev, seating));
    },
    [setLockedPositions],
  );

  const {
    recordSnapshot: recordSeatingSnapshot,
    captureSnapshot: captureSeatingSnapshot,
    pushSnapshot: pushSeatingSnapshot,
    undo: undoSeating,
    redo: redoSeating,
    canUndo: canUndoSeating,
    canRedo: canRedoSeating,
    resetHistory: resetSeatingHistory,
  } = useSeatingHistory({
    seating: currentSeating,
    lockedPositions,
    circleLayout,
    applySnapshot: applySeatingSnapshot,
  });

  // Undo/redo for the class list (step 1). Separate from the seating history
  // on purpose — the two are edited in different steps, and a student edit
  // must never take a seating edit down with it.
  const applyStudentSnapshot = useCallback(
    (restored: Student[]) => {
      setStudents(restored);
    },
    [setStudents],
  );

  const {
    record: recordStudentChange,
    recordAsync: recordStudentChangeAsync,
    undo: undoStudents,
    redo: redoStudents,
    canUndo: canUndoStudents,
    canRedo: canRedoStudents,
    resetHistory: resetStudentHistory,
  } = useStudentHistory({
    getStudents,
    applySnapshot: applyStudentSnapshot,
  });

  // Every write to the class list runs as one undo step. The history drops the
  // step again if the write turned out to change nothing.
  const addStudent = useCallback<typeof addStudentBase>(
    (...args) => recordStudentChange(() => addStudentBase(...args)),
    [addStudentBase, recordStudentChange],
  );

  const addBulkPlaceholderStudents = useCallback<
    typeof addBulkPlaceholderStudentsBase
  >(
    (count) => recordStudentChange(() => addBulkPlaceholderStudentsBase(count)),
    [addBulkPlaceholderStudentsBase, recordStudentChange],
  );

  const removeStudent = useCallback(
    (id: string) => recordStudentChange(() => removeStudentBase(id)),
    [removeStudentBase, recordStudentChange],
  );

  const removeStudents = useCallback(
    (ids: string[]) => recordStudentChange(() => removeStudentsBase(ids)),
    [removeStudentsBase, recordStudentChange],
  );

  const updateStudent = useCallback<typeof updateStudentBase>(
    (id, patch) => recordStudentChange(() => updateStudentBase(id, patch)),
    [updateStudentBase, recordStudentChange],
  );

  const updateStudents = useCallback<typeof updateStudentsBase>(
    (ids, patch) => recordStudentChange(() => updateStudentsBase(ids, patch)),
    [updateStudentsBase, recordStudentChange],
  );

  const importCsv = useCallback<typeof importCsvBase>(
    (file, mode) => recordStudentChangeAsync(() => importCsvBase(file, mode)),
    [importCsvBase, recordStudentChangeAsync],
  );

  // Wrap generateSeatingPlan to acknowledge student updates
  const generateSeatingPlan = useCallback(
    async (
      settings: Parameters<typeof generateSeatingPlanBase>[0],
      scene: Parameters<typeof generateSeatingPlanBase>[1],
      run?: Parameters<typeof generateSeatingPlanBase>[2],
    ) => {
      recordSeatingSnapshot();
      const arrangement = await generateSeatingPlanBase(settings, scene, run);
      acknowledgeStudentUpdates();
      return arrangement;
    },
    [generateSeatingPlanBase, acknowledgeStudentUpdates, recordSeatingSnapshot],
  );

  const toggleLockWithHistory = useCallback(
    (studentId: string, table: number, seat: number) => {
      recordSeatingSnapshot();
      toggleLock(studentId, table, seat);
    },
    [toggleLock, recordSeatingSnapshot],
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

  /**
   * Loads the open class anew. `replaced`: what is stored is no longer what
   * this window showed — another window wrote it.
   */
  const applyClassReload = useCallback(
    async (options?: { replaced?: boolean }) => {
      const openBefore = activeClass?.id ?? null;
      setIsClassReloading(true);
      try {
        const snapshot = await reloadCurrentClassData({
          keepOpenClass: !options?.replaced,
        });
        // The same class read back as this window wrote it — another class
        // was created or deleted beside it — keeps its undo steps and what
        // is unsaved in it: nothing in it changed.
        if (!options?.replaced && snapshot.classId === openBefore) {
          return;
        }
        // The undo stacks belong to the class that was open — undoing into
        // another class's seating would write its students into this plan.
        resetSeatingHistory();
        resetStudentHistory();
        syncSeatingSnapshot({
          seating: snapshot.currentSeating,
          circleLayout: snapshot.circleLayout,
          planName: snapshot.planName,
          lockedPositions: snapshot.lockedPositions,
        });
      } finally {
        setIsClassReloading(false);
      }
    },
    [
      activeClass?.id,
      reloadCurrentClassData,
      syncSeatingSnapshot,
      resetSeatingHistory,
      resetStudentHistory,
    ],
  );

  // Another window of the app may have changed the open class while this one
  // was away. Coming back, this one loads it anew, so what it shows and writes
  // next is what is stored; its undo starts afresh, the room and plan views
  // included, as after a restore. What it still had queued is written first.
  useEffect(() => {
    let checking = false;
    const reloadIfChangedElsewhere = () => {
      if (checking || document.visibilityState !== 'visible') {
        return;
      }
      checking = true;
      repository
        .isOpenClassChangedElsewhere()
        .then(async (changed) => {
          if (changed.success && changed.data) {
            await applyClassReload({ replaced: true });
            setReloadGeneration((count) => count + 1);
          }
        })
        .catch((error: unknown) => {
          logError(
            'Failed to load a class another window changed',
            { error },
            'useSeatingGenerator',
          );
        })
        .finally(() => {
          checking = false;
        });
    };
    document.addEventListener('visibilitychange', reloadIfChangedElsewhere);
    window.addEventListener('focus', reloadIfChangedElsewhere);
    return () => {
      document.removeEventListener(
        'visibilitychange',
        reloadIfChangedElsewhere,
      );
      window.removeEventListener('focus', reloadIfChangedElsewhere);
    };
  }, [applyClassReload, repository]);

  const applyClassMetadata = useCallback(
    (record: ClassRecord) => {
      const { name, label, notes, updatedAt } = record;
      setClassSummaries((previous) =>
        previous.map((entry) =>
          entry.id === record.id
            ? { ...entry, name, label, notes, updatedAt }
            : entry,
        ),
      );
      setActiveClass((previous) =>
        previous.id === record.id
          ? { ...previous, name, label, notes }
          : previous,
      );
    },
    [setActiveClass, setClassSummaries],
  );

  // Class management
  const { selectClass, createClass, updateClassMetadata, deleteClass } =
    useClassManagement({
      repository,
      classSummaries,
      activeClass,
      hasPendingStudentUpdates,
      hasUnsavedSeatingChanges,
      applyClassReload,
      applyClassMetadata,
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
    updateStudentPosition: updateStudentPositionBase,
    swapStudentPositions: swapStudentPositionsBase,
    batchSwapStudentPositions: batchSwapStudentPositionsBase,
    toggleCircleLock: toggleCircleLockBase,
    clearCircleLayout: clearCircleLayoutBase,
    syncCircleFromTable,
    cancelCircleGeneration,
  } = circleOrchestration;

  // Circle rearrangements are seating changes too — the same undo covers both
  // views, so a teacher can revert a mis-drop in the circle just like on the
  // table plan. `generateCircleSeating`/`syncCircleFromTable` stay unwrapped:
  // they only derive the circle from a table plan that was itself recorded.
  const updateStudentPosition = useCallback(
    (...args: Parameters<typeof updateStudentPositionBase>) => {
      recordSeatingSnapshot();
      return updateStudentPositionBase(...args);
    },
    [updateStudentPositionBase, recordSeatingSnapshot],
  );

  const swapStudentPositions = useCallback(
    (...args: Parameters<typeof swapStudentPositionsBase>) => {
      recordSeatingSnapshot();
      return swapStudentPositionsBase(...args);
    },
    [swapStudentPositionsBase, recordSeatingSnapshot],
  );

  const batchSwapStudentPositions = useCallback(
    (...args: Parameters<typeof batchSwapStudentPositionsBase>) => {
      recordSeatingSnapshot();
      return batchSwapStudentPositionsBase(...args);
    },
    [batchSwapStudentPositionsBase, recordSeatingSnapshot],
  );

  // A lock decides what the next shuffle may move, so it is undone with the
  // arrangement it protects.
  const toggleCircleLock = useCallback(
    (...args: Parameters<typeof toggleCircleLockBase>) => {
      recordSeatingSnapshot();
      return toggleCircleLockBase(...args);
    },
    [toggleCircleLockBase, recordSeatingSnapshot],
  );

  const clearCircleLayout = useCallback(
    (...args: Parameters<typeof clearCircleLayoutBase>) => {
      recordSeatingSnapshot();
      return clearCircleLayoutBase(...args);
    },
    [clearCircleLayoutBase, recordSeatingSnapshot],
  );

  // Wizard orchestration (step navigation, auto-mix)
  const openPlanIsAutoSave = useMemo(() => {
    const open = activePlanId
      ? seatingHistory.find((plan) => plan.id === activePlanId)
      : undefined;
    return open?.autoSaved === true && open.name === planName.trim();
  }, [activePlanId, seatingHistory, planName]);

  const wizardOrchestration = useGeneratorWizardOrchestration({
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
    handleMix,
    setShouldRegenerateCircle,
  } = wizardOrchestration;

  // The rooms of the open class: opening one, a new one, a template as one.
  const {
    switchRoom,
    openRoom,
    createRoom,
    addRoom,
    createRoomFromTemplate,
    renameRoom,
    deleteRoom,
    movePlanToRoom,
  } = useRoomManagement({
    seatingState,
    resetSeatingHistory,
    syncSeatingSnapshot,
    markClassroomSceneSynced,
    setShouldRegenerateCircle,
  });

  // Rearranging seats by hand is the step teachers take on the plan they mean
  // to use, so it feeds the usage record — see `usePlanUsageTracking`.
  const { noteSeatingEdited } = usePlanUsageTracking({
    classId: activeClass.id,
    currentSeating,
  });

  // Enhanced student move handler that triggers circle regeneration
  const handleStudentMove = useCallback(
    (fromTable: number, fromSeat: number, toTable: number, toSeat: number) => {
      // A drop onto a locked seat is rejected — capture first, but only turn
      // it into an undo step once the swap actually happened.
      const before = captureSeatingSnapshot();
      const moved = moveStudent(fromTable, fromSeat, toTable, toSeat);
      if (!moved) {
        return false;
      }
      pushSeatingSnapshot(before);
      noteSeatingEdited();
      if (circleLayout) {
        setShouldRegenerateCircle(true);
      }
      return moved;
    },
    [
      moveStudent,
      circleLayout,
      noteSeatingEdited,
      setShouldRegenerateCircle,
      captureSeatingSnapshot,
      pushSeatingSnapshot,
    ],
  );

  // A restore that replaces everything puts the backup where the open class
  // was, as a class switch does: the open class is loaded as replaced, so the
  // undo steps from before it go — they would write the old list and plan into
  // the restored class — the room and plan views start afresh with theirs
  // (`reloadGeneration`), and the restored plan reads as saved, even when the
  // backup holds the very class that was open. A merge leaves the open class
  // as it is, and its history with it.
  const importAllFromJson = useCallback<typeof importAllFromJsonBase>(
    async (json, options) => {
      const outcome = await importAllFromJsonBase(json, options);
      if (!outcome.merge) {
        await applyClassReload({ replaced: true });
        setReloadGeneration((count) => count + 1);
      }
      return outcome;
    },
    [applyClassReload, importAllFromJsonBase],
  );

  // Backup orchestration (import/export)
  const backupOrchestration = useGeneratorBackupOrchestration({
    exportAllAsJson,
    importAllFromJson,
  });

  const {
    importInputRef,
    triggerImport,
    handleExportAll,
    handleImportFile,
    importBackupFile,
  } = backupOrchestration;

  // Auto-update statistics when seating changes
  useSeatingStatisticsUpdater({
    currentSeating,
    students,
    mixSettings,
    seatingHistory,
    planUsage,
    planUsageSince,
    planUsageManual,
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
      hasPlan: hasPlanForScene(classroomScene, currentSeating),
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
      setLockedPositions,
      setMixSettings,
      markClassroomSynced: markClassroomSceneSynced,
      syncSeatingSnapshot,
      recordSeatingSnapshot,
      classroomScene,
      students,
      rooms,
      activeRoomId,
      seatingHistory,
      switchRoom,
    });

  // Aggregate state for consumers
  const generatorState = useMemo(
    () => ({
      students,
      classroomScene,
      currentSeating,
      mixSettings,
      step,
      classroomEdited,
      hasUnsavedSeatingChanges,
      planName,
      activePlanId,
      lockedPositions,
      rooms,
      activeRoomId,
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
      planUsage,
      planUsageSince,
      planUsageManual,
      canUndoSeating,
      canRedoSeating,
      canUndoStudents,
      canRedoStudents,
      reloadGeneration,
    }),
    [
      students,
      classroomScene,
      currentSeating,
      mixSettings,
      step,
      classroomEdited,
      hasUnsavedSeatingChanges,
      planName,
      activePlanId,
      lockedPositions,
      rooms,
      activeRoomId,
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
      planUsage,
      planUsageSince,
      planUsageManual,
      canUndoSeating,
      canRedoSeating,
      canUndoStudents,
      canRedoStudents,
      reloadGeneration,
    ],
  );

  // Aggregate actions for consumers
  const actions = useMemo(
    () => ({
      handleStepChange,
      addStudent,
      addBulkPlaceholderStudents,
      removeStudent,
      removeStudents,
      clearStudents,
      updateStudent,
      updateStudents,
      setStudents,
      importCsv,
      undoStudents,
      redoStudents,
      downloadStudentsCsv,
      updateClassroomScene,
      removeTables,
      generateSeatingPlan,
      moveStudent: handleStudentMove,
      onMix: handleMix,
      undoSeating,
      redoSeating,
      setPlanName,
      setPlanNameError,
      handleSaveSeatingPlan,
      isSeatLocked,
      toggleLock: toggleLockWithHistory,
      saveTemplate,
      updateTemplate,
      loadTemplate,
      deleteTemplate,
      renameTemplate,
      handleHistoryLoad,
      deleteSeatingPlan,
      releaseOpenPlan,
      restoreOpenPlan,
      renameSeatingPlan,
      openRoom,
      createRoom,
      addRoom,
      duplicateSeatingPlan,
      createRoomFromTemplate,
      renameRoom,
      deleteRoom,
      movePlanToRoom,
      handleMixLoad,
      deleteMixResult,
      setMixSettings,
      setCurrentSeating,
      followLockedStudents,
      importInputRef,
      triggerImport,
      handleExportAll,
      handleImportFile,
      importBackupFile,
      clearAllData,
      generateCircleSeating,
      regenerateCircle,
      updateStudentPosition,
      swapStudentPositions,
      batchSwapStudentPositions,
      toggleCircleLock,
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
      deleteClass,
    }),
    [
      handleStepChange,
      addStudent,
      addBulkPlaceholderStudents,
      removeStudent,
      removeStudents,
      clearStudents,
      updateStudent,
      updateStudents,
      setStudents,
      importCsv,
      undoStudents,
      redoStudents,
      downloadStudentsCsv,
      updateClassroomScene,
      removeTables,
      generateSeatingPlan,
      handleStudentMove,
      handleMix,
      undoSeating,
      redoSeating,
      setPlanName,
      setPlanNameError,
      handleSaveSeatingPlan,
      isSeatLocked,
      toggleLockWithHistory,
      saveTemplate,
      updateTemplate,
      loadTemplate,
      deleteTemplate,
      renameTemplate,
      handleHistoryLoad,
      deleteSeatingPlan,
      releaseOpenPlan,
      restoreOpenPlan,
      renameSeatingPlan,
      openRoom,
      createRoom,
      addRoom,
      duplicateSeatingPlan,
      createRoomFromTemplate,
      renameRoom,
      deleteRoom,
      movePlanToRoom,
      handleMixLoad,
      deleteMixResult,
      setMixSettings,
      setCurrentSeating,
      followLockedStudents,
      importInputRef,
      triggerImport,
      handleExportAll,
      handleImportFile,
      importBackupFile,
      clearAllData,
      generateCircleSeating,
      regenerateCircle,
      updateStudentPosition,
      swapStudentPositions,
      batchSwapStudentPositions,
      toggleCircleLock,
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

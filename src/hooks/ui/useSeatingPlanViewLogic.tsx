// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/* eslint-disable react-hooks/refs -- refs are used as stable references to avoid re-renders in template/selection management */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { buildFeatureTemplateMap } from '@/hooks/canvas/featureTemplates';
import type { SeatingArrangement } from '@/types';
import {
  CLASSROOM_WIDTH,
  CLASSROOM_HEIGHT,
  BOARD_WIDTH,
  hasSeatedStudent,
  hasShapeMismatch,
  createClientToSceneConverter,
  syncSeatingWithStudents,
  type AlignmentGuide,
} from '@/utils';
import useTableSelection from '@/hooks/useTableSelection';
import useFeatureSelection from '@/hooks/useFeatureSelection';
import useTableInteraction from '@/hooks/useTableInteraction';
import useTemplateManager from '@/hooks/template/useTemplateManager';
import { useSeatingMixHandler } from '@/hooks/useSeatingMixHandler';
import { useClassroomSetup } from '@/hooks/classroom/useClassroomSetup';
import LayoutEditorView from '@/components/SeatingPlanGenerator/LayoutEditorView';
import SeatingPlanEditorView from '@/components/SeatingPlanGenerator/SeatingPlanEditorView';
import { useCanvasPreferences } from '@/contexts/seatingPlan/CanvasPreferencesContext';
import { useOptionalSeatingPlanActions } from '@/contexts/SeatingPlanContext';
import { useSceneHistory } from '@/hooks/scene/useSceneHistory';
import { useSceneManager } from '@/hooks/scene/useSceneManager';
import { useContextMenuIntegration } from '@/hooks/ui/useContextMenuIntegration';
import { useFeatureVisibility } from '@/hooks/ui/useFeatureVisibility';
import { useDragDropState } from '@/hooks/ui/useDragDropState';
import { type LayoutEditorSectionProps } from '@/components/SeatingPlanGenerator/views/SeatingPlanViewContent';
import type {
  CanvasInteractionLayerProps,
  CanvasInteractionHandlers,
} from '@/components/SeatingPlanGenerator/canvas/CanvasInteractionLayer';
import type { SeatingPlanViewProps } from '@/components/SeatingPlanGenerator/seatingPlanView.types';

export type { SeatingPlanViewProps };

export function useSeatingPlanViewLogic({
  currentSeating,
  generateSeatingPlan,
  settings,
  setMixSettings,
  classroomScene,
  students,
  studentsCount,
  planName,
  saveSeatingPlan,
  updateClassroomScene,
  moveStudent,
  removeTables,
  isSeatLocked,
  toggleLock,
  onMix,
  step,
  seatingMode,
  onModeChange,
  showModeToggle,
  lastStatistics,
  onCloseStatistics,
  onOpenStatistics,
  showStatisticsBadge,
  hasPendingStudentUpdates,
  onAcknowledgeStudentUpdates,
  statisticsHighlight,
  setStatisticsHighlight,
  setStatisticsHighlightMode,
  clearStatisticsHighlight,
  seatingHistory,
  planUsage,
  planUsageSince = null,
  planUsageManual = false,
  autoMixing = false,
  autoMixError = null,
}: SeatingPlanViewProps) {
  const { t } = useTranslation('generator');

  const seatingPlanActions = useOptionalSeatingPlanActions();

  const noopSetCurrentSeating = React.useCallback<
    React.Dispatch<React.SetStateAction<SeatingArrangement>>
  >(() => undefined, []);
  const setCurrentSeatingDispatch =
    seatingPlanActions?.setCurrentSeating ?? noopSetCurrentSeating;

  // Scene Management
  const {
    sceneTables,
    sceneFeatures,
    setSceneFeatures,
    commitScene,
    getCommittedSceneState,
    updateSceneTables,
    runSceneTransaction,
  } = useSceneManager({
    classroomScene,
    currentSeating,
    updateClassroomScene,
    setCurrentSeating: setCurrentSeatingDispatch,
  });

  const {
    selectedTables: selectedTableIds,
    setSelectedTables: setSelectedTableIds,
    toggleSelect,
    clearSelection: clearTableSelection,
  } = useTableSelection(sceneTables);

  const {
    selectedFeatureIds,
    setSelectedFeatureIds,
    toggleFeatureSelect,
    clearFeatureSelection,
  } = useFeatureSelection();

  // Unified selection covers both tables and features simultaneously, so
  // clearing (e.g. clicking empty canvas or starting a box selection) resets
  // both id-spaces at once.
  const clearSelection = React.useCallback(() => {
    clearTableSelection();
    clearFeatureSelection();
  }, [clearTableSelection, clearFeatureSelection]);

  const {
    featureVisibility,
    setFeatureVisible,
    setAllFeatureVisibility,
    getFeatureVisibility,
  } = useFeatureVisibility();

  // Scene History Management. A step of the room brings back the seating as
  // it was then; it goes on screen as the class is now — a student renamed
  // since under the new name, one deleted not at all — and the locks follow
  // their students, since removing a table shifted them and its undo does not.
  const runRestoreTransaction = React.useCallback<typeof runSceneTransaction>(
    (mutator, options) =>
      runSceneTransaction((state) => {
        const result = mutator(state);
        return result?.seating
          ? {
              ...result,
              seating: syncSeatingWithStudents(result.seating, students),
            }
          : result;
      }, options),
    [runSceneTransaction, students],
  );

  const {
    history,
    snapshot,
    undo: undoScene,
    redo: redoScene,
    canRedo,
  } = useSceneHistory({
    getCommittedSceneState,
    runSceneTransaction: runRestoreTransaction,
    getFeatureVisibility,
    setAllFeatureVisibility,
    setSelectedTableIds,
    setSelectedFeatureIds,
  });

  const followLockedStudents = seatingPlanActions?.followLockedStudents;
  const undo = React.useCallback(() => {
    undoScene();
    followLockedStudents?.(getCommittedSceneState().seating);
  }, [undoScene, followLockedStudents, getCommittedSceneState]);
  const redo = React.useCallback(() => {
    redoScene();
    followLockedStudents?.(getCommittedSceneState().seating);
  }, [redoScene, followLockedStudents, getCommittedSceneState]);

  // The canvas view toggles live in their own context, so the editor views read
  // them where they use them instead of taking eight props for four booleans.
  // Photos, names and badges come from there too: the table plan and the
  // circle show the class the same way.
  const {
    snapToGrid,
    showAlignmentGuides,
    photoDisplayMode,
    setPhotoDisplayMode,
    nameDisplay,
    setNameDisplay,
    badgeDisplay,
    setBadgeDisplay,
    badgeHover,
    setBadgeHover,
  } = useCanvasPreferences();
  // Guides of the drag currently in progress; null while nothing is dragged.
  const [activeAlignmentGuides, setActiveAlignmentGuides] = React.useState<
    AlignmentGuide[] | null
  >(null);
  const canvasRef = React.useRef<SVGSVGElement | null>(null);

  // Context Menu Integration
  const {
    registerTableContextMenuSetter,
    registerCanvasContextMenuSetter,
    registerFeatureContextMenuSetter,
    closeTableContextMenu,
    closeCanvasContextMenu,
    closeFeatureContextMenu,
    openTableContextMenu,
    openCanvasContextMenu,
  } = useContextMenuIntegration();

  const classroomWidth = CLASSROOM_WIDTH;
  const classroomHeight = CLASSROOM_HEIGHT;
  const canvasWidth = Math.max(classroomWidth, BOARD_WIDTH); // Ensure the board fits horizontally

  // Shared feature template map (geometry/labels) reused by the sidebar palette
  // and the unified copy/paste feature operations.
  const featureTemplateMap = React.useMemo(
    () => buildFeatureTemplateMap(t),
    [t],
  );

  const toSceneCoordinates = React.useMemo(
    () =>
      createClientToSceneConverter({
        sceneWidth: canvasWidth,
        sceneHeight: classroomHeight,
      }),
    [canvasWidth, classroomHeight],
  );

  const {
    templates,
    selectedTemplateId,
    setSelectedTemplateId,
    handleSaveTemplate,
    handleDeleteTemplate,
    handleRenameTemplate,
  } = useTemplateManager(classroomScene);

  // Builds the room from one kind of table or from a template
  const { handleTemplateChange, handleTypeChange } = useClassroomSetup({
    students,
    templates,
    classroomScene,
    setClassroomScene: updateClassroomScene,
    selectedTemplate: selectedTemplateId,
    disableAutoGeneration: true, // Manual control only
  });

  // Wrapper for template change to sync both states
  const handleTemplateChangeWrapper = React.useCallback(
    (templateId: number | null) => {
      setSelectedTemplateId(templateId);
      handleTemplateChange(templateId);
    },
    [setSelectedTemplateId, handleTemplateChange],
  );

  // A template is a room of its own (decision 0024): it opens as a new room
  // of the class, and this view starts afresh for it.
  const createRoomFromTemplate = seatingPlanActions?.createRoomFromTemplate;
  const handleLoadTemplateAsRoom = React.useCallback(
    (templateId: number) => {
      const template = templates.find((entry) => entry.id === templateId);
      if (template) createRoomFromTemplate?.(template);
    },
    [templates, createRoomFromTemplate],
  );

  // Drag & Drop State Management
  const {
    dragPreview,
    dragOrigin,
    dragHover,
    lockedDropTarget,
    handleSeatDragStart,
    handleSeatDrag,
    handleSeatDragEnd,
    handleSeatHoverChange,
    handleLockedDrop,
  } = useDragDropState();
  const {
    startTemplateDrag,
    addTemplate,
    startTablePointerDrag,
    templateDragPreview,
    initializeDragFromSelection,
    updateDragSelection,
    finalizeDragInteraction,
    releaseTablePointerCapture,
    cancelSelectionInteraction,
  } = useTableInteraction({
    sceneTables,
    sceneFeatures,
    selectedFeatureIds,
    setSceneFeatures,
    updateSceneTables,
    runSceneTransaction,
    snapshot,
    commitScene,
    setSelectedTableIds,
    snapToGrid,
    classroomWidth,
    classroomHeight,
    canvasWidth,
    canvasRef,
    alignmentGuidesEnabled: showAlignmentGuides,
    setActiveAlignmentGuides,
    featureVisibility,
  });

  // Generate placeholder seating and empty seating arrays for rendering
  const placeholderSeating: SeatingArrangement = React.useMemo(
    () =>
      sceneTables.map((t, tableIdx) =>
        Array.from({ length: t.seatCount }, (_, seatIdx) => ({
          id: `p-${tableIdx}-${seatIdx}`,
          name: String(seatIdx + 1),
          gender: (['boy', 'girl', 'diverse'] as const)[seatIdx % 3],
          restless: false,
          shy: false,
          concentrationIssues: false,
          needsFrontSeat: false,
        })),
      ),
    [sceneTables],
  );

  const emptySeating: SeatingArrangement = React.useMemo(
    () => sceneTables.map((t) => Array(t.seatCount).fill(null)),
    [sceneTables],
  );

  const { handleMix, isMixing } = useSeatingMixHandler({
    settings,
    students,
    classroomScene,
    generateSeatingPlan,
    onMix,
  });
  const mixingInProgress = isMixing || autoMixing;

  const sceneForCheck = React.useMemo(
    () => ({ ...classroomScene, tables: sceneTables }),
    [classroomScene, sceneTables],
  );

  const sceneSignature = React.useMemo(() => {
    const tableSignature = sceneTables.map(
      ({ x, y, width, height, seatCount, templateType, rotation, locked }) => ({
        x: Math.round(x),
        y: Math.round(y),
        width,
        height,
        seatCount,
        templateType,
        rotation,
        locked,
      }),
    );

    const featureSignature = (classroomScene.features ?? []).map(
      ({ id, type, x, y, width, height }) => ({
        id,
        type,
        x: Math.round(x),
        y: Math.round(y),
        width,
        height,
      }),
    );

    return JSON.stringify({
      tables: tableSignature,
      features: featureSignature,
    });
  }, [sceneTables, classroomScene.features]);

  // The canvas draws the arrangement only where it fits the tables on it: one
  // made for other tables would put its seats beside the tables and on top of
  // each other, so they stand empty until it is mixed again.
  const seatingFitsCanvas = !hasShapeMismatch(sceneForCheck, currentSeating);
  // Stale only when it fits neither the canvas nor the scene itself: the
  // canvas takes the scene's tables an effect later, so a plan opened with
  // other tables — scene and seating arriving together — would otherwise
  // read as stale for one render and be mixed over.
  const seatingStale =
    !seatingFitsCanvas && hasShapeMismatch(classroomScene, currentSeating);

  const lastAutoMixSceneRef = React.useRef<string | null>(null);
  // Bumped when an automatic mix was aborted, so the effect below tries again.
  const [autoMixRetry, setAutoMixRetry] = React.useState(0);

  const canAutoMixNow = React.useMemo(() => {
    if (step !== 3 || mixingInProgress) {
      return false;
    }
    if (students.length === 0 || sceneTables.length === 0) {
      return false;
    }
    if (!seatingStale) {
      return false;
    }
    if (students.some((student) => !student.gender)) {
      return false;
    }
    return true;
  }, [step, mixingInProgress, students, sceneTables.length, seatingStale]);

  const willAutoMixThisRender =
    canAutoMixNow && lastAutoMixSceneRef.current !== sceneSignature;

  const shouldShowPendingStudentUpdates =
    hasPendingStudentUpdates && !mixingInProgress && !willAutoMixThisRender;

  React.useEffect(() => {
    if (!canAutoMixNow) {
      return;
    }

    if (lastAutoMixSceneRef.current === sceneSignature) {
      return;
    }

    lastAutoMixSceneRef.current = sceneSignature;
    void handleMix().then((outcome) => {
      // An aborted run mixed nothing — the view was taken down under it, or
      // React's StrictMode tried the effect twice, whose second run found the
      // scene already noted and left the old arrangement on the new tables.
      // Forget the scene so this or the next mount tries again. A failed run
      // stays noted: its toast says so, and "Mischen" tries again.
      if (
        outcome === 'aborted' &&
        lastAutoMixSceneRef.current === sceneSignature
      ) {
        lastAutoMixSceneRef.current = null;
        setAutoMixRetry((count) => count + 1);
      }
    });
  }, [canAutoMixNow, sceneSignature, handleMix, autoMixRetry]);

  // Layout Editor Props Construction
  let layoutEditorSection: LayoutEditorSectionProps | null = null;
  if (step === 2) {
    const canvasProps: Omit<CanvasInteractionLayerProps, 'children'> = {
      classroomHeight,
      classroomWidth,
      canvasWidth,
      sceneTables,
      sceneFeatures,
      selectedTableIds,
      selectedFeatureIds,
      classroomScene,
      snapToGrid,
      studentsCount,
      featureTemplateMap,
      setFeatureVisible,
      setSelectedTableIds,
      setSelectedFeatureIds,
      updateClassroomScene,
      removeTables,
      runSceneTransaction,
      snapshot,
      openTableContextMenu,
      openCanvasContextMenu,
      closeTableContextMenu,
      closeCanvasContextMenu,
      clearSelection,
      startTablePointerDrag,
      releaseTablePointerCapture,
      cancelSelectionInteraction,
      initializeDragFromSelection,
      updateDragSelection,
      finalizeDragInteraction,
      toggleSelect,
      toSceneCoordinates,
    };

    const renderLayoutEditor = (
      handlers: CanvasInteractionHandlers,
    ): React.ReactNode => (
      <LayoutEditorView
        canvasHandlers={handlers}
        alignmentGuides={activeAlignmentGuides}
        setActiveAlignmentGuides={setActiveAlignmentGuides}
        featureVisibility={featureVisibility}
        setFeatureVisible={setFeatureVisible}
        undo={undo}
        redo={redo}
        canRedo={canRedo}
        historyLength={history.length}
        students={students}
        templates={templates}
        handleSaveTemplate={handleSaveTemplate}
        handleDeleteTemplate={handleDeleteTemplate}
        handleRenameTemplate={handleRenameTemplate}
        canvasWidth={canvasWidth}
        classroomHeight={classroomHeight}
        sceneTables={sceneTables}
        sceneFeatures={sceneFeatures}
        setSceneFeatures={setSceneFeatures}
        updateSceneTables={updateSceneTables}
        runSceneTransaction={runSceneTransaction}
        selectedTableIds={selectedTableIds}
        setSelectedTableIds={setSelectedTableIds}
        selectedFeatureIds={selectedFeatureIds}
        setSelectedFeatureIds={setSelectedFeatureIds}
        toggleFeatureSelect={toggleFeatureSelect}
        clearFeatureSelection={clearFeatureSelection}
        featureTemplateMap={featureTemplateMap}
        onTemplatePointerDown={startTemplateDrag}
        onTemplateAdd={addTemplate}
        canvasRef={canvasRef}
        templateDragPreview={templateDragPreview}
        placeholderSeating={placeholderSeating}
        onTableUpdate={commitScene}
        snapshot={snapshot}
        onCloseTableContextMenu={closeTableContextMenu}
        onTableContextMenuSetterChange={registerTableContextMenuSetter}
        onCloseCanvasContextMenu={closeCanvasContextMenu}
        onCanvasContextMenuSetterChange={registerCanvasContextMenuSetter}
        onCloseFeatureContextMenu={closeFeatureContextMenu}
        onFeatureContextMenuSetterChange={registerFeatureContextMenuSetter}
        onTableTypeChange={handleTypeChange}
        onTemplateChange={handleTemplateChangeWrapper}
        onLoadTemplateAsRoom={handleLoadTemplateAsRoom}
        onRoomReplaced={seatingPlanActions?.releaseOpenPlan}
      />
    );

    layoutEditorSection = {
      canvasProps,
      renderLayoutEditor,
    };
  }

  const seatingEditorProps =
    step !== 2
      ? ({
          settings,
          setMixSettings,
          handleMix,
          isMixing,
          autoMixing,
          autoMixError,
          featureVisibility,
          setFeatureVisible,
          canvasWidth,
          classroomHeight,
          photoDisplayMode,
          setPhotoDisplayMode,
          nameDisplay,
          setNameDisplay,
          badgeDisplay,
          setBadgeDisplay,
          badgeHover,
          setBadgeHover,
          sceneTables,
          currentSeating: seatingFitsCanvas ? currentSeating : emptySeating,
          seatingStale: seatingStale && hasSeatedStudent(currentSeating),
          students,
          emptySeating,
          moveStudent,
          isSeatLocked,
          toggleLock,
          handleSeatDragStart,
          handleSeatDrag,
          handleSeatDragEnd,
          dragOrigin,
          dragHover,
          lockedDropTarget,
          handleSeatHoverChange,
          handleLockedDrop,
          dragPreview,
          planName,
          saveSeatingPlan,
          classroomScene,
          seatingMode,
          onModeChange,
          showModeToggle,
          lastStatistics,
          onCloseStatistics,
          onOpenStatistics,
          showStatisticsBadge,
          templateDragPreview,
          hasPendingStudentUpdates: shouldShowPendingStudentUpdates,
          onAcknowledgeStudentUpdates,
          statisticsHighlight,
          setStatisticsHighlight,
          setStatisticsHighlightMode,
          clearStatisticsHighlight,
          seatingHistory,
          planUsage,
          planUsageSince,
          planUsageManual,
        } satisfies React.ComponentProps<typeof SeatingPlanEditorView>)
      : null;

  return {
    layoutEditorSection,
    seatingEditorProps,
  };
}

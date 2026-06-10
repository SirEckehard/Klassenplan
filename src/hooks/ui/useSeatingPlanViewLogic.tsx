// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/* eslint-disable react-hooks/refs -- refs are used as stable references to avoid re-renders in template/selection management */
import React from 'react';
import { useLocalizedNavigate } from '@/hooks/useLocalizedNavigate';
import type {
  SeatingArrangement,
  ClassroomScene,
  PhotoDisplayMode,
} from '@/types';
import {
  CLASSROOM_WIDTH,
  CLASSROOM_HEIGHT,
  BOARD_WIDTH,
  hasShapeMismatch,
  createClientToSceneConverter,
} from '@/utils';
import useTableSelection from '@/hooks/useTableSelection';
import usePersistentState from '@/hooks/usePersistentState';
import useTableInteraction from '@/hooks/useTableInteraction';
import { countSeats } from '@/utils/math/scene';
import useTemplateManager from '@/hooks/template/useTemplateManager';
import { useSeatingMixHandler } from '@/hooks/useSeatingMixHandler';
import { useClassroomSetup } from '@/hooks/classroom/useClassroomSetup';
import LayoutEditorView from '@/components/SeatingPlanGenerator/LayoutEditorView';
import SeatingPlanEditorView from '@/components/SeatingPlanGenerator/SeatingPlanEditorView';
import SaveTemplateModal from '@/components/ui/modals/SaveTemplateModal';
import { LOCAL_STORAGE_KEYS } from '@/utils/data/storageKeys';
import {
  useOptionalSeatingPlanActions,
  useOptionalSeatingPlanState,
} from '@/contexts/SeatingPlanContext';
import { useSceneHistory } from '@/hooks/scene/useSceneHistory';
import { useSceneManager } from '@/hooks/scene/useSceneManager';
import { useContextMenuIntegration } from '@/hooks/ui/useContextMenuIntegration';
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
  setPlanName,
  saveSeatingPlan,
  planNameError,
  setPlanNameError,
  planNameInputRef,
  updateClassroomScene,
  moveStudent,
  removeTables,
  isSeatLocked,
  toggleLock,
  onMix,
  refineSeatingLocal,
  onEditStudents,
  onEditLayout,
  onProceedToPlan,
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
  mixHistory,
  autoMixing = false,
  autoMixError = null,
}: SeatingPlanViewProps) {
  const navigate = useLocalizedNavigate();

  const seatingPlanState = useOptionalSeatingPlanState();
  const seatingPlanActions = useOptionalSeatingPlanActions();
  const circleLayout = seatingPlanState?.circleLayout ?? null; // Gracefully handle missing provider

  const noopSetCurrentSeating = React.useCallback<
    React.Dispatch<React.SetStateAction<SeatingArrangement>>
  >(() => undefined, []);
  const setCurrentSeatingDispatch =
    seatingPlanActions?.setCurrentSeating ?? noopSetCurrentSeating;

  // Scene Management
  const {
    sceneTables,
    setSceneTables,
    sceneFeatures,
    setSceneFeatures,
    commitScene,
    updateSceneTables,
    runSceneTransaction,
  } = useSceneManager({
    classroomScene,
    currentSeating,
    updateClassroomScene,
    setCurrentSeating: setCurrentSeatingDispatch,
  });
  const seatCount = countSeats(sceneTables);

  const {
    selectedTables: selectedTableIds,
    setSelectedTables: setSelectedTableIds,
    toggleSelect,
    clearSelection,
  } = useTableSelection(sceneTables);

  // Scene History Management
  const { history, snapshot, undo } = useSceneHistory({
    classroomScene,
    currentSeating,
    updateClassroomScene,
    setCurrentSeating: setCurrentSeatingDispatch,
    setSceneTables,
    setSceneFeatures,
    setSelectedTableIds,
  });

  const [snapToGrid, setSnapToGrid] = React.useState(true); // Toggle to snap table positions to the grid
  const [showGrid, setShowGrid] = usePersistentState<boolean>(
    LOCAL_STORAGE_KEYS.showGrid,
    true,
  ); // Toggle to show grid lines
  const [showBoard, setShowBoard] = usePersistentState<boolean>(
    LOCAL_STORAGE_KEYS.showBoard,
    true,
  ); // Toggle to show board
  const [photoDisplayMode, setPhotoDisplayMode] =
    usePersistentState<PhotoDisplayMode>(
      LOCAL_STORAGE_KEYS.photoDisplayMode,
      'hover',
    ); // How student photos grow on the seat dots (all / hover / off)
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
  const [showWindows, setShowWindows] = usePersistentState<boolean>(
    LOCAL_STORAGE_KEYS.showWindows,
    true,
  );
  const [showDoor, setShowDoor] = usePersistentState<boolean>(
    LOCAL_STORAGE_KEYS.showDoor,
    true,
  );
  const [showPodium, setShowPodium] = usePersistentState<boolean>(
    LOCAL_STORAGE_KEYS.showPodium,
    true,
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
    isSaveModalOpen,
    openSaveModal,
    closeSaveModal,
  } = useTemplateManager(classroomScene, updateClassroomScene);

  // Classroom Setup Hook (moved from StudentInput)
  const { currentType, handleTemplateChange, handleTypeChange } =
    useClassroomSetup({
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

  // Handler for quick overwrite in ClassroomQuickSetup
  const handleOverwriteTemplate = React.useCallback(
    (templateId: number) => {
      const template = templates.find((t) => t.id === templateId);
      if (template) {
        handleSaveTemplate(template.name, templateId);
      }
    },
    [templates, handleSaveTemplate],
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
    startTablePointerDrag,
    templateDragPreview,
    initializeDragFromSelection,
    updateDragSelection,
    finalizeDragInteraction,
    releaseTablePointerCapture,
    cancelSelectionInteraction,
  } = useTableInteraction({
    sceneTables,
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
    refineSeatingLocal,
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

  const lastAutoMixSceneRef = React.useRef<string | null>(null);

  const canAutoMixNow = React.useMemo(() => {
    if (step !== 3 || mixingInProgress) {
      return false;
    }
    if (students.length === 0 || sceneTables.length === 0) {
      return false;
    }
    if (!hasShapeMismatch(sceneForCheck, currentSeating)) {
      return false;
    }
    if (students.some((student) => !student.gender)) {
      return false;
    }
    return true;
  }, [
    step,
    mixingInProgress,
    students,
    sceneTables.length,
    sceneForCheck,
    currentSeating,
  ]);

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
    void handleMix();
  }, [canAutoMixNow, sceneSignature, handleMix]);

  // Wrap saveSeatingPlan to automatically include circleLayout
  const saveSeatingPlanWithCircle = React.useCallback(
    (name: string, scene: ClassroomScene) => {
      saveSeatingPlan(name, scene, circleLayout);
    },
    [saveSeatingPlan, circleLayout],
  );

  // Layout Editor Props Construction
  let layoutEditorSection: LayoutEditorSectionProps | null = null;
  if (step === 2) {
    const canvasProps: Omit<CanvasInteractionLayerProps, 'children'> = {
      classroomHeight,
      classroomWidth,
      sceneTables,
      selectedTableIds,
      classroomScene,
      snapToGrid,
      studentsCount,
      setSelectedTableIds,
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
        snapToGrid={snapToGrid}
        setSnapToGrid={setSnapToGrid}
        showGrid={showGrid}
        setShowGrid={setShowGrid}
        showBoard={showBoard}
        setShowBoard={setShowBoard}
        showWindows={showWindows}
        setShowWindows={setShowWindows}
        showDoor={showDoor}
        setShowDoor={setShowDoor}
        showPodium={showPodium}
        setShowPodium={setShowPodium}
        undo={undo}
        historyLength={history.length}
        studentsCount={studentsCount}
        students={students}
        seatCount={seatCount}
        templates={templates}
        selectedTemplateId={selectedTemplateId}
        handleSaveTemplate={openSaveModal}
        handleDeleteTemplate={handleDeleteTemplate}
        handleRenameTemplate={handleRenameTemplate}
        handleOverwriteTemplate={handleOverwriteTemplate}
        canvasWidth={canvasWidth}
        classroomHeight={classroomHeight}
        sceneTables={sceneTables}
        sceneFeatures={sceneFeatures}
        setSceneFeatures={setSceneFeatures}
        runSceneTransaction={runSceneTransaction}
        selectedTableIds={selectedTableIds}
        setSelectedTableIds={setSelectedTableIds}
        onTemplatePointerDown={startTemplateDrag}
        canvasRef={canvasRef}
        templateDragPreview={templateDragPreview}
        placeholderSeating={placeholderSeating}
        onTableUpdate={commitScene}
        snapshot={snapshot}
        onEditStudents={onEditStudents}
        onProceedToPlan={onProceedToPlan}
        onCloseTableContextMenu={closeTableContextMenu}
        onTableContextMenuSetterChange={registerTableContextMenuSetter}
        onCloseCanvasContextMenu={closeCanvasContextMenu}
        onCanvasContextMenuSetterChange={registerCanvasContextMenuSetter}
        onCloseFeatureContextMenu={closeFeatureContextMenu}
        onFeatureContextMenuSetterChange={registerFeatureContextMenuSetter}
        currentTableType={currentType}
        onTableTypeChange={handleTypeChange}
        onTemplateChange={handleTemplateChangeWrapper}
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
          showBoard,
          setShowBoard,
          showWindows,
          setShowWindows,
          showDoor,
          setShowDoor,
          showPodium,
          setShowPodium,
          canvasWidth,
          classroomHeight,
          showGrid,
          setShowGrid,
          photoDisplayMode,
          setPhotoDisplayMode,
          sceneTables,
          currentSeating,
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
          onTableUpdate: commitScene,
          snapshot,
          dragPreview,
          planName,
          setPlanName,
          planNameError,
          setPlanNameError,
          planNameInputRef,
          onEditLayout,
          saveSeatingPlan: saveSeatingPlanWithCircle,
          classroomScene,
          onExport: () => navigate('/export'),
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
          mixHistory,
        } satisfies React.ComponentProps<typeof SeatingPlanEditorView>)
      : null;

  const saveTemplateModalProps: React.ComponentProps<typeof SaveTemplateModal> =
    {
      open: isSaveModalOpen,
      onClose: closeSaveModal,
      onSave: (name, overwriteId) => {
        handleSaveTemplate(name, overwriteId);
        closeSaveModal();
      },
      existingTemplates: templates,
      tableCount: sceneTables.length,
      seatCount,
    };

  return {
    layoutEditorSection,
    seatingEditorProps,
    saveTemplateModalProps,
  };
}

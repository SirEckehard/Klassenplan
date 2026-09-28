// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlignCenterVerticalSimpleIcon,
  ClipboardTextIcon,
  CopyIcon,
  GridNineIcon,
  IntersectIcon,
  MagnetIcon,
  ScissorsIcon,
  TrashIcon,
  LecternIcon,
  LockersIcon,
  DoorIcon,
  PanoramaIcon,
  PresentationIcon,
  ChalkboardSimpleIcon,
  WallIcon,
} from '@phosphor-icons/react';
import ClassroomCanvas from '@/components/SeatingPlanGenerator/canvas/ClassroomCanvas';
import type { CanvasInteractionHandlers } from '@/components/SeatingPlanGenerator/canvas/CanvasInteractionLayer';
import LayoutEditorSidebarSection from '@/components/SeatingPlanGenerator/views/LayoutEditorSidebarSection';
import SceneInspector from '@/components/SeatingPlanGenerator/views/SceneInspector';
import InspectorPortal from '@/components/shell/InspectorPortal';
import LayoutEditorMainSection from '@/components/SeatingPlanGenerator/views/LayoutEditorMainSection';
import type {
  SeatingArrangement,
  ClassroomTable,
  ClassroomTemplate,
  TableTemplateType,
  Student,
  ClassroomFeature,
  ClassroomFeatureType,
} from '@/types';
import type { TemplateDragPreview } from '@/types/templateDrag';
import type {
  TableContextMenuState,
  CanvasContextMenuState,
  FeatureContextMenuState,
} from '@/hooks/useContextMenus';
import { useCanvasContextMenus } from '@/hooks/canvas/useCanvasContextMenus';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useLayoutMode } from '@/hooks/ui/useLayoutMode';
import { isAnyDialogOpen } from '@/hooks/ui/useDialogLayer';
import { useInspector } from '@/contexts/InspectorContext';
import { useCanvasPreferences } from '@/contexts/seatingPlan/CanvasPreferencesContext';
import { useFirstVisit } from '@/hooks/ui/useFirstVisit';
import {
  createClientToSceneConverter,
  showToast,
  type AlignmentGuide,
} from '@/utils';
import { type FeatureVisibilityFlags } from '@/utils/ui';
import {
  buildFeatureVisibilityGroup,
  getFeatureAvailability,
} from '@/components/SeatingPlanGenerator/canvas/featureVisibilityGroup';
import {
  useFeaturePaletteDrag,
  type FeaturePaletteItem,
} from '@/hooks/canvas/useFeaturePaletteDrag';
import { useFeatureResize } from '@/hooks/canvas/useFeatureResize';
import {
  buildFeatureTemplates,
  type FeatureTemplate,
} from '@/hooks/canvas/featureTemplates';
import type { SceneTransactionRunner } from '@/hooks/scene/useSceneManager';
import { useSelectionRotation } from '@/hooks/canvas/useSelectionRotation';
import { useRoomSetup } from '@/hooks/canvas/useRoomSetup';
import { workspaceLayerClass } from '@/components/shell/shellTokens';

type Props = {
  alignmentGuides: AlignmentGuide[] | null;
  setActiveAlignmentGuides: (guides: AlignmentGuide[] | null) => void;
  featureVisibility: FeatureVisibilityFlags;
  setFeatureVisible: (type: ClassroomFeatureType, visible: boolean) => void;
  undo: () => void;
  redo: () => void;
  canRedo: boolean;
  historyLength: number;
  students: Student[];
  templates: ClassroomTemplate[];
  handleSaveTemplate: () => void;
  handleDeleteTemplate: (id?: number) => void;
  handleRenameTemplate: (
    id: number,
    newName: string,
  ) => Promise<{ success: boolean; error?: string }>;
  canvasWidth: number;
  classroomHeight: number;
  sceneTables: ClassroomTable[];
  sceneFeatures: ClassroomFeature[];
  setSceneFeatures: React.Dispatch<React.SetStateAction<ClassroomFeature[]>>;
  updateSceneTables: (
    updateFn: (tables: ClassroomTable[]) => ClassroomTable[],
  ) => void;
  runSceneTransaction: SceneTransactionRunner;
  selectedTableIds: number[];
  setSelectedTableIds: React.Dispatch<React.SetStateAction<number[]>>;
  selectedFeatureIds: string[];
  setSelectedFeatureIds: React.Dispatch<React.SetStateAction<string[]>>;
  toggleFeatureSelect: (id: string, multi?: boolean) => string[];
  clearFeatureSelection: () => void;
  featureTemplateMap: Map<ClassroomFeatureType, FeatureTemplate>;
  canvasHandlers: CanvasInteractionHandlers;
  onTemplatePointerDown: (
    type: TableTemplateType,
    e: React.PointerEvent<Element>,
  ) => void;
  /** Adds one table at the free spot nearest the middle; false when full. */
  onTemplateAdd: (type: TableTemplateType) => boolean;
  canvasRef: React.RefObject<SVGSVGElement | null>;
  templateDragPreview: TemplateDragPreview | null;
  placeholderSeating: SeatingArrangement;
  onTableUpdate: () => void;
  snapshot: () => void;
  onCloseTableContextMenu: () => void;
  onTableContextMenuSetterChange?: (
    setter: React.Dispatch<
      React.SetStateAction<TableContextMenuState | null>
    > | null,
  ) => void;
  onCloseCanvasContextMenu: () => void;
  onCanvasContextMenuSetterChange?: (
    setter: React.Dispatch<
      React.SetStateAction<CanvasContextMenuState | null>
    > | null,
  ) => void;
  onCloseFeatureContextMenu?: () => void;
  onFeatureContextMenuSetterChange?: (
    setter: React.Dispatch<
      React.SetStateAction<FeatureContextMenuState | null>
    > | null,
  ) => void;
  // Setting the room up from one kind of table, or from a template
  onTableTypeChange: (type: TableTemplateType, force?: boolean) => void;
  onTemplateChange: (templateId: number | null) => void;
};

/**
 * The memo has no custom comparator on purpose.
 *
 * It used to carry a hand-written one over 45 props, which had already drifted:
 * `selectedFeatureIds` and nine other props were missing from it, so a changed
 * feature selection would have been swallowed had the comparison ever
 * succeeded. It never did — `canvasHandlers` is rebuilt by
 * `CanvasInteractionLayer` on every render, and the comparator checked it by
 * identity. React's own shallow compare cannot develop that kind of blind spot,
 * and now that the handlers object is memoised it actually skips renders.
 */
const LayoutEditorView = React.memo(function LayoutEditorView({
  alignmentGuides,
  setActiveAlignmentGuides,
  featureVisibility,
  setFeatureVisible,
  undo,
  redo,
  canRedo,
  historyLength,
  students,
  templates,
  handleSaveTemplate,
  handleDeleteTemplate,
  handleRenameTemplate,
  canvasWidth,
  classroomHeight,
  sceneTables,
  sceneFeatures,
  setSceneFeatures,
  updateSceneTables,
  runSceneTransaction,
  selectedTableIds,
  setSelectedTableIds,
  selectedFeatureIds,
  setSelectedFeatureIds,
  toggleFeatureSelect,
  clearFeatureSelection,
  featureTemplateMap,
  canvasHandlers,
  onTemplatePointerDown,
  onTemplateAdd,
  canvasRef,
  templateDragPreview,
  placeholderSeating,
  onTableUpdate,
  snapshot,
  onCloseTableContextMenu,
  onTableContextMenuSetterChange,
  onCloseCanvasContextMenu,
  onCanvasContextMenuSetterChange,
  onCloseFeatureContextMenu,
  onFeatureContextMenuSetterChange,
  onTableTypeChange,
  onTemplateChange,
}: Props) {
  const { t } = useTranslation('generator');
  const {
    snapToGrid,
    setSnapToGrid,
    showGrid,
    setShowGrid,
    showAlignmentGuides,
    setShowAlignmentGuides,
    showPhotoOverlapWarning,
    setShowPhotoOverlapWarning,
  } = useCanvasPreferences();
  const layoutMode = useLayoutMode();
  const isPhone = layoutMode === 'phone';
  const isDesktop = layoutMode === 'desktop';
  const { setDrawerOpen } = useInspector();
  // Marks the visit (`spg.hasVisitedApp`) for the onboarding tour record.
  useFirstVisit();
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const tableMenuRef = React.useRef<HTMLDivElement | null>(null);
  const canvasMenuRef = React.useRef<HTMLDivElement | null>(null);
  const featureMenuRef = React.useRef<HTMLDivElement | null>(null);

  // Palette icons keyed by feature type; combined with the shared geometry
  // templates to build the sidebar palette entries.
  const FEATURE_ICONS = React.useMemo<
    Record<ClassroomFeatureType, React.ReactNode>
  >(
    () => ({
      window: <PanoramaIcon size={16} />,
      door: <DoorIcon size={16} />,
      board: <ChalkboardSimpleIcon size={16} />,
      podium: <LecternIcon size={16} />,
      whiteboard: <PresentationIcon size={16} />,
      cabinet: <LockersIcon size={16} />,
      divider: <WallIcon size={16} />,
    }),
    [],
  );

  const FEATURE_PALETTE = React.useMemo<FeaturePaletteItem[]>(
    () =>
      buildFeatureTemplates(t).map((template) => ({
        ...template,
        icon: FEATURE_ICONS[template.type],
      })),
    [t, FEATURE_ICONS],
  );

  const {
    handleCanvasPointerMove,
    handleCanvasPointerUp,
    beginSelectionWithLongPress,
    handleTablePointerDown,
    copySelection,
    cutSelection,
    deleteSelection,
    pasteSelectionAt,
    duplicateSelection,
    handleCanvasMenuPaste,
    canPaste,
    selectionBox,
  } = canvasHandlers;
  // Without a point on the canvas the copy lands beside its original, as with
  // Ctrl/Cmd+V.
  const pasteSelection = React.useCallback(
    () => pasteSelectionAt(),
    [pasteSelectionAt],
  );

  // Kontextmenüs verwalten
  const {
    tableContextMenu,
    setTableContextMenu,
    canvasContextMenu,
    setCanvasContextMenu,
    featureContextMenu,
    setFeatureContextMenu,
    closeTableContextMenu,
    closeCanvasContextMenu,
    closeFeatureContextMenu,
    tableContextMenuPosition,
    canvasContextMenuPosition,
    featureContextMenuPosition,
    handleCloseTableMenu,
    handleCloseCanvasMenu,
    handleCloseFeatureMenu,
    handleEscapeKey,
    openFeatureContextMenu,
  } = useCanvasContextMenus({
    containerRef,
    tableMenuRef,
    canvasMenuRef,
    featureMenuRef,
    onCloseTableContextMenu,
    onCloseCanvasContextMenu,
    onCloseFeatureContextMenu: onCloseFeatureContextMenu ?? (() => {}),
    canPaste,
  });

  const featureAvailability = React.useMemo(
    () => getFeatureAvailability(sceneFeatures),
    [sceneFeatures],
  );

  React.useEffect(() => {
    if (!sceneFeatures) {
      return;
    }
    // The board stays a singleton because its position defines the front of
    // the room for the seating algorithm.
    let boardSeen = false;
    const filtered = sceneFeatures.filter((feature) => {
      if (feature.type === 'board') {
        if (boardSeen) {
          return false;
        }
        boardSeen = true;
      }
      return true;
    });
    if (filtered.length !== sceneFeatures.length) {
      setSceneFeatures(filtered);
    }
  }, [sceneFeatures, setSceneFeatures]);

  // Selects a feature as part of the unified selection. A plain click selects
  // only this feature (clearing tables + other features); Shift/Ctrl toggles
  // it additively while keeping the rest of the selection. Clicking a feature
  // that is already selected keeps the whole selection so a group drag works.
  const selectFeature = React.useCallback(
    (featureId: string, additive: boolean) => {
      if (additive) {
        toggleFeatureSelect(featureId, true);
        return;
      }
      if (!selectedFeatureIds.includes(featureId)) {
        setSelectedTableIds([]);
        setSelectedFeatureIds([featureId]);
      }
    },
    [
      selectedFeatureIds,
      toggleFeatureSelect,
      setSelectedTableIds,
      setSelectedFeatureIds,
    ],
  );

  const handleFeatureAdded = React.useCallback(
    (feature: ClassroomFeature) => {
      setFeatureVisible(feature.type, true);
      setSelectedTableIds([]);
      setSelectedFeatureIds([feature.id]);
    },
    [setFeatureVisible, setSelectedTableIds, setSelectedFeatureIds],
  );

  const toSceneCoordinates = React.useMemo(
    () =>
      createClientToSceneConverter({
        sceneWidth: canvasWidth,
        sceneHeight: classroomHeight,
      }),
    [canvasWidth, classroomHeight],
  );
  const sceneToClient = React.useCallback(
    (point: { x: number; y: number }) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        return null;
      }
      const rect = canvas.getBoundingClientRect();
      const scaleX = rect.width / canvasWidth;
      const scaleY = rect.height / classroomHeight;
      return {
        x: rect.left + point.x * scaleX,
        y: rect.top + point.y * scaleY,
      };
    },
    [canvasRef, canvasWidth, classroomHeight],
  );
  // The setup and the templates are the inspector's while nothing is
  // selected; this is how the room gets there and what it does there.
  const clearCanvasSelection = React.useCallback(() => {
    setSelectedTableIds([]);
    clearFeatureSelection();
  }, [clearFeatureSelection, setSelectedTableIds]);
  const { setupFocusRequest, revealSetup, setUpRoom, loadTemplate } =
    useRoomSetup({
      isRoomEmpty: sceneTables.length === 0,
      isDesktop,
      snapshot,
      onTemplateChange,
      onTableTypeChange,
      clearSelection: clearCanvasSelection,
      setDrawerOpen,
    });

  // Tables and room elements turn together, by either handle, Q/E or the
  // inspector; the handles' gesture and the inspector's commit live here.
  const { handleRotationGesture, commitRotations } = useSelectionRotation({
    sceneTables,
    sceneFeatures,
    selectedTableIds,
    selectedFeatureIds,
    updateSceneTables,
    setSceneFeatures,
    runSceneTransaction,
    snapshot,
    roomWidth: canvasWidth,
    roomHeight: classroomHeight,
  });

  const {
    featureDragPreview,
    handleFeatureTemplatePointerDown,
    handleFeaturePointerDown,
    handleFeatureRotateStart,
    addFeature,
  } = useFeaturePaletteDrag({
    rotateSelection: handleRotationGesture,
    featureTemplateMap,
    sceneFeatures,
    runSceneTransaction,
    setSceneFeatures,
    snapshot,
    snapToGrid,
    classroomWidth: canvasWidth,
    classroomHeight,
    selectedFeatureIds,
    selectedTableIds,
    sceneTables,
    updateSceneTables,
    commitScene: onTableUpdate,
    toSceneCoordinates,
    sceneToClient,
    canvasRef,
    onFeatureAdded: handleFeatureAdded,
    openFeatureContextMenu,
    closeFeatureContextMenu,
    selectFeature,
    alignmentGuidesEnabled: showAlignmentGuides,
    setActiveAlignmentGuides,
    featureVisibility,
  });

  const { handleFeatureResizeStart } = useFeatureResize({
    sceneFeatures,
    setSceneFeatures,
    runSceneTransaction,
    snapshot,
    snapToGrid,
    classroomWidth: canvasWidth,
    classroomHeight,
    canvasRef,
    toSceneCoordinates,
    selectFeature,
  });

  const handleEscape = React.useCallback(() => {
    // Any open overlay outranks the canvas.
    if (isAnyDialogOpen()) {
      return;
    }
    handleEscapeKey();
  }, [handleEscapeKey]);

  // Register context menu setters with parent
  React.useEffect(() => {
    onTableContextMenuSetterChange?.(setTableContextMenu);
    return () => onTableContextMenuSetterChange?.(null);
  }, [onTableContextMenuSetterChange, setTableContextMenu]);

  React.useEffect(() => {
    onCanvasContextMenuSetterChange?.(setCanvasContextMenu);
    return () => onCanvasContextMenuSetterChange?.(null);
  }, [onCanvasContextMenuSetterChange, setCanvasContextMenu]);

  React.useEffect(() => {
    onFeatureContextMenuSetterChange?.(setFeatureContextMenu);
    return () => onFeatureContextMenuSetterChange?.(null);
  }, [onFeatureContextMenuSetterChange, setFeatureContextMenu]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    escape: handleEscape,
    'ctrl+z': undo,
    'cmd+z': undo,
    'ctrl+y': redo,
    'cmd+y': redo,
    'ctrl+shift+z': redo,
    'cmd+shift+z': redo,
    'ctrl+e': revealSetup,
    'cmd+e': revealSetup,
  });
  const handleSvgPointerMove = React.useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (tableContextMenu || canvasContextMenu || featureContextMenu) return;
      handleCanvasPointerMove(e);
    },
    [
      canvasContextMenu,
      featureContextMenu,
      handleCanvasPointerMove,
      tableContextMenu,
    ],
  );
  const handleSvgPointerUp = React.useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (tableContextMenu || canvasContextMenu || featureContextMenu) return;
      handleCanvasPointerUp(e);
    },
    [
      canvasContextMenu,
      featureContextMenu,
      handleCanvasPointerUp,
      tableContextMenu,
    ],
  );
  const handleSvgPointerDown = React.useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (tableContextMenu || canvasContextMenu || featureContextMenu) {
        if (tableContextMenu) {
          handleCloseTableMenu();
        }
        if (canvasContextMenu) {
          handleCloseCanvasMenu();
        }
        if (featureContextMenu) {
          handleCloseFeatureMenu();
        }
        return;
      }
      clearFeatureSelection();
      beginSelectionWithLongPress(e);
    },
    [
      beginSelectionWithLongPress,
      canvasContextMenu,
      handleCloseCanvasMenu,
      handleCloseFeatureMenu,
      handleCloseTableMenu,
      featureContextMenu,
      clearFeatureSelection,
      tableContextMenu,
    ],
  );
  const handleSvgContextMenu = React.useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      e.preventDefault();
      e.stopPropagation();

      // CheckIcon if right-clicked on a table element (including seats)
      const target = e.target as Element;
      const tableElement = target.closest('[data-table-index]');
      const featureElement = target.closest('[data-feature-id]');

      if (tableElement) {
        // Right-click on table - show ONLY table context menu
        const tableIndex = parseInt(
          tableElement.getAttribute('data-table-index') || '-1',
          10,
        );

        if (tableIndex >= 0 && !sceneTables[tableIndex].locked) {
          // Close canvas menu first
          closeCanvasContextMenu();

          // Select the table if not already selected. A fresh single-table
          // selection also clears any feature selection.
          if (!selectedTableIds.includes(tableIndex)) {
            setSelectedTableIds([tableIndex]);
            clearFeatureSelection();
          }

          setTableContextMenu({
            tableIndex,
            clientX: e.clientX,
            clientY: e.clientY,
            pointerType: 'mouse',
            trigger: 'contextmenu',
          });
        } else {
          // Locked table or invalid index - close both menus
          closeTableContextMenu();
          closeCanvasContextMenu();
        }
        // Early return - NEVER show canvas menu when on table
        return;
      }

      if (featureElement) {
        const featureId = featureElement.getAttribute('data-feature-id');
        if (!featureId) {
          closeFeatureContextMenu();
          return;
        }

        closeTableContextMenu();
        closeCanvasContextMenu();
        // Ensure the right-clicked feature is part of the selection; if it
        // already is, the whole (possibly mixed) selection is kept.
        selectFeature(featureId, false);

        openFeatureContextMenu({
          featureId,
          clientX: e.clientX,
          clientY: e.clientY,
          pointerType: 'mouse',
          trigger: 'contextmenu',
        });
        return;
      }

      // Only show canvas menu on truly empty canvas
      if (e.target !== e.currentTarget) {
        // Clicked on some other SVG element (not table, not canvas itself)
        return;
      }

      // Right-click on empty canvas - show paste menu
      if (!canPaste) return;

      clearFeatureSelection();

      closeFeatureContextMenu();

      closeTableContextMenu();

      const svg = e.currentTarget as SVGSVGElement;
      const rect = svg.getBoundingClientRect();
      const scaleX = svg.viewBox.baseVal.width / rect.width;
      const scaleY = svg.viewBox.baseVal.height / rect.height;
      const sceneX = (e.clientX - rect.left) * scaleX;
      const sceneY = (e.clientY - rect.top) * scaleY;

      setCanvasContextMenu({
        clientX: e.clientX,
        clientY: e.clientY,
        sceneX,
        sceneY,
        pointerType: 'mouse',
        trigger: 'contextmenu',
      });
    },
    [
      canPaste,
      closeTableContextMenu,
      closeCanvasContextMenu,
      closeFeatureContextMenu,
      openFeatureContextMenu,
      setCanvasContextMenu,
      setTableContextMenu,
      sceneTables,
      selectedTableIds,
      clearFeatureSelection,
      selectFeature,
      setSelectedTableIds,
    ],
  );
  const handleToggleSnapToGrid = React.useCallback(
    (checked: boolean) => {
      setSnapToGrid(() => checked);
    },
    [setSnapToGrid],
  );

  const handleToggleShowGrid = React.useCallback(
    (checked: boolean) => {
      setShowGrid(() => checked);
    },
    [setShowGrid],
  );

  const handleToggleAlignmentGuides = React.useCallback(
    (checked: boolean) => {
      setShowAlignmentGuides(() => checked);
    },
    [setShowAlignmentGuides],
  );

  const handleTogglePhotoOverlapWarning = React.useCallback(
    (checked: boolean) => {
      setShowPhotoOverlapWarning(() => checked);
    },
    [setShowPhotoOverlapWarning],
  );

  const layoutSettingsGroups = React.useMemo(
    () => [
      {
        id: 'layout-base',
        title: t('editor.workspace', 'Arbeitsfläche'),
        options: [
          {
            kind: 'checkList' as const,
            id: 'layout-base-grid',
            label: t('editor.workspace', 'Arbeitsfläche'),
            items: [
              {
                id: 'snap-to-grid',
                label: t('editor.snapToGrid', 'Am Raster ausrichten'),
                icon: <MagnetIcon size={18} />,
                checked: snapToGrid,
                onChange: handleToggleSnapToGrid,
              },
              {
                id: 'show-grid',
                label: t('editor.showGrid', 'Raster anzeigen'),
                icon: <GridNineIcon size={18} />,
                checked: showGrid,
                onChange: handleToggleShowGrid,
              },
              {
                id: 'alignment-guides',
                label: t('editor.alignmentGuides', 'Ausrichtungshilfen'),
                icon: <AlignCenterVerticalSimpleIcon size={18} />,
                checked: showAlignmentGuides,
                onChange: handleToggleAlignmentGuides,
              },
              {
                id: 'photo-overlap-warning',
                label: t(
                  'editor.photoOverlapWarning',
                  'Fotokollisionen anzeigen',
                ),
                icon: <IntersectIcon size={18} />,
                checked: showPhotoOverlapWarning,
                onChange: handleTogglePhotoOverlapWarning,
              },
            ],
          },
        ],
      },
      buildFeatureVisibilityGroup({
        id: 'layout-features',
        title: t('layout.roomElements', 'Raumelemente'),
        t,
        isChecked: (type) =>
          featureAvailability[type] === true &&
          featureVisibility[type] !== false,
        isDisabled: (type) => featureAvailability[type] !== true,
        onToggle: setFeatureVisible,
      }),
    ],
    [
      featureAvailability,
      featureVisibility,
      setFeatureVisible,
      handleToggleAlignmentGuides,
      handleTogglePhotoOverlapWarning,
      handleToggleShowGrid,
      handleToggleSnapToGrid,
      showAlignmentGuides,
      showPhotoOverlapWarning,
      showGrid,
      snapToGrid,
      t,
    ],
  );

  // Copy/cut/delete always act on the whole unified selection (tables +
  // features), so the table and feature context menus share the same actions.
  const withMenuClose = React.useCallback(
    (action: () => void) => () => {
      action();
      closeTableContextMenu();
      closeFeatureContextMenu();
    },
    [closeTableContextMenu, closeFeatureContextMenu],
  );

  const selectionMenuActions = React.useMemo(
    () => [
      {
        label: t('common.copy', 'Kopieren'),
        icon: CopyIcon,
        onSelect: withMenuClose(copySelection),
      },
      {
        label: t('common.cut', 'Ausschneiden'),
        icon: ScissorsIcon,
        onSelect: withMenuClose(cutSelection),
      },
      {
        label: t('common.delete', 'Löschen'),
        icon: TrashIcon,
        onSelect: withMenuClose(deleteSelection),
      },
    ],
    [copySelection, cutSelection, deleteSelection, withMenuClose, t],
  );
  const tableMenuActions = selectionMenuActions;
  const featureMenuActions = React.useMemo(() => {
    if (!featureContextMenu) {
      return [];
    }
    const feature = sceneFeatures.find(
      (item) => item.id === featureContextMenu.featureId,
    );
    if (!feature) {
      return [];
    }
    return selectionMenuActions;
  }, [featureContextMenu, sceneFeatures, selectionMenuActions]);

  const canvasMenuActions = React.useMemo(() => {
    if (!canvasContextMenu || !canPaste) return [];

    const menuState = canvasContextMenu;
    return [
      {
        label: t('canvas.paste', 'Einfügen'),
        icon: ClipboardTextIcon,
        onSelect: () => handleCanvasMenuPaste(menuState),
      },
    ];
  }, [canvasContextMenu, canPaste, handleCanvasMenuPaste, t]);
  const canvasProps: React.ComponentProps<typeof ClassroomCanvas> = {
    canvasRef,
    canvasWidth,
    classroomHeight,
    showGrid,
    featureVisibility,
    selectedFeatureIds,
    onFeatureRotateStart: handleFeatureRotateStart,
    onFeatureResizeStart: handleFeatureResizeStart,
    features: sceneFeatures ?? [],
    sceneTables,
    selectedTableIds,
    placeholderSeating,
    allStudents: students,
    selectionBox,
    templateDragPreview,
    featureDragPreview,
    alignmentGuides,
    showPhotoOverlapWarning,
    onPointerMove: handleSvgPointerMove,
    onPointerUp: handleSvgPointerUp,
    onPointerDown: handleSvgPointerDown,
    onContextMenu: handleSvgContextMenu,
    onTablePointerDown: handleTablePointerDown,
    onRotateGesture: handleRotationGesture,
    onFeaturePointerDown: handleFeaturePointerDown,
  };

  const tableMenuConfig = {
    state: tableContextMenu,
    position: tableContextMenuPosition,
    menuRef: tableMenuRef,
    actions: tableMenuActions,
    onCloseMenu: handleCloseTableMenu,
  };

  const canvasMenuConfig = {
    state: canvasContextMenu,
    position: canvasContextMenuPosition,
    menuRef: canvasMenuRef,
    actions: canvasMenuActions,
    onCloseMenu: handleCloseCanvasMenu,
  };

  const featureMenuConfig = {
    state: featureContextMenu,
    position: featureContextMenuPosition,
    menuRef: featureMenuRef,
    actions: featureMenuActions,
    onCloseMenu: handleCloseFeatureMenu,
  };

  // A click or Enter on an entry — dragging is not the only way into the
  // room (WCAG 2.5.7, 2.1.1): one more where there is room, selected, so
  // the arrow keys and Q/E take it on.
  const handleTemplateAdd = React.useCallback(
    (type: TableTemplateType) => {
      clearFeatureSelection();
      if (!onTemplateAdd(type)) {
        showToast('info', 'toast:room.noFreeSpot');
      }
    },
    [clearFeatureSelection, onTemplateAdd],
  );
  const handleFeatureAdd = React.useCallback(
    (type: ClassroomFeatureType) => {
      if (!addFeature(type)) {
        showToast('info', 'toast:room.noFreeSpot');
      }
    },
    [addFeature],
  );

  const mobileTemplatesProps = {
    onTemplatePointerDown,
    onFeaturePointerDown: handleFeatureTemplatePointerDown,
    onTemplateAdd: handleTemplateAdd,
    onFeatureAdd: handleFeatureAdd,
  };

  return (
    <div className="space-y-6 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:space-y-0">
      {/* The shell owns the panel; the selection and its mutators live here,
          so this is where its content is rendered from. */}
      <InspectorPortal label={t('sceneInspector.title')}>
        <SceneInspector
          tables={sceneTables}
          features={sceneFeatures}
          selectedTableIds={selectedTableIds}
          selectedFeatureIds={selectedFeatureIds}
          featurePalette={FEATURE_PALETTE}
          studentsCount={students.length}
          onSetUpRoom={setUpRoom}
          setupFocusRequest={setupFocusRequest}
          templates={templates}
          onLoadTemplate={loadTemplate}
          onRenameTemplate={handleRenameTemplate}
          onDeleteTemplate={handleDeleteTemplate}
          onSaveTemplate={handleSaveTemplate}
          snapshot={snapshot}
          onRotateSelection={commitRotations}
          runSceneTransaction={runSceneTransaction}
          onDeleteSelection={deleteSelection}
          onDuplicateSelection={duplicateSelection}
          onCopySelection={copySelection}
          onCutSelection={cutSelection}
          onPasteSelection={pasteSelection}
          canPaste={canPaste}
        />
      </InspectorPortal>
      {/* The direction comes from the same hook that decides whether the
          sidebar is a rail or a phone sheet — a `md:` variant here could
          disagree with it and stack the rail on top of the canvas. */}
      <div className={workspaceLayerClass}>
        <LayoutEditorSidebarSection
          isPhone={isPhone}
          onTemplatePointerDown={onTemplatePointerDown}
          onTemplateAdd={handleTemplateAdd}
          featurePalette={FEATURE_PALETTE}
          onFeaturePointerDown={handleFeatureTemplatePointerDown}
          onFeatureAdd={handleFeatureAdd}
          settingsGroups={layoutSettingsGroups}
        />

        <LayoutEditorMainSection
          isPhone={isPhone}
          containerRef={containerRef}
          undo={undo}
          redo={redo}
          canRedo={canRedo}
          historyLength={historyLength}
          canvasProps={canvasProps}
          tableMenu={tableMenuConfig}
          canvasMenu={canvasMenuConfig}
          featureMenu={featureMenuConfig}
          featurePalette={FEATURE_PALETTE}
          mobileTemplatesProps={mobileTemplatesProps}
        />
      </div>
    </div>
  );
});

export default LayoutEditorView;

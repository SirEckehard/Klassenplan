// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ClipboardText,
  Copy,
  GridNine,
  HammerIcon,
  Magnet,
  Scissors,
  TrashIcon,
  LecternIcon,
  LockersIcon,
  DoorIcon,
  PanoramaIcon,
  PresentationIcon,
  ChalkboardSimpleIcon,
  WallIcon,
} from '@phosphor-icons/react';
import ClassroomQuickSetup from '@/components/ui/panels/ClassroomQuickSetup';
import ContextActionMenu, {
  type ContextAction,
} from '@/components/SeatingPlanGenerator/ContextActionMenu';
import ClassroomCanvas from '@/components/SeatingPlanGenerator/canvas/ClassroomCanvas';
import type { CanvasInteractionHandlers } from '@/components/SeatingPlanGenerator/canvas/CanvasInteractionLayer';
import CanvasToolbar from '@/components/SeatingPlanGenerator/canvas/CanvasToolbar';
import MobileTableTemplates from '@/components/SeatingPlanGenerator/mobile/MobileTableTemplates';
import {
  CanvasSettingsButton,
  type CanvasSettingsGroup,
} from '@/components/SeatingPlanGenerator/canvas/CanvasSettingsButton';
import LayoutEditorSidebarSection from '@/components/SeatingPlanGenerator/views/LayoutEditorSidebarSection';
import LayoutEditorQuickSetupOverlay from '@/components/SeatingPlanGenerator/views/LayoutEditorQuickSetupOverlay';
import LayoutEditorStatusBadge from '@/components/SeatingPlanGenerator/views/LayoutEditorStatusBadge';
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
import { useIsMobile } from '@/hooks/ui/useIsMobile';
import { useFirstVisit } from '@/hooks/ui/useFirstVisit';
import {
  canvasFrameClass,
  primaryButtonClass,
  neutralButtonClass,
  secondaryButtonClass,
  createClientToSceneConverter,
} from '@/utils';
import { FEATURE_TYPES, type FeatureVisibilityFlags } from '@/utils/ui';
import { buildFeatureVisibilityGroup } from '@/components/SeatingPlanGenerator/canvas/featureVisibilityGroup';
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

type Props = {
  snapToGrid: boolean;
  setSnapToGrid: React.Dispatch<React.SetStateAction<boolean>>;
  showGrid: boolean;
  setShowGrid: React.Dispatch<React.SetStateAction<boolean>>;
  featureVisibility: FeatureVisibilityFlags;
  setFeatureVisible: (type: ClassroomFeatureType, visible: boolean) => void;
  undo: () => void;
  historyLength: number;
  studentsCount: number;
  students: Student[];
  seatCount: number;
  templates: ClassroomTemplate[];
  selectedTemplateId: number | null;
  handleSaveTemplate: () => void;
  handleDeleteTemplate: (id?: number) => void;
  handleRenameTemplate: (
    id: number,
    newName: string,
  ) => Promise<{ success: boolean; error?: string }>;
  handleOverwriteTemplate?: (id: number) => void;
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
  canvasRef: React.RefObject<SVGSVGElement | null>;
  templateDragPreview: TemplateDragPreview | null;
  placeholderSeating: SeatingArrangement;
  onTableUpdate: () => void;
  snapshot: () => void;
  onEditStudents: () => void;
  onProceedToPlan: () => void;
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
  // Quick Setup props
  currentTableType: TableTemplateType;
  onTableTypeChange: (type: TableTemplateType) => void;
  onTemplateChange: (templateId: number | null) => void;
};

const LayoutEditorView = React.memo(
  function LayoutEditorView({
    snapToGrid,
    setSnapToGrid,
    showGrid,
    setShowGrid,
    featureVisibility,
    setFeatureVisible,
    undo,
    historyLength,
    studentsCount,
    students,
    seatCount,
    templates,
    selectedTemplateId,
    handleSaveTemplate,
    handleDeleteTemplate,
    handleRenameTemplate,
    handleOverwriteTemplate,
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
    canvasRef,
    templateDragPreview,
    placeholderSeating,
    onTableUpdate,
    snapshot,
    onEditStudents,
    onProceedToPlan,
    onCloseTableContextMenu,
    onTableContextMenuSetterChange,
    onCloseCanvasContextMenu,
    onCanvasContextMenuSetterChange,
    onCloseFeatureContextMenu,
    onFeatureContextMenuSetterChange,
    currentTableType,
    onTableTypeChange,
    onTemplateChange,
  }: Props) {
    const { t } = useTranslation('generator');
    const isMobile = useIsMobile();
    const isFirstVisit = useFirstVisit();
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
      handleCanvasMenuPaste,
      canPaste,
      selectionBox,
    } = canvasHandlers;

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

    const featureAvailability = React.useMemo(() => {
      const features = sceneFeatures ?? [];
      const availability: FeatureVisibilityFlags = {};
      for (const type of FEATURE_TYPES) {
        availability[type] = features.some((feature) => feature.type === type);
      }
      return availability;
    }, [sceneFeatures]);

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
    const quickSetupShortcutHint = t('layout.quickSetupShortcut', 'Strg/⌘+E');
    const [isQuickSetupOpen, setIsQuickSetupOpen] = React.useState(
      sceneTables.length === 0,
    );
    const canDismissQuickSetup = sceneTables.length > 0;

    React.useEffect(() => {
      if (sceneTables.length === 0) {
        setIsQuickSetupOpen(true);
      }
    }, [sceneTables.length]);

    React.useEffect(() => {
      if (!isMobile || !isQuickSetupOpen) {
        return;
      }

      if (typeof document === 'undefined') {
        return;
      }

      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }, [isMobile, isQuickSetupOpen]);

    const handleOpenQuickSetup = React.useCallback(() => {
      setIsQuickSetupOpen(true);
    }, []);

    const handleCloseQuickSetup = React.useCallback(() => {
      setIsQuickSetupOpen(false);
    }, []);

    const handleToggleQuickSetupShortcut = React.useCallback(() => {
      setIsQuickSetupOpen((previousState) => {
        if (previousState) {
          if (sceneTables.length === 0) {
            return true;
          }
          return false;
        }
        return true;
      });
    }, [sceneTables.length]);

    const previousTablesRef = React.useRef(sceneTables);

    React.useEffect(() => {
      const previousTables = previousTablesRef.current;
      const tablesChanged =
        previousTables.length !== sceneTables.length ||
        previousTables.some((table, index) => table !== sceneTables[index]);

      if (isQuickSetupOpen && sceneTables.length > 0 && tablesChanged) {
        setIsQuickSetupOpen(false);
      }

      previousTablesRef.current = sceneTables;
    }, [isQuickSetupOpen, sceneTables]);
    const {
      featureDragPreview,
      handleFeatureTemplatePointerDown,
      handleFeaturePointerDown,
      handleFeatureRotateStart,
    } = useFeaturePaletteDrag({
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

    const handleEscapeKeyWithQuickSetup = React.useCallback(() => {
      // CheckIcon if a modal/dialog is currently open
      const hasOpenModal = document.querySelector('[role="dialog"]');
      if (hasOpenModal) {
        // Let the modal handle ESC, don't close Quick Setup
        return;
      }

      if (isQuickSetupOpen) {
        setIsQuickSetupOpen(false);
        return;
      }
      handleEscapeKey();
    }, [handleEscapeKey, isQuickSetupOpen]);

    const quickSetupPanel = (
      <ClassroomQuickSetup
        templates={templates}
        selectedTemplate={selectedTemplateId}
        onTemplateChange={onTemplateChange}
        currentType={currentTableType}
        onTypeChange={onTableTypeChange}
        sceneTables={sceneTables}
        panelClassName="shadow-none [box-shadow:none]"
        onClose={sceneTables.length === 0 ? undefined : handleCloseQuickSetup}
        onDeleteTemplate={handleDeleteTemplate}
        onRenameTemplate={handleRenameTemplate}
        onOverwriteTemplate={handleOverwriteTemplate}
      />
    );

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
      escape: handleEscapeKeyWithQuickSetup,
      'ctrl+z': undo,
      'cmd+z': undo,
      'ctrl+e': handleToggleQuickSetupShortcut,
      'cmd+e': handleToggleQuickSetupShortcut,
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

    const layoutSettingsGroups = React.useMemo(
      () => [
        {
          id: 'layout-base',
          title: t('editor.workspace', 'Arbeitsfläche'),
          options: [
            {
              id: 'snap-to-grid',
              label: t('editor.snapToGrid', 'Am Raster ausrichten'),
              icon: <Magnet size={16} />,
              checked: snapToGrid,
              onChange: handleToggleSnapToGrid,
            },
            {
              id: 'show-grid',
              label: t('editor.showGrid', 'Raster anzeigen'),
              icon: <GridNine size={16} />,
              checked: showGrid,
              onChange: handleToggleShowGrid,
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
        handleToggleShowGrid,
        handleToggleSnapToGrid,
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
          icon: Copy,
          onSelect: withMenuClose(copySelection),
        },
        {
          label: t('common.cut', 'Ausschneiden'),
          icon: Scissors,
          onSelect: withMenuClose(cutSelection),
        },
        {
          label: t('common.delete', 'Entfernen'),
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
          icon: ClipboardText,
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
      onPointerMove: handleSvgPointerMove,
      onPointerUp: handleSvgPointerUp,
      onPointerDown: handleSvgPointerDown,
      onContextMenu: handleSvgContextMenu,
      onTablePointerDown: handleTablePointerDown,
      onTableUpdate,
      onTransformStart: snapshot,
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

    const mobileTemplatesProps = {
      onTemplatePointerDown,
      onFeaturePointerDown: handleFeatureTemplatePointerDown,
      onSaveTemplate: handleSaveTemplate,
    };

    const footerProps = {
      onEditStudents,
      onProceedToPlan,
      seatCount,
      studentsCount,
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:gap-2 md:items-start">
          <LayoutEditorSidebarSection
            isMobile={isMobile}
            isFirstVisit={isFirstVisit}
            studentsCount={studentsCount}
            seatCount={seatCount}
            handleSaveTemplate={handleSaveTemplate}
            onTemplatePointerDown={onTemplatePointerDown}
            onOpenQuickSetup={handleOpenQuickSetup}
            quickSetupShortcutHint={quickSetupShortcutHint}
            featurePalette={FEATURE_PALETTE}
            onFeaturePointerDown={handleFeatureTemplatePointerDown}
          />

          <LayoutEditorMainSection
            isMobile={isMobile}
            containerRef={containerRef}
            isQuickSetupOpen={isQuickSetupOpen}
            undo={undo}
            historyLength={historyLength}
            layoutSettingsGroups={layoutSettingsGroups}
            canvasProps={canvasProps}
            studentsCount={studentsCount}
            seatCount={seatCount}
            quickSetupOverlay={{
              panel: quickSetupPanel,
              canDismiss: canDismissQuickSetup,
              onClose: handleCloseQuickSetup,
            }}
            onOpenQuickSetup={handleOpenQuickSetup}
            tableMenu={tableMenuConfig}
            canvasMenu={canvasMenuConfig}
            featureMenu={featureMenuConfig}
            featurePalette={FEATURE_PALETTE}
            mobileTemplatesProps={mobileTemplatesProps}
            footerProps={footerProps}
          />
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison for complex props
    return (
      prevProps.sceneTables === nextProps.sceneTables &&
      prevProps.selectedTableIds === nextProps.selectedTableIds &&
      prevProps.placeholderSeating === nextProps.placeholderSeating &&
      prevProps.templateDragPreview === nextProps.templateDragPreview &&
      prevProps.templates === nextProps.templates &&
      prevProps.snapToGrid === nextProps.snapToGrid &&
      prevProps.showGrid === nextProps.showGrid &&
      prevProps.featureVisibility === nextProps.featureVisibility &&
      prevProps.historyLength === nextProps.historyLength &&
      prevProps.studentsCount === nextProps.studentsCount &&
      prevProps.seatCount === nextProps.seatCount &&
      prevProps.selectedTemplateId === nextProps.selectedTemplateId &&
      prevProps.canvasWidth === nextProps.canvasWidth &&
      prevProps.classroomHeight === nextProps.classroomHeight &&
      prevProps.sceneFeatures === nextProps.sceneFeatures &&
      // Function props are expected to be stable
      prevProps.setSnapToGrid === nextProps.setSnapToGrid &&
      prevProps.setShowGrid === nextProps.setShowGrid &&
      prevProps.setFeatureVisible === nextProps.setFeatureVisible &&
      prevProps.setSelectedTableIds === nextProps.setSelectedTableIds &&
      prevProps.canvasHandlers === nextProps.canvasHandlers &&
      prevProps.undo === nextProps.undo &&
      prevProps.handleSaveTemplate === nextProps.handleSaveTemplate &&
      prevProps.handleDeleteTemplate === nextProps.handleDeleteTemplate &&
      prevProps.handleRenameTemplate === nextProps.handleRenameTemplate &&
      prevProps.onTemplatePointerDown === nextProps.onTemplatePointerDown &&
      prevProps.canvasRef === nextProps.canvasRef &&
      prevProps.onTableUpdate === nextProps.onTableUpdate &&
      prevProps.snapshot === nextProps.snapshot &&
      prevProps.onEditStudents === nextProps.onEditStudents &&
      prevProps.onProceedToPlan === nextProps.onProceedToPlan &&
      prevProps.onCloseTableContextMenu === nextProps.onCloseTableContextMenu &&
      prevProps.onTableContextMenuSetterChange ===
        nextProps.onTableContextMenuSetterChange &&
      prevProps.onCloseCanvasContextMenu ===
        nextProps.onCloseCanvasContextMenu &&
      prevProps.onCanvasContextMenuSetterChange ===
        nextProps.onCanvasContextMenuSetterChange &&
      prevProps.currentTableType === nextProps.currentTableType &&
      prevProps.onTableTypeChange === nextProps.onTableTypeChange &&
      prevProps.onTemplateChange === nextProps.onTemplateChange
    );
  },
);

type LayoutEditorContextMenuProps<T> = {
  state: T | null;
  position: { left: number; top: number } | null;
  menuRef: React.RefObject<HTMLDivElement | null>;
  actions: ContextAction[];
  onCloseMenu: () => void;
};

type LayoutEditorMainSectionProps = {
  isMobile: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  isQuickSetupOpen: boolean;
  undo: () => void;
  historyLength: number;
  layoutSettingsGroups: CanvasSettingsGroup[];
  canvasProps: React.ComponentProps<typeof ClassroomCanvas>;
  studentsCount: number;
  seatCount: number;
  quickSetupOverlay: {
    panel: React.ReactNode;
    canDismiss: boolean;
    onClose: () => void;
  };
  onOpenQuickSetup: () => void;
  tableMenu: LayoutEditorContextMenuProps<TableContextMenuState>;
  canvasMenu: LayoutEditorContextMenuProps<CanvasContextMenuState>;
  featureMenu: LayoutEditorContextMenuProps<FeatureContextMenuState>;
  featurePalette: FeaturePaletteItem[];
  mobileTemplatesProps: {
    onTemplatePointerDown: (
      type: TableTemplateType,
      event: React.PointerEvent<Element>,
    ) => void;
    onFeaturePointerDown: (
      type: ClassroomFeatureType,
      event: React.PointerEvent<Element>,
    ) => void;
    onSaveTemplate: () => void;
  };
  footerProps: {
    onEditStudents: () => void;
    onProceedToPlan: () => void;
    seatCount: number;
    studentsCount: number;
  };
};

const LayoutEditorMainSection = React.memo(function LayoutEditorMainSection({
  isMobile,
  containerRef,
  isQuickSetupOpen,
  undo,
  historyLength,
  layoutSettingsGroups,
  canvasProps,
  studentsCount,
  seatCount,
  quickSetupOverlay,
  onOpenQuickSetup,
  tableMenu,
  canvasMenu,
  featureMenu,
  featurePalette,
  mobileTemplatesProps,
  footerProps,
}: LayoutEditorMainSectionProps) {
  const { t } = useTranslation('generator');
  return (
    <div className="flex-1 flex flex-col gap-4 md:min-w-0">
      {/* Mobile: Quick Setup Button above canvas for easy access */}
      {isMobile && (
        <button
          type="button"
          onClick={onOpenQuickSetup}
          className={`${secondaryButtonClass} flex w-full items-center justify-center gap-3 px-4 py-3 text-sm h-12`}
          title={t('layout.setupClassroom', 'Klassenraum einrichten')}
        >
          <HammerIcon className="h-4 w-4 shrink-0" />
          <span className="text-sm font-semibold">
            {t('layout.setupClassroom', 'Klassenraum einrichten')}
          </span>
        </button>
      )}
      <div
        data-testid="classroom-canvas"
        className={`${canvasFrameClass} relative select-none`}
        style={{
          width: '100%',
          maxWidth: '100vw',
          ...(isQuickSetupOpen
            ? {
                borderColor: 'transparent',
                boxShadow: 'none',
                background: 'transparent',
              }
            : undefined),
        }}
        ref={containerRef}
      >
        <CanvasToolbar onUndo={undo} canUndo={historyLength > 0} />
        <CanvasSettingsButton
          groups={layoutSettingsGroups}
          buttonTitle={t('editor.viewSettings', 'Ansichtseinstellungen')}
        />
        <ClassroomCanvas {...canvasProps} />

        {!isQuickSetupOpen && (
          <div className="absolute bottom-3 right-3 z-20">
            <LayoutEditorStatusBadge
              studentsCount={studentsCount}
              seatCount={seatCount}
            />
          </div>
        )}

        <LayoutEditorQuickSetupOverlay
          isOpen={isQuickSetupOpen}
          isMobile={isMobile}
          panel={quickSetupOverlay.panel}
          canDismiss={quickSetupOverlay.canDismiss}
          onClose={quickSetupOverlay.onClose}
        />

        {tableMenu.state && tableMenu.position && (
          <div ref={tableMenu.menuRef}>
            <ContextActionMenu
              x={tableMenu.position.left}
              y={tableMenu.position.top}
              actions={tableMenu.actions}
              onCloseMenu={tableMenu.onCloseMenu}
              pointerType={tableMenu.state.pointerType}
              trigger={tableMenu.state.trigger}
            />
          </div>
        )}
        {canvasMenu.state && canvasMenu.position && (
          <div ref={canvasMenu.menuRef}>
            <ContextActionMenu
              x={canvasMenu.position.left}
              y={canvasMenu.position.top}
              actions={canvasMenu.actions}
              onCloseMenu={canvasMenu.onCloseMenu}
              pointerType={canvasMenu.state.pointerType}
              trigger={canvasMenu.state.trigger}
            />
          </div>
        )}
        {featureMenu.state && featureMenu.position && (
          <div ref={featureMenu.menuRef}>
            <ContextActionMenu
              x={featureMenu.position.left}
              y={featureMenu.position.top}
              actions={featureMenu.actions}
              onCloseMenu={featureMenu.onCloseMenu}
              pointerType={featureMenu.state.pointerType}
              trigger={featureMenu.state.trigger}
            />
          </div>
        )}
      </div>

      {isMobile && (
        <div className="mt-4">
          <MobileTableTemplates
            onTemplatePointerDown={mobileTemplatesProps.onTemplatePointerDown}
            featurePalette={featurePalette}
            onFeaturePointerDown={mobileTemplatesProps.onFeaturePointerDown}
            onSaveTemplate={mobileTemplatesProps.onSaveTemplate}
          />
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between gap-2 mt-4">
        <button
          type="button"
          onClick={footerProps.onEditStudents}
          className={`${neutralButtonClass} w-full justify-center gap-2 sm:w-auto`}
          title={t(
            'wizard.backToStudentsShortcut',
            'Zurück zur Klassenliste (Alt/Option+←)',
          )}
        >
          <ArrowLeftIcon className="w-4 h-4" />
          {t('wizard.backToStudents', 'Zurück zur Klassenliste')}
        </button>
        <button
          type="button"
          onClick={footerProps.onProceedToPlan}
          disabled={footerProps.seatCount < footerProps.studentsCount}
          className={`${primaryButtonClass} flex items-center gap-2 ${
            footerProps.seatCount < footerProps.studentsCount
              ? 'cursor-not-allowed opacity-60'
              : ''
          }`}
          title={t(
            'wizard.forwardToPlanShortcut',
            'Weiter zum Sitzplan (Alt/Option+→)',
          )}
        >
          {t('wizard.forwardToPlan', 'Weiter zum Sitzplan')}
          <ArrowRightIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

export default LayoutEditorView;

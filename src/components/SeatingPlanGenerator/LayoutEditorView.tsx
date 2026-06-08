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
  DoorIcon,
  PanoramaIcon,
  ChalkboardSimpleIcon,
} from '@phosphor-icons/react';
import ClassroomQuickSetup from '@/components/ui/panels/ClassroomQuickSetup';
import ContextActionMenu, {
  type ContextAction,
} from '@/components/SeatingPlanGenerator/ContextActionMenu';
import ClassroomCanvas from '@/components/SeatingPlanGenerator/canvas/ClassroomCanvas';
import type { CanvasInteractionHandlers } from '@/components/SeatingPlanGenerator/canvas/CanvasInteractionLayer';
import CanvasToolbar from '@/components/SeatingPlanGenerator/canvas/CanvasToolbar';
import MobileTableTemplates from '@/components/SeatingPlanGenerator/mobile/MobileTableTemplates';
import { CanvasSettingsButton } from '@/components/SeatingPlanGenerator/canvas/CanvasSettingsButton';
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
  generateId,
  deepClone,
  WINDOW_WIDTH,
  WINDOW_HEIGHT,
  DOOR_WIDTH,
  DOOR_HEIGHT,
  BOARD_WIDTH,
  BOARD_HEIGHT,
  PODIUM_WIDTH,
  PODIUM_HEIGHT,
  createClientToSceneConverter,
  calculateFeatureHandleAnchor,
  type FeatureHandleAnchor,
} from '@/utils';
import {
  useFeaturePaletteDrag,
  rotateFeatureForAnchor,
  placeMovableFeatureBase,
  placeFixedFeatureBase,
  type FeaturePaletteItem,
  type FeaturePlacement,
} from '@/hooks/canvas/useFeaturePaletteDrag';
import type { SceneTransactionRunner } from '@/hooks/scene/useSceneManager';

type LayoutSettingOption = {
  id: string;
  label: string;
  icon: React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
};

type LayoutSettingsGroup = {
  id: string;
  title: string;
  options: LayoutSettingOption[];
};

type Props = {
  snapToGrid: boolean;
  setSnapToGrid: React.Dispatch<React.SetStateAction<boolean>>;
  showGrid: boolean;
  setShowGrid: React.Dispatch<React.SetStateAction<boolean>>;
  showBoard: boolean;
  setShowBoard: React.Dispatch<React.SetStateAction<boolean>>;
  showWindows: boolean;
  setShowWindows: React.Dispatch<React.SetStateAction<boolean>>;
  showDoor: boolean;
  setShowDoor: React.Dispatch<React.SetStateAction<boolean>>;
  showPodium: boolean;
  setShowPodium: React.Dispatch<React.SetStateAction<boolean>>;
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
  runSceneTransaction: SceneTransactionRunner;
  selectedTableIds: number[];
  setSelectedTableIds: React.Dispatch<React.SetStateAction<number[]>>;
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
    showBoard,
    setShowBoard,
    showWindows,
    setShowWindows,
    showDoor,
    setShowDoor,
    showPodium,
    setShowPodium,
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
    runSceneTransaction,
    selectedTableIds,
    setSelectedTableIds,
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

    const FEATURE_PALETTE = React.useMemo<FeaturePaletteItem[]>(
      () => [
        {
          type: 'window',
          label: t('layout.window', 'Fenster'),
          icon: <PanoramaIcon size={16} />,
          width: WINDOW_WIDTH,
          height: WINDOW_HEIGHT,
          movable: false,
          allowMultiple: true,
        },
        {
          type: 'door',
          label: t('layout.door', 'Tür'),
          icon: <DoorIcon size={16} />,
          width: DOOR_WIDTH,
          height: DOOR_HEIGHT,
          movable: false,
          allowMultiple: true,
        },
        {
          type: 'board',
          label: t('layout.board', 'Tafel'),
          icon: <ChalkboardSimpleIcon size={16} />,
          width: BOARD_WIDTH,
          height: BOARD_HEIGHT,
          movable: false,
          allowMultiple: false,
        },
        {
          type: 'podium',
          label: t('layout.podium', 'Pult'),
          icon: <LecternIcon size={16} />,
          width: PODIUM_WIDTH,
          height: PODIUM_HEIGHT,
          movable: true,
          allowMultiple: false,
        },
      ],
      [t],
    );

    const featureTemplateMap = React.useMemo(() => {
      const map = new Map<ClassroomFeatureType, FeaturePaletteItem>();
      FEATURE_PALETTE.forEach((item) => map.set(item.type, item));
      return map;
    }, [FEATURE_PALETTE]);

    const {
      handleCanvasPointerMove,
      handleCanvasPointerUp,
      beginSelectionWithLongPress,
      handleTablePointerDown,
      copySelectedTables,
      cutSelectedTables,
      deleteSelectedTables,
      handleCanvasMenuPaste,
      canPasteTables,
      canPasteFeatures,
      featureClipboard,
      setFeatureClipboard,
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
      onCloseFeatureContextMenu: onCloseFeatureContextMenu ?? (() => { }),
      canPasteTables,
      canPasteFeatures,
    });

    const featureAvailability = React.useMemo(() => {
      const features = sceneFeatures ?? [];
      return {
        board: features.some((feature) => feature.type === 'board'),
        windows: features.some((feature) => feature.type === 'window'),
        door: features.some((feature) => feature.type === 'door'),
        podium: features.some((feature) => feature.type === 'podium'),
      };
    }, [sceneFeatures]);

    React.useEffect(() => {
      if (!sceneFeatures) {
        return;
      }
      let boardSeen = false;
      let podiumSeen = false;
      const filtered = sceneFeatures.filter((feature) => {
        if (feature.type === 'board') {
          if (boardSeen) {
            return false;
          }
          boardSeen = true;
        } else if (feature.type === 'podium') {
          if (podiumSeen) {
            return false;
          }
          podiumSeen = true;
        }
        return true;
      });
      if (filtered.length !== sceneFeatures.length) {
        setSceneFeatures(filtered);
      }
    }, [sceneFeatures, setSceneFeatures]);

    const effectiveShowBoard = featureAvailability.board ? showBoard : false;
    const effectiveShowWindows = featureAvailability.windows
      ? showWindows
      : false;
    const effectiveShowDoor = featureAvailability.door ? showDoor : false;
    const effectiveShowPodium = featureAvailability.podium ? showPodium : false;
    const hasFeatureClipboard = Boolean(
      featureClipboard && featureClipboard.length > 0,
    );

    const [featureHandleAnchors, setFeatureHandleAnchors] = React.useState<
      Map<string, FeatureHandleAnchor>
    >(() => new Map());
    const updateFeatureHandleAnchors = React.useCallback(
      (updater: (next: Map<string, FeatureHandleAnchor>) => void) => {
        setFeatureHandleAnchors((prev) => {
          const next = new Map(prev);
          updater(next);
          return next;
        });
      },
      [],
    );
    React.useEffect(
      () => () => {
        setFeatureClipboard(null);
      },
      [setFeatureClipboard],
    );
    const [activeFeatureId, setActiveFeatureId] = React.useState<string | null>(
      null,
    );
    const handleFeatureAdded = React.useCallback(
      (feature: ClassroomFeature) => {
        if (feature.type === 'board') {
          setShowBoard(true);
        }
        if (feature.type === 'podium') {
          setShowPodium(true);
          updateFeatureHandleAnchors((next) => {
            if (!next.has(feature.id)) {
              next.set(
                feature.id,
                calculateFeatureHandleAnchor(
                  feature.width,
                  feature.height,
                  feature.rotation ?? 0,
                ),
              );
            }
          });
        }
        if (feature.type === 'window') {
          setShowWindows(true);
        }
        if (feature.type === 'door') {
          setShowDoor(true);
        }
        setActiveFeatureId(feature.id);
      },
      [
        setActiveFeatureId,
        setShowBoard,
        setShowPodium,
        setShowWindows,
        setShowDoor,
        updateFeatureHandleAnchors,
      ],
    );
    const handleCopyFeature = React.useCallback(
      (featureId: string) => {
        const feature = sceneFeatures.find((item) => item.id === featureId);
        if (!feature) {
          return;
        }
        setFeatureClipboard([deepClone(feature)]);
        closeFeatureContextMenu();
      },
      [closeFeatureContextMenu, sceneFeatures, setFeatureClipboard],
    );

    const handleDeleteFeature = React.useCallback(
      (featureId: string) => {
        const targetFeature = sceneFeatures.find(
          (item) => item.id === featureId,
        );
        if (!targetFeature) {
          return;
        }
        updateFeatureHandleAnchors((next) => {
          next.delete(featureId);
        });
        snapshot();
        runSceneTransaction(({ features, scene, tables, seating }) => {
          const existing = features ?? scene.features ?? [];
          const nextFeatures = existing.filter(
            (feature) => feature.id !== featureId,
          );
          return {
            features: nextFeatures,
            scene: { ...scene, features: nextFeatures },
            tables,
            seating,
          };
        });
        if (targetFeature.type === 'board') {
          setShowBoard(false);
        }
        setActiveFeatureId((prev) => (prev === featureId ? null : prev));
        closeFeatureContextMenu();
      },
      [
        closeFeatureContextMenu,
        runSceneTransaction,
        sceneFeatures,
        setActiveFeatureId,
        setShowBoard,
        snapshot,
        updateFeatureHandleAnchors,
      ],
    );

    const handleCutFeature = React.useCallback(
      (featureId: string) => {
        const feature = sceneFeatures.find((item) => item.id === featureId);
        if (!feature) {
          return;
        }
        setFeatureClipboard([deepClone(feature)]);
        snapshot();
        updateFeatureHandleAnchors((next) => {
          next.delete(featureId);
        });
        runSceneTransaction(({ features, scene, tables, seating }) => {
          const existing = features ?? scene.features ?? [];
          const nextFeatures = existing.filter((item) => item.id !== featureId);
          return {
            features: nextFeatures,
            scene: { ...scene, features: nextFeatures },
            tables,
            seating,
          };
        });
        if (feature.type === 'board') {
          setShowBoard(false);
        }
        setActiveFeatureId((prev) => (prev === featureId ? null : prev));
        closeFeatureContextMenu();
      },
      [
        closeFeatureContextMenu,
        runSceneTransaction,
        sceneFeatures,
        setFeatureClipboard,
        setActiveFeatureId,
        setShowBoard,
        snapshot,
        updateFeatureHandleAnchors,
      ],
    );

    React.useEffect(() => {
      const handleFeatureDeleteKey = (event: KeyboardEvent) => {
        if (event.key !== 'Delete' && event.key !== 'Backspace') {
          return;
        }

        if (!activeFeatureId) {
          return;
        }

        const activeElement = document.activeElement;
        if (
          activeElement &&
          (activeElement instanceof HTMLInputElement ||
            activeElement instanceof HTMLTextAreaElement ||
            activeElement instanceof HTMLSelectElement ||
            (activeElement instanceof HTMLElement &&
              activeElement.isContentEditable))
        ) {
          return;
        }

        if (selectedTableIds.length > 0) {
          return;
        }

        event.preventDefault();
        handleDeleteFeature(activeFeatureId);
      };

      window.addEventListener('keydown', handleFeatureDeleteKey);
      return () => {
        window.removeEventListener('keydown', handleFeatureDeleteKey);
      };
    }, [activeFeatureId, handleDeleteFeature, selectedTableIds]);

    const performFeaturePaste = React.useCallback(
      (state: CanvasContextMenuState) => {
        const clipboardFeatures = featureClipboard;
        if (!clipboardFeatures || clipboardFeatures.length === 0) {
          return;
        }

        const sceneX = state.sceneX ?? canvasWidth / 2;
        const sceneY = state.sceneY ?? classroomHeight / 2;

        const pastedFeatures = clipboardFeatures
          .map((feature, index) => {
            const template = featureTemplateMap.get(feature.type);
            if (!template) {
              return null;
            }

            let placement: FeaturePlacement;
            if (template.movable) {
              const offset = index * 20;
              placement = placeMovableFeatureBase(
                template,
                sceneX - template.width / 2 + offset,
                sceneY - template.height / 2 + offset,
                snapToGrid,
                canvasWidth,
                classroomHeight,
              );
            } else {
              placement = placeFixedFeatureBase(
                template,
                sceneX,
                sceneY,
                snapToGrid,
                canvasWidth,
                classroomHeight,
              );
            }

            let nextFeature: ClassroomFeature = {
              ...feature,
              id: generateId(),
              x: placement.x,
              y: placement.y,
              width: placement.width ?? template.width,
              height: placement.height ?? template.height,
              movable: template.movable,
              anchor: placement.anchor,
              label: template.label,
              rotation: feature.rotation ?? 0,
            };

            if (!template.movable) {
              nextFeature = rotateFeatureForAnchor(
                nextFeature,
                placement.anchor,
              );
            }

            return nextFeature;
          })
          .filter((item): item is ClassroomFeature => item !== null);

        if (pastedFeatures.length === 0) {
          return;
        }

        pastedFeatures.forEach((createdFeature) => {
          handleFeatureAdded(createdFeature);
        });

        snapshot();
        runSceneTransaction(({ features, scene, tables, seating }) => {
          const existing = features ?? scene.features ?? [];
          const nextFeatures = [...existing, ...pastedFeatures];
          return {
            features: nextFeatures,
            scene: { ...scene, features: nextFeatures },
            tables,
            seating,
          };
        });
      },
      [
        canvasWidth,
        classroomHeight,
        featureClipboard,
        snapToGrid,
        runSceneTransaction,
        handleFeatureAdded,
        snapshot,
        featureTemplateMap,
      ],
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
      toSceneCoordinates,
      sceneToClient,
      canvasRef,
      onFeatureAdded: handleFeatureAdded,
      openFeatureContextMenu,
      closeFeatureContextMenu,
      setActiveFeatureId,
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
        setActiveFeatureId(null);
        beginSelectionWithLongPress(e);
      },
      [
        beginSelectionWithLongPress,
        canvasContextMenu,
        handleCloseCanvasMenu,
        handleCloseFeatureMenu,
        handleCloseTableMenu,
        featureContextMenu,
        setActiveFeatureId,
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

            // Select the table if not already selected
            if (!selectedTableIds.includes(tableIndex)) {
              setSelectedTableIds([tableIndex]);
            }
            setActiveFeatureId(null);

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
          setActiveFeatureId(featureId);

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
        if (!canPasteTables && !hasFeatureClipboard) return;

        setActiveFeatureId(null);

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
        canPasteTables,
        closeTableContextMenu,
        closeCanvasContextMenu,
        closeFeatureContextMenu,
        hasFeatureClipboard,
        openFeatureContextMenu,
        setCanvasContextMenu,
        setTableContextMenu,
        sceneTables,
        selectedTableIds,
        setActiveFeatureId,
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

    const handleToggleBoard = React.useCallback(
      (checked: boolean) => {
        setShowBoard(() => checked);
      },
      [setShowBoard],
    );

    const handleToggleWindows = React.useCallback(
      (checked: boolean) => {
        setShowWindows(() => checked);
      },
      [setShowWindows],
    );

    const handleToggleDoor = React.useCallback(
      (checked: boolean) => {
        setShowDoor(() => checked);
      },
      [setShowDoor],
    );

    const handleTogglePodium = React.useCallback(
      (checked: boolean) => {
        setShowPodium(() => checked);
      },
      [setShowPodium],
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
        {
          id: 'layout-features',
          title: t('layout.roomElements', 'Raumelemente'),
          options: [
            {
              id: 'board',
              label: t('editor.showBoard', 'Tafel anzeigen'),
              icon: <ChalkboardSimpleIcon size={16} />,
              checked: effectiveShowBoard,
              onChange: handleToggleBoard,
              disabled: !featureAvailability.board,
            },
            {
              id: 'windows',
              label: t('editor.showWindows', 'Fenster anzeigen'),
              icon: <PanoramaIcon size={16} />,
              checked: effectiveShowWindows,
              onChange: handleToggleWindows,
              disabled: !featureAvailability.windows,
            },
            {
              id: 'door',
              label: t('editor.showDoor', 'Tür anzeigen'),
              icon: <DoorIcon size={16} />,
              checked: effectiveShowDoor,
              onChange: handleToggleDoor,
              disabled: !featureAvailability.door,
            },
            {
              id: 'podium',
              label: t('editor.showPodium', 'Pult anzeigen'),
              icon: <LecternIcon size={16} />,
              checked: effectiveShowPodium,
              onChange: handleTogglePodium,
              disabled: !featureAvailability.podium,
            },
          ],
        },
      ],
      [
        featureAvailability,
        effectiveShowBoard,
        effectiveShowDoor,
        effectiveShowPodium,
        effectiveShowWindows,
        handleToggleBoard,
        handleToggleDoor,
        handleTogglePodium,
        handleToggleShowGrid,
        handleToggleSnapToGrid,
        handleToggleWindows,
        showGrid,
        snapToGrid,
        t,
      ],
    );

    const tableMenuActions = React.useMemo(
      () => [
        {
          label: t('common.copy', 'Kopieren'),
          icon: Copy,
          onSelect: copySelectedTables,
        },
        {
          label: t('common.cut', 'Ausschneiden'),
          icon: Scissors,
          onSelect: cutSelectedTables,
        },
        {
          label: t('common.delete', 'Entfernen'),
          icon: TrashIcon,
          onSelect: deleteSelectedTables,
        },
      ],
      [copySelectedTables, cutSelectedTables, deleteSelectedTables, t],
    );
    const canvasMenuActions = React.useMemo(() => {
      if (!canvasContextMenu) return [];

      const menuState = canvasContextMenu;
      const actions: {
        label: string;
        icon: typeof ClipboardText;
        onSelect: () => void;
        disabled?: boolean;
      }[] = [];

      if (canPasteTables) {
        actions.push({
          label: t('canvas.pasteTables', 'Tische einfügen'),
          icon: ClipboardText,
          onSelect: () => handleCanvasMenuPaste(menuState),
          disabled: !canPasteTables,
        });
      }

      if (hasFeatureClipboard) {
        actions.push({
          label: t('canvas.pasteFeature', 'Raumelement einfügen'),
          icon: ClipboardText,
          onSelect: () => {
            performFeaturePaste(menuState);
            closeCanvasContextMenu();
          },
        });
      }

      return actions;
    }, [
      canvasContextMenu,
      canPasteTables,
      closeCanvasContextMenu,
      handleCanvasMenuPaste,
      hasFeatureClipboard,
      performFeaturePaste,
      t,
    ]);

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
      return [
        {
          label: t('common.copy', 'Kopieren'),
          icon: Copy,
          onSelect: () => handleCopyFeature(feature.id),
        },
        {
          label: t('common.cut', 'Ausschneiden'),
          icon: Scissors,
          onSelect: () => handleCutFeature(feature.id),
        },
        {
          label: t('common.delete', 'Entfernen'),
          icon: TrashIcon,
          onSelect: () => handleDeleteFeature(feature.id),
        },
      ];
    }, [
      featureContextMenu,
      sceneFeatures,
      handleCopyFeature,
      handleCutFeature,
      handleDeleteFeature,
      t,
    ]);
    const canvasProps: React.ComponentProps<typeof ClassroomCanvas> = {
      canvasRef,
      canvasWidth,
      classroomHeight,
      showGrid,
      showBoard,
      showWindows,
      showDoor,
      showPodium,
      activeFeatureId,
      onFeatureRotateStart: handleFeatureRotateStart,
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
      featureHandleAnchors,
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
      prevProps.showBoard === nextProps.showBoard &&
      prevProps.showWindows === nextProps.showWindows &&
      prevProps.showDoor === nextProps.showDoor &&
      prevProps.showPodium === nextProps.showPodium &&
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
      prevProps.setShowBoard === nextProps.setShowBoard &&
      prevProps.setShowWindows === nextProps.setShowWindows &&
      prevProps.setShowDoor === nextProps.setShowDoor &&
      prevProps.setShowPodium === nextProps.setShowPodium &&
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
  layoutSettingsGroups: LayoutSettingsGroup[];
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
          className={`${primaryButtonClass} flex items-center gap-2 ${footerProps.seatCount < footerProps.studentsCount
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

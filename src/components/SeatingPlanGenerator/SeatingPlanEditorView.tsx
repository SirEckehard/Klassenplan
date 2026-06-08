import React from 'react';
import equal from 'fast-deep-equal';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import {
  WarningIcon,
  ArrowLeftIcon,
  ChartBarIcon,
  LecternIcon,
  DoorIcon,
  GridNine,
  SpinnerGapIcon,
  PanoramaIcon,
  ChalkboardSimpleIcon,
  FloppyDiskIcon,
  ExportIcon,
} from '@phosphor-icons/react';
import SmartSidebar from '@/components/ui/panels/SmartSidebar';
import SmartMixControls from '@/components/ui/controls/SmartMixControls';
import MixCriteriaIcons from '@/components/ui/icons/MixCriteriaIcons';
import FloatingMixButton from '@/components/ui/buttons/FloatingMixButton';
import SeatingModeToggle from '@/components/SeatingPlanGenerator/SeatingModeToggle';
import SeatingPlanCanvas from '@/components/SeatingPlanGenerator/SeatingPlanCanvas';
import SeatingStatisticsBadge from '@/components/ui/feedback/SeatingStatisticsBadge';
import StorageSidebarSection from '@/components/ui/navigation/StorageSidebarSection';
import { CanvasSettingsButton } from '@/components/SeatingPlanGenerator/canvas/CanvasSettingsButton';
import {
  GRID_SIZE,
  isFormElementFocused,
  getDisplayName,
  canvasFrameClass,
  getViewportMetrics,
  primaryButtonClass,
  neutralButtonClass,
  secondaryButtonClass,
  inputFieldClass,
  mutedIconButtonClass,
  cardSurfaceClass,
  onVisualViewport,
  buildSeatHighlightLookup,
} from '@/utils';
import { calculateBadgePillLayout } from '@/utils/ui/studentAppearance';
import type {
  MixSettings,
  SeatingArrangement,
  ClassroomTable,
  ClassroomScene,
  Student,
  SavedPlan,
  MixResult,
} from '@/types';
import {
  calculateCriteriaWeightedScore,
  type CriterionFulfillment,
} from '@/utils/algorithm/seatingStatistics';
import { useIsDarkMode } from '@/hooks/useIsDarkMode';
import { useFirstVisit } from '@/hooks/ui/useFirstVisit';
import { useIsMobile } from '@/hooks/ui/useIsMobile';
import { buildCriterionHighlightEntries } from '@/utils/algorithm/criterionHighlights';
import type {
  DragPreview,
  DragOrigin,
  DragHover,
  LockedDropTarget,
  DragSeatConfig,
} from '@/hooks/ui/useDragDropState';
import type { TemplateDragPreview } from '@/types/templateDrag';

type SeatPreviewCardProps = {
  preview: DragPreview;
  viewportScale: number;
};

function SeatPreviewCard({ preview, viewportScale }: SeatPreviewCardProps) {
  const clampedViewportScale = Math.max(0.3, Math.min(1, viewportScale * 0.92));
  const baseTarget = 60 * clampedViewportScale;
  const maxDimension = Math.max(preview.seatWidth, preview.seatHeight, 1);
  const targetSize = Math.max(24, Math.min(68, baseTarget));
  const sizeScale = targetSize / maxDimension;
  const width = Math.max(24, preview.seatWidth * sizeScale);
  const height = Math.max(24, preview.seatHeight * sizeScale);
  const badgeLayout =
    preview.flags.length > 0
      ? calculateBadgePillLayout({
        availableWidth: Math.max(width - 14, 30),
        iconCount: preview.flags.length,
        baseIconSize: Math.max(7, Math.min(10, width * 0.18)),
        minIconSize: 6,
        horizontalPadding: 6,
        verticalPadding: 1,
        rowGap: 2,
        minIconsForWrap: 5,
      })
      : null;

  return (
    <div
      className={`${cardSurfaceClass} pointer-events-none px-2 py-2 shadow-lg backdrop-blur-sm bg-white/90 dark:bg-gray-800/90`}
    >
      <div
        className="relative flex items-center justify-center rounded-md"
        style={{
          width,
          height,
          backgroundColor: preview.appearance.fill,
          border: `2px solid ${preview.appearance.stroke}`,
          transition: 'transform 150ms ease',
        }}
      >
        <span
          className="text-xs font-semibold"
          style={{ color: preview.appearance.text }}
        >
          {getDisplayName(
            preview.student.name,
            preview.showFullName ? 'full' : 'table',
          )}
        </span>
        {preview.flags.length > 0 && badgeLayout && (
          <div
            className="pointer-events-none absolute left-1/2 bottom-1 -translate-x-1/2 rounded-full border"
            style={{
              position: 'absolute',
              width: badgeLayout.width,
              height: badgeLayout.height,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderColor: 'rgba(148, 163, 184, 0.6)',
            }}
          >
            <div className="relative h-full w-full">
              {preview.flags.map(({ key, icon: Icon, tooltip }, index) => {
                const position = badgeLayout.iconPositions[index];
                if (!position) {
                  return null;
                }
                return (
                  <span
                    key={key}
                    className="absolute flex items-center justify-center"
                    style={{
                      left: position.x,
                      top: position.y,
                      width: badgeLayout.iconSize,
                      height: badgeLayout.iconSize,
                    }}
                  >
                    <Icon size={badgeLayout.iconSize} color="#d97706">
                      <title>{tooltip}</title>
                    </Icon>
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type Props = {
  settings: MixSettings;
  setMixSettings: React.Dispatch<React.SetStateAction<MixSettings>>;
  handleMix: () => Promise<void>;
  isMixing: boolean;
  autoMixing?: boolean;
  autoMixError?: string | null;
  showBoard: boolean;
  setShowBoard: React.Dispatch<React.SetStateAction<boolean>>;
  showWindows: boolean;
  setShowWindows: React.Dispatch<React.SetStateAction<boolean>>;
  showDoor: boolean;
  setShowDoor: React.Dispatch<React.SetStateAction<boolean>>;
  showPodium: boolean;
  setShowPodium: React.Dispatch<React.SetStateAction<boolean>>;
  canvasWidth: number;
  classroomHeight: number;
  showGrid: boolean;
  setShowGrid: React.Dispatch<React.SetStateAction<boolean>>;
  sceneTables: ClassroomTable[];
  currentSeating: SeatingArrangement;
  students: Student[];
  emptySeating: SeatingArrangement;
  moveStudent?: (
    fromTable: number,
    fromSeat: number,
    toTable: number,
    toSeat: number,
  ) => boolean;
  isSeatLocked?: (table: number, seat: number) => boolean;
  toggleLock?: (studentId: string, table: number, seat: number) => void;
  handleSeatDragStart: (student: Student, config: DragSeatConfig) => void;
  handleSeatDrag: (x: number, y: number) => void;
  handleSeatDragEnd: () => void;
  dragOrigin: DragOrigin | null;
  dragHover: DragHover | null;
  lockedDropTarget: LockedDropTarget | null;
  handleSeatHoverChange: (hover: DragHover | null) => void;
  handleLockedDrop: (target: DragHover) => void;
  onTableUpdate: () => void;
  snapshot: () => void;
  dragPreview: DragPreview | null;
  planName: string;
  setPlanName: (v: string) => void;
  planNameError: boolean;
  setPlanNameError: (v: boolean) => void;
  planNameInputRef: React.RefObject<HTMLInputElement | null>;
  onEditLayout: () => void;
  saveSeatingPlan: (name: string, scene: ClassroomScene) => void;
  classroomScene: ClassroomScene;
  onExport: () => void;
  seatingMode?: 'table' | 'circle';
  onModeChange?: (mode: 'table' | 'circle') => void;
  showModeToggle?: boolean;
  lastStatistics?: CriterionFulfillment[] | null;
  onCloseStatistics?: () => void;
  onOpenStatistics?: () => void;
  showStatisticsBadge?: boolean;
  templateDragPreview?: TemplateDragPreview | null;
  hasPendingStudentUpdates?: boolean;
  onAcknowledgeStudentUpdates?: () => void;
  statisticsHighlight?: import('@/types').StatisticHighlightState | null;
  setStatisticsHighlight?: React.Dispatch<
    React.SetStateAction<import('@/types').StatisticHighlightState | null>
  >;
  setStatisticsHighlightMode?: (
    mode: import('@/types').StatisticHighlightMode | null,
  ) => void;
  clearStatisticsHighlight?: () => void;
  seatingHistory?: SavedPlan[];
  mixHistory?: MixResult[];
};

export default function SeatingPlanEditorView({
  settings,
  setMixSettings,
  handleMix,
  isMixing,
  autoMixing = false,
  autoMixError = null,
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
  onTableUpdate,
  snapshot,
  dragPreview,
  planName,
  setPlanName,
  planNameError,
  setPlanNameError,
  planNameInputRef,
  onEditLayout,
  saveSeatingPlan,
  classroomScene,
  onExport,
  seatingMode,
  onModeChange,
  showModeToggle,
  lastStatistics,
  onCloseStatistics,
  onOpenStatistics,
  showStatisticsBadge,
  templateDragPreview = null,
  hasPendingStudentUpdates = false,
  onAcknowledgeStudentUpdates,
  statisticsHighlight = null,
  setStatisticsHighlight,
  setStatisticsHighlightMode,
  clearStatisticsHighlight,
  seatingHistory = [],
  mixHistory = [],
}: Props) {
  const isDark = useIsDarkMode();
  const { t } = useTranslation('generator');
  const isFirstVisit = useFirstVisit();
  const isMobile = useIsMobile();
  const backgroundColor = isDark ? '#1f2937' : '#f9fafb';
  const gridColor = isDark ? '#374151' : '#e5e7eb';

  const handleToggleBoard = React.useCallback(
    (checked: boolean) => setShowBoard(() => checked),
    [setShowBoard],
  );
  const handleToggleWindows = React.useCallback(
    (checked: boolean) => setShowWindows(() => checked),
    [setShowWindows],
  );
  const handleToggleDoor = React.useCallback(
    (checked: boolean) => setShowDoor(() => checked),
    [setShowDoor],
  );
  const handleTogglePodium = React.useCallback(
    (checked: boolean) => setShowPodium(() => checked),
    [setShowPodium],
  );
  const handleToggleGrid = React.useCallback(
    (checked: boolean) => setShowGrid(() => checked),
    [setShowGrid],
  );

  const featureAvailability = React.useMemo(() => {
    const features = classroomScene.features ?? [];
    return {
      board: features.some((feature) => feature.type === 'board'),
      windows: features.some((feature) => feature.type === 'window'),
      door: features.some((feature) => feature.type === 'door'),
      podium: features.some((feature) => feature.type === 'podium'),
    };
  }, [classroomScene.features]);

  const effectiveShowBoard = featureAvailability.board ? showBoard : false;
  const effectiveShowWindows = featureAvailability.windows
    ? showWindows
    : false;
  const effectiveShowDoor = featureAvailability.door ? showDoor : false;
  const effectiveShowPodium = featureAvailability.podium ? showPodium : false;

  const seatingSettingsGroups = React.useMemo(
    () => [
      {
        id: 'editor-canvas',
        title: t('editor.workspace', 'Arbeitsfläche'),
        options: [
          {
            id: 'show-grid',
            label: t('editor.showGrid', 'Raster anzeigen'),
            icon: <GridNine size={16} />,
            checked: showGrid,
            onChange: handleToggleGrid,
          },
        ],
      },
      {
        id: 'editor-features',
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
      effectiveShowBoard,
      effectiveShowDoor,
      effectiveShowPodium,
      effectiveShowWindows,
      featureAvailability,
      handleToggleBoard,
      handleToggleDoor,
      handleToggleGrid,
      handleTogglePodium,
      handleToggleWindows,
      showGrid,
      t,
    ],
  );
  const canvasContainerRef = React.useRef<HTMLDivElement | null>(null);
  const [previewViewportScale, setPreviewViewportScale] = React.useState(1);
  const [viewportOffset, setViewportOffset] = React.useState({
    left: 0,
    top: 0,
  });
  const hasStatistics = Boolean(lastStatistics && lastStatistics.length > 0);
  const statisticsScore = React.useMemo(() => {
    if (!lastStatistics || lastStatistics.length === 0) {
      return 0;
    }
    return Math.round(calculateCriteriaWeightedScore(lastStatistics));
  }, [lastStatistics]);
  const effectiveSeating = React.useMemo(
    () =>
      currentSeating.map((seating, tIndex) =>
        seating?.length ? seating : (emptySeating[tIndex] ?? []),
      ),
    [currentSeating, emptySeating],
  );
  const statisticsButtonTitle = t(
    'editor.showStatistics',
    'Statistik anzeigen',
  );
  const statisticsButtonLabel = t(
    'editor.statisticsLabel',
    'Statistik anzeigen – Gesamt-Score {{score}}%',
    { score: statisticsScore },
  );
  const statisticsButtonClasses = `${mutedIconButtonClass} absolute bottom-3 right-3 z-20 flex min-h-10 items-center justify-center gap-2 rounded-full bg-white/90 px-3 py-2 text-blue-700 shadow-md transition hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:bg-gray-900/70 dark:text-blue-200 sm:min-h-12 sm:gap-3 sm:px-4`;
  const canShowStatisticsBadge = Boolean(
    showStatisticsBadge &&
    lastStatistics &&
    lastStatistics.length > 0 &&
    onCloseStatistics,
  );
  const seatHighlightLookup = React.useMemo(
    () => buildSeatHighlightLookup(statisticsHighlight),
    [statisticsHighlight],
  );
  const mixingLocked = isMixing || autoMixing;
  const activeHighlightKey = statisticsHighlight?.key ?? null;
  const activeHighlightMode = statisticsHighlight?.mode ?? null;
  const buildHighlightEntriesForCriterion = React.useCallback(
    (criterion: CriterionFulfillment) =>
      buildCriterionHighlightEntries({
        criterionKey: criterion.key,
        arrangement: effectiveSeating,
        scene: classroomScene,
        seatingHistory,
        mixHistory,
      }),
    [classroomScene, effectiveSeating, mixHistory, seatingHistory],
  );

  const handleCriterionHover = React.useCallback(
    (criterion: CriterionFulfillment) => {
      if (!setStatisticsHighlight) return;
      if (statisticsHighlight?.mode === 'persistent') return;
      const entries = buildHighlightEntriesForCriterion(criterion);
      if (!entries.length) {
        setStatisticsHighlight(null);
        return;
      }
      setStatisticsHighlight({
        key: criterion.key,
        mode: 'hover',
        entries,
      });
      setStatisticsHighlightMode?.('hover');
    },
    [
      buildHighlightEntriesForCriterion,
      setStatisticsHighlight,
      setStatisticsHighlightMode,
      statisticsHighlight?.mode,
    ],
  );

  const handleCriterionHoverEnd = React.useCallback(() => {
    if (!setStatisticsHighlight) return;
    setStatisticsHighlight((current) =>
      current && current.mode === 'hover' ? null : current,
    );
  }, [setStatisticsHighlight]);

  const handleCriterionToggle = React.useCallback(
    (criterion: CriterionFulfillment) => {
      if (!setStatisticsHighlight) return;
      setStatisticsHighlight((current) => {
        const isSamePersistent =
          current &&
          current.key === criterion.key &&
          current.mode === 'persistent';
        if (isSamePersistent) {
          return null;
        }
        const entries = buildHighlightEntriesForCriterion(criterion);
        if (!entries.length) {
          return null;
        }
        return {
          key: criterion.key,
          mode: 'persistent',
          entries,
        };
      });
      setStatisticsHighlightMode?.('persistent');
    },
    [
      buildHighlightEntriesForCriterion,
      setStatisticsHighlight,
      setStatisticsHighlightMode,
    ],
  );

  const handleStatisticsToggle = React.useCallback(() => {
    if (!hasStatistics) {
      return;
    }
    if (showStatisticsBadge) {
      onCloseStatistics?.();
    } else {
      onOpenStatistics?.();
    }
  }, [hasStatistics, onCloseStatistics, onOpenStatistics, showStatisticsBadge]);

  React.useEffect(() => {
    if (!statisticsHighlight || !setStatisticsHighlight) {
      return;
    }
    const targetCriterion = lastStatistics?.find(
      (criterion) => criterion.key === statisticsHighlight.key,
    );
    if (!targetCriterion) {
      return;
    }

    const nextEntries = buildHighlightEntriesForCriterion(targetCriterion);
    const prevEntries = statisticsHighlight.entries;
    const entriesChanged =
      prevEntries.length !== nextEntries.length ||
      prevEntries.some((entry, index) => {
        const next = nextEntries[index];
        if (!next) return true;
        return (
          entry.target.tableIndex !== next.target.tableIndex ||
          entry.target.seatIndex !== next.target.seatIndex ||
          entry.status !== next.status ||
          Math.round(entry.percentage) !== Math.round(next.percentage)
        );
      });

    if (!entriesChanged) {
      return;
    }

    setStatisticsHighlight((current) => {
      if (!current || current.key !== statisticsHighlight.key) {
        return current;
      }
      return {
        ...current,
        entries: nextEntries,
      };
    });
  }, [
    buildHighlightEntriesForCriterion,
    lastStatistics,
    statisticsHighlight,
    setStatisticsHighlight,
  ]);

  React.useEffect(() => {
    const node = canvasContainerRef.current;
    if (!node) {
      return;
    }

    const calculateScale = () => {
      const rect = node.getBoundingClientRect();
      const width =
        rect.width || (typeof window !== 'undefined' ? window.innerWidth : 0);
      if (width <= 0 || canvasWidth <= 0) {
        setPreviewViewportScale(1);
        return;
      }
      setPreviewViewportScale(width / canvasWidth);
    };

    calculateScale();

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        calculateScale();
      });
      observer.observe(node);
    } else if (typeof window !== 'undefined') {
      window.addEventListener('resize', calculateScale);
    }

    return () => {
      if (observer) {
        observer.disconnect();
      } else if (typeof window !== 'undefined') {
        window.removeEventListener('resize', calculateScale);
      }
    };
  }, [canvasWidth]);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const updateOffset = () => {
      const { offsetLeft, offsetTop } = getViewportMetrics();
      const nextOffset = {
        left: offsetLeft,
        top: offsetTop,
      };
      setViewportOffset((previous) =>
        previous.left === nextOffset.left && previous.top === nextOffset.top
          ? previous
          : nextOffset,
      );
    };

    updateOffset();

    const removeScroll = onVisualViewport('scroll', updateOffset);
    const removeResize = onVisualViewport('resize', updateOffset);

    return () => {
      removeScroll();
      removeResize();
    };
  }, []);

  React.useEffect(() => {
    if (!showStatisticsBadge) {
      clearStatisticsHighlight?.();
    }
  }, [showStatisticsBadge, clearStatisticsHighlight]);

  // CheckIcon if there are unsaved changes compared to the saved plan
  const hasUnsavedChanges = React.useCallback(() => {
    const trimmedName = planName.trim();
    if (!trimmedName) return true; // New unnamed plan

    const savedPlan = seatingHistory.find((p) => p.name === trimmedName);
    if (!savedPlan) return true; // Plan doesn't exist yet

    // Compare current state with saved plan
    const seatingChanged = !equal(savedPlan.seating, currentSeating);
    const sceneChanged = !equal(savedPlan.scene, classroomScene);

    return seatingChanged || sceneChanged;
  }, [planName, seatingHistory, currentSeating, classroomScene]);

  // Export handler that saves only if there are changes
  const handleExportWithConditionalSave = React.useCallback(() => {
    if (hasUnsavedChanges()) {
      saveSeatingPlan(planName, classroomScene);
    }
    onExport();
  }, [hasUnsavedChanges, saveSeatingPlan, planName, classroomScene, onExport]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isFormElementFocused()) {
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        saveSeatingPlan(planName, classroomScene);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'e') {
        event.preventDefault();
        handleExportWithConditionalSave();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'm') {
        event.preventDefault();
        if (!mixingLocked) {
          void handleMix();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    planName,
    classroomScene,
    saveSeatingPlan,
    handleExportWithConditionalSave,
    handleMix,
    mixingLocked,
  ]);

  const handleMixSettingChange = React.useCallback(
    (key: keyof MixSettings, value: number) => {
      setMixSettings((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    [setMixSettings],
  );

  return (
    <div className="space-y-6">
      {autoMixing ? (
        <section
          aria-live="polite"
          role="status"
          className={`${cardSurfaceClass} border-blue-200 bg-blue-50/80 px-4 py-3 text-blue-900 shadow-xs backdrop-blur dark:border-blue-500/40 dark:bg-blue-900/20 dark:text-blue-50`}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20 text-blue-600 dark:bg-blue-400/20 dark:text-blue-200">
                <SpinnerGapIcon aria-hidden="true" className="h-5 w-5 animate-spin" />
              </span>
              <div className="space-y-0.5">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  {t('editor.autoMixRunning', 'Automatisches Mischen läuft')}
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-100/90">
                  {t(
                    'editor.autoMixWait',
                    'Bitte warte einen Moment, bis der neue Sitzplan erstellt wurde.',
                  )}
                </p>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {!autoMixing && autoMixError ? (
        <section
          aria-live="polite"
          role="alert"
          className={`${cardSurfaceClass} border-red-200 bg-red-50/80 px-4 py-4 text-red-900 shadow-xs backdrop-blur dark:border-red-500/40 dark:bg-red-900/40 dark:text-red-100`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-1 items-start gap-3">
              <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20 text-red-600 dark:bg-red-400/20 dark:text-red-200">
                <WarningIcon aria-hidden="true" className="h-5 w-5" />
              </span>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-red-900 dark:text-red-100">
                  {t(
                    'editor.autoMixFailed',
                    'Automatisches Mischen fehlgeschlagen',
                  )}
                </p>
                <p className="text-sm text-red-800 dark:text-red-100/90">
                  {autoMixError}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => void handleMix()}
                disabled={mixingLocked}
                className={`${primaryButtonClass} h-10 px-4 ${mixingLocked ? 'cursor-not-allowed opacity-60' : ''
                  }`}
              >
                {t('actions.retryMix', 'Erneut mischen')}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {hasPendingStudentUpdates ? (
        <section
          aria-live="polite"
          role="status"
          className={`${cardSurfaceClass} border-amber-200 bg-amber-50/80 px-4 py-4 text-amber-900 shadow-xs backdrop-blur dark:border-amber-500/40 dark:bg-amber-900/30 dark:text-amber-100`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-1 items-start gap-3">
              <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-600 dark:bg-amber-400/20 dark:text-amber-200">
                <WarningIcon aria-hidden="true" className="h-5 w-5" />
              </span>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                  {t('editor.classDataChanged', 'Klassendaten wurden geändert')}
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-100/90">
                  {t(
                    'editor.classDataChangedHint',
                    'Deine Anpassungen sind sichtbar. Mische den Plan neu, damit der Algorithmus optimal reagieren kann.',
                  )}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:mt-0 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => void handleMix()}
                disabled={mixingLocked}
                className={`${primaryButtonClass} h-10 px-4 ${mixingLocked ? 'cursor-not-allowed opacity-60' : ''
                  }`}
              >
                {t('actions.mixNow', 'Jetzt neu mischen')}
              </button>
              {onAcknowledgeStudentUpdates ? (
                <button
                  type="button"
                  onClick={onAcknowledgeStudentUpdates}
                  className={`${secondaryButtonClass} h-10 px-4`}
                >
                  {t('editor.hideNotice', 'Hinweis ausblenden')}
                </button>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <div className="flex flex-col gap-4 md:flex-row md:gap-2 md:items-start">
        <SmartSidebar isFirstVisit={isFirstVisit}>
          {({ isExpanded }) =>
            isExpanded ? (
              <>
                <SmartMixControls
                  settings={settings}
                  setMixSettings={setMixSettings}
                  students={students}
                />
                <StorageSidebarSection isExpanded />
              </>
            ) : (
              <>
                <MixCriteriaIcons
                  settings={settings}
                  students={students}
                  onSettingChange={handleMixSettingChange}
                  isExpanded={isExpanded}
                />
                <StorageSidebarSection isExpanded={false} />
              </>
            )
          }
        </SmartSidebar>

        <div className="relative flex-1">
          <div className="flex flex-col gap-4 md:min-w-0">
            <div
              data-testid="classroom-canvas"
              className={`${canvasFrameClass} relative select-none`}
              style={{ width: '100%', maxWidth: '100vw' }}
            >
              {/* Floating Mix Button - positioned at top right */}
              <FloatingMixButton
                onMix={handleMix}
                isLoading={mixingLocked}
                disabled={mixingLocked}
              />

              {hasStatistics && (onOpenStatistics || onCloseStatistics) && (
                <button
                  type="button"
                  onClick={handleStatisticsToggle}
                  className={statisticsButtonClasses}
                  title={statisticsButtonTitle}
                  aria-label={statisticsButtonLabel}
                  aria-pressed={showStatisticsBadge}
                >
                  <ChartBarIcon size={20} />
                  <div className="flex flex-col leading-tight text-left">
                    <span className="text-base font-semibold text-blue-700 dark:text-blue-200">
                      {statisticsScore}%
                    </span>
                  </div>
                </button>
              )}

              {/* Statistics Badge - absolute positioned above button for <xl viewports */}
              {canShowStatisticsBadge && lastStatistics && onCloseStatistics && (
                <div className="xl:hidden">
                  <SeatingStatisticsBadge
                    criteria={lastStatistics}
                    onClose={onCloseStatistics}
                    onHighlightHover={handleCriterionHover}
                    onHighlightLeave={handleCriterionHoverEnd}
                    onHighlightToggle={handleCriterionToggle}
                    activeHighlightKey={activeHighlightKey}
                    activeHighlightMode={activeHighlightMode}
                  />
                </div>
              )}

              {showModeToggle && seatingMode && onModeChange && (
                <div className="absolute top-3 right-3 z-10 opacity-80">
                  <SeatingModeToggle
                    mode={seatingMode}
                    onModeChange={onModeChange}
                  />
                </div>
              )}
              <CanvasSettingsButton
                groups={seatingSettingsGroups}
                buttonTitle={t('editor.viewSettings', 'Ansichtseinstellungen')}
              />
              <div
                ref={canvasContainerRef}
                style={{
                  backgroundColor,
                  backgroundImage: showGrid
                    ? `linear-gradient(to right, ${gridColor} 1px, transparent 1px), linear-gradient(to bottom, ${gridColor} 1px, transparent 1px)`
                    : undefined,
                  backgroundSize: showGrid
                    ? `${GRID_SIZE}px ${GRID_SIZE}px`
                    : undefined,
                }}
                className="w-full h-auto"
              >
                <SeatingPlanCanvas
                  canvasWidth={canvasWidth}
                  classroomHeight={classroomHeight}
                  sceneTables={sceneTables}
                  features={classroomScene.features ?? []}
                  currentSeating={effectiveSeating}
                  allStudents={students}
                  selectedTableIds={[]}
                  showGrid={false}
                  showBoard={showBoard}
                  showWindows={showWindows}
                  showDoor={showDoor}
                  showPodium={showPodium}
                  selectionBox={null}
                  handlePointerMove={() => { }}
                  handlePointerUp={() => { }}
                  beginSelection={() => { }}
                  startTablePointerDrag={() => { }}
                  templateDragPreview={templateDragPreview}
                  onTableUpdate={onTableUpdate}
                  toggleSelect={() => []}
                  handleSeatDragStart={handleSeatDragStart}
                  handleSeatDrag={handleSeatDrag}
                  handleSeatDragEnd={handleSeatDragEnd}
                  dragOrigin={dragOrigin}
                  dragHover={dragHover}
                  lockedDropTarget={lockedDropTarget}
                  onSeatHoverChange={handleSeatHoverChange}
                  onLockedSeatDrop={handleLockedDrop}
                  moveStudent={moveStudent}
                  isSeatLocked={isSeatLocked}
                  toggleLock={toggleLock}
                  onTransformStart={snapshot}
                  isDark={isDark}
                  seatHighlights={seatHighlightLookup}
                />
                {autoMixing && (
                  <div className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-white/70 backdrop-blur-sm dark:bg-gray-900/80">
                    <div className="flex flex-col items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-100">
                      <SpinnerGapIcon className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-300" />
                      <span>
                        {t(
                          'editor.autoMixRunning',
                          'Automatisches Mischen läuft',
                        )}{' '}
                        …
                      </span>
                    </div>
                  </div>
                )}
              </div>
              {dragPreview &&
                typeof document !== 'undefined' &&
                createPortal(
                  <div
                    className="pointer-events-none fixed z-50"
                    style={{
                      left: dragPreview.x + viewportOffset.left,
                      top: dragPreview.y + viewportOffset.top,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <SeatPreviewCard
                      preview={dragPreview}
                      viewportScale={previewViewportScale}
                    />
                  </div>,
                  document.body,
                )}
            </div>

            {isMobile && (
              <div className="mt-4 sm:hidden">
                <MixCriteriaIcons
                  settings={settings}
                  students={students}
                  onSettingChange={handleMixSettingChange}
                  compactLayout={true}
                />
              </div>
            )}

            <form
              className="mt-4 flex flex-col items-start gap-2 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                saveSeatingPlan(planName, classroomScene);
              }}
            >
              {/* Desktop: Zurück-Button oben links */}
              <button
                type="button"
                onClick={onEditLayout}
                title={t('actions.backShortcut', 'Zurück (Alt/Option+←)')}
                className={`${neutralButtonClass} hidden justify-center gap-2 sm:flex sm:w-auto`}
              >
                <ArrowLeftIcon className="w-4 h-4" />
                {t('circle.backToClassroom', 'Zurück zum Klassenraum')}
              </button>
              <div className="w-full sm:w-auto flex-1">
                <div className="relative">
                  <input
                    ref={planNameInputRef}
                    type="text"
                    value={planName}
                    onChange={(e) => {
                      setPlanName(e.target.value);
                      if (planNameError) {
                        setPlanNameError(false);
                      }
                    }}
                    placeholder={t(
                      'circle.planNamePlaceholder',
                      'Name für diesen Sitzplan',
                    )}
                    className={`${inputFieldClass} w-full pr-12`}
                    aria-label={t(
                      'circle.planNameLabel',
                      'Gib einen Namen für diesen Sitzplan ein',
                    )}
                  />
                  <button
                    type="submit"
                    disabled={currentSeating.length === 0}
                    title={t(
                      'actions.saveShortcut',
                      'Plan speichern (Strg/Cmd+S)',
                    )}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors ${currentSeating.length === 0
                      ? 'cursor-not-allowed text-gray-400 dark:text-gray-600'
                      : 'cursor-pointer text-green-600 hover:bg-green-50 hover:text-green-700 dark:text-green-400 dark:hover:bg-green-900/30 dark:hover:text-green-300'
                      }`}
                    aria-label={t('actions.savePlan', 'Plan speichern')}
                  >
                    <FloppyDiskIcon className="w-5 h-5" />
                  </button>
                </div>
                {planNameError && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                    {t('circle.planNameError', 'Bitte gib einen Namen ein.')}
                  </p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleExportWithConditionalSave}
                  title={t(
                    'actions.exportShortcut',
                    'Exportieren (Strg/Cmd+E)',
                  )}
                  className={`${primaryButtonClass} flex items-center gap-2`}
                >
                  <ExportIcon className="w-4 h-4" size={16} />
                  {t('actions.export', 'Exportieren')}
                </button>
                {/* Mobile: Zurück-Button unterhalb von Exportieren */}
                <button
                  type="button"
                  onClick={onEditLayout}
                  title={t('actions.backShortcut', 'Zurück (Alt/Option+←)')}
                  className={`${neutralButtonClass} flex w-full justify-center gap-2 sm:hidden`}
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                  {t('circle.backToClassroom', 'Zurück zum Klassenraum')}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Statistics Sidebar - flex child on xl+ only */}
        {canShowStatisticsBadge && lastStatistics && onCloseStatistics ? (
          <div className="hidden xl:block">
            <SeatingStatisticsBadge
              criteria={lastStatistics}
              onClose={onCloseStatistics}
              onHighlightHover={handleCriterionHover}
              onHighlightLeave={handleCriterionHoverEnd}
              onHighlightToggle={handleCriterionToggle}
              activeHighlightKey={activeHighlightKey}
              activeHighlightMode={activeHighlightMode}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

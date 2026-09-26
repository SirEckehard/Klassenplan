// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import {
  WarningIcon,
  InfoIcon,
  ChartBarIcon,
  GridNine,
  ShuffleIcon,
  SpinnerGapIcon,
  EyeIcon,
  CursorIcon,
  EyeSlashIcon,
} from '@phosphor-icons/react';
import SmartSidebar from '@/components/ui/panels/SmartSidebar';
import SmartMixControls, {
  MixCriteriaSwitch,
} from '@/components/ui/controls/SmartMixControls';
import PlanToolPanel from '@/components/SeatingPlanGenerator/views/PlanToolPanel';
import InspectorPortal from '@/components/shell/InspectorPortal';
import {
  InspectorBody,
  InspectorHeader,
} from '@/components/shell/InspectorPanel';
import StatusBarPortal from '@/components/shell/StatusBarPortal';
import { useCanvasPreferences } from '@/contexts/seatingPlan/CanvasPreferencesContext';
import SeatingPlanCanvas from '@/components/SeatingPlanGenerator/SeatingPlanCanvas';
import SeatingStatisticsBadge from '@/components/ui/feedback/SeatingStatisticsBadge';
import { TOUR_ANCHORS } from '@/components/onboarding/tours';
import {
  GRID_SIZE,
  isFormElementFocused,
  getDisplayNameForMode,
  type NameDisplayMode,
  canvasFrameClass,
  canvasStageClass,
  canvasFitClass,
  getViewportMetrics,
  primaryButtonClass,
  secondaryButtonClass,
  cardSurfaceClass,
  onVisualViewport,
  buildSeatHighlightLookup,
  withoutUnavailableWeights,
} from '@/utils';
import { calculateBadgePillLayout } from '@/utils/ui/studentAppearance';
import { FEATURE_TYPES, type FeatureVisibilityFlags } from '@/utils/ui';
import { buildFeatureVisibilityGroup } from '@/components/SeatingPlanGenerator/canvas/featureVisibilityGroup';
import { buildNameDisplayGroup } from '@/components/SeatingPlanGenerator/canvas/nameDisplayGroup';
import type {
  MixSettings,
  SeatingArrangement,
  ClassroomTable,
  ClassroomScene,
  ClassroomFeatureType,
  Student,
  SavedPlan,
  MixResult,
  PlanUsage,
  PhotoDisplayMode,
} from '@/types';
import {
  calculateCriteriaWeightedScore,
  type CriterionFulfillment,
} from '@/utils/algorithm/seatingStatistics';
import { useIsDarkMode } from '@/hooks/useIsDarkMode';
import { usePlanExits } from '@/hooks/plan/usePlanExits';
import { useFirstVisit } from '@/hooks/ui/useFirstVisit';
import { useIsPhone } from '@/hooks/ui/useLayoutMode';
import { createSuspendedWeights } from '@/hooks/ui/useMixCriteria';
import { buildCriterionHighlightEntries } from '@/utils/algorithm/criterionHighlights';
import type {
  DragPreview,
  DragOrigin,
  DragHover,
  LockedDropTarget,
  DragSeatConfig,
} from '@/hooks/ui/useDragDropState';
import type { TemplateDragPreview } from '@/types/templateDrag';
import {
  workspaceLayerClass,
  workspaceStageClass,
} from '@/components/shell/shellTokens';

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
      className={`${cardSurfaceClass} pointer-events-none bg-(--surface-card) px-2 py-2 shadow-lg backdrop-blur-sm`}
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
          {getDisplayNameForMode(
            preview.student.name,
            'table',
            preview.nameDisplay,
            preview.nameLabels,
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

/**
 * A line about the plan, above the plan: what changed or went wrong, and what
 * can be done about it in grey. It sits inside the stage because it concerns
 * the plan alone — a strip across the layer would push the toolbar out of line
 * with the inspector — and its buttons are never blue, because the layer's one
 * primary button is the status bar's.
 */
function PlanNotice({
  role = 'status',
  icon,
  action,
  children,
}: {
  role?: 'status' | 'alert';
  icon?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      role={role}
      className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border border-(--border-card) bg-(--surface-card) px-3 py-2 text-sm text-(--text-page)"
    >
      <div className="flex min-w-0 flex-1 items-start gap-2">
        {icon}
        <div className="min-w-0">{children}</div>
      </div>
      {action}
    </div>
  );
}

const planNoticeActionClass = `${secondaryButtonClass} h-8 shrink-0 px-3 text-xs`;

type Props = {
  settings: MixSettings;
  setMixSettings: React.Dispatch<React.SetStateAction<MixSettings>>;
  handleMix: () => Promise<void>;
  isMixing: boolean;
  autoMixing?: boolean;
  autoMixError?: string | null;
  featureVisibility: FeatureVisibilityFlags;
  setFeatureVisible: (type: ClassroomFeatureType, visible: boolean) => void;
  canvasWidth: number;
  classroomHeight: number;
  photoDisplayMode: PhotoDisplayMode;
  setPhotoDisplayMode: React.Dispatch<React.SetStateAction<PhotoDisplayMode>>;
  nameDisplay: NameDisplayMode;
  setNameDisplay: React.Dispatch<React.SetStateAction<NameDisplayMode>>;
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
  saveSeatingPlan: (name: string, scene: ClassroomScene) => void;
  classroomScene: ClassroomScene;
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
  /** Records of plans that were really in use; see `buildPreviousPairs`. */
  planUsage?: PlanUsage[];
};

export default function SeatingPlanEditorView({
  settings,
  setMixSettings,
  handleMix,
  isMixing,
  autoMixing = false,
  autoMixError = null,
  featureVisibility,
  setFeatureVisible,
  canvasWidth,
  classroomHeight,
  photoDisplayMode,
  setPhotoDisplayMode,
  nameDisplay,
  setNameDisplay,
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
  saveSeatingPlan,
  classroomScene,
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
  planUsage = [],
}: Props) {
  const isDark = useIsDarkMode();
  const { t } = useTranslation('generator');
  const { showGrid, setShowGrid } = useCanvasPreferences();
  // Marks the visit (`spg.hasVisitedApp`) for the onboarding tour record.
  useFirstVisit();
  const isPhone = useIsPhone();
  // The floor takes the canvas surface and the grid the hairline, both as
  // custom properties so light and dark come from the one place that defines
  // them — an inline style resolves `var()` like any other declaration.
  const backgroundColor = 'var(--canvas-bg)';
  const gridColor = 'var(--border-card)';

  const handleToggleGrid = React.useCallback(
    (checked: boolean) => setShowGrid(() => checked),
    [setShowGrid],
  );
  const handlePhotoDisplayModeChange = React.useCallback(
    (next: string) => setPhotoDisplayMode(() => next as PhotoDisplayMode),
    [setPhotoDisplayMode],
  );
  const studentNames = React.useMemo(
    () => students.map((student) => student.name),
    [students],
  );
  const featureAvailability = React.useMemo(() => {
    const features = classroomScene.features ?? [];
    const availability: FeatureVisibilityFlags = {};
    for (const type of FEATURE_TYPES) {
      availability[type] = features.some((feature) => feature.type === type);
    }
    return availability;
  }, [classroomScene.features]);

  const seatingSettingsGroups = React.useMemo(
    () => [
      {
        id: 'editor-canvas',
        title: t('editor.workspace', 'Arbeitsfläche'),
        options: [
          {
            kind: 'checkList' as const,
            id: 'editor-canvas-grid',
            label: t('editor.workspace', 'Arbeitsfläche'),
            items: [
              {
                id: 'show-grid',
                label: t('editor.showGrid', 'Raster anzeigen'),
                icon: <GridNine size={18} />,
                checked: showGrid,
                onChange: handleToggleGrid,
              },
            ],
          },
        ],
      },
      {
        id: 'editor-photos',
        title: t('editor.studentPhotos', 'Schülerfotos'),
        options: [
          {
            kind: 'segment' as const,
            id: 'photo-display-mode',
            value: photoDisplayMode,
            onChange: handlePhotoDisplayModeChange,
            choices: [
              {
                value: 'all',
                label: t('editor.photoModeAll', 'An'),
                icon: <EyeIcon size={18} />,
              },
              {
                value: 'hover',
                label: t('editor.photoModeHover', 'Hover'),
                icon: <CursorIcon size={18} />,
              },
              {
                value: 'off',
                label: t('editor.photoModeOff', 'Aus'),
                icon: <EyeSlashIcon size={18} />,
              },
            ],
          },
        ],
      },
      buildNameDisplayGroup({
        id: 'editor-names',
        value: nameDisplay,
        onChange: setNameDisplay,
        names: studentNames,
        t,
      }),
      buildFeatureVisibilityGroup({
        id: 'editor-features',
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
      handleToggleGrid,
      handlePhotoDisplayModeChange,
      nameDisplay,
      setNameDisplay,
      studentNames,
      photoDisplayMode,
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
  // The switch above the criteria turns the statistics on and off; what it
  // turns is the fulfilment beside each criterion in the inspector. Only a
  // phone, whose sidebar is a sheet over the plan, still gets a panel of its
  // own — see `SeatingStatisticsBadge`.
  const statisticsVisible = Boolean(
    showStatisticsBadge && lastStatistics && lastStatistics.length > 0,
  );
  const canShowStatisticsBadge = Boolean(
    statisticsVisible && onCloseStatistics,
  );
  const seatHighlightLookup = React.useMemo(
    () => buildSeatHighlightLookup(statisticsHighlight),
    [statisticsHighlight],
  );
  const mixingLocked = isMixing || autoMixing;
  /**
   * What the highlight is showing, in words: the criterion and how many of the
   * seats it touches are short of it.
   */
  const highlightNotice = React.useMemo(() => {
    if (!statisticsHighlight || statisticsHighlight.mode !== 'persistent') {
      return null;
    }
    const criterion = lastStatistics?.find(
      (entry) => entry.key === statisticsHighlight.key,
    );
    if (!criterion) return null;
    const open = statisticsHighlight.entries.filter(
      (entry) => entry.status !== 'ok',
    ).length;
    return {
      label: t('statisticsBadge.highlighted', {
        criterion: criterion.label,
        count: open,
      }),
    };
  }, [lastStatistics, statisticsHighlight, t]);

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
        planUsage,
      }),
    [classroomScene, effectiveSeating, mixHistory, planUsage, seatingHistory],
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

  const sidebarFulfillment = statisticsVisible
    ? (lastStatistics ?? undefined)
    : undefined;
  const fulfillmentProps = React.useMemo(
    () => ({
      fulfillment: sidebarFulfillment,
      // A phone shows the criteria in a sheet that covers the plan, so marking
      // seats from there would point at something nobody can see. The values
      // themselves still show.
      onHighlightHover: isPhone ? undefined : handleCriterionHover,
      onHighlightLeave: isPhone ? undefined : handleCriterionHoverEnd,
      onHighlightToggle: isPhone ? undefined : handleCriterionToggle,
      activeHighlightKey,
      activeHighlightMode,
    }),
    [
      activeHighlightKey,
      activeHighlightMode,
      handleCriterionHover,
      handleCriterionHoverEnd,
      handleCriterionToggle,
      isPhone,
      sidebarFulfillment,
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

  // Exporting and presenting live in the header, which saves first through
  // `usePlanExits`; Ctrl/Cmd+E reaches the same one implementation.
  const { exportPlan } = usePlanExits();

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
        exportPlan();
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
    exportPlan,
    handleMix,
    mixingLocked,
  ]);

  // What "all criteria off" cleared, for "all on" to bring back — shared by the
  // expanded panel, the rail and the phone row, so each can undo the others.
  // Kept for this visit of the step only: classes are switched in step 1, so
  // one class's weights can never come back in another.
  const [suspendedWeights] = React.useState(createSuspendedWeights);

  // Criteria the class has no data for are hidden in every sidebar density, so
  // their weights are cleared whichever density is on screen. `settings` is a
  // dependency because "all on" and the default weights set hidden ones too —
  // hence the check first: an update that clears nothing must not be sent, or
  // a setter that returns a new object each time would restart this effect
  // forever.
  React.useEffect(() => {
    if (withoutUnavailableWeights(settings, students) === settings) {
      return;
    }
    setMixSettings((prev) => withoutUnavailableWeights(prev, students));
  }, [students, settings, setMixSettings]);

  return (
    <div className="space-y-6 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:space-y-0">
      {/* The direction comes from the same hook that decides whether the
          sidebar is a rail or a phone sheet — a `md:` variant here could
          disagree with it and stack the rail on top of the canvas. */}
      <div className={workspaceLayerClass}>
        <SmartSidebar tourAnchor={TOUR_ANCHORS.planSidebar}>
          {({ isExpanded }) => (
            <PlanToolPanel
              density={isExpanded ? 'comfortable' : 'compact'}
              seatingMode={seatingMode}
              onModeChange={onModeChange}
              showModeToggle={showModeToggle}
              settingsGroups={seatingSettingsGroups}
              onSavePlan={() => saveSeatingPlan(planName, classroomScene)}
              canSavePlan={currentSeating.length > 0}
            />
          )}
        </SmartSidebar>

        {/* Why the plan looks like this is a property of the plan, so the
            criteria belong in the inspector — not in the toolbar opposite. */}
        <InspectorPortal>
          {/* The heading names the panel once, and the switch beside it acts
              on every criterion under it. */}
          <InspectorHeader
            title={t('mix.title')}
            actions={
              <MixCriteriaSwitch
                settings={settings}
                setMixSettings={setMixSettings}
                students={students}
                suspendedWeights={suspendedWeights}
              />
            }
          />
          <InspectorBody>
            {/* How well the plan meets the criteria, above the criteria it is
              about; the button shows or hides the value beside each one. */}
            {hasStatistics && (onOpenStatistics || onCloseStatistics) && (
              <button
                type="button"
                onClick={handleStatisticsToggle}
                data-tour={TOUR_ANCHORS.planFulfillment}
                aria-pressed={showStatisticsBadge}
                title={statisticsButtonTitle}
                aria-label={statisticsButtonLabel}
                className={`${secondaryButtonClass} mb-3 flex w-full items-center justify-between gap-2 px-3 py-2 text-sm`}
              >
                <span className="flex items-center gap-2">
                  <ChartBarIcon size={18} aria-hidden="true" />
                  {t('editor.fulfillmentLabel')}
                </span>
                <span className="font-semibold tabular-nums">
                  {statisticsScore}%
                </span>
              </button>
            )}
            <SmartMixControls
              settings={settings}
              setMixSettings={setMixSettings}
              students={students}
              suspendedWeights={suspendedWeights}
              density="comfortable"
              {...fulfillmentProps}
            />
          </InspectorBody>
        </InspectorPortal>

        {/* The layer's one primary action, in the same spot as the other
            layers' "carry on". */}
        <StatusBarPortal slot="end">
          <button
            type="button"
            data-tour={TOUR_ANCHORS.mixButton}
            onClick={() => void handleMix()}
            disabled={mixingLocked}
            title={t('mixButton.shortcut', 'Neu mischen (Strg/Cmd+M)')}
            className={`${primaryButtonClass} flex items-center gap-2 whitespace-nowrap ${
              mixingLocked ? 'cursor-not-allowed opacity-60' : ''
            }`}
          >
            <ShuffleIcon className="h-4 w-4" aria-hidden="true" />
            {t('actions.mixAgain', 'Neu mischen')}
          </button>
        </StatusBarPortal>

        <div className={`${workspaceStageClass} relative flex flex-col`}>
          <div className="flex min-w-0 flex-col gap-4 lg:min-h-0 lg:flex-1">
            {!autoMixing && autoMixError && (
              <PlanNotice
                role="alert"
                icon={
                  <WarningIcon
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0 text-(--button-icon-danger-text)"
                  />
                }
                action={
                  <button
                    type="button"
                    onClick={() => void handleMix()}
                    disabled={mixingLocked}
                    className={planNoticeActionClass}
                  >
                    {t('actions.retryMix', 'Erneut mischen')}
                  </button>
                }
              >
                <p className="font-semibold">
                  {t(
                    'editor.autoMixFailed',
                    'Automatisches Mischen fehlgeschlagen',
                  )}
                </p>
                <p className="text-(--text-muted)">{autoMixError}</p>
              </PlanNotice>
            )}
            {/* Grey, not blue: the status bar's "Neu mischen" stays the one
                primary button, the notice only offers the same step where
                the reason for it is written. */}
            {hasPendingStudentUpdates && (
              <PlanNotice
                icon={
                  <InfoIcon
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0 text-(--text-muted)"
                  />
                }
                action={
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleMix()}
                      disabled={mixingLocked}
                      className={planNoticeActionClass}
                    >
                      {t('actions.mixNow', 'Jetzt neu mischen')}
                    </button>
                    {onAcknowledgeStudentUpdates && (
                      <button
                        type="button"
                        onClick={onAcknowledgeStudentUpdates}
                        className={planNoticeActionClass}
                      >
                        {t('editor.hideNotice', 'Hinweis ausblenden')}
                      </button>
                    )}
                  </div>
                }
              >
                <p className="font-semibold">
                  {t('editor.classDataChanged', 'Klassendaten wurden geändert')}
                </p>
                <p className="text-(--text-muted)">
                  {t(
                    'editor.classDataChangedHint',
                    'Deine Anpassungen sind sichtbar. Mische den Plan neu, damit der Algorithmus optimal reagieren kann.',
                  )}
                </p>
              </PlanNotice>
            )}
            {/* A highlight changes what the seats mean, so it says so above
                the plan rather than leaving the colours to be guessed at. */}
            {highlightNotice && (
              <PlanNotice
                action={
                  <button
                    type="button"
                    onClick={() => clearStatisticsHighlight?.()}
                    className={planNoticeActionClass}
                  >
                    {t('statisticsBadge.highlightOff')}
                  </button>
                }
              >
                <p>{highlightNotice.label}</p>
              </PlanNotice>
            )}
            {/* The notices above take their height out of the stage, so the
                plan is fitted into what is left rather than into the whole
                stage, which would push its bottom edge out of sight. */}
            <div className={`${canvasStageClass} lg:min-h-0 lg:flex-1`}>
              <div
                data-testid="classroom-canvas"
                data-tour={TOUR_ANCHORS.planCanvas}
                className={`${canvasFrameClass} ${canvasFitClass} relative select-none`}
                style={{ maxWidth: '100vw' }}
              >
                {/* Phone only: everywhere the options rail fits, the values sit
                  beside the criteria instead. */}
                {isPhone &&
                  canShowStatisticsBadge &&
                  lastStatistics &&
                  onCloseStatistics && (
                    <SeatingStatisticsBadge
                      criteria={lastStatistics}
                      onClose={onCloseStatistics}
                      onHighlightHover={handleCriterionHover}
                      onHighlightLeave={handleCriterionHoverEnd}
                      onHighlightToggle={handleCriterionToggle}
                      activeHighlightKey={activeHighlightKey}
                      activeHighlightMode={activeHighlightMode}
                    />
                  )}

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
                  className="h-auto w-full rounded-none"
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
                    featureVisibility={featureVisibility}
                    selectionBox={null}
                    handlePointerMove={() => {}}
                    handlePointerUp={() => {}}
                    beginSelection={() => {}}
                    startTablePointerDrag={() => {}}
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
                    photoDisplayMode={photoDisplayMode}
                    nameDisplay={nameDisplay}
                  />
                  {autoMixing && (
                    <div
                      role="status"
                      className="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-(--surface-card)/80 backdrop-blur-sm"
                    >
                      <div className="flex flex-col items-center gap-2 text-sm font-medium text-(--text-page)">
                        <SpinnerGapIcon className="h-5 w-5 animate-spin text-(--text-badge)" />
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
            </div>

            {isPhone && (
              <div className="mt-4 sm:hidden">
                <SmartMixControls
                  settings={settings}
                  setMixSettings={setMixSettings}
                  students={students}
                  suspendedWeights={suspendedWeights}
                  density="compact"
                  direction="row"
                  {...fulfillmentProps}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

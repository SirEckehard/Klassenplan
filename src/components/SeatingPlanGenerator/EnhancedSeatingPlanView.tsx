// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LinkSimpleIcon,
  ArrowCounterClockwiseIcon,
  ShuffleIcon,
} from '@phosphor-icons/react';
import SmartSidebar from '@/components/ui/panels/SmartSidebar';
import PlanToolPanel from '@/components/SeatingPlanGenerator/views/PlanToolPanel';
import StatusBarPortal from '@/components/shell/StatusBarPortal';
import SeatingPlanView from './SeatingPlanView';
import SimpleCircleView from '@/components/circle/SimpleCircleView';
import CircleInspector from '@/components/circle/CircleInspector';
import type { SeatingMode } from '@/types/Circle';
import type { ConnectionDisplayMode } from '@/components/circle/SimpleCircleView';
import type { Student } from '@/types';
import {
  useSeatingPlanState,
  useSeatingPlanActions,
} from '@/contexts/SeatingPlanContext';
import { useIsDarkMode } from '@/hooks/useIsDarkMode';
import { useFirstVisit } from '@/hooks/ui/useFirstVisit';
import { useCanvasPreferences } from '@/contexts/seatingPlan/CanvasPreferencesContext';
import type { Props as SeatingPlanViewProps } from './SeatingPlanView';
import {
  canvasFrameClass,
  canvasStageClass,
  canvasFitClass,
  hasSeatedStudent,
  primaryButtonClass,
  secondaryButtonClass,
} from '@/utils';
import { buildNameDisplayGroup } from '@/components/SeatingPlanGenerator/canvas/nameDisplayGroup';
import { buildBadgeDisplayGroup } from '@/components/SeatingPlanGenerator/canvas/badgeDisplayGroup';
import { buildPhotoDisplayGroup } from '@/components/SeatingPlanGenerator/canvas/photoDisplayGroup';
import { useSeatBadgeView } from '@/hooks/canvas/useSeatBadgeView';
import { useHasHoverPointer } from '@/hooks/ui/useHasHoverPointer';
import { useEnsureCircleLayout } from '@/hooks/circle/useEnsureCircleLayout';
import { circleShuffleSwaps } from '@/services/circleLayoutService';
import { usePlanExits } from '@/hooks/plan/usePlanExits';
import { usePlanShortcuts } from '@/hooks/plan/usePlanShortcuts';
import {
  workspaceLayerClass,
  workspaceStageClass,
} from '@/components/shell/shellTokens';

type EnhancedSeatingPlanViewProps = SeatingPlanViewProps & {
  seatingMode?: 'table' | 'circle';
  onModeChange?: (mode: 'table' | 'circle') => void;
  showModeToggle?: boolean;
};

export default function EnhancedSeatingPlanView(
  props: EnhancedSeatingPlanViewProps,
) {
  const { t } = useTranslation('generator');
  const {
    step,
    seatingMode: propSeatingMode,
    onModeChange: propOnModeChange,
    showModeToggle: propShowModeToggle,
    ...seatingPlanViewProps
  } = props;
  const { circleLayout } = useSeatingPlanState();
  const {
    generateCircleSeating,
    swapStudentPositions,
    batchSwapStudentPositions,
    toggleCircleLock,
  } = useSeatingPlanActions();
  // Read from the shared context rather than a second `usePersistentState` on
  // the same key: two instances only agreed because nothing toggled the grid
  // while both were mounted.
  const { showGrid } = useCanvasPreferences();
  const isDark = useIsDarkMode();
  // Marks the visit (`spg.hasVisitedApp`) for the onboarding tour record.
  useFirstVisit();

  const [internalSeatingMode, setInternalSeatingMode] =
    useState<SeatingMode>('table');

  // Connection mode state for circle view
  const [connectionMode, setConnectionMode] =
    useState<ConnectionDisplayMode>('subtle');
  // Photos, names and badges are the table plan's own settings, read from the
  // same place: whatever was chosen in one arrangement holds in the other.
  const {
    photoDisplayMode: photoMode,
    setPhotoDisplayMode: setPhotoMode,
    nameDisplay,
    setNameDisplay,
    badgeDisplay,
    setBadgeDisplay,
    badgeHover,
    setBadgeHover,
  } = useCanvasPreferences();
  // The same badges and the same pointing as on the table plan.
  const { badgeView, badgeFocus, reportBadgeFocus } = useSeatBadgeView(
    badgeDisplay,
    props.settings,
    badgeHover.highlight,
  );

  // Use prop values if provided, otherwise use internal state and logic
  const requestedSeatingMode = propSeatingMode ?? internalSeatingMode;
  const seatingMode = requestedSeatingMode;
  const showModeToggle = propShowModeToggle ?? step === 3;
  const ensureCircleLayout = useEnsureCircleLayout(seatingMode, {
    enabled: showModeToggle,
  });

  // Track if this is the initial load to avoid infinite switching
  const hasInitialized = useRef(false);

  // Initialize without auto-switching to circle mode
  useEffect(() => {
    if (showModeToggle && !hasInitialized.current) {
      // Always start with table mode, let user choose circle mode explicitly
      hasInitialized.current = true;
    }
  }, [showModeToggle]);

  const handleModeChange = (mode: SeatingMode) => {
    if (propOnModeChange) {
      propOnModeChange(mode);
    } else {
      setInternalSeatingMode(mode);
    }

    ensureCircleLayout(mode);

    // Note: We no longer clear circle layout when switching back to table mode
    // This allows the circle to persist when switching between modes
  };

  const handleStudentPositionChange = (
    studentId: string,
    targetPosition: number,
  ) => {
    swapStudentPositions(studentId, targetPosition);
  };

  // A random order for the circle alone; the seating plan stays as it is.
  // Locked students keep their places (`circleShuffleSwaps`).
  const handleShuffleCircle = () => {
    if (!circleLayout) return;
    const swaps = circleShuffleSwaps(circleLayout);
    if (swaps.length > 0) {
      batchSwapStudentPositions(swaps);
    }
  };

  const circleStudents = useMemo(
    () =>
      (circleLayout?.students ?? [])
        .map((entry) => entry.student)
        .filter((student): student is Student => Boolean(student)),
    [circleLayout],
  );
  const circleStudentNames = useMemo(
    () => circleStudents.map((student) => student.name),
    [circleStudents],
  );
  const hasHoverPointer = useHasHoverPointer();

  // Circle view settings live in the canvas' settings button, exactly like the
  // table plan's — display options belong to the canvas they affect, while the
  // status bar carries the actions (sync, shuffle).
  const circleSettingsGroups = useMemo(
    () => [
      {
        id: 'circle-connections',
        title: t('circleView.connectionsTitle', 'Verbindungen'),
        options: [
          {
            // A row of the menu like the seating plan's workspace toggles.
            kind: 'checkList' as const,
            id: 'circle-connections-grid',
            label: t('circleView.connectionsTitle', 'Verbindungen'),
            items: [
              {
                id: 'circle-show-connections',
                label: t('circleView.showConnections', 'Verbindungen anzeigen'),
                icon: <LinkSimpleIcon size={18} />,
                checked: connectionMode !== 'off',
                onChange: (next: boolean) =>
                  setConnectionMode(next ? 'subtle' : 'off'),
              },
            ],
          },
        ],
      },
      buildPhotoDisplayGroup({
        id: 'circle-photos',
        optionId: 'circle-photo-mode',
        value: photoMode,
        onChange: setPhotoMode,
        hasHover: hasHoverPointer,
        t,
      }),
      buildNameDisplayGroup({
        id: 'circle-names',
        value: nameDisplay,
        onChange: setNameDisplay,
        names: circleStudentNames,
        t,
      }),
      buildBadgeDisplayGroup({
        id: 'circle-badges',
        value: badgeDisplay,
        onChange: (next) => setBadgeDisplay(next),
        hover: badgeHover,
        onHoverChange: (next) => setBadgeHover(next),
        students: circleStudents,
        onFocusChange: reportBadgeFocus,
        t,
      }),
    ],
    [
      badgeDisplay,
      setBadgeDisplay,
      badgeHover,
      setBadgeHover,
      reportBadgeFocus,
      circleStudents,
      circleStudentNames,
      hasHoverPointer,
      connectionMode,
      nameDisplay,
      setNameDisplay,
      photoMode,
      setPhotoMode,
      t,
    ],
  );

  // Saving and exporting answer to the same keys as in the table plan; the
  // help lists them for the circle too. The table plan registers its own
  // (with mixing), so these only listen while the circle is on screen.
  const isCircleView = showModeToggle && seatingMode === 'circle';
  const { exportPlan } = usePlanExits();
  const { saveSeatingPlan, planName, classroomScene } = props;
  const handleSaveShortcut = useCallback(
    () => saveSeatingPlan(planName, classroomScene),
    [classroomScene, planName, saveSeatingPlan],
  );
  usePlanShortcuts({
    enabled: isCircleView,
    onSave: handleSaveShortcut,
    onExport: exportPlan,
  });

  // Calculate actual neighborhood count (preserved neighbors from table seating)
  // For circle mode, we need different controls and view
  if (isCircleView) {
    return (
      <div className="space-y-6 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:space-y-0">
        {/* The direction comes from the same hook that decides whether the
            sidebar is a rail or a phone sheet, so the two cannot disagree and
            stack the rail on top of the canvas. */}
        <div className={workspaceLayerClass}>
          {/* A phone gets the sheet as the table plan does: the way back to
              the tables, the view settings and the foot every rail shares.
              Rebuilding the circle from the plan and shuffling it are the
              status bar's, so the toolbar repeats neither. */}
          <SmartSidebar>
            {({ isExpanded }) => (
              <PlanToolPanel
                density={isExpanded ? 'comfortable' : 'compact'}
                seatingMode="circle"
                onModeChange={handleModeChange}
                showModeToggle={showModeToggle}
                settingsGroups={circleSettingsGroups}
                canSavePlan={hasSeatedStudent(props.currentSeating)}
              />
            )}
          </SmartSidebar>

          {/* The table plan's inspector holds its criteria; the circle is
              not built from them, so its panel says what the ring came to. */}
          <CircleInspector layout={circleLayout} nameDisplay={nameDisplay} />

          <div className={`${workspaceStageClass} ${canvasStageClass} gap-4`}>
            <div
              className={`${canvasFrameClass} ${canvasFitClass} select-none`}
              style={{ maxWidth: '100vw' }}
            >
              {circleLayout ? (
                <SimpleCircleView
                  layout={circleLayout}
                  editable={true}
                  onStudentMove={handleStudentPositionChange}
                  showSpecialNeeds={true}
                  showGrid={showGrid}
                  isDark={isDark}
                  connectionMode={connectionMode}
                  onConnectionModeChange={setConnectionMode}
                  photoMode={photoMode}
                  nameDisplay={nameDisplay}
                  badgeView={badgeView}
                  badgeFocus={badgeFocus}
                  onBadgeFocusChange={reportBadgeFocus}
                  showBadgeTooltip={badgeHover.tooltip}
                  onToggleLock={toggleCircleLock}
                  onSyncCircle={() => void generateCircleSeating()}
                />
              ) : (
                <div className="flex min-h-100 items-center justify-center bg-(--surface-sunken)">
                  <div className="text-center space-y-4">
                    <div className="text-(--text-muted)">
                      <svg
                        className="mx-auto h-16 w-16 mb-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="10"
                          strokeWidth="1.5"
                          strokeDasharray="3,3"
                        />
                        <circle cx="6" cy="12" r="1" fill="currentColor" />
                        <circle cx="12" cy="6" r="1" fill="currentColor" />
                        <circle cx="18" cy="12" r="1" fill="currentColor" />
                        <circle cx="12" cy="18" r="1" fill="currentColor" />
                        <circle cx="12" cy="12" r="1" fill="currentColor" />
                      </svg>
                      <h3 className="text-lg font-medium">
                        {t(
                          'circleView.generatingTitle',
                          'Sitzkreis wird generiert...',
                        )}
                      </h3>
                      <p className="text-sm">
                        {t(
                          'circleView.generatingHint',
                          'Der Sitzkreis wird automatisch basierend auf dem Tischplan erstellt.',
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* The circle's actions sit where the plan's "Mischen" does,
                beside undo/redo. Mixing is the blue one here too — the purely
                random shuffle — and fitting the circle to the seating plan
                stands quietly before it, so the screen keeps one blue
                button. Saving is in the toolbar, the two exits at the end of
                the status bar. */}
            <StatusBarPortal slot="action">
              {/* On a phone only the icon: the words took the bar's width and
                  pushed the toolbar's switch out of reach. The accessible
                  name stays whole at every width. */}
              <button
                type="button"
                onClick={() => void generateCircleSeating()}
                title={t('circleView.syncTitle')}
                aria-label={t('circleView.syncButton')}
                className={`${secondaryButtonClass} flex items-center gap-2 whitespace-nowrap`}
              >
                <ArrowCounterClockwiseIcon
                  className="h-4 w-4"
                  aria-hidden="true"
                />
                <span className="hidden sm:inline">
                  {t('circleView.syncButton')}
                </span>
              </button>
              {/* Its word where the fitting shows one; the accessible name
                  holds the visible word at every width. */}
              <button
                type="button"
                onClick={handleShuffleCircle}
                disabled={!circleLayout}
                title={t('circleView.shuffleTitle')}
                aria-label={t('circleView.shuffleButton')}
                className={`${primaryButtonClass} flex items-center gap-2 whitespace-nowrap`}
              >
                <ShuffleIcon className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">
                  {t('circleView.shuffleShort')}
                </span>
              </button>
            </StatusBarPortal>
          </div>
        </div>
      </div>
    );
  }

  // For table mode or when not in step 3, show the original SeatingPlanView
  return (
    <SeatingPlanView
      {...seatingPlanViewProps}
      step={step}
      seatingMode={seatingMode}
      onModeChange={handleModeChange}
      showModeToggle={showModeToggle}
    />
  );
}

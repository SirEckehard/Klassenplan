// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LinkSimpleIcon,
  ArrowCounterClockwiseIcon,
  ShuffleIcon,
  EyeIcon,
  EyeSlashIcon,
  CursorIcon,
} from '@phosphor-icons/react';
import SmartSidebar from '@/components/ui/panels/SmartSidebar';
import PlanToolPanel from '@/components/SeatingPlanGenerator/views/PlanToolPanel';
import { ToolRailButton } from '@/components/shell/ToolRail';
import StatusBarPortal from '@/components/shell/StatusBarPortal';
import SeatingPlanView from './SeatingPlanView';
import SimpleCircleView from '@/components/circle/SimpleCircleView';
import CircleInspector from '@/components/circle/CircleInspector';
import type { SeatingMode } from '@/types/Circle';
import type { ConnectionDisplayMode } from '@/components/circle/SimpleCircleView';
import type { PhotoDisplayMode, Student } from '@/types';
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
  primaryButtonClass,
} from '@/utils';
import { buildNameDisplayGroup } from '@/components/SeatingPlanGenerator/canvas/nameDisplayGroup';
import { buildBadgeDisplayGroup } from '@/components/SeatingPlanGenerator/canvas/badgeDisplayGroup';
import {
  createBadgeDisplayFilter,
  isBadgeCriterionActive,
  type BadgeFocus,
  type SeatBadgeView,
} from '@/utils/ui/seatBadges';
import { useEnsureCircleLayout } from '@/hooks/circle/useEnsureCircleLayout';
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
  const mixSettings = props.settings;
  const badgeView = useMemo<SeatBadgeView>(
    () => ({
      filter: createBadgeDisplayFilter(badgeDisplay, mixSettings),
      collapse: true,
      prioritize: (badge) => isBadgeCriterionActive(badge, mixSettings),
    }),
    [badgeDisplay, mixSettings],
  );
  const [storedBadgeFocus, setBadgeFocus] = useState<BadgeFocus | null>(null);
  // Marking the others is a choice; switched off, pointing marks nobody.
  const badgeFocus = badgeHover.highlight ? storedBadgeFocus : null;
  const reportBadgeFocus = badgeHover.highlight ? setBadgeFocus : undefined;

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

  // ShuffleIcon circle layout without affecting seating plan
  const handleShuffleCircle = () => {
    if (!circleLayout) return;

    // Perform multiple random swaps to shuffle the circle. Only the places of
    // students who are not locked take part: a locked student stays put.
    const locked = new Set(circleLayout.lockedStudentIds ?? []);
    const freePositions = circleLayout.students
      .map((position, index) =>
        position?.student && !locked.has(position.student.id) ? index : -1,
      )
      .filter((index) => index !== -1);
    const freeCount = freePositions.length;
    const swapCount = Math.max(10, freeCount); // At least 10 swaps or 1 per student

    const swaps: Array<{ studentId: string; targetPosition: number }> = [];
    for (let i = 0; i < swapCount && freeCount > 1; i++) {
      const pos1 = freePositions[Math.floor(Math.random() * freeCount)];
      const pos2 = freePositions[Math.floor(Math.random() * freeCount)];

      if (pos1 !== pos2 && circleLayout.students[pos1]) {
        const studentId = circleLayout.students[pos1].student.id;
        swaps.push({ studentId, targetPosition: pos2 });
      }
    }

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

  // Circle view settings live in the canvas' settings button, exactly like the
  // table plan's — display options belong to the canvas they affect, while the
  // sidebar keeps the actions (sync, shuffle).
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
      {
        id: 'circle-photos',
        title: t('editor.studentPhotos', 'Schülerfotos'),
        options: [
          {
            kind: 'segment' as const,
            id: 'circle-photo-mode',
            value: photoMode,
            onChange: (next: string) => setPhotoMode(next as PhotoDisplayMode),
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
      connectionMode,
      nameDisplay,
      setNameDisplay,
      photoMode,
      setPhotoMode,
      t,
    ],
  );

  // Calculate actual neighborhood count (preserved neighbors from table seating)
  // For circle mode, we need different controls and view
  if (showModeToggle && seatingMode === 'circle') {
    return (
      <div className="space-y-6 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:space-y-0">
        {/* The direction comes from the same hook that decides whether the
            sidebar is a rail or a phone sheet, so the two cannot disagree and
            stack the rail on top of the canvas. */}
        <div className={workspaceLayerClass}>
          {/* A phone gets the sheet as the table plan does: the way back to
              the tables, the view settings, the shuffle and the foot every
              rail shares. Rebuilding the circle from the plan is the status
              bar's primary action, so the toolbar does not repeat it. */}
          <SmartSidebar>
            {({ isExpanded }) => (
              <PlanToolPanel
                density={isExpanded ? 'comfortable' : 'compact'}
                seatingMode="circle"
                onModeChange={handleModeChange}
                showModeToggle={showModeToggle}
                settingsGroups={circleSettingsGroups}
                onSavePlan={() =>
                  props.saveSeatingPlan(
                    props.planName,
                    props.classroomScene,
                    circleLayout,
                  )
                }
                canSavePlan={props.currentSeating.length > 0}
                extraTools={
                  <ToolRailButton
                    icon={<ShuffleIcon size={18} />}
                    label={t('circleView.shuffleButton')}
                    title={t('circleView.shuffleTitle')}
                    onClick={handleShuffleCircle}
                  />
                }
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

            {/* The circle's own primary action sits where every layer's
                does; naming and the two exits live in the header. */}
            <StatusBarPortal slot="end">
              <button
                type="button"
                onClick={() => void generateCircleSeating()}
                title={t('circleView.syncTitle')}
                className={`${primaryButtonClass} flex items-center gap-2 whitespace-nowrap`}
              >
                <ArrowCounterClockwiseIcon
                  className="h-4 w-4"
                  aria-hidden="true"
                />
                {t('circleView.syncButton')}
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

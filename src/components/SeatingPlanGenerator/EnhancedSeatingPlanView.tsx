// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LinkSimpleIcon,
  ArrowCounterClockwiseIcon,
  ShuffleIcon,
  LinkBreakIcon,
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
import { type SeatingMode } from './SeatingModeToggle';
import type { ConnectionDisplayMode } from '@/components/circle/SimpleCircleView';
import type { PhotoDisplayMode } from '@/types';
import {
  useSeatingPlanState,
  useSeatingPlanActions,
} from '@/contexts/SeatingPlanContext';
import usePersistentState from '@/hooks/usePersistentState';
import { useIsDarkMode } from '@/hooks/useIsDarkMode';
import { useFirstVisit } from '@/hooks/ui/useFirstVisit';
import { useCanvasPreferences } from '@/contexts/seatingPlan/CanvasPreferencesContext';
import { useIsPhone } from '@/hooks/ui/useLayoutMode';
import type { Props as SeatingPlanViewProps } from './SeatingPlanView';
import {
  canvasFrameClass,
  canvasStageClass,
  canvasFitClass,
  LOCAL_STORAGE_KEYS,
  primaryButtonClass,
  secondaryButtonClass,
  type NameDisplayMode,
} from '@/utils';
import { buildNameDisplayGroup } from '@/components/SeatingPlanGenerator/canvas/nameDisplayGroup';
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
  // Photo display mode for circle view (parity with the seating plan).
  const [photoMode, setPhotoMode] = usePersistentState<PhotoDisplayMode>(
    LOCAL_STORAGE_KEYS.circlePhotoMode,
    'all',
  );
  // Shared with the table plan and the presentation: one class, one name rule.
  const [nameDisplay, setNameDisplay] = usePersistentState<NameDisplayMode>(
    LOCAL_STORAGE_KEYS.nameDisplay,
    'firstNameInitial',
  );
  const isPhone = useIsPhone();

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

    // Perform multiple random swaps to shuffle the circle
    const studentCount = circleLayout.students.length;
    const swapCount = Math.max(10, studentCount); // At least 10 swaps or 1 per student

    const swaps: Array<{ studentId: string; targetPosition: number }> = [];
    for (let i = 0; i < swapCount; i++) {
      const pos1 = Math.floor(Math.random() * studentCount);
      const pos2 = Math.floor(Math.random() * studentCount);

      if (pos1 !== pos2 && circleLayout.students[pos1]) {
        const studentId = circleLayout.students[pos1].student.id;
        swaps.push({ studentId, targetPosition: pos2 });
      }
    }

    if (swaps.length > 0) {
      batchSwapStudentPositions(swaps);
    }
  };

  const circleStudentNames = useMemo(
    () =>
      (circleLayout?.students ?? [])
        .map((entry) => entry.student?.name)
        .filter((name): name is string => Boolean(name)),
    [circleLayout],
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
            // Icon chip like the seating plan's workspace toggles — same size,
            // label as tooltip and accessible name.
            kind: 'iconGrid' as const,
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
                icon: <EyeIcon size={14} />,
              },
              {
                value: 'hover',
                label: t('editor.photoModeHover', 'Hover'),
                icon: <CursorIcon size={14} />,
              },
              {
                value: 'off',
                label: t('editor.photoModeOff', 'Aus'),
                icon: <EyeSlashIcon size={14} />,
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
    ],
    [
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
        {/* Same source as the sidebar's own phone/rail decision, so the two
            cannot disagree and stack the rail on top of the canvas. */}
        <div className={workspaceLayerClass}>
          {!isPhone && (
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
                    <>
                      <ToolRailButton
                        icon={<ArrowCounterClockwiseIcon size={18} />}
                        label={t('circleView.syncButton')}
                        title={t('circleView.syncTitle')}
                        onClick={() => void generateCircleSeating()}
                      />
                      <ToolRailButton
                        icon={<ShuffleIcon size={18} />}
                        label={t('circleView.shuffleButton')}
                        title={t('circleView.shuffleTitle')}
                        onClick={handleShuffleCircle}
                      />
                    </>
                  }
                />
              )}
            </SmartSidebar>
          )}

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

            {isPhone && (
              <div className="sm:hidden">
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void generateCircleSeating()}
                    className={`${secondaryButtonClass} flex-1 min-w-35 justify-center gap-2`}
                    title={t(
                      'circleView.syncTitle',
                      'Sitzkreis an Sitzplan anpassen',
                    )}
                  >
                    <ArrowCounterClockwiseIcon className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {t('circleView.syncButton', 'An Sitzplan anpassen')}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={handleShuffleCircle}
                    className={`${secondaryButtonClass} flex-1 min-w-35 justify-center gap-2`}
                    title={t(
                      'circleView.shuffleTitle',
                      'Sitzkreis zufällig anordnen',
                    )}
                  >
                    <ShuffleIcon className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {t('circleView.shuffleButton', 'Zufällig mischen')}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setConnectionMode((previous) =>
                        previous === 'off' ? 'subtle' : 'off',
                      )
                    }
                    className={`${secondaryButtonClass} flex-1 min-w-35 justify-center gap-2 ${
                      connectionMode === 'off'
                        ? 'text-(--text-muted)'
                        : 'text-(--text-badge)'
                    }`}
                    title={t(
                      'circleView.showConnections',
                      'Verbindungen anzeigen',
                    )}
                    aria-pressed={connectionMode !== 'off'}
                  >
                    {/* Show what will happen on click: LinkSimpleIcon icon when off (to turn on), LinkBreakIcon when on (to turn off) */}
                    {connectionMode === 'off' ? (
                      <LinkSimpleIcon className="h-4 w-4" />
                    ) : (
                      <LinkBreakIcon className="h-4 w-4" />
                    )}
                    <span className="text-sm font-medium">
                      {t('circleView.showConnections', 'Verbindungen anzeigen')}
                    </span>
                  </button>
                </div>
              </div>
            )}

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

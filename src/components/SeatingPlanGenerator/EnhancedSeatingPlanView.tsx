// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import equal from 'fast-deep-equal';
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
import { useNavigate } from 'react-router-dom';
import SmartSidebar from '@/components/ui/panels/SmartSidebar';
import CircleViewControls from '@/components/ui/controls/CircleViewControls';
import SeatingPlanView from './SeatingPlanView';
import SimpleCircleView from '@/components/circle/SimpleCircleView';
import CircleControlBar from '@/components/circle/CircleControlBar';
import SeatingModeToggle, { type SeatingMode } from './SeatingModeToggle';
import type { ConnectionDisplayMode } from '@/components/circle/SimpleCircleView';
import type { PhotoDisplayMode } from '@/types';
import {
  useSeatingPlanState,
  useSeatingPlanActions,
} from '@/contexts/SeatingPlanContext';
import usePersistentState from '@/hooks/usePersistentState';
import { LOCAL_STORAGE_KEYS } from '@/utils/data/storageKeys';
import { useIsDarkMode } from '@/hooks/useIsDarkMode';
import { useFirstVisit } from '@/hooks/ui/useFirstVisit';
import { useCanvasPreferences } from '@/contexts/seatingPlan/CanvasPreferencesContext';
import { useIsPhone } from '@/hooks/ui/useLayoutMode';
import type { Props as SeatingPlanViewProps } from './SeatingPlanView';
import {
  canvasFrameClass,
  secondaryButtonClass,
  type NameDisplayMode,
} from '@/utils';
import { buildNameDisplayGroup } from '@/components/SeatingPlanGenerator/canvas/nameDisplayGroup';
import SeatingHistoryToolbar from '@/components/SeatingPlanGenerator/canvas/SeatingHistoryToolbar';
import { CanvasSettingsButton } from '@/components/SeatingPlanGenerator/canvas/CanvasSettingsButton';
import { useEnsureCircleLayout } from '@/hooks/circle/useEnsureCircleLayout';

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
  const navigate = useNavigate();
  const { circleLayout, circleGenerationInProgress } = useSeatingPlanState();
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
  const isFirstVisit = useFirstVisit();

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

  // CheckIcon if there are unsaved changes compared to the saved plan (for circle view export)
  const hasUnsavedChanges = useCallback(() => {
    const trimmedName = props.planName.trim();
    if (!trimmedName) return true; // New unnamed plan

    const savedPlan = props.seatingHistory?.find((p) => p.name === trimmedName);
    if (!savedPlan) return true; // Plan doesn't exist yet

    // Compare current state with saved plan
    const seatingChanged = !equal(savedPlan.seating, props.currentSeating);
    const sceneChanged = !equal(savedPlan.scene, props.classroomScene);
    const circleChanged = !equal(savedPlan.circleLayout, circleLayout);

    return seatingChanged || sceneChanged || circleChanged;
  }, [
    props.planName,
    props.seatingHistory,
    props.currentSeating,
    props.classroomScene,
    circleLayout,
  ]);

  // Export handler that saves only if there are changes
  const handleExportWithConditionalSave = useCallback(() => {
    if (hasUnsavedChanges()) {
      props.saveSeatingPlan(props.planName, props.classroomScene, circleLayout);
    }
    navigate('/export');
  }, [hasUnsavedChanges, props, circleLayout, navigate]);

  // Present handler that saves only if there are changes, then opens the
  // smartboard view directly in circle mode.
  const handlePresentWithConditionalSave = useCallback(() => {
    if (hasUnsavedChanges()) {
      props.saveSeatingPlan(props.planName, props.classroomScene, circleLayout);
    }
    navigate('/present', { state: { mode: 'circle' } });
  }, [hasUnsavedChanges, props, circleLayout, navigate]);

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
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          {!isPhone && (
            <SmartSidebar isFirstVisit={isFirstVisit}>
              {({ isExpanded }) => (
                <CircleViewControls
                  onSyncCircle={() => void generateCircleSeating()}
                  onShuffleCircle={handleShuffleCircle}
                  isExpanded={isExpanded}
                />
              )}
            </SmartSidebar>
          )}

          <div className="flex-1 flex flex-col gap-4 md:min-w-0">
            <div
              className={`${canvasFrameClass} select-none`}
              style={{ width: '100%', maxWidth: '100vw' }}
            >
              {/* Undo/redo — the circle shares the seating history, so a
                  mis-drop here is taken back the same way as on the plan. */}
              <div className="absolute top-3 left-3 z-20">
                <SeatingHistoryToolbar />
              </div>

              {/* SeatingModeToggle - fixed top-right */}
              <div className="absolute top-3 right-3 z-10 opacity-80">
                <SeatingModeToggle
                  mode={seatingMode}
                  onModeChange={handleModeChange}
                  disabled={circleGenerationInProgress}
                />
              </div>

              <CanvasSettingsButton
                groups={circleSettingsGroups}
                buttonTitle={t('editor.viewSettings', 'Ansichtseinstellungen')}
              />

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
                <div className="flex min-h-100 items-center justify-center bg-gray-50 dark:bg-gray-800">
                  <div className="text-center space-y-4">
                    <div className="text-gray-500 dark:text-gray-400">
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
                        ? 'text-gray-700 dark:text-gray-200'
                        : 'text-blue-600 dark:text-blue-300'
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

            <CircleControlBar
              planName={props.planName}
              setPlanName={props.setPlanName}
              planNameError={props.planNameError}
              setPlanNameError={props.setPlanNameError}
              planNameInputRef={props.planNameInputRef}
              onEditLayout={props.onEditLayout}
              saveSeatingPlan={props.saveSeatingPlan}
              circleLayout={circleLayout}
              classroomScene={props.classroomScene}
              onExport={handleExportWithConditionalSave}
              onPresent={handlePresentWithConditionalSave}
              isSaveDisabled={props.currentSeating.length === 0}
            />
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

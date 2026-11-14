// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowCounterClockwiseIcon,
  ArrowLeftIcon,
  HandPointingIcon,
} from '@phosphor-icons/react';
import Seo from '@/components/Seo';
import AppHeader, { HeaderTitle } from '@/components/shell/AppHeader';
import { usePageSeo } from '@/hooks/usePageSeo';
import { useBackToWorkspace } from '@/hooks/useReturnToApp';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useLocalizedNavigate } from '@/hooks/useLocalizedNavigate';
import { useIsDarkMode } from '@/hooks/useIsDarkMode';
import usePersistentState from '@/hooks/usePersistentState';
import { usePanZoom } from '@/hooks/ui/usePanZoom';
import { useFullscreen } from '@/hooks/ui/useFullscreen';
import { useEdgeReveal } from '@/hooks/ui/useEdgeReveal';
import { useRandomStudentPicker } from '@/hooks/ui/useRandomStudentPicker';
import { useEnsureCircleLayout } from '@/hooks/circle/useEnsureCircleLayout';
import { useSeatingPlanState } from '@/contexts/SeatingPlanContext';
import { clearAbsent, toggleAbsent, useAbsentIds } from '@/stores/absenceStore';
import {
  announce,
  hasPlanForScene,
  iconButtonClass,
  LOCAL_STORAGE_KEYS,
  primaryButtonClass,
  quietSuccessToasts,
  type NameDisplayMode,
  type ShortcutContext,
} from '@/utils';
import { usePlanUsagePrompt } from '@/hooks/plan/usePlanUsagePrompt';
import { NAME_DISPLAY_MODES } from '@/components/SeatingPlanGenerator/canvas/nameDisplayGroup';
import HelpButton from '@/components/ui/buttons/HelpButton';
import { PAGE_HELP_TOPICS } from '@/components/help/pageHelpTopics';
import PresentationScene from '@/components/scene/PresentationScene';
import PresentationToolbar, {
  type AbsentStudent,
} from '@/components/scene/PresentationToolbar';
import SimpleCircleView from '@/components/circle/SimpleCircleView';
import type { SeatingArrangement } from '@/types';
import type { SeatingMode } from '@/types/Circle';
import type { PresentationPerspective } from '@/utils/ui/boardOrientation';
import type { SeatBadgeView } from '@/utils/ui/seatBadges';

/** Legible badges and a "+N" on the tokens, as on the projected table plan. */
const PRESENT_CIRCLE_BADGE_VIEW: SeatBadgeView = { collapse: true };

const NO_SEATING: SeatingArrangement = [];

/** The projection's own keys, which its help lists (`shortcutMap.present`). */
const PRESENT_SHORTCUTS: ShortcutContext[] = ['present'];

const PRESENT_MIN_ZOOM = 0.5;
const PRESENT_MAX_ZOOM = 3;

/**
 * How long a plan has to stay on screen before it counts as presented. Long
 * enough that opening the view and navigating straight back out is not mistaken
 * for a lesson, short enough that any real use is caught.
 */
const PRESENT_USAGE_DWELL_MS = 30_000;

export default function Present() {
  const { t } = useTranslation('generator');
  const metadata = usePageSeo('/present');
  const navigate = useLocalizedNavigate();
  const isDark = useIsDarkMode();
  const location = useLocation();

  const {
    currentSeating,
    classroomScene,
    students,
    circleLayout,
    activeClass,
  } = useSeatingPlanState();

  // The view to open with: the workspace hands over the arrangement it was
  // in, and the way back from "Gruppen bilden" hands back the whole view.
  const openedWith = location.state as {
    mode?: SeatingMode;
    perspective?: PresentationPerspective;
    fromWorkspace?: boolean;
  } | null;
  const [mode, setMode] = useState<SeatingMode>(openedWith?.mode ?? 'table');
  // Generate the circle layout on demand when switching to circle presentation.
  useEnsureCircleLayout(mode, { enabled: mode === 'circle' });

  // Its question waits for the way back: the wall faces the class.
  const recordUsage = usePlanUsagePrompt(activeClass.id, {
    holdUntilLeft: true,
  });

  // The wall faces the class: the plan's "saved" from the way here, or any
  // other success, is not for the room to read (`quietSuccessToasts`).
  useEffect(() => quietSuccessToasts(), []);

  // A plan only for the tables it stands on: one made for tables the room no
  // longer has is not drawn, and not counted as presented either.
  const hasPlan = hasPlanForScene(classroomScene, currentSeating);

  // Showing a plan on the projector is the clearest evidence that it is the
  // arrangement actually in use, unlike the dozens of mixes tried beforehand.
  // Circle mode is left out: the usage record tracks table neighbourhoods.
  useEffect(() => {
    if (mode !== 'table' || !hasPlan) return;

    const timer = window.setTimeout(() => {
      recordUsage(currentSeating, 'presented');
    }, PRESENT_USAGE_DWELL_MS);

    return () => window.clearTimeout(timer);
  }, [mode, hasPlan, currentSeating, recordUsage]);

  const [perspective, setPerspective] = useState<PresentationPerspective>(
    openedWith?.perspective ?? 'student',
  );
  // Every handler the bar gets keeps its identity: the bar is memoised, so
  // that a finger moving the plan does not render it again with every step.
  const [showBadges, setShowBadges] = useState(false);
  const toggleBadges = useCallback(() => setShowBadges((value) => !value), []);
  const [showPhotos, setShowPhotos] = usePersistentState(
    LOCAL_STORAGE_KEYS.presentShowPhotos,
    true,
  );
  const togglePhotos = useCallback(
    () => setShowPhotos((value) => !value),
    [setShowPhotos],
  );
  const [showColors, setShowColors] = usePersistentState(
    LOCAL_STORAGE_KEYS.presentShowColors,
    true,
  );
  const toggleColors = useCallback(
    () => setShowColors((value) => !value),
    [setShowColors],
  );
  const [showFeatures, setShowFeatures] = usePersistentState(
    LOCAL_STORAGE_KEYS.presentShowFeatures,
    true,
  );
  const toggleFeatures = useCallback(
    () => setShowFeatures((value) => !value),
    [setShowFeatures],
  );
  const [zoom, setZoom] = usePersistentState(LOCAL_STORAGE_KEYS.presentZoom, 1);
  // Black on white for a bright room; the projection's own decision, kept
  // between lessons like the other presentation preferences.
  const [contrast, setContrast] = usePersistentState(
    LOCAL_STORAGE_KEYS.presentContrast,
    false,
  );
  const toggleContrast = useCallback(
    () => setContrast((value) => !value),
    [setContrast],
  );
  // The beamer keeps its own name rule and starts at the first name: it is
  // read from the back row, where "Mia W." is two words too many. The editor's
  // `spg.nameDisplay` stays as it is.
  const [nameDisplay, setNameDisplay] = usePersistentState<NameDisplayMode>(
    LOCAL_STORAGE_KEYS.presentNameDisplay,
    'firstName',
  );
  // The projector toolbar has no room for a segmented control, so one button
  // cycles through the modes and names the current one in its tooltip.
  const nameDisplayIndex = Math.max(0, NAME_DISPLAY_MODES.indexOf(nameDisplay));
  const currentNameDisplay = NAME_DISPLAY_MODES[nameDisplayIndex];
  const cycleNameDisplay = useCallback(
    () =>
      setNameDisplay(
        (current) =>
          NAME_DISPLAY_MODES[
            (Math.max(0, NAME_DISPLAY_MODES.indexOf(current)) + 1) %
              NAME_DISPLAY_MODES.length
          ],
      ),
    [setNameDisplay],
  );
  const { pan, containerRef, pointerHandlers, canPan, setZoomLevel, reset } =
    usePanZoom({
      zoom,
      setZoom,
      minZoom: PRESENT_MIN_ZOOM,
      maxZoom: PRESENT_MAX_ZOOM,
    });

  const surfaceRef = useRef<HTMLElement>(null);
  const {
    isFullscreen,
    isSupported: fullscreenSupported,
    toggle: toggleFullscreen,
  } = useFullscreen(surfaceRef);
  // In fullscreen the wall belongs to the plan: the head on top goes, and the
  // bar waits below the edge until the teacher reaches for it.
  const { visible: barVisible, barProps } = useEdgeReveal(isFullscreen);

  // "Who's next?" draws without replacement, so every student gets a turn
  // before anyone repeats.
  // The circle draws from its own order: it takes every student, a seat at a
  // table or not. Switching the shape starts a new round.
  const circleSeating = useMemo(
    () => [
      (circleLayout?.students ?? []).map(
        (position) => position?.student ?? null,
      ),
    ],
    [circleLayout],
  );
  // A plan for tables the room no longer has is not drawn, so nobody is
  // drawn from it either.
  // Who is missing today (decision 0045): a tap on the seat, kept for the
  // day in memory alone; the draw leaves them out.
  const classId = activeClass.id;
  const absentIds = useAbsentIds(classId);
  const picker = useRandomStudentPicker(
    mode === 'circle' ? circleSeating : hasPlan ? currentSeating : NO_SEATING,
    undefined,
    absentIds,
  );
  const toggleMissing = useCallback(
    (studentId: string) => {
      if (!classId) return;
      const name = students.find((student) => student.id === studentId)?.name;
      const wasMissing = absentIds.has(studentId);
      toggleAbsent(classId, studentId);
      if (name) {
        announce(
          t(wasMissing ? 'present.absent.back' : 'present.absent.marked', {
            name,
          }),
        );
      }
    },
    [absentIds, classId, students, t],
  );
  // The bar lists them by name, in the class's own order.
  const absentStudents = useMemo<AbsentStudent[]>(
    () =>
      students
        .filter((student) => absentIds.has(student.id))
        .map(({ id, name }) => ({ id, name })),
    [students, absentIds],
  );
  const clearMissing = useCallback(() => {
    if (classId) clearAbsent(classId);
  }, [classId]);

  const backToPlan = useBackToWorkspace(
    useCallback(() => navigate('/generator'), [navigate]),
  );

  const zoomBy = useCallback(
    (delta: number) =>
      setZoomLevel(
        Math.min(
          PRESENT_MAX_ZOOM,
          Math.max(PRESENT_MIN_ZOOM, Number((zoom + delta).toFixed(2))),
        ),
      ),
    [setZoomLevel, zoom],
  );

  useKeyboardShortcuts({
    // Same back shortcut as the export page.
    'alt+arrowleft': backToPlan,
    f: toggleFullscreen,
    ' ': () => picker.pick(),
    escape: () => picker.reset(),
    '+': () => zoomBy(0.1),
    '-': () => zoomBy(-0.1),
    '0': reset,
  });

  // "Gruppen bilden" and "Dienste verteilen" go back through the history, so
  // this entry is where their way back lands: it is brought up to the view on
  // screen first.
  const fromWorkspace = openedWith?.fromWorkspace;
  const openTool = useCallback(
    (route: '/gruppen' | '/dienste') => {
      navigate('/present', {
        replace: true,
        state: { mode, perspective, fromWorkspace },
      });
      navigate(route);
    },
    [navigate, mode, perspective, fromWorkspace],
  );
  const openGroups = useCallback(() => openTool('/gruppen'), [openTool]);
  const openDuties = useCallback(() => openTool('/dienste'), [openTool]);

  const hasCircle = !!circleLayout && circleLayout.students.length > 0;
  const hasContent = mode === 'circle' ? hasCircle : hasPlan;
  const isTeacher = perspective === 'teacher';
  const isCircle = mode === 'circle';

  const wallClass = contrast
    ? 'bg-(--present-contrast-bg)'
    : 'bg-(--surface-sunken)';

  // The head says what is on the wall and for whom, with no way back of its
  // own: that is "Beenden" in the bar at the bottom, within reach of the
  // teacher standing in front of it, like everything else that acts on the
  // plan. One element for as long as it says the same, so zooming the plan
  // leaves it alone.
  const className = activeClass.name;
  const header = useMemo(
    () => (
      <AppHeader
        start={
          <HeaderTitle
            title={
              isTeacher ? t('present.teacherView') : t('present.studentView')
            }
            subtitle={className}
          />
        }
        help={
          <HelpButton
            faqSection="unterricht"
            title={t('help.present.title')}
            topics={PAGE_HELP_TOPICS.present}
            shortcutContexts={PRESENT_SHORTCUTS}
          />
        }
      />
    ),
    [isTeacher, className, t],
  );

  return (
    // Fixed to the window, the page leaves the body's distance from a phone's
    // notch behind and keeps its own.
    <div
      className={`fixed inset-0 flex flex-col pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)] ${wallClass}`}
    >
      {/* In fullscreen the room sees the plan alone, so the head is not
          drawn at all. */}
      {!isFullscreen && header}

      <main
        id="main"
        ref={surfaceRef}
        tabIndex={-1}
        className={`relative flex min-h-0 flex-1 flex-col ${wallClass} ${
          isFullscreen ? 'overflow-hidden' : ''
        }`}
      >
        <Seo {...metadata} />

        {/* The drawn student is named in text as well: on a projection the
          spotlight alone is not readable from the back row, and the announcement
          also reaches screen readers. */}
        {picker.picked && (
          <div
            role="status"
            aria-live="polite"
            className="flex flex-wrap items-center justify-center gap-3 px-4 pb-1"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-(--border-card) bg-(--surface-sunken) px-4 py-1.5 text-lg font-semibold text-(--text-page) shadow-sm">
              <HandPointingIcon size={20} aria-hidden />
              {picker.picked.student.name}
            </span>
            <span className="text-sm text-(--text-muted)">
              {t('present.pickRemaining', {
                count: picker.remaining,
              })}
            </span>
            <button
              type="button"
              onClick={picker.reset}
              className={`${iconButtonClass} h-9 w-9`}
              aria-label={t('present.pickReset')}
              title={t('present.pickReset')}
            >
              <ArrowCounterClockwiseIcon size={18} aria-hidden />
            </button>
          </div>
        )}

        {/* Scene fills the remaining space. Without a plan there is nothing to
          pan, and its pointer capture would take the click from "Zurück". */}
        <div
          ref={containerRef}
          className="min-h-0 flex-1 touch-none overflow-hidden px-2"
          style={{ cursor: canPan ? 'grab' : 'default' }}
          {...(hasContent ? pointerHandlers : {})}
        >
          {hasContent && isCircle && circleLayout ? (
            <div className="flex h-full items-center justify-center">
              {/* The ring fills the wall, framed on itself as the table plan is
                framed on its furniture; 100 % is the whole screen. */}
              <div
                className="h-full w-full"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: 'center',
                }}
              >
                <SimpleCircleView
                  layout={circleLayout}
                  editable={false}
                  isDark={contrast ? false : isDark}
                  contrast={contrast}
                  showSpecialNeeds={isTeacher && showBadges && !contrast}
                  showGenderColors={contrast ? false : showColors}
                  photoMode={
                    isTeacher && showPhotos && !contrast ? 'all' : 'off'
                  }
                  nameDisplay={currentNameDisplay}
                  connectionMode="off"
                  badgeView={PRESENT_CIRCLE_BADGE_VIEW}
                  transparentBackground
                  fit
                  spotlightStudentId={picker.picked?.student.id ?? null}
                />
              </div>
            </div>
          ) : hasContent ? (
            <PresentationScene
              scene={classroomScene}
              seating={currentSeating}
              students={students}
              perspective={perspective}
              showBadges={showBadges}
              showPhotos={showPhotos}
              showFeatures={showFeatures}
              showColors={showColors}
              nameDisplay={currentNameDisplay}
              zoom={zoom}
              panX={pan.x}
              panY={pan.y}
              isDark={isDark}
              contrast={contrast}
              absentIds={absentIds}
              onSeatTap={classId ? toggleMissing : undefined}
              spotlight={
                picker.picked
                  ? {
                      tableIndex: picker.picked.tableIndex,
                      seatIndex: picker.picked.seatIndex,
                    }
                  : null
              }
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-center text-(--text-muted)">
              <p className="text-lg font-medium">{t('present.empty')}</p>
              <button
                type="button"
                onClick={backToPlan}
                className={`${primaryButtonClass} h-10 gap-2 px-4`}
                title={t('present.backTitle')}
              >
                <ArrowLeftIcon size={20} aria-hidden />
                <span className="text-sm font-semibold">
                  {t('present.back')}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* One bar, floating over the plan: everything the teacher reaches for
          while standing in front of the projection. In fullscreen it lies over
          the plan instead of beside it, so coming and going does not resize
          the plan under it, and it waits below the edge until the pointer
          comes near, a tap lands there or the keyboard moves into it. */}
        {hasContent ? (
          <div
            {...barProps}
            className={
              isFullscreen
                ? `absolute inset-x-0 bottom-0 z-20 transition duration-200 ease-out motion-reduce:transition-none ${
                    barVisible
                      ? 'translate-y-0 opacity-100'
                      : 'pointer-events-none translate-y-full opacity-0'
                  }`
                : undefined
            }
            data-testid="present-bar"
            data-visible={barVisible}
          >
            <PresentationToolbar
              perspective={perspective}
              onPerspectiveChange={setPerspective}
              mode={mode}
              onModeChange={setMode}
              isTeacher={isTeacher}
              showBadges={showBadges}
              onToggleBadges={toggleBadges}
              showPhotos={showPhotos}
              onTogglePhotos={togglePhotos}
              showColors={showColors}
              onToggleColors={toggleColors}
              showFeatures={showFeatures}
              onToggleFeatures={toggleFeatures}
              contrast={contrast}
              onToggleContrast={toggleContrast}
              nameDisplay={currentNameDisplay}
              onCycleNameDisplay={cycleNameDisplay}
              onPick={picker.total > 0 ? picker.pick : undefined}
              absent={absentStudents}
              onMarkBack={classId ? toggleMissing : undefined}
              onClearAbsent={classId ? clearMissing : undefined}
              onOpenGroups={openGroups}
              onOpenDuties={openDuties}
              zoom={zoom}
              minZoom={PRESENT_MIN_ZOOM}
              maxZoom={PRESENT_MAX_ZOOM}
              onZoomChange={setZoomLevel}
              onResetView={reset}
              fullscreenSupported={fullscreenSupported}
              isFullscreen={isFullscreen}
              onToggleFullscreen={toggleFullscreen}
              onExit={backToPlan}
            />
          </div>
        ) : (
          <div className="h-4" aria-hidden />
        )}
      </main>
    </div>
  );
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowCounterClockwiseIcon,
  ArrowLeftIcon,
  HandPointingIcon,
} from '@phosphor-icons/react';
import Seo from '@/components/Seo';
import { KpLockup } from '@/components/KpLockup';
import { LocalizedLink } from '@/components/LocalizedLink';
import { usePageSeo } from '@/hooks/usePageSeo';
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
import {
  iconButtonClass,
  LOCAL_STORAGE_KEYS,
  primaryButtonClass,
  type NameDisplayMode,
} from '@/utils';
import { usePlanUsagePrompt } from '@/hooks/plan/usePlanUsagePrompt';
import { NAME_DISPLAY_MODES } from '@/components/SeatingPlanGenerator/canvas/nameDisplayGroup';
import HelpButton from '@/components/ui/buttons/HelpButton';
import AppearanceControls from '@/components/ui/navigation/AppearanceControls';
import PresentationScene from '@/components/scene/PresentationScene';
import PresentationToolbar from '@/components/scene/PresentationToolbar';
import SimpleCircleView from '@/components/circle/SimpleCircleView';
import { type SeatingMode } from '@/components/SeatingPlanGenerator/SeatingModeToggle';
import type { PresentationPerspective } from '@/utils/ui/boardOrientation';

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
  } | null;
  const [mode, setMode] = useState<SeatingMode>(openedWith?.mode ?? 'table');
  // Generate the circle layout on demand when switching to circle presentation.
  useEnsureCircleLayout(mode, { enabled: mode === 'circle' });

  const recordUsage = usePlanUsagePrompt(activeClass.id);

  // Showing a plan on the projector is the clearest evidence that it is the
  // arrangement actually in use, unlike the dozens of mixes tried beforehand.
  // Circle mode is left out: the usage record tracks table neighbourhoods.
  useEffect(() => {
    if (mode !== 'table' || currentSeating.length === 0) return;

    const timer = window.setTimeout(() => {
      recordUsage(currentSeating, 'presented');
    }, PRESENT_USAGE_DWELL_MS);

    return () => window.clearTimeout(timer);
  }, [mode, currentSeating, recordUsage]);

  const [perspective, setPerspective] = useState<PresentationPerspective>(
    openedWith?.perspective ?? 'student',
  );
  const [showBadges, setShowBadges] = useState(false);
  const [showPhotos, setShowPhotos] = usePersistentState(
    LOCAL_STORAGE_KEYS.presentShowPhotos,
    true,
  );
  const [showRoomColors, setShowRoomColors] = usePersistentState(
    LOCAL_STORAGE_KEYS.presentShowColors,
    true,
  );
  const [showFeatures, setShowFeatures] = usePersistentState(
    LOCAL_STORAGE_KEYS.presentShowFeatures,
    true,
  );
  const [zoom, setZoom] = usePersistentState(LOCAL_STORAGE_KEYS.presentZoom, 1);
  // Black on white for a bright room; the projection's own decision, kept
  // between lessons like the other presentation preferences.
  const [contrast, setContrast] = usePersistentState(
    LOCAL_STORAGE_KEYS.presentContrast,
    false,
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
  const cycleNameDisplay = () =>
    setNameDisplay(
      () =>
        NAME_DISPLAY_MODES[(nameDisplayIndex + 1) % NAME_DISPLAY_MODES.length],
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
  // In fullscreen the wall belongs to the plan: the strip on top goes, and the
  // bar waits below the edge until the teacher reaches for it.
  const { visible: barVisible, barProps } = useEdgeReveal(isFullscreen);

  // "Who's next?" draws without replacement, so every student gets a turn
  // before anyone repeats.
  const picker = useRandomStudentPicker(currentSeating);

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
    'alt+arrowleft': () => navigate('/generator'),
    f: toggleFullscreen,
    ' ': () => picker.pick(),
    escape: () => picker.reset(),
    '+': () => zoomBy(0.1),
    '-': () => zoomBy(-0.1),
    '0': reset,
  });

  // "Gruppen bilden" goes back through the history, so this entry is where
  // its way back lands: it is brought up to the view on screen first.
  const openGroups = () => {
    navigate('/present', { replace: true, state: { mode, perspective } });
    navigate('/gruppen');
  };

  const seatedCount = currentSeating.reduce(
    (count, table) => count + table.filter(Boolean).length,
    0,
  );
  const hasPlan = classroomScene.tables.length > 0 && currentSeating.length > 0;
  const hasCircle = !!circleLayout && circleLayout.students.length > 0;
  const hasContent = mode === 'circle' ? hasCircle : hasPlan;
  const isTeacher = perspective === 'teacher';
  const isCircle = mode === 'circle';

  return (
    <main
      id="main"
      ref={surfaceRef}
      tabIndex={-1}
      className={`fixed inset-0 flex flex-col ${
        contrast ? 'bg-white' : 'bg-(--surface-sunken)'
      } ${isFullscreen ? 'overflow-hidden' : ''}`}
    >
      <Seo {...metadata} />

      {/* A strip, not a toolbar: what is on the wall and for whom. Everything
          that can be pressed lives in the bar at the bottom, within reach of
          the teacher standing in front of it. In fullscreen the room sees the
          plan alone, so the strip is not drawn at all. */}
      {!isFullscreen && (
        <div className="flex flex-wrap items-center gap-3 px-3 py-2 sm:px-4 sm:py-3">
          {/* The mark sits centred on the line; the class and whose view it is
            share one baseline beside it. */}
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <h1 className="flex shrink-0 items-center">
              <LocalizedLink
                to="/"
                className="kp-lockup focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary) focus-visible:ring-offset-2"
              >
                <KpLockup size="sm" hideWordmarkOnMobile />
              </LocalizedLink>
            </h1>
            <div className="flex min-w-0 items-baseline gap-3">
              <span className="truncate text-lg font-semibold text-(--text-page)">
                {activeClass.name}
              </span>
              <span className="hidden shrink-0 text-sm text-(--text-muted) sm:inline">
                {isTeacher
                  ? t('present.teacherView')
                  : t('present.studentView')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {seatedCount > 0 && (
              <span className="hidden text-sm tabular-nums text-(--text-muted) sm:inline">
                {t('present.seats', { count: seatedCount })}
              </span>
            )}
            <AppearanceControls />
            <HelpButton
              title={t('help.present.title', 'Präsentiermodus')}
              instructions={
                <ul className="list-disc space-y-1 pl-4">
                  <li>
                    {t(
                      'help.present.item1',
                      'Wechsle oben zwischen Lehrer- und Schüleransicht sowie zwischen Sitzplan und Sitzkreis.',
                    )}
                  </li>
                  <li>
                    {t(
                      'help.present.item2',
                      'Die Schüleransicht zeigt den Plan aus Sicht der Klasse – ohne Merkmale und Fotos.',
                    )}
                  </li>
                  <li>
                    {t(
                      'help.present.item3',
                      'Blende über die Leiste unten Merkmale, Fotos, Farben und Raumelemente ein oder aus.',
                    )}
                  </li>
                  <li>
                    {/* New keys carry no inline default (see AGENTS.md). */}
                    {t('help.present.itemNames')}
                  </li>
                  <li>{t('help.present.itemContrast')}</li>
                  <li>
                    {t(
                      'help.present.item4',
                      'Zoome per Regler oder Mausrad und verschiebe die Ansicht durch Ziehen; das Zentrieren-Symbol setzt die Ansicht zurück.',
                    )}
                  </li>
                  <li>
                    {t(
                      'help.present.item6',
                      '„Wer kommt dran?“ zieht einen zufälligen Schüler und hebt seinen Platz hervor – jeder kommt einmal dran, bevor sich jemand wiederholt.',
                    )}
                  </li>
                  <li>
                    {t(
                      'help.present.item7',
                      'Tastatur: F Vollbild, Leertaste zieht einen Schüler, Esc setzt die Auswahl zurück, + / − zoomen, 0 zentriert.',
                    )}
                  </li>
                  <li>{t('help.present.itemFullscreen')}</li>
                  <li>
                    {t(
                      'help.present.item5',
                      'Mit Alt + ← kehrst du zum Generator zurück.',
                    )}
                  </li>
                </ul>
              }
            />
          </div>
        </div>
      )}

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
              defaultValue: 'noch {{count}} übrig',
            })}
          </span>
          <button
            type="button"
            onClick={picker.reset}
            className={`${iconButtonClass} h-9 w-9`}
            aria-label={t('present.pickReset', 'Auswahl zurücksetzen (Esc)')}
            title={t('present.pickReset', 'Auswahl zurücksetzen (Esc)')}
          >
            <ArrowCounterClockwiseIcon size={18} aria-hidden />
          </button>
        </div>
      )}

      {/* Scene fills the remaining space */}
      <div
        ref={containerRef}
        className="min-h-0 flex-1 touch-none overflow-hidden px-2"
        style={{ cursor: canPan ? 'grab' : 'default' }}
        {...pointerHandlers}
      >
        {hasContent && isCircle && circleLayout ? (
          <div className="flex h-full items-center justify-center">
            <div
              className="w-full max-w-5xl"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'center',
              }}
            >
              <SimpleCircleView
                layout={circleLayout}
                editable={false}
                isDark={isDark}
                showSpecialNeeds={isTeacher && showBadges}
                photoMode={isTeacher && showPhotos ? 'all' : 'off'}
                nameDisplay={currentNameDisplay}
                connectionMode="off"
                transparentBackground
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
            showRoomColors={showRoomColors}
            nameDisplay={currentNameDisplay}
            zoom={zoom}
            panX={pan.x}
            panY={pan.y}
            isDark={isDark}
            contrast={contrast}
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
            <p className="text-lg font-medium">
              {t('present.empty', 'Noch kein Sitzplan zum Präsentieren.')}
            </p>
            <button
              type="button"
              onClick={() => navigate('/generator')}
              className={`${primaryButtonClass} h-10 gap-2 px-4`}
              title={t('present.backTitle', 'Zurück zum Generator (Alt + ←)')}
            >
              <ArrowLeftIcon size={20} aria-hidden />
              <span className="text-sm font-semibold">
                {t('present.back', 'Zurück')}
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
            onToggleBadges={() => setShowBadges((value) => !value)}
            showPhotos={showPhotos}
            onTogglePhotos={() => setShowPhotos((value) => !value)}
            showRoomColors={showRoomColors}
            onToggleRoomColors={() => setShowRoomColors((value) => !value)}
            showFeatures={showFeatures}
            onToggleFeatures={() => setShowFeatures((value) => !value)}
            contrast={contrast}
            onToggleContrast={() => setContrast((value) => !value)}
            nameDisplay={currentNameDisplay}
            onCycleNameDisplay={cycleNameDisplay}
            onPick={!isCircle && picker.total > 0 ? picker.pick : undefined}
            onOpenGroups={openGroups}
            zoom={zoom}
            minZoom={PRESENT_MIN_ZOOM}
            maxZoom={PRESENT_MAX_ZOOM}
            onZoomChange={setZoomLevel}
            onResetView={reset}
            fullscreenSupported={fullscreenSupported}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
            onExit={() => navigate('/generator')}
          />
        </div>
      ) : (
        <div className="h-4" aria-hidden />
      )}
    </main>
  );
}

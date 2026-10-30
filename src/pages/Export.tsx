// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { ArrowLeftIcon } from '@phosphor-icons/react';
import {
  canvasFrameClass,
  canvasStageClass,
  errorHandlers,
  formatLongDate,
  hasPlanForScene,
  LEGACY_EXPORT_KEYS,
  LOCAL_STORAGE_KEYS,
  logError,
  primaryButtonClass,
  toIsoDate,
} from '@/utils';
import type { DataFamily, NameDisplayMode } from '@/utils';
import { BADGE_FAMILY_ORDER, getClassBadges } from '@/utils/ui/seatBadges';
import { showToast, TOAST_MESSAGES } from '@/utils/ui/toast';
import {
  isChunkLoadError,
  reportChunkLoadFailure,
} from '@/utils/performance/chunkLoad';
import {
  DEFAULT_FEATURE_VISIBILITY,
  FEATURE_TYPES,
  type FeatureVisibilityFlags,
} from '@/utils/ui';
import { NAME_DISPLAY_MODES } from '@/components/SeatingPlanGenerator/canvas/nameDisplayGroup';
import {
  useSeatingPlanState,
  useSeatingPlanActions,
} from '@/contexts/SeatingPlanContext';
import {
  renderCircleSvg,
  renderNoteListSvgPages,
  renderSceneSvg,
  preloadRenderer,
} from '@/services/export/sceneRenderer';
import {
  buildNoteListEntries,
  DEFAULT_NOTE_LIST_SETTINGS,
  normalizeNoteListSettings,
  type NoteListOrder,
  type NoteListSettings,
} from '@/utils/ui/noteList';
import type { NoteListInput } from '@/components/scene/NoteListSheet';
import {
  DEFAULT_SUBSTITUTE_SETTINGS,
  normalizeSubstituteSettings,
  substituteHeaderLines,
  substituteRenderOptions,
  type SheetNotes,
  type SubstituteArrangement,
  type SubstituteSheetSettings,
} from '@/utils/ui/substituteSheet';
import type { ExportClassMetadata } from '@/services/export/sceneRenderer';
import { buildPhotoDataUrlMap } from '@/services/export/pdfExportFunctions';
import type {
  ClassroomFeatureType,
  PhotoDisplayMode,
  SeatingArrangement,
  Student,
} from '@/types';
import usePersistentState from '@/hooks/usePersistentState';
import type { CircleLayout, SeatingMode } from '@/types/Circle';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { isAnyDialogOpen } from '@/hooks/ui/useDialogLayer';
import { useFirstVisit } from '@/hooks/ui/useFirstVisit';
import { usePlanUsagePrompt } from '@/hooks/plan/usePlanUsagePrompt';
import Seo from '@/components/Seo';
import { useLocalizedNavigate } from '@/hooks/useLocalizedNavigate';
import { usePageSeo } from '@/hooks/usePageSeo';
import primaryFontWoff2Url from '@fontsource-variable/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-wght-normal.woff2?url';
import AppShell from '@/components/shell/AppShell';
import InspectorPortal from '@/components/shell/InspectorPortal';
import {
  workspaceLayerClass,
  workspaceStageClass,
} from '@/components/shell/shellTokens';
import SeatingPlanHeader from '@/components/SeatingPlanGenerator/SeatingPlanHeader';
import ExportStatusBar from '@/components/SeatingPlanGenerator/ExportStatusBar';
import ExportToolPanel, {
  type ExportView,
} from '@/components/SeatingPlanGenerator/ExportToolPanel';
import ExportSheetInspector from '@/components/SeatingPlanGenerator/ExportSheetInspector';
import SmartSidebar from '@/components/ui/panels/SmartSidebar';
import { useInspector } from '@/contexts/InspectorContext';

type PageOrientation = 'landscape' | 'portrait';

/**
 * What the plan's or the circle's sheet carries besides the arrangement — the
 * ordinary sheet's switches, or the substitute's sheet's fixed set (decision
 * 0034). The preview, the PDF and the images read this one object.
 */
type SheetContent = {
  showSpecialNeeds: boolean;
  showGenderColors: boolean;
  showLegend: boolean;
  showConnections: boolean;
  nameDisplay: NameDisplayMode;
  showPhotos: boolean;
  classMetadata?: ExportClassMetadata;
  hiddenBadgeFamilies?: readonly DataFamily[];
  metadataLines?: readonly string[];
  dateLabel?: string;
  notes?: SheetNotes;
};

/**
 * Read a value persisted by the editor (via {@link usePersistentState}) so the
 * export page can seed its own defaults from the live editor settings (WYSIWYG).
 * One-way seed: once the user changes an export control its own `export.*` key
 * takes over.
 */
function readPersisted<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined' || !window.localStorage) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/**
 * Read the pre-split page orientation, if one is still stored.
 *
 * `export.pageOrientation` held a single value for both seating modes before it
 * became one key per mode. It is read as a *default* for the new keys rather
 * than copied over in an effect: `usePersistentState` writes its own default to
 * localStorage on mount, so by the time any effect runs the new keys always
 * exist and a migration could no longer tell a stored preference from a
 * default.
 */
function readLegacyOrientation(): PageOrientation | null {
  const stored = readPersisted<PageOrientation | null>(
    LEGACY_EXPORT_KEYS.pageOrientation,
    null,
  );
  return stored === 'portrait' || stored === 'landscape' ? stored : null;
}

const PORTRAIT_PAGE_RATIO = 817 / 1148;
const LANDSCAPE_PAGE_RATIO = 1148 / 817;

/**
 * The page without a plan to print. The inspector has nothing to show, so it
 * gives its width back, and the one way on is back to the plan.
 */
function ExportEmptyState({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation('generator');
  const { setSuspended } = useInspector();
  useLayoutEffect(() => {
    setSuspended(true);
    return () => setSuspended(false);
  }, [setSuspended]);

  return (
    <div className="flex min-h-96 flex-1 flex-col items-center justify-center gap-4 px-4 text-center text-(--text-muted)">
      <p className="text-lg font-medium">{t('export.empty')}</p>
      <button
        type="button"
        onClick={onBack}
        className={`${primaryButtonClass} h-10 gap-2 px-4`}
        title={t('export.backTitle')}
      >
        <ArrowLeftIcon size={20} aria-hidden />
        <span className="text-sm font-semibold">
          {t('export.backToSeating')}
        </span>
      </button>
    </div>
  );
}

export default function Export() {
  const { t, i18n } = useTranslation('generator');
  const metadata = usePageSeo('/export');
  const location = useLocation();
  const navigate = useLocalizedNavigate();
  // Marks the visit (`spg.hasVisitedApp`) for the onboarding tour record.
  useFirstVisit();
  const navigationState = (location.state || {}) as {
    seating?: SeatingArrangement;
    planName?: string;
    circleLayout?: CircleLayout;
    /** The arrangement the plan layer showed: the sheet starts with it. */
    mode?: SeatingMode | 'list';
    /**
     * The layer "Zurück" leads to: the plan (3) unless the page was opened
     * from elsewhere — the class layer's "Liste drucken" passes 1.
     */
    returnStep?: number;
  };
  const {
    currentSeating,
    planName: contextPlanName,
    classroomScene,
    students,
    circleLayout,
    circleGenerationInProgress,
    circleGenerationStatus,
    activeClass,
    rooms,
    activeRoomId,
  } = useSeatingPlanState();
  const {
    generateCircleSeating,
    cancelCircleGeneration,
    setCircleLayoutValue,
  } = useSeatingPlanActions();
  const { exportError } = errorHandlers;
  // Get circle layout from navigation state if available, or auto-generate one
  const seating = navigationState.seating || currentSeating;
  // A plan made for other tables — the room set up anew under it — is no
  // plan for this room: its seats would land beside the tables on the sheet.
  // Nor is a seating of empty seats alone.
  const hasPlan = hasPlanForScene(classroomScene, seating);
  const returnStep =
    typeof navigationState.returnStep === 'number'
      ? navigationState.returnStep
      : 3;
  const stateCircleLayout = navigationState.circleLayout || null;
  const circleLayoutPromiseRef = useRef<Promise<CircleLayout | null> | null>(
    null,
  );
  const generationProgress =
    typeof circleGenerationStatus?.progress === 'number'
      ? Math.round(circleGenerationStatus.progress * 100)
      : null;
  const generationMessage =
    circleGenerationStatus?.message ?? t('export.generatingCircle');
  // The sheet's title follows the plan's name until the teacher types one of
  // their own — renaming the plan, or switching the class in the header,
  // should not leave the old name printed on the sheet.
  const planNameForTitle = navigationState.planName || contextPlanName || '';
  const [title, setTitle] = useState(planNameForTitle);
  const lastPlanNameRef = useRef(planNameForTitle);
  useEffect(() => {
    const previous = lastPlanNameRef.current;
    lastPlanNameRef.current = planNameForTitle;
    setTitle((current) => (current === previous ? planNameForTitle : current));
  }, [planNameForTitle]);
  // One SVG document per page: the plan and the circle are one page, the
  // note list may run to several.
  const [previewPages, setPreviewPages] = useState<string[]>([]);
  const previewSvg = previewPages[0] ?? '';
  const iframeRef = useRef<HTMLIFrameElement>(null);
  // Opened from the circle, the sheet shows the circle — where there is one
  // to show; opened from the class layer, the note list. The toolbar
  // switches as before.
  const [previewMode, setPreviewMode] = useState<ExportView>(() =>
    navigationState.mode === 'list'
      ? 'list'
      : navigationState.mode === 'circle' &&
          (circleLayout ?? navigationState.circleLayout)
        ? 'circle'
        : 'table',
  );
  // The note list needs students, not a plan: it can be printed before the
  // first mix, by name.
  const hasSheet = hasPlan || (previewMode === 'list' && students.length > 0);
  // Persisted like every other display option on this page: a teacher who
  // never wants needs or connection lines on the printout should not have to
  // switch them off again on each visit.
  const [showNeeds, setShowNeeds] = usePersistentState<boolean>(
    LOCAL_STORAGE_KEYS.exportShowNeeds,
    true,
  );
  const [showConnections, setShowConnections] = usePersistentState<boolean>(
    LOCAL_STORAGE_KEYS.exportShowConnections,
    true,
  );
  // The sheet's own room elements, seeded once from the editor's like the
  // names and photos below; a switch here never reaches the editor's plan.
  const [featureVisibility, setFeatureVisibility] =
    usePersistentState<FeatureVisibilityFlags>(
      LOCAL_STORAGE_KEYS.exportFeatureVisibility,
      readPersisted<FeatureVisibilityFlags>(
        LOCAL_STORAGE_KEYS.featureVisibility,
        DEFAULT_FEATURE_VISIBILITY,
      ),
    );
  const setFeatureVisible = useCallback(
    (type: ClassroomFeatureType, visible: boolean) =>
      setFeatureVisibility((current) => ({ ...current, [type]: visible })),
    [setFeatureVisibility],
  );
  const featureAvailability = useMemo(() => {
    const features = classroomScene.features ?? [];
    const availability: FeatureVisibilityFlags = {};
    for (const type of FEATURE_TYPES) {
      availability[type] = features.some((feature) => feature.type === type);
    }
    return availability;
  }, [classroomScene.features]);
  const effectiveVisibility = useMemo(() => {
    const effective: FeatureVisibilityFlags = {};
    for (const type of FEATURE_TYPES) {
      effective[type] =
        featureAvailability[type] === true && featureVisibility[type] !== false;
    }
    return effective;
  }, [featureAvailability, featureVisibility]);
  const [tableOrientation, setTableOrientation] =
    usePersistentState<PageOrientation>(
      LOCAL_STORAGE_KEYS.exportTableOrientation,
      readLegacyOrientation() ?? 'portrait',
    );
  const [circleOrientation, setCircleOrientation] =
    usePersistentState<PageOrientation>(
      LOCAL_STORAGE_KEYS.exportCircleOrientation,
      readLegacyOrientation() ?? 'landscape',
    );
  // Uniform name rule for the whole sheet. Replaces the former on/off "full
  // names" switch: the default truncation shortens only the names that do not
  // fit, so one plan mixed full names and abbreviations. Seeded from the old
  // boolean key so an existing preference is not silently dropped.
  const [nameDisplay, setNameDisplay] = usePersistentState<NameDisplayMode>(
    LOCAL_STORAGE_KEYS.exportNameDisplay,
    readPersisted<boolean>(LEGACY_EXPORT_KEYS.showFullNames, false)
      ? 'full'
      : readPersisted<NameDisplayMode>(
          LOCAL_STORAGE_KEYS.nameDisplay,
          'firstNameInitial',
        ),
  );
  const effectiveNameDisplay: NameDisplayMode = NAME_DISPLAY_MODES.includes(
    nameDisplay,
  )
    ? nameDisplay
    : 'firstNameInitial';
  // WYSIWYG: seed photo visibility/density defaults from the live editor state.
  const [showPhotos, setShowPhotos] = usePersistentState<boolean>(
    LOCAL_STORAGE_KEYS.exportShowPhotos,
    readPersisted<PhotoDisplayMode>(
      LOCAL_STORAGE_KEYS.photoDisplayMode,
      'hover',
    ) !== 'off',
  );
  const [showClassInfo, setShowClassInfo] = usePersistentState<boolean>(
    LOCAL_STORAGE_KEYS.exportShowClassInfo,
    true,
  );
  const [showLegend, setShowLegend] = usePersistentState<boolean>(
    LOCAL_STORAGE_KEYS.exportShowLegend,
    false,
  );
  // The gender tint on the seats (decision 0020). A plan that hangs on the
  // classroom wall need not be a map of who is a boy and who a girl.
  const [showGenderColors, setShowGenderColors] = usePersistentState<boolean>(
    LOCAL_STORAGE_KEYS.exportShowGenderColors,
    true,
  );
  // Table export only: rotates the classroom 180° with upright names, for a
  // sheet that is read from the opposite side of the room (e.g. a teacher's
  // desk at the back) without turning the page and its header upside down.
  const [flipView, setFlipView] = usePersistentState<boolean>(
    LOCAL_STORAGE_KEYS.exportFlipView,
    false,
  );

  // Table export only: frame the sheet on the tables, as the projection does,
  // or show the whole room with its outline.
  const [frameOnTables, setFrameOnTables] = usePersistentState<boolean>(
    LOCAL_STORAGE_KEYS.exportFrameOnTables,
    true,
  );

  // The note list keeps its settings in one object; a stored value is read
  // field by field, so a setting added later starts at its default.
  const [storedNoteList, setStoredNoteList] = usePersistentState<
    Partial<NoteListSettings>
  >(LOCAL_STORAGE_KEYS.exportNoteList, DEFAULT_NOTE_LIST_SETTINGS);
  const noteListSettings = useMemo(
    () => normalizeNoteListSettings(storedNoteList),
    [storedNoteList],
  );
  const updateNoteList = useCallback(
    (patch: Partial<NoteListSettings>) =>
      setStoredNoteList((current) => ({
        ...normalizeNoteListSettings(current),
        ...patch,
      })),
    [setStoredNoteList],
  );

  // The substitute's sheet (decision 0034) keeps its own settings in one
  // object, apart from the teacher's own sheet. What belongs to this one
  // sheet — the arrangement, the day, the note, the title — lasts as long as
  // the page and is never stored.
  const [storedSubstitute, setStoredSubstitute] = usePersistentState<
    Partial<SubstituteSheetSettings>
  >(LOCAL_STORAGE_KEYS.exportSubstitute, DEFAULT_SUBSTITUTE_SETTINGS);
  const substituteSettings = useMemo(
    () => normalizeSubstituteSettings(storedSubstitute),
    [storedSubstitute],
  );
  const updateSubstitute = useCallback(
    (patch: Partial<SubstituteSheetSettings>) =>
      setStoredSubstitute((current) => ({
        ...normalizeSubstituteSettings(current),
        ...patch,
      })),
    [setStoredSubstitute],
  );
  const [substituteArrangement, setSubstituteArrangement] =
    useState<SubstituteArrangement>(() =>
      navigationState.mode === 'circle' &&
      (circleLayout ?? navigationState.circleLayout)
        ? 'circle'
        : 'table',
    );
  const [substituteDate, setSubstituteDate] = useState(() => toIsoDate());
  const [substituteNote, setSubstituteNote] = useState('');
  const [substituteTitle, setSubstituteTitle] = useState(() =>
    t('export.substitute.defaultTitle'),
  );
  const isSubstitute = previewMode === 'substitute';
  // The arrangement on the sheet: the substitute's sheet shows either.
  const sheetArrangement =
    previewMode === 'substitute' ? substituteArrangement : previewMode;
  const roomName =
    rooms?.find((room) => room.id === activeRoomId)?.name.trim() || undefined;

  const studentNames = useMemo(
    () => students.map((student) => student.name),
    [students],
  );

  // Badge families the printout leaves out. A plan that hangs on the wall
  // may show who wants to sit where, but not who is restless.
  const [storedHiddenFamilies, setHiddenFamilies] = usePersistentState<
    DataFamily[]
  >(LOCAL_STORAGE_KEYS.exportHiddenBadgeFamilies, []);
  const hiddenBadgeFamilies = useMemo(
    () =>
      BADGE_FAMILY_ORDER.filter(
        (family) =>
          Array.isArray(storedHiddenFamilies) &&
          storedHiddenFamilies.includes(family),
      ),
    [storedHiddenFamilies],
  );
  // Only the families the class actually carries get a switch.
  const presentBadgeFamilies = useMemo(() => {
    const families = new Set(
      getClassBadges(students).map((badge) => badge.family),
    );
    return BADGE_FAMILY_ORDER.filter((family) => families.has(family));
  }, [students]);
  // The legend explains the gender tint and the badges; with neither on the
  // sheet it would be an empty heading, so its switch is greyed out.
  const legendHasEntries =
    (showGenderColors && students.length > 0) ||
    (showNeeds &&
      presentBadgeFamilies.some(
        (family) => !hiddenBadgeFamilies.includes(family),
      ));
  const handleToggleBadgeFamily = useCallback(
    (family: DataFamily, visible: boolean) =>
      setHiddenFamilies((current) => {
        const rest = (Array.isArray(current) ? current : []).filter(
          (entry) => entry !== family,
        );
        return visible ? rest : [...rest, family];
      }),
    [setHiddenFamilies],
  );

  const classMetadataForExport = useMemo(() => {
    if (!showClassInfo) {
      return undefined;
    }

    const trimmedName = activeClass.name?.trim() || undefined;
    const trimmedLabel = activeClass.label?.trim() || undefined;
    const trimmedNotes = activeClass.notes?.trim() || undefined;

    if (!trimmedLabel && !trimmedNotes) {
      return undefined;
    }

    return {
      name: trimmedName,
      label: trimmedLabel,
      notes: trimmedNotes,
    };
  }, [activeClass.name, activeClass.label, activeClass.notes, showClassInfo]);

  const handleToggleConnections = useCallback(
    (checked: boolean) => setShowConnections(() => checked),
    [setShowConnections],
  );
  const handleToggleNeeds = useCallback(
    (checked: boolean) => setShowNeeds(() => checked),
    [setShowNeeds],
  );
  const handleTogglePhotos = useCallback(
    (checked: boolean) => setShowPhotos(() => checked),
    [setShowPhotos],
  );
  const handleToggleClassInfo = useCallback(
    (checked: boolean) => setShowClassInfo(() => checked),
    [setShowClassInfo],
  );
  const handleToggleLegend = useCallback(
    (checked: boolean) => setShowLegend(() => checked),
    [setShowLegend],
  );
  const handleToggleGenderColors = useCallback(
    (checked: boolean) => setShowGenderColors(() => checked),
    [setShowGenderColors],
  );
  const handleToggleFlipView = useCallback(
    (checked: boolean) => setFlipView(() => checked),
    [setFlipView],
  );
  const handleToggleFrameOnTables = useCallback(
    (checked: boolean) => setFrameOnTables(() => checked),
    [setFrameOnTables],
  );

  useEffect(() => {
    // Drawing the sheet asks for the renderer again and reports a failure.
    preloadRenderer().catch((error: unknown) => {
      logError('Preloading the sheet renderer failed', { error }, 'Export');
    });
  }, []);

  // The seeding above has already consumed the value, so the only thing left is
  // to retire the key.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    try {
      window.localStorage.removeItem(LEGACY_EXPORT_KEYS.pageOrientation);
    } catch {
      // A storage that refuses writes is not worth failing the page over.
    }
  }, []);
  const activeOrientation =
    sheetArrangement === 'list'
      ? noteListSettings.orientation
      : sheetArrangement === 'circle'
        ? circleOrientation
        : tableOrientation;

  // The orders there is something to follow for: the tables only once
  // someone sits at one, the circle only where there is one. A stored order
  // with nothing to follow falls back to the first that has.
  const someoneSeated = seating.some((table) => table.some(Boolean));
  const noteListOrders = useMemo<NoteListOrder[]>(
    () => [
      ...(someoneSeated ? (['tables'] as const) : []),
      ...(circleLayout ? (['circle'] as const) : []),
      'alphabetical',
      'lastName',
    ],
    [someoneSeated, circleLayout],
  );
  const noteListOrder = noteListOrders.includes(noteListSettings.order)
    ? noteListSettings.order
    : noteListOrders[0]!;
  const noteListEntries = useMemo(
    () =>
      buildNoteListEntries(students, {
        order: noteListOrder,
        seating,
        scene: classroomScene,
        circleLayout,
        locale: i18n.language,
      }),
    [
      students,
      noteListOrder,
      seating,
      classroomScene,
      circleLayout,
      i18n.language,
    ],
  );
  const className = activeClass.name?.trim() || '';
  const noteListTitle =
    title.trim() || className || t('export.noteList.defaultTitle');
  const noteListInput = useMemo<NoteListInput>(
    () => ({
      students,
      entries: noteListEntries,
      settings: noteListSettings,
      title: noteListTitle,
      // The list names its class even without a label: a plan's name alone
      // may not say which class the list is for.
      classMetadata: showClassInfo
        ? {
            name: className || undefined,
            label: activeClass.label?.trim() || undefined,
            notes: activeClass.notes?.trim() || undefined,
          }
        : undefined,
      nameDisplay: effectiveNameDisplay,
      hiddenBadgeFamilies,
      showGenderColors,
    }),
    [
      students,
      noteListEntries,
      noteListSettings,
      noteListTitle,
      showClassInfo,
      className,
      activeClass.label,
      activeClass.notes,
      effectiveNameDisplay,
      hiddenBadgeFamilies,
      showGenderColors,
    ],
  );

  // The title, the header and the foot of the substitute's sheet: the class
  // always named, the day of the cover in place of the printing date.
  const substituteSheetTitle =
    substituteTitle.trim() || t('export.substitute.defaultTitle');
  const substituteDateLabel = t('export.substitute.dateLabel', {
    date:
      formatLongDate(substituteDate, i18n.language) ||
      formatLongDate(new Date(), i18n.language),
  });
  const substituteLines = useMemo(
    () =>
      substituteHeaderLines(
        {
          className,
          label: activeClass.label,
          notes: activeClass.notes,
          roomName,
        },
        substituteSettings,
      ),
    [
      className,
      activeClass.label,
      activeClass.notes,
      roomName,
      substituteSettings,
    ],
  );
  const sheetTitle = isSubstitute ? substituteSheetTitle : title;
  const sheetContent = useMemo<SheetContent>(
    () =>
      isSubstitute
        ? {
            ...substituteRenderOptions(substituteSettings),
            metadataLines: substituteLines,
            dateLabel: substituteDateLabel,
            notes: { text: substituteNote, lines: substituteSettings.lines },
          }
        : {
            showSpecialNeeds: showNeeds,
            showGenderColors,
            showLegend,
            showConnections,
            nameDisplay: effectiveNameDisplay,
            showPhotos,
            classMetadata: classMetadataForExport,
            hiddenBadgeFamilies,
          },
    [
      isSubstitute,
      substituteSettings,
      substituteLines,
      substituteDateLabel,
      substituteNote,
      showNeeds,
      showGenderColors,
      showLegend,
      showConnections,
      effectiveNameDisplay,
      showPhotos,
      classMetadataForExport,
      hiddenBadgeFamilies,
    ],
  );

  // From `lg` up the stage is a size container (`canvas-stage`): the sheet
  // takes whichever of width and height binds first, like the plan's canvas.
  // Below it the unit falls back to the viewport, which keeps a portrait sheet
  // from growing past the screen on a phone.
  const sheetStyle = useMemo<CSSProperties>(() => {
    const isPortrait = activeOrientation === 'portrait';
    const ratio = isPortrait ? PORTRAIT_PAGE_RATIO : LANDSCAPE_PAGE_RATIO;
    return {
      width: `min(100%, calc(100cqh * ${ratio}))`,
      aspectRatio: isPortrait ? '817 / 1148' : '1148 / 817',
    };
  }, [activeOrientation]);

  const previewDocument = useMemo(() => {
    const isPortrait = activeOrientation === 'portrait';
    const pageWidthMm = isPortrait ? 210 : 297;
    const pageHeightMm = isPortrait ? 297 : 210;

    // Inline stylesheet - Safari print fix v4
    // Screen preview uses original working CSS
    // Print mode has aggressive Safari-specific overrides
    const fontUrl = new URL(primaryFontWoff2Url, window.location.href).href;
    const styles =
      `@font-face{font-family:'Atkinson Hyperlegible Next Variable';src:url('${fontUrl}') format('woff2');font-weight:400 700;font-style:normal;}

      :root { color-scheme: light; }
      @page {
        size: ${pageWidthMm}mm ${pageHeightMm}mm;
        margin: 0;
      }
      *, *::before, *::after {
        box-sizing: border-box;
      }
      html, body {
        margin: 0;
        padding: 0;
        background: #fff;
        width: 100%;
        min-height: 100%;
      }
      body {
        display: grid;
        place-items: center;
        overflow: hidden;
      }
      /* On screen the sheet fills the frame the page gives it; print sets
         the page's own size below. A cap at the paper size shrank a
         landscape sheet into the middle of a large screen. */
      #print-root {
        width: 100%;
        height: 100%;
        display: grid;
        place-items: center;
      }
      #print-root > * {
        width: 100%;
        height: 100%;
        max-height: 100%;
      }
      @media screen {
        html, body {
          height: 100%;
        }
      }
      svg {
        width: 100%;
        height: 100%;
        display: block;
      }
      /* Several pages stand one under the other on grey, the first filling
         the frame, the rest a scroll away. Printing has its own document. */
      body.pages {
        display: block;
        overflow-y: auto;
        background: #e7e5e4;
      }
      body.pages #print-root {
        height: auto;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      body.pages #print-root > .sheet {
        height: auto;
        max-height: none;
        aspect-ratio: ${pageWidthMm} / ${pageHeightMm};
        flex: none;
        background: #fff;
      }
      @media print {
        * {
          margin: 0 !important;
          padding: 0 !important;
        }
        html {
          width: ${pageWidthMm}mm !important;
          height: ${pageHeightMm}mm !important;
          overflow: hidden !important;
        }
        body {
          width: ${pageWidthMm}mm !important;
          height: ${pageHeightMm}mm !important;
          max-height: ${pageHeightMm}mm !important;
          overflow: hidden !important;
          display: block !important;
          position: static !important;
        }
        #print-root {
          width: ${pageWidthMm}mm !important;
          height: ${pageHeightMm}mm !important;
          max-height: ${pageHeightMm}mm !important;
          display: block !important;
          position: static !important;
          overflow: hidden !important;
        }
        svg {
          width: auto !important;
          height: auto !important;
          max-width: ${pageWidthMm}mm !important;
          max-height: ${pageHeightMm}mm !important;
          display: block !important;
        }
      }
    `.trim();

    // Preview-only document (the print button prints from a frame of its own,
    // `printSheets`), but it is still a real document with its own root element: `lang` is what
    // a screen reader announces the iframe content in, so it has to follow the
    // active language rather than sitting on a hardcoded "de".
    const documentTitle = t('export.printDocumentTitle');

    const multiPage = previewPages.length > 1;
    const content = multiPage
      ? previewPages.map((page) => `<div class="sheet">${page}</div>`).join('')
      : (previewPages[0] ?? '');

    return `<!DOCTYPE html><html lang="${metadata.lang}"><head><meta charset="utf-8" /><title>${documentTitle}</title><style>${styles}</style></head><body${multiPage ? ' class="pages"' : ''}><div id="print-root">${content}</div></body></html>`;
  }, [activeOrientation, previewPages, metadata.lang, t]);

  useEffect(() => {
    if (stateCircleLayout && circleLayout !== stateCircleLayout) {
      setCircleLayoutValue(() => stateCircleLayout);
    }
  }, [stateCircleLayout, circleLayout, setCircleLayoutValue]);

  const ensureCircleLayout = useCallback(async () => {
    if (circleLayout) {
      return circleLayout;
    }

    if (stateCircleLayout) {
      setCircleLayoutValue(() => stateCircleLayout);
      return stateCircleLayout;
    }

    if (circleLayoutPromiseRef.current) {
      return circleLayoutPromiseRef.current;
    }

    const promise: Promise<CircleLayout | null> = (async () => {
      try {
        const layout = await generateCircleSeating();
        return layout;
      } catch (error) {
        logError(
          'Circle layout generation failed',
          { error },
          'ExportPage.ensureCircleLayout',
        );
        showToast('error', TOAST_MESSAGES.CIRCLE_GENERATION_ERROR);
        return null;
      } finally {
        circleLayoutPromiseRef.current = null;
      }
    })();

    circleLayoutPromiseRef.current = promise;
    return promise;
  }, [
    circleLayout,
    stateCircleLayout,
    generateCircleSeating,
    setCircleLayoutValue,
  ]);

  const handleCancelCircleGeneration = useCallback(() => {
    circleLayoutPromiseRef.current = null;
    cancelCircleGeneration();
  }, [cancelCircleGeneration]);

  const handleModeChange = useCallback(
    (mode: ExportView) => {
      if (mode === 'circle') {
        void (async () => {
          try {
            const layout = await ensureCircleLayout();
            if (layout) {
              setPreviewMode('circle');
            }
          } catch (error) {
            logError(
              'Circle preview activation failed',
              { error },
              'ExportPage.handleModeChange',
            );
          }
        })();
        return;
      }

      setPreviewMode(mode);
    },
    [ensureCircleLayout],
  );

  // The substitute's sheet draws the circle once there is one, as the
  // toolbar's own entry does.
  const handleSubstituteArrangement = useCallback(
    (next: SubstituteArrangement) => {
      if (next === 'table') {
        setSubstituteArrangement('table');
        return;
      }
      void (async () => {
        try {
          const layout = await ensureCircleLayout();
          if (layout) {
            setSubstituteArrangement('circle');
          }
        } catch (error) {
          logError(
            'Circle activation for the substitute sheet failed',
            { error },
            'ExportPage.handleSubstituteArrangement',
          );
        }
      })();
    },
    [ensureCircleLayout],
  );

  const [isGenerating, setIsGenerating] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    const updatePreview = async () => {
      setIsGenerating(true);
      // Yield to main thread to allow UI updates (loading state) to render
      await new Promise((resolve) => setTimeout(resolve, 0));

      if (isCancelled) return;

      try {
        if (previewMode === 'list') {
          const pages = await renderNoteListSvgPages({
            ...noteListInput,
            photoDataUrls: noteListSettings.showPhotos
              ? await buildPhotoDataUrlMap(students)
              : undefined,
          });
          if (!isCancelled) {
            setPreviewPages(pages);
            setIsGenerating(false);
          }
          return;
        }

        if (sheetArrangement === 'circle' && circleLayout) {
          const circlePhotoUrls = await buildPhotoDataUrlMap(
            circleLayout.students
              .map((entry) => entry.student)
              .filter((student): student is Student => Boolean(student)),
          );
          const svg = await renderCircleSvg(circleLayout, sheetTitle, {
            showSpecialNeeds: sheetContent.showSpecialNeeds,
            showConnections: sheetContent.showConnections,
            orientation: circleOrientation,
            nameDisplay: sheetContent.nameDisplay,
            classMetadata: sheetContent.classMetadata,
            photoDataUrls: circlePhotoUrls,
            photoDisplayMode: sheetContent.showPhotos ? 'all' : 'off',
            showLegend: sheetContent.showLegend,
            showGenderColors: sheetContent.showGenderColors,
            hiddenBadgeFamilies: sheetContent.hiddenBadgeFamilies,
            metadataLines: sheetContent.metadataLines,
            dateLabel: sheetContent.dateLabel,
            notes: sheetContent.notes,
          });
          if (!isCancelled) {
            setPreviewPages([svg]);
            setIsGenerating(false);
          }
          return;
        }

        const photoDataUrls = await buildPhotoDataUrlMap(students);
        const svg = await renderSceneSvg(classroomScene, seating, sheetTitle, {
          allStudents: students,
          photoDataUrls,
          showSpecialNeeds: sheetContent.showSpecialNeeds,
          featureVisibility: effectiveVisibility,
          lockSeatLabelOrientation: true,
          orientation: tableOrientation,
          flipped: flipView,
          frameOnTables,
          nameDisplay: sheetContent.nameDisplay,
          photoDisplayMode: sheetContent.showPhotos ? 'all' : 'off',
          showLegend: sheetContent.showLegend,
          showGenderColors: sheetContent.showGenderColors,
          classMetadata: sheetContent.classMetadata,
          hiddenBadgeFamilies: sheetContent.hiddenBadgeFamilies,
          metadataLines: sheetContent.metadataLines,
          dateLabel: sheetContent.dateLabel,
          notes: sheetContent.notes,
        });
        if (!isCancelled) {
          setPreviewPages([svg]);
          setIsGenerating(false);
        }
      } catch (error) {
        if (!isCancelled) {
          logError(
            'Export preview rendering failed',
            { error, previewMode },
            'ExportPage',
          );
          // The renderer is fetched on demand; offline, without a service
          // worker, the sheet would stay blank without a word.
          if (isChunkLoadError(error)) {
            reportChunkLoadFailure(error, 'ExportPage');
          }
          setIsGenerating(false);
        }
      }
    };

    // Debounce the update to avoid blocking on rapid changes
    const timeoutId = window.setTimeout(updatePreview, 100);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [
    previewMode,
    sheetArrangement,
    circleLayout,
    seating,
    classroomScene,
    sheetTitle,
    sheetContent,
    students,
    effectiveVisibility,
    circleOrientation,
    tableOrientation,
    flipView,
    frameOnTables,
    noteListInput,
    noteListSettings.showPhotos,
  ]);

  useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.srcdoc = previewDocument;
    }
  }, [previewDocument]);
  const recordUsage = usePlanUsagePrompt(activeClass.id);

  // A plan that gets printed or exported leaves the app for real classroom use,
  // which is the strongest signal that it is not just another experiment.
  const recordTablePlanExport = useCallback(() => {
    recordUsage(seating, 'exported');
  }, [recordUsage, seating]);

  // Circle exports are deliberately not recorded: the usage record tracks who
  // sat next to whom at the tables, which a circle says nothing about. Nor is
  // the note list: it is a list of names, not the plan. The substitute's
  // sheet of the table plan is the plan in use.
  const recordPreviewExport = useCallback(() => {
    if (sheetArrangement !== 'table') return;
    recordTablePlanExport();
  }, [sheetArrangement, recordTablePlanExport]);

  // "Notizliste_7b": the list's file names the class, whatever its title.
  const noteListFilename = [t('export.noteList.defaultTitle'), className]
    .filter(Boolean)
    .join('_');

  const printFilename =
    previewMode === 'list'
      ? noteListFilename
      : sheetTitle ||
        (sheetArrangement === 'circle'
          ? t('export.circleDefaultFilename')
          : t('export.tableDefaultFilename'));

  // Printing opens the browser's dialog on the preview's own sheets, one per
  // page. Where a browser cannot print from a frame (iOS) the PDF opens in a
  // tab of its own, and where that tab is blocked it is downloaded.
  const handlePrint = useCallback(async () => {
    if (!previewSvg) {
      exportError(
        new Error('print-preview-unavailable'),
        t('export.errors.printPreviewUnavailable'),
      );
      return;
    }

    try {
      const { printSheets, isAppleMobile } =
        await import('@/services/export/printSheets');
      const printed = await printSheets(previewPages, activeOrientation, {
        lang: metadata.lang,
        title: printFilename,
      });
      if (printed) {
        recordPreviewExport();
        return;
      }

      const { generatePdfBlob, openPdfForPrinting, downloadPdfBlob } =
        await import('@/services/export/pdfExportFunctions');

      const pdfBlob = await generatePdfBlob(
        previewPages.length > 1 ? previewPages : previewSvg,
        activeOrientation,
      );

      // iOS opens the download in its viewer, which prints; a tab would be
      // blocked this long after the tap, and the message said so needlessly.
      if (isAppleMobile()) {
        downloadPdfBlob(pdfBlob, printFilename);
        recordPreviewExport();
        return;
      }

      // Try to open in new tab - if blocked, download as fallback
      const opened = openPdfForPrinting(pdfBlob);
      recordPreviewExport();
      if (!opened) {
        downloadPdfBlob(pdfBlob, printFilename);
        showToast('info', t('export.printDownloadedInfo'));
      }
    } catch (error) {
      exportError(
        error instanceof Error ? error : new Error('print-pdf-failed'),
        t('export.errors.printPreparationFailed'),
      );
    }
  }, [
    recordPreviewExport,
    previewSvg,
    previewPages,
    activeOrientation,
    metadata.lang,
    printFilename,
    exportError,
    t,
  ]);

  // New PDF export handlers using the specialized functions
  const handleTablePdf = useCallback(async () => {
    try {
      const { exportTableLayoutToPdf } =
        await import('@/services/export/pdfExportFunctions');
      await exportTableLayoutToPdf(classroomScene, seating, sheetTitle, {
        ...sheetContent,
        allStudents: students,
        featureVisibility: effectiveVisibility,
        orientation: tableOrientation,
        flipped: flipView,
        frameOnTables,
      });
      recordTablePlanExport();
    } catch (error) {
      exportError(error as Error, t('export.errors.tablePdfFailed'));
    }
  }, [
    classroomScene,
    seating,
    sheetTitle,
    sheetContent,
    students,
    effectiveVisibility,
    tableOrientation,
    flipView,
    frameOnTables,
    recordTablePlanExport,
    exportError,
    t,
  ]);

  const handleCirclePdf = useCallback(async () => {
    const layout = await ensureCircleLayout();
    if (!layout) return;
    try {
      const { exportCircleLayoutToPdf } =
        await import('@/services/export/pdfExportFunctions');
      await exportCircleLayoutToPdf(layout, sheetTitle, {
        ...sheetContent,
        orientation: circleOrientation,
      });
    } catch (error) {
      exportError(error as Error, t('export.errors.circlePdfFailed'));
    }
  }, [
    ensureCircleLayout,
    sheetTitle,
    sheetContent,
    circleOrientation,
    exportError,
    t,
  ]);

  const handleNoteListPdf = useCallback(async () => {
    try {
      const { exportNoteListToPdf } =
        await import('@/services/export/pdfExportFunctions');
      await exportNoteListToPdf(noteListInput, noteListFilename);
    } catch (error) {
      exportError(error as Error, t('export.noteList.errors.pdfFailed'));
    }
  }, [noteListInput, noteListFilename, exportError, t]);

  // Image exports reuse the rendered preview markup (WYSIWYG) instead of
  // re-rendering, so they always match what the user is looking at.
  const imageExportBaseName =
    sheetTitle.trim() ||
    (sheetArrangement === 'circle' ? t('mode.circle') : t('mode.table'));
  const imageOrientation =
    sheetArrangement === 'circle' ? circleOrientation : tableOrientation;

  const requirePreviewSvg = useCallback((): string | null => {
    if (previewSvg) {
      return previewSvg;
    }
    exportError(
      new Error('image-preview-unavailable'),
      t('export.errors.imagePreviewUnavailable'),
    );
    return null;
  }, [previewSvg, exportError, t]);

  const handlePngExport = useCallback(async () => {
    const svg = requirePreviewSvg();
    if (!svg) return;
    try {
      const { exportSvgAsPng } =
        await import('@/utils/export/imageExportFunctions');
      await exportSvgAsPng(svg, imageExportBaseName, imageOrientation);
      recordPreviewExport();
    } catch (error) {
      exportError(error as Error, t('export.errors.pngFailed'));
    }
  }, [
    requirePreviewSvg,
    imageExportBaseName,
    imageOrientation,
    recordPreviewExport,
    exportError,
    t,
  ]);

  const handleSvgExport = useCallback(async () => {
    const svg = requirePreviewSvg();
    if (!svg) return;
    try {
      const { exportSvgAsFile } =
        await import('@/utils/export/imageExportFunctions');
      await exportSvgAsFile(svg, imageExportBaseName);
      recordPreviewExport();
    } catch (error) {
      exportError(error as Error, t('export.errors.svgFailed'));
    }
  }, [
    requirePreviewSvg,
    imageExportBaseName,
    recordPreviewExport,
    exportError,
    t,
  ]);

  // The toolbar has one PDF entry: the file of the arrangement on the sheet.
  const handlePdf = useCallback(() => {
    if (previewMode === 'list') {
      void handleNoteListPdf();
      return;
    }
    if (sheetArrangement === 'circle') {
      void handleCirclePdf();
      return;
    }
    void handleTablePdf();
  }, [
    previewMode,
    sheetArrangement,
    handleNoteListPdf,
    handleCirclePdf,
    handleTablePdf,
  ]);

  const backToPlan = useCallback(
    () => navigate('/generator', { state: { step: returnStep } }),
    [navigate, returnStep],
  );

  // P saves the PDF of whatever the sheet shows, as the toolbar's one PDF
  // entry does. The shortcuts it replaces (Ctrl/⌘+Shift+T, +C and +I) belong
  // to the browsers: reopening a closed tab and the developer tools. A dialog
  // owns the keyboard while it is up.
  useKeyboardShortcuts(
    {
      'alt+arrowleft': backToPlan,
      p: handlePdf,
      'ctrl+p': handlePrint,
      'cmd+p': handlePrint,
    },
    { condition: () => !isAnyDialogOpen() },
  );

  const pageCount = previewMode === 'list' ? previewPages.length : 1;
  const sheetFormat = t('export.sheetFormat', {
    orientation:
      activeOrientation === 'landscape'
        ? t('export.landscape')
        : t('export.portrait'),
  });
  const sheetLabel =
    pageCount > 1
      ? `${sheetFormat} · ${t('export.noteList.pages', { count: pageCount })}`
      : sheetFormat;
  const isList = previewMode === 'list';

  const sheetInspector = (
    <ExportSheetInspector
      mode={previewMode}
      noteList={{
        settings: noteListSettings,
        onChange: updateNoteList,
        orders: noteListOrders,
      }}
      substitute={{
        arrangement: substituteArrangement,
        onArrangementChange: handleSubstituteArrangement,
        date: substituteDate,
        onDateChange: setSubstituteDate,
        room: roomName
          ? {
              checked: substituteSettings.showRoom,
              onChange: (showRoom) => updateSubstitute({ showRoom }),
            }
          : undefined,
        note: substituteNote,
        onNoteChange: setSubstituteNote,
        lines: substituteSettings.lines,
        onLinesChange: (lines) => updateSubstitute({ lines }),
      }}
      title={isSubstitute ? substituteTitle : title}
      onTitleChange={isSubstitute ? setSubstituteTitle : setTitle}
      orientation={activeOrientation}
      onOrientationChange={
        isList
          ? (orientation) => updateNoteList({ orientation })
          : sheetArrangement === 'circle'
            ? setCircleOrientation
            : setTableOrientation
      }
      flipView={{ checked: flipView, onChange: handleToggleFlipView }}
      frameOnTables={{
        checked: frameOnTables,
        onChange: handleToggleFrameOnTables,
      }}
      // The list keeps its own badges and photos, both off by default: a
      // list left on a desk should not say who is restless.
      needs={
        isList
          ? {
              checked: noteListSettings.showBadges,
              onChange: (showBadges) => updateNoteList({ showBadges }),
            }
          : { checked: showNeeds, onChange: handleToggleNeeds }
      }
      badgeFamilies={{
        present: presentBadgeFamilies,
        hidden: hiddenBadgeFamilies,
        onToggle: handleToggleBadgeFamily,
      }}
      genderColors={{
        checked: showGenderColors,
        onChange: handleToggleGenderColors,
      }}
      photos={
        isList
          ? {
              checked: noteListSettings.showPhotos,
              onChange: (next) => updateNoteList({ showPhotos: next }),
            }
          : isSubstitute
            ? {
                checked: substituteSettings.showPhotos,
                onChange: (next) => updateSubstitute({ showPhotos: next }),
              }
            : { checked: showPhotos, onChange: handleTogglePhotos }
      }
      legend={{
        checked: showLegend,
        onChange: handleToggleLegend,
        unavailable: legendHasEntries
          ? undefined
          : t('export.legendUnavailable'),
      }}
      // The substitute's sheet names the class always; its school year and
      // notes only when asked for, apart from the teacher's own sheet.
      classInfo={
        isSubstitute
          ? {
              checked: substituteSettings.showClassInfo,
              onChange: (showClassInfo) => updateSubstitute({ showClassInfo }),
            }
          : { checked: showClassInfo, onChange: handleToggleClassInfo }
      }
      connections={{
        checked: showConnections,
        onChange: handleToggleConnections,
      }}
      nameDisplay={
        isSubstitute ? substituteSettings.nameDisplay : effectiveNameDisplay
      }
      onNameDisplayChange={
        isSubstitute
          ? (nameDisplay) => updateSubstitute({ nameDisplay })
          : setNameDisplay
      }
      names={studentNames}
      featureAvailability={featureAvailability}
      featureVisibility={featureVisibility}
      onFeatureToggle={setFeatureVisible}
    />
  );

  return (
    <AppShell
      header={<SeatingPlanHeader view="export" />}
      statusBar={
        <ExportStatusBar
          hasPlan={hasSheet}
          sheetLabel={sheetLabel}
          studentCount={students.length}
          circleGeneration={
            circleGenerationInProgress
              ? {
                  message: generationMessage,
                  progress: generationProgress,
                  onCancel: handleCancelCircleGeneration,
                }
              : null
          }
          onPrint={() => void handlePrint()}
          onBack={hasSheet ? backToPlan : undefined}
          backTarget={returnStep === 1 ? 'class' : 'plan'}
        />
      }
    >
      <Seo
        {...metadata}
        structuredData={{
          '@type': 'WebPage',
          name: metadata.title,
          description: metadata.description,
        }}
      />
      {!hasSheet ? (
        <ExportEmptyState onBack={backToPlan} />
      ) : (
        <div className={workspaceLayerClass}>
          <SmartSidebar>
            {({ isExpanded }) => (
              <ExportToolPanel
                density={isExpanded ? 'comfortable' : 'compact'}
                mode={previewMode}
                onModeChange={handleModeChange}
                modeDisabled={circleGenerationInProgress}
                planViewsDisabled={!hasPlan}
                onPdf={handlePdf}
                onPng={() => void handlePngExport()}
                onSvg={() => void handleSvgExport()}
              />
            )}
          </SmartSidebar>

          {/* The sheet is paper on the sunken stage, and nothing lies on top
              of it: the arrangement is switched in the toolbar, what the
              sheet carries in the inspector, and the circle's progress is
              told in the status bar. */}
          <div className={`${workspaceStageClass} ${canvasStageClass}`}>
            <div
              className={`${canvasFrameClass} w-full shrink-0`}
              style={sheetStyle}
              aria-busy={isGenerating}
            >
              <iframe
                ref={iframeRef}
                className={`h-full w-full border-0 transition-opacity duration-300 ${
                  isGenerating ? 'opacity-50' : 'opacity-100'
                }`}
                title={t('export.preview')}
              />
            </div>
          </div>

          {/* What the sheet carries is set in the inspector, as everything on
              a layer is: a column from `lg` up, below it the drawer the
              status bar's switch opens, as on the plan. */}
          <InspectorPortal label={t('export.sheet')}>
            {sheetInspector}
          </InspectorPortal>
        </div>
      )}
    </AppShell>
  );
}

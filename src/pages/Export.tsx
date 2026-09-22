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
  LEGACY_EXPORT_KEYS,
  LOCAL_STORAGE_KEYS,
  logError,
  primaryButtonClass,
} from '@/utils';
import type { NameDisplayMode } from '@/utils';
import { showToast, TOAST_MESSAGES } from '@/utils/ui/toast';
import { FEATURE_TYPES, type FeatureVisibilityFlags } from '@/utils/ui';
import { NAME_DISPLAY_MODES } from '@/components/SeatingPlanGenerator/canvas/nameDisplayGroup';
import { useFeatureVisibility } from '@/hooks/ui/useFeatureVisibility';
import { useIsLgUp } from '@/hooks/ui/useIsLgUp';
import {
  useSeatingPlanState,
  useSeatingPlanActions,
} from '@/contexts/SeatingPlanContext';
import {
  renderCircleSvg,
  renderSceneSvg,
  preloadRenderer,
} from '@/services/export/sceneRenderer';
import { buildPhotoDataUrlMap } from '@/services/export/pdfExportFunctions';
import type { PhotoDisplayMode, SeatingArrangement, Student } from '@/types';
import usePersistentState from '@/hooks/usePersistentState';
import type { CircleLayout, SeatingMode } from '@/types/Circle';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useFirstVisit } from '@/hooks/ui/useFirstVisit';
import { usePlanUsagePrompt } from '@/hooks/plan/usePlanUsagePrompt';
import Seo from '@/components/Seo';
import { useLocalizedNavigate } from '@/hooks/useLocalizedNavigate';
import { usePageSeo } from '@/hooks/usePageSeo';
import primaryFontWoff2Url from '@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2?url';
import AppShell from '@/components/shell/AppShell';
import InspectorPortal from '@/components/shell/InspectorPortal';
import {
  workspaceLayerClass,
  workspaceStageClass,
} from '@/components/shell/shellTokens';
import SeatingPlanHeader from '@/components/SeatingPlanGenerator/SeatingPlanHeader';
import ExportStatusBar from '@/components/SeatingPlanGenerator/ExportStatusBar';
import ExportToolPanel from '@/components/SeatingPlanGenerator/ExportToolPanel';
import ExportSheetInspector from '@/components/SeatingPlanGenerator/ExportSheetInspector';
import SmartSidebar from '@/components/ui/panels/SmartSidebar';
import { useInspector } from '@/contexts/InspectorContext';

type PageOrientation = 'landscape' | 'portrait';

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
  const { t } = useTranslation('generator');
  const metadata = usePageSeo('/export');
  const location = useLocation();
  const navigate = useLocalizedNavigate();
  // Marks the visit (`spg.hasVisitedApp`) for the onboarding tour record.
  useFirstVisit();
  const navigationState = (location.state || {}) as {
    seating?: SeatingArrangement;
    planName?: string;
    circleLayout?: CircleLayout;
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
  } = useSeatingPlanState();
  const {
    generateCircleSeating,
    cancelCircleGeneration,
    setCircleLayoutValue,
  } = useSeatingPlanActions();
  const { exportError } = errorHandlers;
  // Get circle layout from navigation state if available, or auto-generate one
  const seating = navigationState.seating || currentSeating;
  const hasPlan = classroomScene.tables.length > 0 && seating.length > 0;
  const stateCircleLayout = navigationState.circleLayout || null;
  const circleLayoutPromiseRef = useRef<Promise<CircleLayout | null> | null>(
    null,
  );
  const generationProgress =
    typeof circleGenerationStatus?.progress === 'number'
      ? Math.round(circleGenerationStatus.progress * 100)
      : null;
  const generationMessage =
    circleGenerationStatus?.message ??
    t('export.generatingCircle', 'Sitzkreis wird erstellt...');
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
  const [previewSvg, setPreviewSvg] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isLgUp = useIsLgUp();
  const [previewMode, setPreviewMode] = useState<SeatingMode>('table');
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
  const { featureVisibility, setFeatureVisible } = useFeatureVisibility();
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
  // Table export only: rotates the classroom 180° with upright names, for a
  // sheet that is read from the opposite side of the room (e.g. a teacher's
  // desk at the back) without turning the page and its header upside down.
  const [flipView, setFlipView] = usePersistentState<boolean>(
    LOCAL_STORAGE_KEYS.exportFlipView,
    false,
  );

  const studentNames = useMemo(
    () => students.map((student) => student.name),
    [students],
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
  const handleToggleFlipView = useCallback(
    (checked: boolean) => setFlipView(() => checked),
    [setFlipView],
  );

  useEffect(() => {
    void preloadRenderer();
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
    previewMode === 'circle' ? circleOrientation : tableOrientation;

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
      `@font-face{font-family:'Instrument Sans Variable';src:url('${fontUrl}') format('woff2');font-weight:400 700;font-style:normal;}

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
      #print-root {
        width: 100%;
        height: 100%;
        max-width: ${pageWidthMm}mm;
        max-height: ${pageHeightMm}mm;
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

    // Preview-only document (the print button goes through generatePdfBlob),
    // but it is still a real document with its own root element: `lang` is what
    // a screen reader announces the iframe content in, so it has to follow the
    // active language rather than sitting on a hardcoded "de".
    const documentTitle = t('export.printDocumentTitle');

    return `<!DOCTYPE html><html lang="${metadata.lang}"><head><meta charset="utf-8" /><title>${documentTitle}</title><style>${styles}</style></head><body><div id="print-root">${previewSvg}</div></body></html>`;
  }, [activeOrientation, previewSvg, metadata.lang, t]);

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
    (mode: SeatingMode) => {
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

  const [isGenerating, setIsGenerating] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    const updatePreview = async () => {
      setIsGenerating(true);
      // Yield to main thread to allow UI updates (loading state) to render
      await new Promise((resolve) => setTimeout(resolve, 0));

      if (isCancelled) return;

      try {
        if (previewMode === 'circle' && circleLayout) {
          const circlePhotoUrls = await buildPhotoDataUrlMap(
            circleLayout.students
              .map((entry) => entry.student)
              .filter((student): student is Student => Boolean(student)),
          );
          const svg = await renderCircleSvg(circleLayout, title, {
            showSpecialNeeds: showNeeds,
            showConnections,
            orientation: circleOrientation,
            nameDisplay: effectiveNameDisplay,
            classMetadata: classMetadataForExport,
            photoDataUrls: circlePhotoUrls,
            photoDisplayMode: showPhotos ? 'all' : 'off',
            showLegend,
          });
          if (!isCancelled) {
            setPreviewSvg(svg);
            setIsGenerating(false);
          }
          return;
        }

        const photoDataUrls = await buildPhotoDataUrlMap(students);
        const svg = await renderSceneSvg(classroomScene, seating, title, {
          allStudents: students,
          photoDataUrls,
          showSpecialNeeds: showNeeds,
          featureVisibility: effectiveVisibility,
          lockSeatLabelOrientation: true,
          orientation: tableOrientation,
          flipped: flipView,
          nameDisplay: effectiveNameDisplay,
          photoDisplayMode: showPhotos ? 'all' : 'off',
          showLegend,
          classMetadata: classMetadataForExport,
        });
        if (!isCancelled) {
          setPreviewSvg(svg);
          setIsGenerating(false);
        }
      } catch (error) {
        if (!isCancelled) {
          logError(
            'Export preview rendering failed',
            { error, previewMode },
            'ExportPage',
          );
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
    circleLayout,
    seating,
    classroomScene,
    title,
    students,
    showNeeds,
    effectiveVisibility,
    showConnections,
    circleOrientation,
    tableOrientation,
    flipView,
    effectiveNameDisplay,
    showPhotos,
    showLegend,
    classMetadataForExport,
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
  // sat next to whom at the tables, which a circle says nothing about.
  const recordPreviewExport = useCallback(() => {
    if (previewMode === 'circle') return;
    recordTablePlanExport();
  }, [previewMode, recordTablePlanExport]);

  // Print via PDF - opens generated PDF in new tab for consistent cross-browser printing
  // Falls back to PDF download if popup is blocked
  const handlePrint = useCallback(async () => {
    if (!previewSvg) {
      exportError(
        new Error('print-preview-unavailable'),
        t(
          'export.errors.printPreviewUnavailable',
          'Die Druckvorschau ist noch nicht bereit. Bitte warten Sie einen Moment und versuchen Sie es erneut.',
        ),
      );
      return;
    }

    try {
      const { generatePdfBlob, openPdfForPrinting, downloadPdfBlob } =
        await import('@/services/export/pdfExportFunctions');

      // Use the correct orientation based on preview mode
      const orientation =
        previewMode === 'circle' ? circleOrientation : tableOrientation;

      const pdfBlob = await generatePdfBlob(previewSvg, orientation);

      // Try to open in new tab - if blocked, download as fallback
      const opened = openPdfForPrinting(pdfBlob);
      recordPreviewExport();
      if (!opened) {
        // Popup was blocked - download the PDF instead
        const filename =
          title ||
          (previewMode === 'circle'
            ? t('export.circleDefaultFilename', 'Sitzkreis')
            : t('export.tableDefaultFilename', 'Sitzplan'));
        downloadPdfBlob(pdfBlob, filename);
        showToast(
          'info',
          t(
            'export.printDownloadedInfo',
            'Pop-up blockiert - PDF wurde heruntergeladen. Bitte öffne die Datei zum Drucken.',
          ),
        );
      }
    } catch (error) {
      exportError(
        error instanceof Error ? error : new Error('print-pdf-failed'),
        t(
          'export.errors.printPreparationFailed',
          'Drucken konnte nicht vorbereitet werden. Bitte versuchen Sie es erneut.',
        ),
      );
    }
  }, [
    recordPreviewExport,
    previewSvg,
    previewMode,
    circleOrientation,
    tableOrientation,
    title,
    exportError,
    t,
  ]);

  // New PDF export handlers using the specialized functions
  const handleTablePdf = useCallback(async () => {
    try {
      const { exportTableLayoutToPdf } =
        await import('@/services/export/pdfExportFunctions');
      await exportTableLayoutToPdf(classroomScene, seating, title, {
        allStudents: students,
        showSpecialNeeds: showNeeds,
        featureVisibility: effectiveVisibility,
        nameDisplay: effectiveNameDisplay,
        showPhotos,
        showLegend,
        orientation: tableOrientation,
        flipped: flipView,
        classMetadata: classMetadataForExport,
      });
      recordTablePlanExport();
    } catch (error) {
      exportError(
        error as Error,
        t(
          'export.errors.tablePdfFailed',
          'Sitzplan PDF-Export fehlgeschlagen. Bitte versuchen Sie es erneut.',
        ),
      );
    }
  }, [
    classroomScene,
    seating,
    title,
    students,
    showNeeds,
    effectiveVisibility,
    effectiveNameDisplay,
    showPhotos,
    showLegend,
    tableOrientation,
    flipView,
    classMetadataForExport,
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
      await exportCircleLayoutToPdf(layout, title, {
        showSpecialNeeds: showNeeds,
        showConnections,
        orientation: circleOrientation,
        nameDisplay: effectiveNameDisplay,
        showPhotos,
        showLegend,
        classMetadata: classMetadataForExport,
      });
    } catch (error) {
      exportError(
        error as Error,
        t(
          'export.errors.circlePdfFailed',
          'Sitzkreis PDF-Export fehlgeschlagen. Bitte versuchen Sie es erneut.',
        ),
      );
    }
  }, [
    ensureCircleLayout,
    title,
    showNeeds,
    showConnections,
    circleOrientation,
    effectiveNameDisplay,
    showPhotos,
    showLegend,
    classMetadataForExport,
    exportError,
    t,
  ]);

  // Image exports reuse the rendered preview markup (WYSIWYG) instead of
  // re-rendering, so they always match what the user is looking at.
  const imageExportBaseName =
    title.trim() ||
    (previewMode === 'circle'
      ? t('mode.circle', 'Sitzkreis')
      : t('mode.table', 'Sitzplan'));
  const imageOrientation =
    previewMode === 'circle' ? circleOrientation : tableOrientation;

  const requirePreviewSvg = useCallback((): string | null => {
    if (previewSvg) {
      return previewSvg;
    }
    exportError(
      new Error('image-preview-unavailable'),
      t(
        'export.errors.imagePreviewUnavailable',
        'Die Vorschau ist noch nicht bereit. Bitte warte einen Moment und versuche es erneut.',
      ),
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
      exportError(
        error as Error,
        t(
          'export.errors.pngFailed',
          'PNG-Export fehlgeschlagen. Bitte versuche es erneut.',
        ),
      );
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
      exportError(
        error as Error,
        t(
          'export.errors.svgFailed',
          'SVG-Export fehlgeschlagen. Bitte versuche es erneut.',
        ),
      );
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
    if (previewMode === 'circle') {
      void handleCirclePdf();
      return;
    }
    void handleTablePdf();
  }, [previewMode, handleCirclePdf, handleTablePdf]);

  const backToPlan = useCallback(
    () => navigate('/generator', { state: { step: 3 } }),
    [navigate],
  );

  useKeyboardShortcuts({
    'alt+arrowleft': backToPlan,
    'ctrl+shift+t': () => void handleTablePdf(),
    'cmd+shift+t': () => void handleTablePdf(),
    'ctrl+shift+c': () => void handleCirclePdf(),
    'cmd+shift+c': () => void handleCirclePdf(),
    'ctrl+shift+i': () => void handlePngExport(),
    'cmd+shift+i': () => void handlePngExport(),
    'ctrl+p': handlePrint,
    'cmd+p': handlePrint,
  });

  const sheetLabel = t('export.sheetFormat', {
    orientation:
      activeOrientation === 'landscape'
        ? t('export.landscape')
        : t('export.portrait'),
  });

  const sheetInspector = (
    <ExportSheetInspector
      mode={previewMode}
      title={title}
      onTitleChange={setTitle}
      orientation={activeOrientation}
      onOrientationChange={
        previewMode === 'circle' ? setCircleOrientation : setTableOrientation
      }
      flipView={{ checked: flipView, onChange: handleToggleFlipView }}
      needs={{ checked: showNeeds, onChange: handleToggleNeeds }}
      photos={{ checked: showPhotos, onChange: handleTogglePhotos }}
      legend={{ checked: showLegend, onChange: handleToggleLegend }}
      classInfo={{ checked: showClassInfo, onChange: handleToggleClassInfo }}
      connections={{
        checked: showConnections,
        onChange: handleToggleConnections,
      }}
      nameDisplay={effectiveNameDisplay}
      onNameDisplayChange={setNameDisplay}
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
          hasPlan={hasPlan}
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
      {!hasPlan ? (
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
          <div className={`${workspaceStageClass} ${canvasStageClass} gap-4`}>
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

            {/* Below `lg` there is no inspector column, so the sheet's
                settings follow the sheet down the page. */}
            {!isLgUp && (
              <div className="flex flex-col overflow-hidden rounded-xl border border-(--border-card) bg-(--surface-card)">
                {sheetInspector}
              </div>
            )}
          </div>

          {isLgUp && (
            <InspectorPortal label={t('export.sheet')}>
              {sheetInspector}
            </InspectorPortal>
          )}
        </div>
      )}
    </AppShell>
  );
}

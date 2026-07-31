// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import {
  ArrowLeftIcon,
  LinkSimpleIcon,
  EyeIcon,
  UserCircleIcon,
  InfoIcon,
  ListBulletsIcon,
  CameraIcon,
  PrinterIcon,
  GridNineIcon,
  CircleDashedIcon,
} from '@phosphor-icons/react';
import {
  canvasFrameClass,
  errorHandlers,
  logError,
  neutralButtonClass,
  primaryButtonClass,
  successButtonClass,
} from '@/utils';
import { showToast, TOAST_MESSAGES } from '@/utils/ui/toast';
import { FEATURE_TYPES, type FeatureVisibilityFlags } from '@/utils/ui';
import { buildFeatureVisibilityGroup } from '@/components/SeatingPlanGenerator/canvas/featureVisibilityGroup';
import { useFeatureVisibility } from '@/hooks/ui/useFeatureVisibility';
import { useAdaptiveViewportHeight } from '@/hooks/ui/useAdaptiveViewportHeight';
import {
  useSeatingPlanState,
  useSeatingPlanActions,
} from '@/contexts/SeatingPlanContext';
import {
  renderCircleSvg,
  renderSceneSvg,
  preloadRenderer,
} from '@/services/export/sceneRenderer';
import { buildPhotoDataUrlMap } from '@/utils/export/pdfExportFunctions';
import type { PhotoDisplayMode, SeatingArrangement, Student } from '@/types';
import usePersistentState from '@/hooks/usePersistentState';
import type { CircleLayout } from '@/types/Circle';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { LOCAL_STORAGE_KEYS } from '@/utils/data/storageKeys';
import { useFirstVisit } from '@/hooks/ui/useFirstVisit';
import Seo from '@/components/Seo';
import { LocalizedLink } from '@/components/LocalizedLink';
import { useLocalizedNavigate } from '@/hooks/useLocalizedNavigate';
import { usePageSeo } from '@/hooks/usePageSeo';
import { KpLockup } from '@/components/KpLockup';
import SeatingModeToggle, {
  type SeatingMode,
} from '@/components/SeatingPlanGenerator/SeatingModeToggle';
import dmSansWoff2Url from '@fontsource-variable/dm-sans/files/dm-sans-latin-wght-normal.woff2?url';
import HelpButton from '@/components/ui/buttons/HelpButton';
import WizardProgressBar from '@/components/ui/navigation/WizardProgressBar';
import ExportSidebar from '@/components/SeatingPlanGenerator/ExportSidebar';
import {
  CanvasSettingsButton,
  type CanvasSettingsGroup,
  type CanvasSettingsIconGridItem,
  type CanvasSettingsButtonHandle,
} from '@/components/SeatingPlanGenerator/canvas/CanvasSettingsButton';

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

const PORTRAIT_PAGE_RATIO = 817 / 1148;
const LANDSCAPE_PAGE_RATIO = 1148 / 817;

// Space kept free below the preview frame so the back button stays visible
// and shares the wizard steps' action-row baseline: column gap (16px) +
// button row (~36px) + bottom margin (16px).
const PREVIEW_ACTION_RESERVED_PX = 68;

export default function Export() {
  const { t } = useTranslation('generator');
  const metadata = usePageSeo('/export');
  const location = useLocation();
  const navigate = useLocalizedNavigate();
  const isFirstVisit = useFirstVisit();
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
  const hasCircleLayoutAvailable =
    Boolean(circleLayout) || circleGenerationInProgress;
  const generationProgress =
    typeof circleGenerationStatus?.progress === 'number'
      ? Math.round(circleGenerationStatus.progress * 100)
      : null;
  const generationMessage =
    circleGenerationStatus?.message ??
    t('export.generatingCircle', 'Sitzkreis wird erstellt...');
  const [title, setTitle] = useState(
    navigationState.planName || contextPlanName || '',
  );
  const [previewSvg, setPreviewSvg] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const canvasSettingsButtonRef = useRef<CanvasSettingsButtonHandle | null>(
    null,
  );
  const [previewMode, setPreviewMode] = useState<SeatingMode>('table');
  const [showNeeds, setShowNeeds] = useState(true);
  const [showConnections, setShowConnections] = useState(true);
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
    usePersistentState<PageOrientation>('export.tableOrientation', 'portrait');
  const [circleOrientation, setCircleOrientation] =
    usePersistentState<PageOrientation>(
      'export.circleOrientation',
      'landscape',
    );
  const [showFullNames, setShowFullNames] = usePersistentState<boolean>(
    'export.showFullNames',
    false,
  );
  // WYSIWYG: seed photo visibility/density defaults from the live editor state.
  const [showPhotos, setShowPhotos] = usePersistentState<boolean>(
    'export.showPhotos',
    readPersisted<PhotoDisplayMode>(
      LOCAL_STORAGE_KEYS.photoDisplayMode,
      'hover',
    ) !== 'off',
  );
  const [showClassInfo, setShowClassInfo] = usePersistentState<boolean>(
    'export.showClassInfo',
    true,
  );
  const [showLegend, setShowLegend] = usePersistentState<boolean>(
    'export.showLegend',
    false,
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
  const handleToggleFullNames = useCallback(
    (checked: boolean) => setShowFullNames(() => checked),
    [setShowFullNames],
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

  useEffect(() => {
    void preloadRenderer();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      const legacyOrientation = window.localStorage.getItem(
        'export.pageOrientation',
      );
      if (!legacyOrientation) {
        return;
      }

      const parsedOrientation = JSON.parse(
        legacyOrientation,
      ) as PageOrientation | null;
      if (
        parsedOrientation !== 'portrait' &&
        parsedOrientation !== 'landscape'
      ) {
        window.localStorage.removeItem('export.pageOrientation');
        return;
      }

      if (!window.localStorage.getItem('export.tableOrientation')) {
        setTableOrientation(parsedOrientation);
      }
      if (!window.localStorage.getItem('export.circleOrientation')) {
        setCircleOrientation(parsedOrientation);
      }

      window.localStorage.removeItem('export.pageOrientation');
    } catch {
      // Ignore migration issues silently.
    }
  }, [setTableOrientation, setCircleOrientation]);
  const activeOrientation =
    previewMode === 'circle' ? circleOrientation : tableOrientation;

  // Measure the frame's real viewport position (instead of estimating header
  // heights via CSS calc) so the back button below the preview ends exactly
  // 16px above the viewport bottom, like the other steps' action rows.
  const { containerRef: previewFrameRef, maxHeight: previewFrameHeight } =
    useAdaptiveViewportHeight<HTMLDivElement>({
      reservedBottom: PREVIEW_ACTION_RESERVED_PX,
      minHeight: 280,
      maxHeight: 960,
      fallbackHeight: 720,
      includeViewportOffset: true,
      changeThreshold: 8,
    });

  const previewFrameStyles = useMemo<CSSProperties>(() => {
    const ratio =
      activeOrientation === 'portrait'
        ? PORTRAIT_PAGE_RATIO
        : LANDSCAPE_PAGE_RATIO;
    const frameHeight = Math.round(previewFrameHeight ?? 720);

    return {
      maxHeight: `${frameHeight}px`,
      maxWidth: `min(90vw, ${Math.round(frameHeight * ratio)}px)`,
      aspectRatio:
        activeOrientation === 'portrait' ? '817 / 1148' : '1148 / 817',
    };
  }, [activeOrientation, previewFrameHeight]);

  const exportSettingsGroups = useMemo<CanvasSettingsGroup[]>(() => {
    const displayItems: CanvasSettingsIconGridItem[] = [];

    if (previewMode === 'circle') {
      displayItems.push({
        id: 'connections',
        label: t('export.showConnections', 'Verbindungen anzeigen'),
        icon: <LinkSimpleIcon size={18} />,
        checked: showConnections,
        onChange: handleToggleConnections,
      });
    }

    displayItems.push(
      {
        id: 'needs',
        label: t('export.showNeeds', 'Bedürfnisse anzeigen'),
        icon: <EyeIcon size={18} />,
        checked: showNeeds,
        onChange: handleToggleNeeds,
      },
      {
        id: 'names',
        label: t('export.showFullNames', 'Namen vollständig anzeigen'),
        icon: <UserCircleIcon size={18} />,
        checked: showFullNames,
        onChange: handleToggleFullNames,
      },
      {
        id: 'class-info',
        label: t('export.showClassInfo', 'Zusätzliche Klasseninfos anzeigen'),
        icon: <InfoIcon size={18} />,
        checked: showClassInfo,
        onChange: handleToggleClassInfo,
      },
      {
        id: 'legend',
        label: t('export.showLegend', 'Legende anzeigen'),
        icon: <ListBulletsIcon size={18} />,
        checked: showLegend,
        onChange: handleToggleLegend,
      },
      {
        id: 'photos',
        label: t('export.showPhotos', 'Fotos anzeigen'),
        icon: <CameraIcon size={18} />,
        checked: showPhotos,
        onChange: handleTogglePhotos,
      },
    );

    const groups: CanvasSettingsGroup[] = [
      {
        id: 'preview-display',
        title: t('export.preview', 'Vorschau'),
        options: [
          {
            kind: 'iconGrid',
            id: 'preview-display-grid',
            label: t('export.preview', 'Vorschau'),
            items: displayItems,
          },
        ],
      },
    ];

    if (previewMode === 'table') {
      groups.push(
        buildFeatureVisibilityGroup({
          id: 'preview-features',
          title: t('export.roomElements', 'Raumelemente'),
          t,
          isChecked: (type) => effectiveVisibility[type] === true,
          isDisabled: (type) => !featureAvailability[type],
          onToggle: setFeatureVisible,
        }),
      );
    }

    return groups;
  }, [
    effectiveVisibility,
    featureAvailability,
    setFeatureVisible,
    handleToggleClassInfo,
    handleToggleConnections,
    handleToggleFullNames,
    handleToggleNeeds,
    handleTogglePhotos,
    handleToggleLegend,
    previewMode,
    showClassInfo,
    showConnections,
    showFullNames,
    showLegend,
    showNeeds,
    showPhotos,
    t,
  ]);

  const previewDocument = useMemo(() => {
    const isPortrait = activeOrientation === 'portrait';
    const pageWidthMm = isPortrait ? 210 : 297;
    const pageHeightMm = isPortrait ? 297 : 210;

    // Inline stylesheet - Safari print fix v4
    // Screen preview uses original working CSS
    // Print mode has aggressive Safari-specific overrides
    const fontUrl = new URL(dmSansWoff2Url, window.location.href).href;
    const styles =
      `@font-face{font-family:'DM Sans Variable';src:url('${fontUrl}') format('woff2');font-weight:100 900;font-style:normal;}

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

    return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8" /><title>Klassenplan Druck</title><style>${styles}</style></head><body><div id="print-root">${previewSvg}</div></body></html>`;
  }, [activeOrientation, previewSvg]);

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
            showFullNames,
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
          showFullNames,
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
    showFullNames,
    showPhotos,
    showLegend,
    classMetadataForExport,
  ]);

  useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.srcdoc = previewDocument;
    }
  }, [previewDocument]);
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) {
      return;
    }

    const closeSettings = () => {
      canvasSettingsButtonRef.current?.close();
    };

    let detachDocumentListeners: (() => void) | null = null;

    const attachDocumentListeners = () => {
      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) {
        return;
      }
      const handleDocPointerDown = () => {
        closeSettings();
      };
      doc.addEventListener('pointerdown', handleDocPointerDown);
      doc.addEventListener('mousedown', handleDocPointerDown);
      doc.addEventListener('touchstart', handleDocPointerDown);
      detachDocumentListeners = () => {
        doc.removeEventListener('pointerdown', handleDocPointerDown);
        doc.removeEventListener('mousedown', handleDocPointerDown);
        doc.removeEventListener('touchstart', handleDocPointerDown);
      };
    };

    const handleLoad = () => {
      if (detachDocumentListeners) {
        detachDocumentListeners();
        detachDocumentListeners = null;
      }
      attachDocumentListeners();
    };

    attachDocumentListeners();
    iframe.addEventListener('load', handleLoad);
    iframe.addEventListener('pointerdown', closeSettings);

    return () => {
      iframe.removeEventListener('load', handleLoad);
      iframe.removeEventListener('pointerdown', closeSettings);
      if (detachDocumentListeners) {
        detachDocumentListeners();
      }
    };
  }, []);
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
        await import('@/utils/export/pdfExportFunctions');

      // Use the correct orientation based on preview mode
      const orientation =
        previewMode === 'circle' ? circleOrientation : tableOrientation;

      const pdfBlob = await generatePdfBlob(previewSvg, orientation);

      // Try to open in new tab - if blocked, download as fallback
      const opened = openPdfForPrinting(pdfBlob);
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
            'Pop-up blockiert - PDF wurde heruntergeladen. Bitte öffnen Sie die Datei zum Drucken.',
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
        await import('@/utils/export/pdfExportFunctions');
      await exportTableLayoutToPdf(classroomScene, seating, title, {
        allStudents: students,
        showSpecialNeeds: showNeeds,
        featureVisibility: effectiveVisibility,
        showFullNames,
        showPhotos,
        showLegend,
        orientation: tableOrientation,
        classMetadata: classMetadataForExport,
      });
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
    showFullNames,
    showPhotos,
    showLegend,
    tableOrientation,
    classMetadataForExport,
    exportError,
    t,
  ]);

  const handleCirclePdf = useCallback(async () => {
    const layout = await ensureCircleLayout();
    if (!layout) return;
    try {
      const { exportCircleLayoutToPdf } =
        await import('@/utils/export/pdfExportFunctions');
      await exportCircleLayoutToPdf(layout, title, {
        showSpecialNeeds: showNeeds,
        showConnections,
        orientation: circleOrientation,
        showFullNames,
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
    showFullNames,
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
    } catch (error) {
      exportError(
        error as Error,
        t(
          'export.errors.svgFailed',
          'SVG-Export fehlgeschlagen. Bitte versuche es erneut.',
        ),
      );
    }
  }, [requirePreviewSvg, imageExportBaseName, exportError, t]);

  useKeyboardShortcuts({
    'alt+arrowleft': () => navigate('/generator', { state: { step: 3 } }),
    'ctrl+shift+t': () => void handleTablePdf(),
    'cmd+shift+t': () => void handleTablePdf(),
    'ctrl+shift+c': () => void handleCirclePdf(),
    'cmd+shift+c': () => void handleCirclePdf(),
    'ctrl+shift+i': () => void handlePngExport(),
    'cmd+shift+i': () => void handlePngExport(),
    'ctrl+p': handlePrint,
    'cmd+p': handlePrint,
  });

  return (
    <main
      id="main"
      tabIndex={-1}
      className="min-h-[80vh] bg-linear-to-b from-slate-50 via-white to-slate-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 px-4 py-12"
    >
      <Seo
        {...metadata}
        structuredData={{
          '@type': 'WebPage',
          name: metadata.title,
          description: metadata.description,
        }}
      />
      <div className="mx-auto max-w-7xl dark:text-gray-100">
        <header className="mb-8 flex flex-row items-center justify-between gap-4">
          {/* Left side - Logo + Branding */}
          <h1 className="flex items-center shrink-0">
            <LocalizedLink
              to="/"
              className="kp-lockup focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              <KpLockup size="sm" hideWordmarkOnMobile />
            </LocalizedLink>
          </h1>

          {/* Centered Wizard Progress Bar */}
          <div className="flex-1 flex justify-center px-4">
            <WizardProgressBar
              currentStep={4}
              totalSteps={4}
              onStepChange={(step) =>
                navigate('/generator', { state: { step } })
              }
              seatingMode={previewMode}
              className="w-full max-w-xl"
            />
          </div>

          {/* Right side - Help Button */}
          <div className="flex items-center shrink-0">
            <HelpButton
              title={t('help.export.title', 'Export')}
              instructions={
                <div className="space-y-3">
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                    <li>
                      {t(
                        'help.export.item1',
                        'Passe den Namen deines Sitzplans an.',
                      )}
                    </li>
                    <li>
                      {t(
                        'help.export.item2',
                        'Wechsel zwischen Hochformat und Querformat für den PDF-Export.',
                      )}
                    </li>
                    <li>
                      {t(
                        'help.export.item3',
                        'Wähle zwischen den verschiedenen Ansichtsoptionen: Tafel, Bedürfnisse und Namen vollständig anzeigen.',
                      )}
                    </li>
                    <li>
                      {t(
                        'help.export.item4',
                        'Wechsle die Vorschau zwischen Sitzplan und Sitzkreis oben rechts.',
                      )}
                    </li>
                    <li>
                      {t(
                        'help.export.item5',
                        'Neben PDF und Druck kannst du die Ansicht auch als PNG-Bild oder SVG-Vektorgrafik speichern – praktisch für Elternbriefe oder das Schulportal.',
                      )}
                    </li>
                  </ul>
                </div>
              }
              shortcutContexts={['export']}
            />
          </div>
        </header>

        {/* Main content area with Sidebar and Canvas; empty state when no
            seating plan exists yet */}
        {!hasPlan ? (
          <div className="flex min-h-96 flex-col items-center justify-center gap-4 text-center text-gray-600 dark:text-gray-300">
            <p className="text-lg font-medium">
              {t('export.empty', 'Noch kein Sitzplan zum Exportieren.')}
            </p>
            <button
              type="button"
              onClick={() => navigate('/generator', { state: { step: 3 } })}
              className={`${primaryButtonClass} h-10 gap-2 px-4`}
              title={t('export.backTitle', 'Zurück (Alt/Option+←)')}
            >
              <ArrowLeftIcon size={20} aria-hidden />
              <span className="text-sm font-semibold">
                {t('export.backToSeating', 'Zurück zum Sitzplan')}
              </span>
            </button>
          </div>
        ) : (
          <div className="flex gap-4 h-full">
            {/* Sidebar Links */}
            <ExportSidebar
              title={title}
              onTitleChange={setTitle}
              tableOrientation={tableOrientation}
              onTableOrientationChange={setTableOrientation}
              circleOrientation={circleOrientation}
              onCircleOrientationChange={setCircleOrientation}
              onPrint={handlePrint}
              onTablePdf={handleTablePdf}
              onCirclePdf={handleCirclePdf}
              onPngExport={handlePngExport}
              onSvgExport={handleSvgExport}
              hasCircleLayout={hasCircleLayoutAvailable}
              isFirstVisit={isFirstVisit}
            />

            {/* Canvas Bereich */}
            <div className="flex-1 space-y-4">
              <div
                ref={previewFrameRef}
                className={`${canvasFrameClass} relative w-full`}
                style={previewFrameStyles}
              >
                <div className="pointer-events-none absolute left-3 top-3 sm:left-4 sm:top-4">
                  <span className="inline-flex items-center rounded-full border border-white/50 bg-gray-900/70 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-white shadow-sm backdrop-blur-sm">
                    {t('export.preview', 'Vorschau')}
                  </span>
                </div>
                <CanvasSettingsButton
                  ref={canvasSettingsButtonRef}
                  groups={exportSettingsGroups}
                  buttonAriaLabel={t(
                    'export.displayOptions',
                    'Export-Anzeigeoptionen',
                  )}
                  buttonTitle={t(
                    'editor.viewSettings',
                    'Ansichtseinstellungen',
                  )}
                />
                <iframe
                  ref={iframeRef}
                  className={`h-full w-full rounded-[inherit] border-0 transition-opacity duration-300 ${
                    isGenerating ? 'opacity-50' : 'opacity-100'
                  }`}
                  title={t('export.preview', 'Vorschau')}
                />
                {isGenerating && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-[inherit] bg-white/50 backdrop-blur-sm dark:bg-gray-900/50">
                    <div className="flex flex-col items-center gap-3 rounded-xl bg-white/90 p-5 shadow-lg dark:bg-gray-800/90">
                      <div className="flex gap-1.5">
                        <div
                          className="h-3 w-3 rounded-full bg-blue-600 animate-pulse"
                          style={{ animationDelay: '0ms' }}
                        />
                        <div
                          className="h-3 w-3 rounded-full bg-blue-600 animate-pulse"
                          style={{ animationDelay: '150ms' }}
                        />
                        <div
                          className="h-3 w-3 rounded-full bg-blue-600 animate-pulse"
                          style={{ animationDelay: '300ms' }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {t(
                          'export.previewUpdating',
                          'Vorschau wird aktualisiert...',
                        )}
                      </span>
                    </div>
                  </div>
                )}
                <div className="absolute right-3 top-3 flex flex-col items-end gap-2">
                  <div className="opacity-90">
                    <SeatingModeToggle
                      mode={previewMode}
                      onModeChange={handleModeChange}
                      disabled={circleGenerationInProgress}
                    />
                  </div>
                  {circleGenerationInProgress && (
                    <div className="flex w-full flex-col gap-1 rounded-2xl bg-gray-900/80 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-white shadow-lg backdrop-blur-sm dark:bg-gray-100/90 dark:text-gray-900">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-3.5 w-3.5 items-center justify-center">
                          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent dark:border-gray-900 dark:border-t-transparent" />
                        </span>
                        <div className="min-w-0 flex-1 text-left">
                          <span className="block truncate normal-case">
                            {generationMessage}
                          </span>
                          {generationProgress !== null && (
                            <span className="text-[10px] font-normal normal-case text-white/75 dark:text-gray-800/75">
                              {generationProgress}%
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={handleCancelCircleGeneration}
                          className="text-amber-200 underline-offset-2 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 dark:text-amber-600 dark:hover:text-gray-900"
                        >
                          {t('export.cancelCircleGeneration', 'Abbrechen')}
                        </button>
                      </div>
                      {generationProgress !== null && (
                        <div className="h-1.5 w-full rounded-full bg-white/20 dark:bg-gray-300/50">
                          <span
                            className="block h-full rounded-full bg-white/90 transition-[width] duration-200 dark:bg-gray-900"
                            style={{
                              width: `${Math.max(6, generationProgress)}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="sm:hidden space-y-2">
                {/* Drucken-Button alleinstehend */}
                <button
                  type="button"
                  onClick={handlePrint}
                  className={`${successButtonClass} w-full justify-center gap-2`}
                  title={t('export.printShortcut', 'Drucken (Strg/Cmd+P)')}
                >
                  <PrinterIcon className="h-4 w-4" />
                  <span className="text-sm font-semibold">
                    {t('actions.print', 'Drucken')}
                  </span>
                </button>
                {/* PDF-Buttons nebeneinander */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleTablePdf}
                    className={`${primaryButtonClass} flex-1 min-w-0 justify-center gap-2`}
                    title={t(
                      'export.tablePdfShortcut',
                      'Sitzplan als PDF exportieren (Strg/Cmd+Shift+T)',
                    )}
                  >
                    <GridNineIcon className="h-4 w-4" />
                    <span className="text-sm font-semibold">
                      {t('export.tablePdfButton', 'Sitzplan PDF')}
                    </span>
                  </button>
                  {hasCircleLayoutAvailable && (
                    <button
                      type="button"
                      onClick={handleCirclePdf}
                      className={`${primaryButtonClass} flex-1 min-w-0 justify-center gap-2`}
                      title={t(
                        'export.circlePdfShortcut',
                        'Sitzkreis als PDF exportieren (Strg/Cmd+Shift+C)',
                      )}
                    >
                      <CircleDashedIcon className="h-4 w-4" />
                      <span className="text-sm font-semibold">
                        {t('export.circlePdfButton', 'Sitzkreis PDF')}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* Zurück-Button unter Canvas */}
              <button
                type="button"
                onClick={() => navigate('/generator', { state: { step: 3 } })}
                className={`${neutralButtonClass} w-full justify-center gap-2 sm:w-auto`}
                title={t('export.backTitle', 'Zurück (Alt/Option+←)')}
              >
                <ArrowLeftIcon className="w-4 h-4" />
                {t('export.backToSeating', 'Zurück zum Sitzplan')}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

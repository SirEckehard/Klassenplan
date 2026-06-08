import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  TextAa,
  Printer,
  ArrowCounterClockwise,
  Rectangle,
  CircleDashed,
  GridNineIcon,
} from '@phosphor-icons/react';
import SmartSidebar from '@/components/ui/panels/SmartSidebar';
import SectionHeader from '@/components/ui/layout/SectionHeader';
import StorageSidebarSection from '@/components/ui/navigation/StorageSidebarSection';
import {
  cardSurfaceClass,
  inputFieldClass,
  primaryButtonClass,
  secondaryButtonClass,
  successButtonClass,
  getSidebarSurfaceClasses,
  getSidebarIconClasses,
  getSidebarIndicatorClasses,
  type SidebarTone,
} from '@/utils';

type PageOrientation = 'landscape' | 'portrait';

interface ExportSidebarProps {
  // Titel
  title: string;
  onTitleChange: (title: string) => void;

  // Seitenformat
  tableOrientation: PageOrientation;
  onTableOrientationChange: (orientation: PageOrientation) => void;
  circleOrientation: PageOrientation;
  onCircleOrientationChange: (orientation: PageOrientation) => void;

  // Export-Aktionen
  onPrint: () => void;
  onTablePdf: () => void;
  onCirclePdf: () => void;
  hasCircleLayout: boolean;

  // First visit flag
  isFirstVisit?: boolean;
}

export default function ExportSidebar({
  title,
  onTitleChange,
  tableOrientation,
  onTableOrientationChange,
  circleOrientation,
  onCircleOrientationChange,
  onPrint,
  onTablePdf,
  onCirclePdf,
  hasCircleLayout,
  isFirstVisit,
}: ExportSidebarProps) {
  const { t } = useTranslation('generator');
  const titleInputRef = React.useRef<HTMLInputElement>(null);
  const [autoFocusTitle, setAutoFocusTitle] = React.useState(false);
  // Dynamic icons based on state
  const tableOrientationIcon =
    tableOrientation === 'landscape' ? (
      <Rectangle size={18} />
    ) : (
      <Rectangle size={18} style={{ transform: 'rotate(90deg)' }} />
    );

  const circleOrientationIcon =
    circleOrientation === 'landscape' ? (
      <Rectangle size={18} />
    ) : (
      <Rectangle size={18} style={{ transform: 'rotate(90deg)' }} />
    );

  const tableOrientationCollapsedIcon = (
    <>
      {tableOrientationIcon}
      <GridNineIcon size={14} />
    </>
  );

  const circleOrientationCollapsedIcon = (
    <>
      {circleOrientationIcon}
      <CircleDashed size={14} />
    </>
  );

  type CollapsedStyleOptions = {
    tone?: SidebarTone;
    isActive?: boolean;
    disabled?: boolean;
    emphasis?: 'default' | 'accent';
    interactive?: boolean;
  };

  const buildCollapsedStyles = ({
    tone = 'blue',
    isActive = false,
    disabled = false,
    emphasis = 'default',
    interactive = !disabled,
  }: CollapsedStyleOptions = {}) => {
    return {
      button: [
        'group relative inline-flex h-12 w-12 items-center justify-center rounded-full p-0',
        getSidebarSurfaceClasses({
          variant: 'collapsed',
          tone,
          isActive,
          disabled,
          interactive,
          emphasis,
        }),
      ].join(' '),
      icon: getSidebarIconClasses({
        tone,
        isActive,
        disabled,
        emphasis,
      }),
      indicator: getSidebarIndicatorClasses(tone),
    };
  };

  const titleButtonStyles = buildCollapsedStyles();
  const tableOrientationButtonStyles = buildCollapsedStyles({
    emphasis: 'accent',
    isActive: tableOrientation === 'landscape',
  });
  const circleOrientationButtonStyles = buildCollapsedStyles({
    emphasis: 'accent',
    isActive: circleOrientation === 'landscape',
  });
  const printButtonStyles = buildCollapsedStyles({
    tone: 'green',
    emphasis: 'accent',
  });
  const exportButtonStyles = buildCollapsedStyles({
    emphasis: 'accent',
  });

  // Handle icon click from SmartSidebar
  const handleIconClick = React.useCallback(
    (iconId: string, expand: () => void) => {
      if (iconId === 'title') {
        expand();
        setAutoFocusTitle(true);
      }
    },
    [],
  );

  // Auto-focus title input when expanded after icon click
  React.useEffect(() => {
    if (autoFocusTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      setAutoFocusTitle(false);
    }
  }, [autoFocusTitle]);

  return (
    <SmartSidebar isFirstVisit={isFirstVisit}>
      {({ isExpanded, expand }) =>
        isExpanded ? (
          // Expanded Mode - Full UI
          <div className="space-y-5">
            <div className={`${cardSurfaceClass} border px-3 py-4`}>
              <SectionHeader
                icon={<TextAa size={16} />}
                title={t('export.title', 'Titel')}
              />
              <input
                ref={titleInputRef}
                type="text"
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                className={`${inputFieldClass} mt-3`}
                placeholder={t('export.titlePlaceholder', 'Titel eingeben')}
              />
            </div>

            <div className={`${cardSurfaceClass} border px-3 py-4`}>
              <SectionHeader
                icon={<ArrowCounterClockwise size={16} />}
                title={t('export.pageFormat', 'Seitenformat')}
              />
              <div className="mt-3 space-y-4">
                <div>
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
                    <GridNineIcon size={12} />
                    {t('mode.table', 'Sitzplan')}
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => onTableOrientationChange('landscape')}
                      className={`${tableOrientation === 'landscape'
                        ? primaryButtonClass
                        : secondaryButtonClass
                        } w-full justify-center gap-2 px-4 py-2`}
                      aria-pressed={tableOrientation === 'landscape'}
                    >
                      <Rectangle className="h-4 w-4" />
                      {t('export.landscape', 'Querformat')}
                    </button>
                    <button
                      type="button"
                      onClick={() => onTableOrientationChange('portrait')}
                      className={`${tableOrientation === 'portrait'
                        ? primaryButtonClass
                        : secondaryButtonClass
                        } w-full justify-center gap-2 px-4 py-2`}
                      aria-pressed={tableOrientation === 'portrait'}
                    >
                      <Rectangle className="h-4 w-4 rotate-90" />
                      {t('export.portrait', 'Hochformat')}
                    </button>
                  </div>
                </div>
                <div>
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
                    <CircleDashed size={12} />
                    {t('mode.circle', 'Sitzkreis')}
                  </p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => onCircleOrientationChange('landscape')}
                      className={`${circleOrientation === 'landscape'
                        ? primaryButtonClass
                        : secondaryButtonClass
                        } w-full justify-center gap-2 px-4 py-2`}
                      aria-pressed={circleOrientation === 'landscape'}
                    >
                      <Rectangle className="h-4 w-4" />
                      {t('export.landscape', 'Querformat')}
                    </button>
                    <button
                      type="button"
                      onClick={() => onCircleOrientationChange('portrait')}
                      className={`${circleOrientation === 'portrait'
                        ? primaryButtonClass
                        : secondaryButtonClass
                        } w-full justify-center gap-2 px-4 py-2`}
                      aria-pressed={circleOrientation === 'portrait'}
                    >
                      <Rectangle className="h-4 w-4 rotate-90" />
                      {t('export.portrait', 'Hochformat')}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`${cardSurfaceClass} border px-3 py-4 space-y-3 hidden sm:block`}
            >
              <SectionHeader
                icon={<Printer size={16} />}
                title={t('actions.export', 'Export')}
              />
              <button
                type="button"
                onClick={onPrint}
                className={`${successButtonClass} w-full justify-center gap-2`}
                title={t('export.printShortcut', 'Drucken (Strg/Cmd+P)')}
              >
                <Printer size={16} />
                {t('actions.print', 'Drucken')}
              </button>
              <button
                type="button"
                onClick={onTablePdf}
                className={`${primaryButtonClass} w-full justify-center gap-2`}
                title={t(
                  'export.tablePdfShortcut',
                  'Sitzplan als PDF exportieren (Strg/Cmd+Shift+T)',
                )}
              >
                <GridNineIcon size={16} />
                {t('export.tablePdfButton', 'Sitzplan-PDF')}
              </button>
              {hasCircleLayout && (
                <button
                  type="button"
                  onClick={onCirclePdf}
                  className={`${primaryButtonClass} w-full justify-center gap-2`}
                  title={t(
                    'export.circlePdfShortcut',
                    'Sitzkreis als PDF exportieren (Strg/Cmd+Shift+C)',
                  )}
                >
                  <CircleDashed size={16} />
                  {t('export.circlePdfButton', 'Sitzkreis-PDF')}
                </button>
              )}
            </div>

            {/* Storage & Backup Section */}
            <StorageSidebarSection isExpanded />
          </div>
        ) : (
          // Collapsed Mode - Icon-only
          <div className="flex flex-col items-center gap-3 py-3">
            {/* Position 1: Titel (clickable to expand and focus input) */}
            <button
              type="button"
              onClick={() => handleIconClick('title', expand)}
              className={titleButtonStyles.button}
              title={t('export.editTitle', 'Titel bearbeiten')}
            >
              <span className={titleButtonStyles.icon}>
                <TextAa size={18} />
              </span>
            </button>

            {/* Position 2: Orientierung Sitzplan */}
            <button
              type="button"
              onClick={() =>
                onTableOrientationChange(
                  tableOrientation === 'landscape' ? 'portrait' : 'landscape',
                )
              }
              className={tableOrientationButtonStyles.button}
              title={`${t('export.pageFormatTable', 'Seitenformat Sitzplan')}: ${tableOrientation === 'landscape' ? t('export.landscape') : t('export.portrait')}`}
              aria-label={`${t('export.pageFormatTable', 'Seitenformat Sitzplan')}: ${tableOrientation === 'landscape' ? t('export.landscape') : t('export.portrait')}`}
            >
              <span
                className={`${tableOrientationButtonStyles.icon} flex items-center gap-1`}
              >
                {tableOrientationCollapsedIcon}
              </span>
            </button>

            {/* Position 3: Orientierung Sitzkreis */}
            <button
              type="button"
              onClick={() =>
                onCircleOrientationChange(
                  circleOrientation === 'landscape' ? 'portrait' : 'landscape',
                )
              }
              className={circleOrientationButtonStyles.button}
              title={`${t('export.pageFormatCircle', 'Seitenformat Sitzkreis')}: ${circleOrientation === 'landscape' ? t('export.landscape') : t('export.portrait')}`}
              aria-label={`${t('export.pageFormatCircle', 'Seitenformat Sitzkreis')}: ${circleOrientation === 'landscape' ? t('export.landscape') : t('export.portrait')}`}
            >
              <span
                className={`${circleOrientationButtonStyles.icon} flex items-center gap-1`}
              >
                {circleOrientationCollapsedIcon}
              </span>
            </button>

            {/* Divider */}
            <div className="my-1 h-px w-8 bg-blue-100 dark:bg-blue-900/40" />

            {/* Position 5: Drucken */}
            <button
              type="button"
              onClick={onPrint}
              className={printButtonStyles.button}
              title={t('export.printShortcut', 'Drucken (Strg/Cmd+P)')}
            >
              <span className={printButtonStyles.icon}>
                <Printer size={18} />
              </span>
            </button>

            {/* Position 6: Sitzplan PDF Export */}
            <button
              type="button"
              onClick={onTablePdf}
              className={exportButtonStyles.button}
              title={t(
                'export.tablePdfShortcut',
                'Sitzplan-PDF exportieren (Strg/Cmd+Shift+T)',
              )}
            >
              <span className={exportButtonStyles.icon}>
                <GridNineIcon size={18} />
              </span>
            </button>

            {/* Position 7: Sitzkreis PDF Export (only if circle layout exists) */}
            {hasCircleLayout && (
              <button
                type="button"
                onClick={onCirclePdf}
                className={exportButtonStyles.button}
                title={t(
                  'export.circlePdfShortcut',
                  'Sitzkreis-PDF exportieren (Strg/Cmd+Shift+C)',
                )}
              >
                <span className={exportButtonStyles.icon}>
                  <CircleDashed size={18} />
                </span>
              </button>
            )}

            {/* Storage & Backup */}
            <StorageSidebarSection isExpanded={false} />
          </div>
        )
      }
    </SmartSidebar>
  );
}

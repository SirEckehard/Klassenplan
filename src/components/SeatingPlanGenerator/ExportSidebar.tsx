// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  TextAa,
  Printer,
  ArrowCounterClockwise,
  Rectangle,
  CircleDashed,
  GridNineIcon,
  ImageIcon,
  VectorTwoIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  FlipVerticalIcon,
} from '@phosphor-icons/react';
import SmartSidebar from '@/components/ui/panels/SmartSidebar';
import SidebarFlyout from '@/components/ui/panels/SidebarFlyout';
import RailButton from '@/components/ui/controls/RailButton';
import SectionHeader from '@/components/ui/layout/SectionHeader';
import {
  cardSurfaceClass,
  inputFieldClass,
  primaryButtonClass,
  secondaryButtonClass,
  successButtonClass,
  getSidebarSurfaceClasses,
  getSidebarIconClasses,
  sidebarRailButtonClass,
  type SidebarTone,
} from '@/utils';

type PageOrientation = 'landscape' | 'portrait';

/**
 * - `comfortable`: the expanded sidebar, grouped under headings.
 * - `compact`: the collapsed sidebar, one round button per setting or export;
 *   the title is edited in a flyout.
 */
type Density = 'comfortable' | 'compact';

interface ExportSidebarProps {
  title: string;
  onTitleChange: (title: string) => void;

  tableOrientation: PageOrientation;
  onTableOrientationChange: (orientation: PageOrientation) => void;
  circleOrientation: PageOrientation;
  onCircleOrientationChange: (orientation: PageOrientation) => void;

  /**
   * Seating-plan export only: read the sheet from the back of the room. Rotates
   * the classroom 180° while names and photos stay upright. Hidden while the
   * circle is previewed, where the setting has no effect.
   */
  showViewDirection: boolean;
  flipView: boolean;
  onFlipViewChange: (flipped: boolean) => void;

  onPrint: () => void;
  onTablePdf: () => void;
  onCirclePdf: () => void;
  onPngExport: () => void;
  onSvgExport: () => void;
  hasCircleLayout: boolean;
}

type RailStyle = { tone?: SidebarTone; accent?: boolean; isActive?: boolean };

const railStyles = ({
  tone = 'blue',
  accent = false,
  isActive = false,
}: RailStyle = {}) => {
  const emphasis = accent ? 'accent' : 'default';
  return {
    button: `${sidebarRailButtonClass} ${getSidebarSurfaceClasses({
      variant: 'collapsed',
      tone,
      isActive,
      emphasis,
    })}`,
    icon: getSidebarIconClasses({ tone, isActive, emphasis }),
  };
};

function RailDivider() {
  return (
    <div
      aria-hidden="true"
      className="my-1 h-px w-8 bg-(--surface-option-selected)"
    />
  );
}

/** A card with a heading, or on the rail just its buttons. */
function Section({
  density,
  icon,
  title,
  className = '',
  bodyClassName = '',
  dividerBefore = false,
  children,
}: {
  density: Density;
  icon: React.ReactNode;
  title: string;
  className?: string;
  bodyClassName?: string;
  /** Compact only: a divider before the buttons. */
  dividerBefore?: boolean;
  children: React.ReactNode;
}) {
  if (density === 'compact') {
    return (
      <>
        {dividerBefore && <RailDivider />}
        {children}
      </>
    );
  }

  return (
    <div className={`${cardSurfaceClass} border px-3 py-4 ${className}`}>
      <SectionHeader icon={icon} title={title} />
      <div className={`mt-3 ${bodyClassName}`}>{children}</div>
    </div>
  );
}

function TitleInput({
  title,
  onTitleChange,
  onEnter,
}: {
  title: string;
  onTitleChange: (title: string) => void;
  onEnter?: () => void;
}) {
  const { t } = useTranslation('generator');

  return (
    <input
      type="text"
      value={title}
      onChange={(event) => onTitleChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && onEnter) {
          event.preventDefault();
          onEnter();
        }
      }}
      className={inputFieldClass}
      placeholder={t('export.titlePlaceholder')}
      aria-label={t('export.title')}
    />
  );
}

/** One of two options side by side, in the comfortable density. */
function ChoiceButton({
  selected,
  onClick,
  icon,
  label,
  title,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${selected ? primaryButtonClass : secondaryButtonClass} w-full justify-center gap-2 px-4 py-2`}
      aria-pressed={selected}
      title={title}
    >
      {icon}
      {label}
    </button>
  );
}

/**
 * The page orientation of one export: two options, or on the rail one button
 * that switches between them.
 */
function OrientationControl({
  density,
  railLabel,
  modeIcon,
  orientation,
  onChange,
}: {
  density: Density;
  /** Names which export the orientation belongs to. */
  railLabel: string;
  modeIcon: React.ReactNode;
  orientation: PageOrientation;
  onChange: (orientation: PageOrientation) => void;
}) {
  const { t } = useTranslation('generator');
  const isLandscape = orientation === 'landscape';

  if (density === 'compact') {
    const styles = railStyles({ accent: true, isActive: isLandscape });
    const label = `${railLabel}: ${
      isLandscape ? t('export.landscape') : t('export.portrait')
    }`;
    return (
      <button
        type="button"
        onClick={() => onChange(isLandscape ? 'portrait' : 'landscape')}
        className={styles.button}
        title={label}
        aria-label={label}
      >
        <span className={`${styles.icon} flex items-center gap-1`}>
          <Rectangle size={18} className={isLandscape ? '' : 'rotate-90'} />
          {modeIcon}
        </span>
      </button>
    );
  }

  return (
    <div className="mt-2 grid gap-2 sm:grid-cols-2">
      <ChoiceButton
        selected={isLandscape}
        onClick={() => onChange('landscape')}
        icon={<Rectangle className="h-4 w-4" />}
        label={t('export.landscape')}
      />
      <ChoiceButton
        selected={!isLandscape}
        onClick={() => onChange('portrait')}
        icon={<Rectangle className="h-4 w-4 rotate-90" />}
        label={t('export.portrait')}
      />
    </div>
  );
}

function ViewDirectionControl({
  density,
  flipView,
  onChange,
}: {
  density: Density;
  flipView: boolean;
  onChange: (flipped: boolean) => void;
}) {
  const { t } = useTranslation('generator');

  if (density === 'compact') {
    const styles = railStyles({ accent: true, isActive: flipView });
    const label = `${t('export.viewDirection')}: ${
      flipView ? t('export.viewFromBack') : t('export.viewFromFront')
    }`;
    return (
      <button
        type="button"
        onClick={() => onChange(!flipView)}
        className={styles.button}
        title={label}
        aria-label={label}
        aria-pressed={flipView}
      >
        <span className={styles.icon}>
          <FlipVerticalIcon size={18} />
        </span>
      </button>
    );
  }

  return (
    <>
      <p className="mt-3 text-xs font-medium text-(--text-muted)">
        {t('export.viewDirection')}
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <ChoiceButton
          selected={!flipView}
          onClick={() => onChange(false)}
          icon={<ArrowUpIcon className="h-4 w-4" />}
          label={t('export.viewFromFront')}
          title={t('export.viewFromFrontTitle')}
        />
        <ChoiceButton
          selected={flipView}
          onClick={() => onChange(true)}
          icon={<ArrowDownIcon className="h-4 w-4" />}
          label={t('export.viewFromBack')}
          title={t('export.viewFromBackTitle')}
        />
      </div>
    </>
  );
}

/** The settings of one export (seating plan or circle), under its name. */
function FormatGroup({
  density,
  icon,
  label,
  children,
}: {
  density: Density;
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  if (density === 'compact') {
    return <>{children}</>;
  }

  return (
    <div>
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-(--text-badge)">
        {icon}
        {label}
      </p>
      {children}
    </div>
  );
}

const exportActionStyles = {
  print: { comfortable: successButtonClass, tone: 'green', accent: true },
  pdf: { comfortable: primaryButtonClass, tone: 'blue', accent: true },
  // Image exports are secondary next to print and PDF, so they stay plain.
  image: { comfortable: secondaryButtonClass, tone: 'blue', accent: false },
} as const;

function ExportAction({
  density,
  kind,
  icon: Icon,
  label,
  title,
  onClick,
}: {
  density: Density;
  kind: keyof typeof exportActionStyles;
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  title: string;
  onClick: () => void;
}) {
  const style = exportActionStyles[kind];

  if (density === 'compact') {
    const styles = railStyles({ tone: style.tone, accent: style.accent });
    return (
      <button
        type="button"
        onClick={onClick}
        className={styles.button}
        title={title}
        aria-label={label}
      >
        <span className={styles.icon}>
          <Icon size={18} />
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${style.comfortable} w-full justify-center gap-2`}
      title={title}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

/**
 * The export page's sidebar: title, page format and the exports. Both
 * densities are built from the same parts, so each offers what the other does.
 */
export default function ExportSidebar(props: ExportSidebarProps) {
  return (
    // Its rail buttons are still the round 48px ones, so the column stays as
    // wide as they need until they follow the workspace toolbar.
    <SmartSidebar widths={{ expanded: 'w-72', collapsed: 'w-22' }}>
      {({ isExpanded }) => (
        <ExportSidebarContent
          {...props}
          density={isExpanded ? 'comfortable' : 'compact'}
        />
      )}
    </SmartSidebar>
  );
}

function ExportSidebarContent({
  density,
  title,
  onTitleChange,
  tableOrientation,
  onTableOrientationChange,
  circleOrientation,
  onCircleOrientationChange,
  showViewDirection,
  flipView,
  onFlipViewChange,
  onPrint,
  onTablePdf,
  onCirclePdf,
  onPngExport,
  onSvgExport,
  hasCircleLayout,
}: ExportSidebarProps & { density: Density }) {
  const { t } = useTranslation('generator');
  const isCompact = density === 'compact';
  const [titleAnchor, setTitleAnchor] = React.useState<HTMLElement | null>(
    null,
  );

  const closeTitleFlyout = React.useCallback(
    ({ restoreFocus }: { restoreFocus: boolean }) => {
      if (restoreFocus) {
        titleAnchor?.focus();
      }
      setTitleAnchor(null);
    },
    [titleAnchor],
  );

  const titleStyles = railStyles();
  const editTitleLabel = t('export.editTitle');

  return (
    <div
      className={
        isCompact ? 'flex flex-col items-center gap-3 py-3' : 'space-y-5'
      }
    >
      <Section
        density={density}
        icon={<TextAa size={16} />}
        title={t('export.title')}
      >
        {isCompact ? (
          <RailButton
            label={editTitleLabel}
            title={title ? `${editTitleLabel}: ${title}` : editTitleLabel}
            flyoutOpen={titleAnchor !== null}
            className={titleStyles.button}
            onPress={setTitleAnchor}
            onOpenFlyout={setTitleAnchor}
          >
            <span className={titleStyles.icon}>
              <TextAa size={18} />
            </span>
          </RailButton>
        ) : (
          <TitleInput title={title} onTitleChange={onTitleChange} />
        )}
      </Section>

      <Section
        density={density}
        icon={<ArrowCounterClockwise size={16} />}
        title={t('export.pageFormat')}
        bodyClassName="space-y-4"
      >
        <FormatGroup
          density={density}
          icon={<GridNineIcon size={12} />}
          label={t('mode.table')}
        >
          <OrientationControl
            density={density}
            railLabel={t('export.pageFormatTable')}
            modeIcon={<GridNineIcon size={14} />}
            orientation={tableOrientation}
            onChange={onTableOrientationChange}
          />
          {/* Grouped with the seating plan on purpose: the flip has no
              meaning for the circle export. */}
          {showViewDirection && (
            <ViewDirectionControl
              density={density}
              flipView={flipView}
              onChange={onFlipViewChange}
            />
          )}
        </FormatGroup>
        <FormatGroup
          density={density}
          icon={<CircleDashed size={12} />}
          label={t('mode.circle')}
        >
          <OrientationControl
            density={density}
            railLabel={t('export.pageFormatCircle')}
            modeIcon={<CircleDashed size={14} />}
            orientation={circleOrientation}
            onChange={onCircleOrientationChange}
          />
        </FormatGroup>
      </Section>

      {/* Below `sm` the page shows these buttons under the preview instead. */}
      <Section
        density={density}
        icon={<Printer size={16} />}
        title={t('actions.export')}
        className="hidden sm:block"
        bodyClassName="space-y-3"
        dividerBefore
      >
        <ExportAction
          density={density}
          kind="print"
          icon={Printer}
          label={t('actions.print')}
          title={t('export.printShortcut')}
          onClick={onPrint}
        />
        <ExportAction
          density={density}
          kind="pdf"
          icon={GridNineIcon}
          label={t('export.tablePdfButton')}
          title={t('export.tablePdfShortcut')}
          onClick={onTablePdf}
        />
        {hasCircleLayout && (
          <ExportAction
            density={density}
            kind="pdf"
            icon={CircleDashed}
            label={t('export.circlePdfButton')}
            title={t('export.circlePdfShortcut')}
            onClick={onCirclePdf}
          />
        )}
        {/* Image exports of the current preview — for embedding into parent
            letters or an LMS, where a PDF is unwieldy. */}
        <div className={isCompact ? 'contents' : 'grid gap-2 sm:grid-cols-2'}>
          <ExportAction
            density={density}
            kind="image"
            icon={ImageIcon}
            label={t('export.pngButton')}
            title={t('export.pngShortcut')}
            onClick={onPngExport}
          />
          <ExportAction
            density={density}
            kind="image"
            icon={VectorTwoIcon}
            label={t('export.svgButton')}
            title={t('export.svgTitle')}
            onClick={onSvgExport}
          />
        </div>
      </Section>

      {titleAnchor && (
        <SidebarFlyout
          anchor={titleAnchor}
          label={t('export.title')}
          autoFocus
          onClose={closeTitleFlyout}
        >
          <p className="mb-2 text-sm font-medium text-(--text-page)">
            {t('export.title')}
          </p>
          <TitleInput
            title={title}
            onTitleChange={onTitleChange}
            onEnter={() => closeTitleFlyout({ restoreFocus: true })}
          />
        </SidebarFlyout>
      )}
    </div>
  );
}

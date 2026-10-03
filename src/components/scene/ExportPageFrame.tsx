// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { measureNameWidth } from '@/utils/ui/seatLabelLayout';
import { svgFontFamily } from '@/utils';

/**
 * The frame every exported sheet shares — the seating plan and the circle,
 * portrait and landscape alike: the margin, the header and the area left for
 * the plan. Units are PostScript points on a 72 dpi A4 page.
 *
 * The sheet used to keep 14 mm of margin in portrait and 25 mm in landscape,
 * with a landscape header of its own another 21 mm high, and the plan had what
 * was left. A printer needs about 5 mm; 10 mm is safe everywhere, and the
 * header is one line of title, brand and date in both orientations.
 */

export type ExportOrientation = 'portrait' | 'landscape';

/** About 10 mm. */
export const EXPORT_PAGE_MARGIN = 28;

const TITLE_SIZE = 14;
const MIN_TITLE_SIZE = 8;
const SMALL_SIZE = 9;
const TITLE_ROW_HEIGHT = 16;
const METADATA_LINE_HEIGHT = 12;
const METADATA_GAP = 4;
/** Space between the header and the plan, and between the plan and the legend. */
const BAND_GAP = 12;
/** The logo mark's edge length. */
const LOGO_SIZE = 12;
const BRAND = 'Klassenplan.de';

export type ExportClassInfo = {
  name?: string | null;
  label?: string | null;
  notes?: string | null;
};

/**
 * The lines under the title: "class • label", then the notes. Only written
 * when there is a label or notes — the class name alone is already the title.
 */
export function exportMetadataLines(info?: ExportClassInfo): string[] {
  const name = info?.name?.trim() || undefined;
  const label = info?.label?.trim() || undefined;
  const notes = info?.notes?.trim() || undefined;
  if (!label && !notes) {
    return [];
  }
  const lines: string[] = [];
  const primary = [name, label].filter(Boolean).join(' • ');
  if (primary) {
    lines.push(primary);
  }
  if (notes) {
    lines.push(notes);
  }
  return lines;
}

export type ExportPageLayout = {
  pageWidth: number;
  pageHeight: number;
  margin: number;
  headerHeight: number;
  /** Where the plan is drawn. */
  area: { x: number; y: number; width: number; height: number };
  /** Top edge of the legend band, when there is one. */
  legendY: number;
};

export function getExportPageLayout({
  orientation,
  metadataLineCount,
  legendHeight = 0,
}: {
  orientation: ExportOrientation;
  metadataLineCount: number;
  legendHeight?: number;
}): ExportPageLayout {
  const portrait = orientation === 'portrait';
  const pageWidth = portrait ? 595 : 842;
  const pageHeight = portrait ? 842 : 595;
  const margin = EXPORT_PAGE_MARGIN;
  const headerHeight =
    TITLE_ROW_HEIGHT +
    (metadataLineCount > 0
      ? METADATA_GAP + metadataLineCount * METADATA_LINE_HEIGHT
      : 0);
  const areaY = margin + headerHeight + BAND_GAP;
  const legendBand = legendHeight > 0 ? legendHeight + BAND_GAP : 0;
  return {
    pageWidth,
    pageHeight,
    margin,
    headerHeight,
    area: {
      x: margin,
      y: areaY,
      width: pageWidth - margin * 2,
      height: pageHeight - margin - legendBand - areaY,
    },
    legendY: pageHeight - margin - legendHeight,
  };
}

/** The logo: the Klassenplan.de mark, drawn at `LOGO_SIZE`. */
function LogoMark() {
  return (
    <g transform={`scale(${LOGO_SIZE / 240})`}>
      <g fill="#2563EB">
        <rect x="8" y="8" width="40" height="40" rx="8" />
        <rect x="146" y="8" width="40" height="40" rx="8" />
        <rect x="8" y="54" width="40" height="40" rx="8" />
        <rect x="100" y="54" width="40" height="40" rx="8" />
        <rect x="8" y="100" width="40" height="40" rx="8" />
        <rect x="54" y="100" width="40" height="40" rx="8" />
        <rect x="8" y="146" width="40" height="40" rx="8" />
        <rect x="100" y="146" width="40" height="40" rx="8" />
        <rect x="8" y="192" width="40" height="40" rx="8" />
        <rect x="146" y="192" width="40" height="40" rx="8" />
      </g>
      <rect x="192" y="100" width="40" height="40" rx="8" fill="#F59E0B" />
    </g>
  );
}

/**
 * The header: the brand on the left, the title in the middle, the date on the
 * right, and the class details under the title. A long title shrinks rather
 * than run into the brand or the date.
 */
export function ExportPageHeader({
  layout,
  title,
  dateLabel,
  metadataLines,
}: {
  layout: ExportPageLayout;
  title: string;
  dateLabel: string;
  metadataLines: readonly string[];
}) {
  const { pageWidth, margin } = layout;
  const baseline = margin + 11;
  const brandWidth = LOGO_SIZE + 4 + measureNameWidth(BRAND, SMALL_SIZE, 700);
  const dateWidth = measureNameWidth(dateLabel, SMALL_SIZE);
  // The title is centred on the page, so it has twice the wider side's
  // clearance less than the page between the margins.
  const titleRoom =
    pageWidth - margin * 2 - 2 * (Math.max(brandWidth, dateWidth) + 12);
  const titleWidth = measureNameWidth(title, 1, 700);
  const titleSize =
    titleWidth > 0
      ? Math.max(MIN_TITLE_SIZE, Math.min(TITLE_SIZE, titleRoom / titleWidth))
      : TITLE_SIZE;
  const metadataTop = margin + TITLE_ROW_HEIGHT + METADATA_GAP + SMALL_SIZE;

  return (
    <g fontFamily={svgFontFamily}>
      <g transform={`translate(${margin} ${baseline - LOGO_SIZE + 2})`}>
        <LogoMark />
      </g>
      <text
        x={margin + LOGO_SIZE + 4}
        y={baseline}
        fontSize={SMALL_SIZE}
        fontWeight="bold"
        fill="#2563EB"
      >
        {BRAND}
      </text>
      <text
        x={pageWidth / 2}
        y={baseline + 1}
        textAnchor="middle"
        fontSize={titleSize}
        fontWeight="bold"
        fill="#000"
      >
        {title}
      </text>
      <text
        x={pageWidth - margin}
        y={baseline}
        textAnchor="end"
        fontSize={SMALL_SIZE}
        fill="#000"
      >
        {dateLabel}
      </text>
      {metadataLines.map((line, index) => (
        <text
          key={`meta-${index}`}
          x={pageWidth / 2}
          y={metadataTop + index * METADATA_LINE_HEIGHT}
          textAnchor="middle"
          fontSize={SMALL_SIZE}
          fontWeight="500"
          fill="#475569"
        >
          {line}
        </text>
      ))}
    </g>
  );
}

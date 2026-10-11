// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { formatDate, svgFontFamily } from '@/utils';
import { measureNameWidth } from '@/utils/ui/seatLabelLayout';
import {
  ExportPageHeader,
  exportMetadataLines,
  getExportPageLayout,
  type ExportClassInfo,
} from '@/components/scene/ExportPageFrame';

// Ink on paper, the note list's greys.
const INK = '#000';
const MUTED = '#57534e';
const RULE_STRONG = '#44403c';
const RULE = '#a8a29e';

const SMALL_SIZE = 7.5;
const HEAD_ROW = 18;
/** Space above and below the lines of a duty. */
const ROW_PADDING = 6;
const MAX_LINE_HEIGHT = 30;
const MAX_FONT_SIZE = 16;
const MIN_FONT_SIZE = 6;
/** Space between the duty column and the names. */
const COLUMN_GAP = 16;
/** Length of the line an open place leaves to write a name on. */
const OPEN_LINE = 140;

export type DutyRosterRow = {
  /** The duty's name, or "Dienst 2" while it has none. */
  name: string;
  /** Who holds it, as the page shows them. */
  holders: string[];
  /** Places nobody holds, left as lines to write a name on. */
  open: number;
};

export type DutyRosterInput = {
  title: string;
  /** Printed under the title, as on the other sheets. */
  classMetadata?: ExportClassInfo;
  /** ISO 8601 timestamp of the round. */
  at: string;
  rows: DutyRosterRow[];
};

/**
 * The duty rota as a sheet for the wall (decision 0028), in the frame every
 * export shares: the duties down the left, who holds each one beside it, an
 * open place as a line to write a name on. One A4 page in portrait; the type
 * is as large as the number of names leaves room for.
 */
export default function DutyRosterSheet({
  title,
  classMetadata,
  at,
  rows,
}: DutyRosterInput) {
  const { t, i18n } = useTranslation('generator');

  // As on the note list: the class is named even without a label or notes,
  // unless it is the title already.
  const sharedLines = exportMetadataLines(classMetadata);
  const className = classMetadata?.name?.trim();
  const metadataLines =
    sharedLines.length === 0 && className && className !== title.trim()
      ? [className]
      : sharedLines;
  const page = getExportPageLayout({
    orientation: 'portrait',
    metadataLineCount: metadataLines.length,
  });
  const { area } = page;

  const lineCounts = rows.map((row) =>
    Math.max(1, row.holders.length + row.open),
  );
  const totalLines = lineCounts.reduce((sum, count) => sum + count, 0);
  const available = area.height - HEAD_ROW - rows.length * ROW_PADDING * 2;
  const lineHeight = Math.min(
    MAX_LINE_HEIGHT,
    available / Math.max(1, totalLines),
  );
  const fontSize = Math.max(
    MIN_FONT_SIZE,
    Math.min(MAX_FONT_SIZE, lineHeight * 0.58),
  );

  const right = area.x + area.width;
  const longestDuty = Math.max(
    0,
    ...rows.map((row) => measureNameWidth(row.name, fontSize, 700)),
  );
  const holderX =
    area.x + Math.min(area.width * 0.45, longestDuty + COLUMN_GAP);
  const bodyTop = area.y + HEAD_ROW;
  const headBaseline = bodyTop - 5;

  const heights = lineCounts.map(
    (count) => count * lineHeight + ROW_PADDING * 2,
  );
  const placed = rows.map((row, index) => ({
    row,
    rowTop: bodyTop + heights.slice(0, index).reduce((sum, h) => sum + h, 0),
    height: heights[index]!,
  }));

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
      viewBox={`0 0 ${page.pageWidth} ${page.pageHeight}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block' }}
      fontFamily={svgFontFamily}
    >
      <rect width={page.pageWidth} height={page.pageHeight} fill="#fff" />
      <ExportPageHeader
        layout={page}
        title={title}
        dateLabel={`${t('circle.date')}: ${formatDate(new Date(at), i18n.language)}`}
        metadataLines={metadataLines}
      />

      <g fontSize={SMALL_SIZE} fontWeight="bold" fill={MUTED}>
        <text x={area.x} y={headBaseline}>
          {t('tools.duties.sheet.duty')}
        </text>
        <text x={holderX} y={headBaseline}>
          {t('tools.duties.sheet.holders')}
        </text>
      </g>

      {placed.map(({ row, rowTop, height }, index) => {
        const firstBaseline = rowTop + ROW_PADDING + lineHeight * 0.72;
        return (
          <g key={index}>
            <text
              x={area.x}
              y={firstBaseline}
              fontSize={fontSize}
              fontWeight="bold"
              fill={INK}
            >
              {row.name}
            </text>
            {row.holders.map((holder, line) => (
              <text
                key={`holder-${line}`}
                x={holderX}
                y={firstBaseline + line * lineHeight}
                fontSize={fontSize}
                fill={INK}
              >
                {holder}
              </text>
            ))}
            {Array.from({ length: row.open }, (_, line) => {
              const y =
                firstBaseline + (row.holders.length + line) * lineHeight + 2;
              return (
                <line
                  key={`open-${line}`}
                  x1={holderX}
                  x2={Math.min(right, holderX + OPEN_LINE)}
                  y1={y}
                  y2={y}
                  stroke={RULE}
                  strokeWidth={0.5}
                />
              );
            })}
            <line
              x1={area.x}
              x2={right}
              y1={rowTop + height}
              y2={rowTop + height}
              stroke={RULE}
              strokeWidth={0.5}
            />
          </g>
        );
      })}

      <line
        x1={area.x}
        x2={right}
        y1={bodyTop}
        y2={bodyTop}
        stroke={RULE_STRONG}
        strokeWidth={0.9}
      />
    </svg>
  );
}

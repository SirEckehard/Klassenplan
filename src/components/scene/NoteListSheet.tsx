// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import type { Student } from '@/types';
import type { DataFamily, NameDisplayMode, NameLabels } from '@/utils';
import {
  buildNameLabels,
  formatDate,
  getDisplayNameForMode,
  svgFontFamily,
} from '@/utils';
import {
  createHiddenFamiliesFilter,
  fitSeatBadges,
  getSeatBadges,
  type SeatBadgeFit,
} from '@/utils/ui/seatBadges';
import { measureNameWidth } from '@/utils/ui/seatLabelLayout';
import { getStudentAppearance } from '@/utils/ui/studentAppearance';
import {
  NOTE_LIST_METRICS,
  noteListRowHeight,
  paginateNoteList,
  type NoteListEntry,
  type NoteListSettings,
} from '@/utils/ui/noteList';
import SeatBadgePill from '@/components/scene/SeatBadgePill';
import {
  ExportPageHeader,
  exportMetadataLines,
  getExportPageLayout,
  type ExportClassInfo,
  type ExportPageLayout,
} from '@/components/scene/ExportPageFrame';

// Ink on paper: the list is printed, so it keeps to a few greys.
const INK = '#000';
const MUTED = '#57534e';
const RULE_STRONG = '#44403c';
const RULE = '#a8a29e';
const RULE_FAINT = '#d6d3d1';
const ZEBRA = '#f5f5f4';

const NAME_SIZE = 10;
const MIN_NAME_SIZE = 7;
const SMALL_SIZE = 7.5;
const TABLE_COLUMN = 30;
const NUMBER_COLUMN = 22;
const CELL_MIN = 16;
const CELL_MAX = 34;
/** The grid's own note column needs at least this much to be worth drawing. */
const GRID_NOTES_MIN = 48;
const BADGE_ROOM = 90;

export type NoteListInput = {
  /** The whole class: badges name partners, and labels keep names apart. */
  students: Student[];
  entries: NoteListEntry[];
  settings: NoteListSettings;
  title: string;
  /** Printed under the title, as on the other sheets. */
  classMetadata?: ExportClassInfo;
  nameDisplay?: NameDisplayMode;
  photoDataUrls?: ReadonlyMap<string, string>;
  hiddenBadgeFamilies?: readonly DataFamily[];
  /** Frame a photo in its gender's contour, as on the plan (default on). */
  showGenderColors?: boolean;
};

export type NoteListPlan = {
  page: ExportPageLayout;
  metadataLines: string[];
  headRow: number;
  rowHeight: number;
  pages: NoteListEntry[][];
};

/**
 * Lay the list out on A4: the frame every sheet shares, the height of a row
 * and how the rows fall onto pages. Every page carries the header and the
 * column heads again.
 */
export function planNoteList(input: NoteListInput): NoteListPlan {
  // The other sheets print the class only beside a label or notes; the list
  // names it alone too, unless it is the title already.
  const sharedLines = exportMetadataLines(input.classMetadata);
  const className = input.classMetadata?.name?.trim();
  const metadataLines =
    sharedLines.length === 0 && className && className !== input.title.trim()
      ? [className]
      : sharedLines;
  const page = getExportPageLayout({
    orientation: input.settings.orientation,
    metadataLineCount: metadataLines.length,
  });
  const headRow = NOTE_LIST_METRICS.headRow[input.settings.form];
  const available = page.area.height - headRow - NOTE_LIST_METRICS.footer;
  const rowHeight = noteListRowHeight(
    input.settings,
    input.entries.length,
    available,
  );
  return {
    page,
    metadataLines,
    headRow,
    rowHeight,
    pages: paginateNoteList(input.entries, rowHeight, available),
  };
}

const nameFor = (
  student: Student,
  mode: NameDisplayMode | undefined,
  labels: NameLabels,
) => getDisplayNameForMode(student.name, 'full', mode, labels);

type Props = NoteListInput & {
  plan: NoteListPlan;
  pageIndex: number;
};

/**
 * One page of the note list: number, name and — where switched on — photo
 * and badges, then the room to write: ruled lines, or a grid of empty columns
 * whose heads take a date or a topic. By table, a stronger rule and the
 * table's number mark where a table begins.
 */
export default function NoteListSheet({
  students,
  entries,
  settings,
  title,
  nameDisplay,
  photoDataUrls,
  hiddenBadgeFamilies,
  showGenderColors = true,
  plan,
  pageIndex,
}: Props) {
  const { t, i18n } = useTranslation('generator');
  const { page, metadataLines, headRow, rowHeight } = plan;
  const rows = plan.pages[pageIndex] ?? [];
  const pageCount = plan.pages.length;
  const { area } = page;
  const isGrid = settings.form === 'grid';
  const byTable = entries.some((entry) => entry.table !== undefined);
  const labels = buildNameLabels(
    students.map((student) => student.name),
    nameDisplay,
  );

  // Columns are measured over the whole list, so every page lines up.
  const photoSize = Math.min(18, rowHeight - 4);
  const showsPhotos =
    settings.showPhotos &&
    photoSize >= 8 &&
    entries.some(
      ({ student }) => student.hasPhoto && photoDataUrls?.has(student.id),
    );
  const badgeFilter = createHiddenFamiliesFilter(hiddenBadgeFamilies);
  const badgeFits = new Map<string, SeatBadgeFit>();
  if (settings.showBadges) {
    for (const { student } of entries) {
      const fit = fitSeatBadges(
        getSeatBadges(student, students, true, badgeFilter),
        {
          availableWidth: BADGE_ROOM,
          baseIconSize: 9,
          minIconSize: 5,
          horizontalPadding: 3,
          verticalPadding: 1.5,
          maxRows: 1,
          maxHeight: Math.min(14, rowHeight - 4),
        },
      );
      if (fit) badgeFits.set(student.id, fit);
    }
  }
  const badgeWidth = Math.max(
    0,
    ...[...badgeFits.values()].map((fit) => fit.layout.width),
  );

  const tableX = area.x;
  const numberX = tableX + (byTable ? TABLE_COLUMN : 0);
  const photoX = numberX + NUMBER_COLUMN + 4;
  const nameX = photoX + (showsPhotos ? photoSize + 6 : 0);
  const longestName = Math.max(
    0,
    ...entries.map(({ student }) =>
      measureNameWidth(nameFor(student, nameDisplay, labels), NAME_SIZE),
    ),
  );
  const nameWidth = Math.min(area.width * 0.32, Math.max(80, longestName + 8));
  const badgeX = nameX + nameWidth;
  const writeX = badgeX + (badgeWidth > 0 ? badgeWidth + 8 : 0);
  const right = area.x + area.width;
  const writeWidth = right - writeX;

  // The grid: equal narrow cells, then whatever is left as a note column.
  let cellWidth = 0;
  let gridNotesWidth = 0;
  if (isGrid) {
    cellWidth = Math.max(
      CELL_MIN,
      Math.min(CELL_MAX, (writeWidth - GRID_NOTES_MIN) / settings.columns),
    );
    gridNotesWidth = writeWidth - cellWidth * settings.columns;
    if (gridNotesWidth < GRID_NOTES_MIN) {
      cellWidth = writeWidth / settings.columns;
      gridNotesWidth = 0;
    }
  }
  const cellEdges = isGrid
    ? Array.from(
        { length: settings.columns + (gridNotesWidth > 0 ? 1 : 0) },
        (_, index) => writeX + index * cellWidth,
      )
    : [];

  const headTop = area.y;
  const bodyTop = headTop + headRow;
  const bodyBottom = bodyTop + rows.length * rowHeight;
  const headBaseline = bodyTop - 5;
  const currentDate = formatDate(new Date(), i18n.language);

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
        dateLabel={`${t('circle.date')}: ${currentDate}`}
        metadataLines={metadataLines}
      />

      {/* Column heads. The grid's stay empty for a date or a topic. */}
      <g fontSize={SMALL_SIZE} fontWeight="bold" fill={MUTED}>
        {byTable && (
          <text
            x={tableX + TABLE_COLUMN / 2}
            y={headBaseline}
            textAnchor="middle"
          >
            {t('export.noteList.columns.table')}
          </text>
        )}
        <text x={numberX + NUMBER_COLUMN} y={headBaseline} textAnchor="end">
          {t('export.noteList.columns.number')}
        </text>
        <text x={nameX} y={headBaseline}>
          {t('export.noteList.columns.name')}
        </text>
        {!isGrid && (
          <text x={writeX} y={headBaseline}>
            {t('export.noteList.columns.notes')}
          </text>
        )}
        {gridNotesWidth > 0 && (
          <text x={writeX + cellWidth * settings.columns + 4} y={headBaseline}>
            {t('export.noteList.columns.notes')}
          </text>
        )}
      </g>

      {rows.map((entry, index) => {
        const top = bodyTop + index * rowHeight;
        const { student } = entry;
        const name = nameFor(student, nameDisplay, labels);
        const measured = measureNameWidth(name, NAME_SIZE);
        const nameSize =
          measured > nameWidth - 8
            ? Math.max(MIN_NAME_SIZE, (NAME_SIZE * (nameWidth - 8)) / measured)
            : NAME_SIZE;
        // The text line: on ruled lines the name sits on the first of them,
        // in the grid it is centred in the row.
        const lineHeight = isGrid ? rowHeight : NOTE_LIST_METRICS.linePitch;
        const middle = top + lineHeight / 2;
        const baseline = isGrid ? middle + 3.5 : top + lineHeight - 6;
        const photoUrl =
          showsPhotos && student.hasPhoto
            ? photoDataUrls?.get(student.id)
            : undefined;
        const fit = badgeFits.get(student.id);
        const showTable =
          entry.table !== undefined && (entry.groupStart || index === 0);
        const clipId = `note-list-photo-${student.id}`;

        return (
          <g key={student.id}>
            {isGrid && index % 2 === 1 && (
              <rect
                x={area.x}
                y={top}
                width={area.width}
                height={rowHeight}
                fill={ZEBRA}
              />
            )}
            {showTable && (
              <text
                x={tableX + TABLE_COLUMN / 2}
                y={baseline}
                textAnchor="middle"
                fontSize={SMALL_SIZE + 0.5}
                fontWeight="bold"
                fill={MUTED}
              >
                {entry.table ?? '–'}
              </text>
            )}
            <text
              x={numberX + NUMBER_COLUMN}
              y={baseline}
              textAnchor="end"
              fontSize={SMALL_SIZE + 0.5}
              fill={MUTED}
            >
              {entry.number}
            </text>
            {photoUrl && (
              <>
                <defs>
                  <clipPath id={clipId}>
                    <circle
                      cx={photoX + photoSize / 2}
                      cy={middle}
                      r={photoSize / 2}
                    />
                  </clipPath>
                </defs>
                <image
                  href={photoUrl}
                  x={photoX}
                  y={middle - photoSize / 2}
                  width={photoSize}
                  height={photoSize}
                  preserveAspectRatio="xMidYMid slice"
                  clipPath={`url(#${clipId})`}
                />
                {/* The ring a seat's photo wears on the plan. */}
                <circle
                  cx={photoX + photoSize / 2}
                  cy={middle}
                  r={photoSize / 2}
                  fill="none"
                  stroke={
                    getStudentAppearance(
                      student,
                      false,
                      false,
                      false,
                      showGenderColors,
                    ).stroke
                  }
                  strokeWidth={1.25}
                />
              </>
            )}
            <text x={nameX} y={baseline} fontSize={nameSize} fill={INK}>
              {name}
            </text>
            {fit && (
              <SeatBadgePill
                fit={fit}
                studentId={student.id}
                isDark={false}
                x={badgeX}
                y={middle - fit.layout.height / 2}
              />
            )}
            {!isGrid &&
              Array.from({ length: settings.lines - 1 }, (_, line) => (
                <line
                  key={line}
                  x1={writeX}
                  x2={right}
                  y1={top + (line + 1) * NOTE_LIST_METRICS.linePitch}
                  y2={top + (line + 1) * NOTE_LIST_METRICS.linePitch}
                  stroke={RULE}
                  strokeWidth={0.5}
                />
              ))}
            {/* The row's own rule, under the name and the last line. */}
            <line
              x1={area.x}
              x2={right}
              y1={top + rowHeight}
              y2={top + rowHeight}
              stroke={isGrid ? RULE_FAINT : RULE}
              strokeWidth={0.5}
            />
          </g>
        );
      })}

      {/* Where a table begins, a stronger rule; the head's rule closes the
          column heads. Drawn last, so no row's fill covers them. */}
      {rows.map((entry, index) =>
        entry.groupStart && index > 0 ? (
          <line
            key={`group-${entry.student.id}`}
            x1={area.x}
            x2={right}
            y1={bodyTop + index * rowHeight}
            y2={bodyTop + index * rowHeight}
            stroke={RULE_STRONG}
            strokeWidth={0.9}
          />
        ) : null,
      )}
      {cellEdges.map((x) => (
        <line
          key={`cell-${x}`}
          x1={x}
          x2={x}
          y1={headTop}
          y2={bodyBottom}
          stroke={RULE}
          strokeWidth={0.5}
        />
      ))}
      {isGrid && (
        <>
          {/* Close the empty heads at the top, so they read as boxes. */}
          <line
            x1={writeX}
            x2={right}
            y1={headTop}
            y2={headTop}
            stroke={RULE}
            strokeWidth={0.5}
          />
          <line
            x1={right}
            x2={right}
            y1={headTop}
            y2={bodyBottom}
            stroke={RULE}
            strokeWidth={0.5}
          />
        </>
      )}
      <line
        x1={area.x}
        x2={right}
        y1={bodyTop}
        y2={bodyTop}
        stroke={RULE_STRONG}
        strokeWidth={0.9}
      />

      {pageCount > 1 && (
        <text
          x={right}
          y={area.y + area.height - 2}
          textAnchor="end"
          fontSize={SMALL_SIZE}
          fill={MUTED}
        >
          {t('export.noteList.pageOf', {
            page: pageIndex + 1,
            count: pageCount,
          })}
        </text>
      )}
    </svg>
  );
}

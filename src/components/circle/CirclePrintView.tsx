// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import type { CircleLayout } from '@/types/Circle';
import type { Student } from '@/types';
import type { DataFamily, NameDisplayMode } from '@/utils';
import { getDisplayNameForMode, formatDate, svgFontFamily } from '@/utils';
import {
  getStudentAppearance,
  type StudentBadge,
} from '@/utils/ui/studentAppearance';
import {
  createHiddenFamiliesFilter,
  fitSeatBadges,
  getSeatBadges,
} from '@/utils/ui/seatBadges';
import {
  fitNameInCircle,
  planNameFontSize,
  tokenNameMaxFontSize,
} from '@/utils/ui/seatLabelLayout';
import {
  fitPrintRing,
  PRINT_AVATAR_MAX_RADIUS,
} from '@/utils/ui/circlePrintLayout';
import SeatBadgePill from '@/components/scene/SeatBadgePill';
import SeatNameText from '@/components/scene/SeatNameText';
import {
  EXPORT_PAGE_MARGIN,
  ExportPageHeader,
  exportMetadataLines,
  getExportPageLayout,
  type ExportClassInfo,
} from '@/components/scene/ExportPageFrame';
import { computeTokenPhotoLayout } from '@/utils/ui/studentTokenLayout';
import { buildLegendLayout } from '@/utils/ui/classBadgeLegend';
import { summarizeCircle } from '@/utils/algorithm/circleSummary';
import ExportLegend from '@/components/scene/ExportLegend';
import { useNameLabels } from '@/hooks/student/useNameLabels';

type ClassMetadataInfo = ExportClassInfo;

interface CirclePrintViewProps {
  layout: CircleLayout;
  title?: string;
  classMetadata?: ClassMetadataInfo;
  showSpecialNeeds?: boolean;
  showConnections?: boolean;
  orientation?: 'landscape' | 'portrait';
  /** Uniform name rule for the seat labels (see {@link NameDisplayMode}). */
  nameDisplay?: NameDisplayMode;
  /** Pre-resolved studentId -> Data URL map for rendering photos in the export. */
  photoDataUrls?: ReadonlyMap<string, string>;
  /** 'off' hides student photos in the export; 'all' shows them (default). */
  photoDisplayMode?: 'all' | 'off';
  /** When true, append a legend (badge icons + gender colours) in the footer. */
  showLegend?: boolean;
  /** Tint the occupied places by gender (decision 0020); off, they are paper. */
  showGenderColors?: boolean;
  /** Badge families the sheet leaves out, on the tokens and in the legend. */
  hiddenBadgeFamilies?: readonly DataFamily[];
}

const CONNECTION_STROKE = '#16a34a';

/**
 * Optimized circle view for PDF export
 */
export default function CirclePrintView({
  layout,
  title,
  classMetadata,
  showSpecialNeeds = true,
  showConnections = true,
  orientation = 'portrait',
  nameDisplay,
  photoDataUrls,
  photoDisplayMode = 'all',
  showLegend = false,
  showGenderColors = true,
  hiddenBadgeFamilies,
}: CirclePrintViewProps) {
  const badgeFilter = createHiddenFamiliesFilter(hiddenBadgeFamilies);
  const { t, i18n } = useTranslation('generator');
  const nameLabels = useNameLabels(
    layout.students
      .map((entry) => entry?.student)
      .filter((student): student is Student => Boolean(student)),
    nameDisplay,
  );

  const isPortrait = orientation === 'portrait';
  const metadataLines = exportMetadataLines(classMetadata);

  // Optional legend (badge icons + gender colours) as an un-rotated footer band.
  const legendStudents = layout.students
    .map((sp) => sp.student)
    .filter((s): s is Student => s !== null);
  const legendFontSize = isPortrait ? 7 : 10;
  const legendIconSize = isPortrait ? 10 : 13;
  const pageWidth = isPortrait ? 595 : 842;
  const legendLayout =
    showLegend && legendStudents.length > 0
      ? buildLegendLayout({
          students: legendStudents,
          width: pageWidth - EXPORT_PAGE_MARGIN * 2,
          fontSize: legendFontSize,
          iconSize: legendIconSize,
          showSpecialNeeds,
          badgeFilter,
          showGenderColors,
          genderLabels: {
            girl: t('legend.genderGirl'),
            boy: t('legend.genderBoy'),
            diverse: t('legend.genderDiverse'),
            neutral: t('legend.genderNeutral'),
          },
        })
      : null;
  const page = getExportPageLayout({
    orientation,
    metadataLineCount: metadataLines.length,
    legendHeight: legendLayout?.height ?? 0,
  });

  // The ring with its places and their photos fills the area the page leaves;
  // a place is as large as the gap to its neighbours allows. Portrait turns
  // the oval a quarter.
  const showsPhotos =
    photoDisplayMode !== 'off' &&
    legendStudents.some(
      (student) => student.hasPhoto && photoDataUrls?.has(student.id),
    );
  const ring = fitPrintRing({
    placements: layout.students.flatMap((studentPosition) =>
      studentPosition?.student?.id && typeof studentPosition.angle === 'number'
        ? [{ id: studentPosition.student.id, angle: studentPosition.angle }]
        : [],
    ),
    radius: layout.radius ?? { horizontal: 0, vertical: 0 },
    area: page.area,
    portrait: isPortrait,
    withPhotos: showsPhotos,
  });
  const { centerX, centerY, tokenRadius: seatRadius } = ring;
  const seatDiameter = seatRadius * 2;
  const studentCoordinates = ring.positions;

  const currentDate = formatDate(new Date(), i18n.language);
  const displayTitle = title || t('mode.circle', 'Sitzkreis');

  const badgeMinNameSpacing = 4;
  const badgeMinBottomSpacing = 4;
  // Allow 4px more vertical space so 3 rows fit even in small circles.
  const badgeMaxHeightValue = seatRadius - 4;
  const badgeMaxHeight =
    badgeMaxHeightValue > 0 ? badgeMaxHeightValue : undefined;
  const computeBadgeOffset = (radius: number, height: number) => {
    const rawOffset = radius - height - 6;
    const maxAllowedOffset = Math.max(
      badgeMinNameSpacing,
      radius - height - badgeMinBottomSpacing,
    );
    const desiredOffset = Math.max(rawOffset, badgeMinNameSpacing);
    return Math.min(desiredOffset, maxAllowedOffset);
  };
  // Paper cannot be hovered: every badge is printed, as small as it takes,
  // rather than folded into a "+N".
  const fitTokenBadges = (flags: StudentBadge[]) =>
    fitSeatBadges(flags, {
      availableWidth: seatDiameter - 14,
      baseIconSize: Math.min(12, Math.max(8, seatRadius * 0.3)),
      minIconSize: 4,
      horizontalPadding: 4,
      verticalPadding: 1,
      rowGap: 2,
      maxRows: 3,
      maxHeight: badgeMaxHeight,
      minIconsForWrap: 5,
    });
  // Where a place's name may stand: above its badges.
  const nameBandFor = (badgeFit: ReturnType<typeof fitTokenBadges>) => ({
    radius: seatRadius,
    top: -seatRadius + 3,
    bottom:
      badgeFit && badgeFit.layout.height > 0
        ? computeBadgeOffset(seatRadius, badgeFit.layout.height) - 2
        : seatRadius - 3,
  });
  const printName = (student: Student) =>
    getDisplayNameForMode(student.name, 'pdf', nameDisplay, nameLabels);
  const badgesOf = (student: Student) =>
    getSeatBadges(student, legendStudents, showSpecialNeeds, badgeFilter);
  const tokenNameMax = tokenNameMaxFontSize(seatRadius);
  // One name size for the whole circle; only a conspicuously long name
  // shrinks on its own place.
  const circleNameFontSize = planNameFontSize(
    legendStudents.map(
      (student) =>
        fitNameInCircle(
          printName(student),
          nameBandFor(fitTokenBadges(badgesOf(student))),
          { maxFont: tokenNameMax, split: nameDisplay === 'full' },
        ).fontSize,
    ),
  );

  // Optimized spacing for better readability, especially in portrait
  const connectionStrokeWidth = Math.max(1.2, Math.min(2.2, 1.5 * ring.scale));
  const arcDistance = Math.max(24, 40 * ring.scale);

  // Helper to get student appearance for PDF export (light mode only)
  const getStudentColors = (student: Student) => {
    // PDF always uses light mode; the legend explains the gender tint.
    const appearance = getStudentAppearance(
      student,
      false,
      false,
      false,
      showGenderColors,
    );
    return {
      fill: appearance.fill,
      stroke: appearance.stroke,
    };
  };

  const createArcPath = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    centerXValue: number,
    centerYValue: number,
  ) => {
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const directionX = midX - centerXValue;
    const directionY = midY - centerYValue;
    const length =
      Math.sqrt(directionX * directionX + directionY * directionY) || 1;
    const normalizedX = directionX / length;
    const normalizedY = directionY / length;
    const controlX = midX + normalizedX * arcDistance;
    const controlY = midY + normalizedY * arcDistance;
    return `M ${x1} ${y1} Q ${controlX} ${controlY} ${x2} ${y2}`;
  };

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
      <ExportPageHeader
        layout={page}
        title={displayTitle}
        dateLabel={`${t('circle.date', 'Datum')}: ${currentDate}`}
        metadataLines={metadataLines}
      />

      {/* Table neighbours still side by side. Read off the current order:
          the neighbour lists stored on each position describe the order the
          circle was built in, and a drag leaves them behind. */}
      {showConnections &&
        summarizeCircle(layout).tableNeighbors.kept.map(
          ([firstId, secondId]) => {
            const start = studentCoordinates.get(firstId);
            const end = studentCoordinates.get(secondId);
            if (!start || !end) return null;

            const path = createArcPath(
              start.x,
              start.y,
              end.x,
              end.y,
              centerX,
              centerY,
            );

            return (
              <path
                key={`${firstId}-${secondId}`}
                d={path}
                fill="none"
                stroke={CONNECTION_STROKE}
                strokeWidth={connectionStrokeWidth}
                opacity="0.35"
                strokeLinecap="round"
              />
            );
          },
        )}

      {/* Students */}
      {layout.students.map((studentPosition) => {
        // Additional validation for student rendering
        if (!studentPosition?.student?.id) {
          return null;
        }

        const coordinates = studentCoordinates.get(studentPosition.student.id);
        if (!coordinates) {
          return null;
        }

        const { x, y } = coordinates;
        const student = studentPosition.student;
        const displayName = printName(student);
        const colors = getStudentColors(student);
        const badgeFit = fitTokenBadges(badgesOf(student));
        const badgeOffset =
          badgeFit && badgeFit.layout.height > 0
            ? computeBadgeOffset(seatRadius, badgeFit.layout.height)
            : 0;
        const nameFit = fitNameInCircle(displayName, nameBandFor(badgeFit), {
          maxFont: Math.min(tokenNameMax, circleNameFontSize ?? Infinity),
          split: nameDisplay === 'full',
        });

        const photoUrl =
          photoDisplayMode !== 'off' && student.hasPhoto
            ? photoDataUrls?.get(student.id)
            : undefined;
        // Small circular avatar docked radially just outside the token, away
        // from the circle centre — matches the live circle and keeps the photo
        // visible even in the smaller print circles.
        const { avatar: photoAvatar } = computeTokenPhotoLayout({
          shape: 'circle',
          centerX: x,
          centerY: y,
          width: seatDiameter,
          height: seatDiameter,
          hasPhoto: Boolean(photoUrl),
          nameFontSize: nameFit.fontSize,
          outward: {
            dirX: x - centerX,
            dirY: y - centerY,
            tokenRadius: seatRadius,
            maxRadius: PRINT_AVATAR_MAX_RADIUS,
          },
        });
        const photoClipId = `circle-print-photo-${student.id}`;

        // Uniform text alignment - all names horizontal like header elements
        return (
          <g key={student.id}>
            <circle
              cx={x}
              cy={y}
              r={seatRadius}
              fill={colors.fill}
              stroke={colors.stroke}
              strokeWidth="1.0"
            />

            {photoUrl && photoAvatar && (
              <g>
                <defs>
                  <clipPath id={photoClipId}>
                    <circle
                      cx={photoAvatar.cx}
                      cy={photoAvatar.cy}
                      r={photoAvatar.r}
                    />
                  </clipPath>
                </defs>
                <image
                  href={photoUrl}
                  x={photoAvatar.cx - photoAvatar.r}
                  y={photoAvatar.cy - photoAvatar.r}
                  width={photoAvatar.r * 2}
                  height={photoAvatar.r * 2}
                  preserveAspectRatio="xMidYMid slice"
                  clipPath={`url(#${photoClipId})`}
                />
                <circle
                  cx={photoAvatar.cx}
                  cy={photoAvatar.cy}
                  r={photoAvatar.r}
                  fill="none"
                  stroke={colors.stroke}
                  strokeWidth="1.0"
                />
              </g>
            )}

            <SeatNameText
              x={x}
              y={y}
              fit={nameFit}
              title={displayName}
              fontWeight={400}
              fill="#0f172a"
              style={{ userSelect: 'none' }}
            />

            {badgeFit && (
              <SeatBadgePill
                fit={badgeFit}
                studentId={student.id}
                // An export is always printed light.
                isDark={false}
                x={x - badgeFit.layout.width / 2}
                y={y + badgeOffset}
              />
            )}
          </g>
        );
      })}

      {legendLayout && legendLayout.height > 0 && (
        <ExportLegend
          layout={legendLayout}
          x={page.margin}
          y={page.legendY}
          title={t('legend.title', 'Legende')}
          fontSize={legendFontSize}
          iconSize={legendIconSize}
        />
      )}
    </svg>
  );
}

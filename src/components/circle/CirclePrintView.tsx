// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import type { CircleLayout } from '@/types/Circle';
import type { Student } from '@/types';
import type { NameDisplayMode } from '@/utils';
import {
  CLASSROOM_WIDTH,
  CLASSROOM_HEIGHT,
  getDisplayNameForMode,
  calculateSeatLabelFontSize,
  formatDate,
} from '@/utils';
import {
  getStudentAppearance,
  getAllStudentBadges,
  calculateBadgePillLayout,
} from '@/utils/ui/studentAppearance';
import { computeTokenPhotoLayout } from '@/utils/ui/studentTokenLayout';
import { buildLegendLayout } from '@/utils/ui/classBadgeLegend';
import ExportLegend from '@/components/scene/ExportLegend';

interface ClassMetadataInfo {
  name?: string | null;
  label?: string | null;
  notes?: string | null;
}

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
}: CirclePrintViewProps) {
  const { t, i18n } = useTranslation('generator');

  // Page dimensions - exact 72dpi A4 for PDF compatibility
  const isPortrait = orientation === 'portrait';
  const pageWidth = isPortrait ? 595 : 842;
  const pageHeight = isPortrait ? 842 : 595;
  const margin = isPortrait ? 40 : 70; // Sufficient margin for print boundaries
  const trimmedName = classMetadata?.name?.trim() || undefined;
  const trimmedLabel = classMetadata?.label?.trim() || undefined;
  const trimmedNotes = classMetadata?.notes?.trim() || undefined;
  const hasOptionalDetails = Boolean(trimmedLabel || trimmedNotes);
  const metadataLines: string[] = [];

  if (hasOptionalDetails) {
    const primaryLineParts: string[] = [];
    if (trimmedName) {
      primaryLineParts.push(trimmedName);
    }
    if (trimmedLabel) {
      primaryLineParts.push(trimmedLabel);
    }
    if (primaryLineParts.length > 0) {
      metadataLines.push(primaryLineParts.join(' • '));
    }
    if (trimmedNotes) {
      metadataLines.push(trimmedNotes);
    }
  }

  const baseHeaderHeight = isPortrait ? 20 : 60;
  const metadataGap = metadataLines.length > 0 ? (isPortrait ? 6 : 12) : 0;
  const metadataLineSpacing = isPortrait ? 8 : 14;
  const headerHeight =
    baseHeaderHeight + metadataGap + metadataLines.length * metadataLineSpacing;

  // Conditional oval rotation and sizing based on orientation
  const shouldRotateOval = orientation === 'portrait';
  const portraitRadiusReduction = 0.85; // 15% smaller in portrait for better spacing

  // Validate layout.radius values with fallbacks and portrait optimization
  const baseRadiusH =
    layout.radius?.horizontal > 0 ? layout.radius.horizontal : 200;
  const baseRadiusV =
    layout.radius?.vertical > 0 ? layout.radius.vertical : 150;

  const safeRadiusH = baseRadiusH * (isPortrait ? portraitRadiusReduction : 1);
  const safeRadiusV = baseRadiusV * (isPortrait ? portraitRadiusReduction : 1);

  // Debug logging temporarily disabled to prevent render loops

  // Optional legend (badge icons + gender colours) as an un-rotated footer band.
  const legendStudents = layout.students
    .map((sp) => sp.student)
    .filter((s): s is Student => s !== null);
  const legendFontSize = isPortrait ? 7 : 10;
  const legendIconSize = isPortrait ? 10 : 13;
  const legendLayout =
    showLegend && legendStudents.length > 0
      ? buildLegendLayout({
          students: legendStudents,
          width: pageWidth - margin * 2,
          fontSize: legendFontSize,
          iconSize: legendIconSize,
          showSpecialNeeds,
          genderLabels: {
            girl: t('legend.genderGirl', 'Weiblich'),
            boy: t('legend.genderBoy', 'Männlich'),
            diverse: t('legend.genderDiverse', 'Divers'),
            neutral: t('legend.genderNeutral', 'Ohne Angabe'),
          },
        })
      : null;
  const legendGap = legendLayout && legendLayout.height > 0 ? 10 : 0;
  const legendBandHeight = legendLayout ? legendLayout.height : 0;

  // Use same frame calculation approach as SceneSvg with proper centering
  const availableHeight =
    pageHeight - margin * 2 - headerHeight - legendBandHeight - legendGap;
  const scale = Math.min(
    (pageWidth - margin * 2) / CLASSROOM_WIDTH,
    availableHeight / CLASSROOM_HEIGHT,
  );
  const offsetX = (pageWidth - CLASSROOM_WIDTH * scale) / 2;
  const offsetY =
    margin + headerHeight + (availableHeight - CLASSROOM_HEIGHT * scale) / 2;

  // Calculate circle dimensions within the scaled classroom frame
  const frameWidth = CLASSROOM_WIDTH * scale;
  const frameHeight = CLASSROOM_HEIGHT * scale;

  // Scale circle to fit within the classroom frame with safety checks
  const circleScaleH =
    frameWidth > 0 && safeRadiusH > 0 ? frameWidth / (safeRadiusH * 2) : 1;
  const circleScaleV =
    frameHeight > 0 && safeRadiusV > 0 ? frameHeight / (safeRadiusV * 2) : 1;
  const circleScale = Math.min(circleScaleH, circleScaleV);

  // Ensure circleScale is valid
  const safeCircleScale =
    circleScale > 0 && Number.isFinite(circleScale) ? circleScale : 1;

  const scaledRadiusH = safeRadiusH * safeCircleScale;
  const scaledRadiusV = safeRadiusV * safeCircleScale;
  const centerX = offsetX + frameWidth / 2;
  const centerY = offsetY + frameHeight / 2;

  // Calculations completed

  const currentDate = formatDate(new Date(), i18n.language);
  const displayTitle = title || t('mode.circle', 'Sitzkreis');
  const headerTitleY = isPortrait ? margin + 6 : 60;
  const headerGroupY = isPortrait ? headerTitleY - 6 : 47;
  const headerLogoX = isPortrait ? margin : 70;
  const headerTitleX = isPortrait
    ? margin + (pageWidth - margin * 2) / 2
    : pageWidth / 2;
  const headerDateX = isPortrait ? pageWidth - margin : pageWidth - 115;
  const headerDateAnchor = isPortrait ? 'end' : 'middle';
  const metadataStartY = headerTitleY + (isPortrait ? 8 : 20);
  const metadataFontSize = isPortrait ? 6 : 12;

  // Dynamic sizing based on student count to prevent overlapping
  const studentCount = layout.students.length;

  // Dynamic circle radius - smaller for larger classes
  const baseSeatRadius = isPortrait ? 28 : 30;
  const seatRadius = Math.max(
    16,
    baseSeatRadius - Math.floor(studentCount / 3),
  );
  const seatDiameter = seatRadius * 2;
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

  // Calculate minimum required spacing between circles
  const minCircleDistance = seatRadius * 2.2; // 20% spacing buffer
  const requiredCircumference = studentCount * minCircleDistance;

  // CheckIcon if current oval size can accommodate all students without overlap
  const currentCircumference =
    2 *
    Math.PI *
    Math.sqrt((Math.pow(scaledRadiusH, 2) + Math.pow(scaledRadiusV, 2)) / 2);
  const needsOvalExpansion = currentCircumference < requiredCircumference;

  // Expand oval if needed (up to 30% larger)
  const expansionFactor = needsOvalExpansion
    ? Math.min(1.3, requiredCircumference / currentCircumference)
    : 1;

  const finalRadiusH = scaledRadiusH * expansionFactor;
  const finalRadiusV = scaledRadiusV * expansionFactor;

  // Optimized spacing for better readability, especially in portrait
  const connectionStrokeWidth = Math.max(
    1.2,
    Math.min(2.2, 1.5 * safeCircleScale),
  );
  const arcDistance = Math.max(24, 40 * safeCircleScale);

  const studentIndexMap = new Map<string, number>();
  const studentCoordinates = new Map<string, { x: number; y: number }>();

  layout.students.forEach((studentPosition, index) => {
    // Validate student position data
    if (
      !studentPosition?.student?.id ||
      typeof studentPosition.angle !== 'number'
    ) {
      return;
    }

    // Single-ring positioning for all student counts
    const angle = (studentPosition.angle * Math.PI) / 180;

    // Calculate base oval coordinates using expanded radii
    const baseX = Math.cos(angle) * finalRadiusH;
    const baseY = Math.sin(angle) * finalRadiusV;

    // Apply rotation only in portrait mode: (x,y) → (-y,x) for oval rotation
    const rotatedX = shouldRotateOval ? -baseY : baseX; // Rotate only in portrait
    const rotatedY = shouldRotateOval ? baseX : baseY; // Rotate only in portrait

    const x = centerX + rotatedX;
    const y = centerY + rotatedY;

    // Validate calculated coordinates
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return;
    }

    studentIndexMap.set(studentPosition.student.id, index);
    studentCoordinates.set(studentPosition.student.id, { x, y });
  });

  // Helper to get student appearance for PDF export (light mode only)
  const getStudentColors = (student: Student) => {
    const appearance = getStudentAppearance(student, false); // PDF always uses light mode
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
      viewBox={`0 0 ${pageWidth} ${pageHeight}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block' }}
      fontFamily="'DM Sans Variable', system-ui, sans-serif"
    >
      {/* Header - Logo and Branding - responsive sizing for portrait mode */}
      <g
        transform={
          isPortrait
            ? `translate(${headerLogoX} ${headerGroupY})`
            : 'translate(70 47)'
        }
      >
        <g transform={`scale(${(isPortrait ? 8 : 16) / 240})`}>
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
        <text
          x={isPortrait ? 12 : 20}
          y={isPortrait ? 7 : 14}
          fontSize={isPortrait ? 8 : 16}
          fontWeight="bold"
          fill="#2563EB"
          fontFamily="'DM Sans Variable', system-ui, sans-serif"
        >
          Klassenplan.de
        </text>
      </g>

      {/* Title */}
      <text
        x={headerTitleX}
        y={headerTitleY}
        textAnchor="middle"
        fontSize={isPortrait ? 10 : 20}
        fontWeight="bold"
        fill="#000"
      >
        {displayTitle}
      </text>

      {/* Date */}
      <text
        x={headerDateX}
        y={headerTitleY}
        textAnchor={headerDateAnchor}
        fontSize={isPortrait ? 6 : 12}
        fill="#000"
      >
        {`${t('circle.date', 'Datum')}: ${currentDate}`}
      </text>
      {metadataLines.length > 0 &&
        metadataLines.map((line, index) => (
          <text
            key={`metadata-${index}`}
            x={headerTitleX}
            y={metadataStartY + index * metadataLineSpacing}
            textAnchor="middle"
            fontSize={metadataFontSize}
            fontWeight="500"
            fill="#475569"
          >
            {line}
          </text>
        ))}

      {/* Preserved neighborhood connections */}
      {showConnections &&
        layout.students.map((studentPosition) => {
          const start = studentCoordinates.get(studentPosition.student.id);
          if (!start) return null;

          return studentPosition.preservedNeighbors.map((neighborId) => {
            const neighborIndex = studentIndexMap.get(neighborId);
            const startIndex = studentIndexMap.get(studentPosition.student.id);
            if (
              neighborIndex === undefined ||
              startIndex === undefined ||
              startIndex >= neighborIndex
            ) {
              return null;
            }

            const end = studentCoordinates.get(neighborId);
            if (!end) return null;

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
                key={`${studentPosition.student.id}-${neighborId}`}
                d={path}
                fill="none"
                stroke={CONNECTION_STROKE}
                strokeWidth={connectionStrokeWidth}
                opacity="0.35"
                strokeLinecap="round"
              />
            );
          });
        })}

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
        const displayName = getDisplayNameForMode(
          student.name,
          'pdf',
          nameDisplay,
        );
        const seatFontSize = calculateSeatLabelFontSize(
          displayName,
          seatDiameter,
        );
        const allStudents = layout.students
          .map((sp) => sp.student)
          .filter((s): s is Student => s !== null);
        const flags = getAllStudentBadges(student, allStudents, {
          showSpecialNeeds,
          showPartners: showSpecialNeeds,
          showHeight: showSpecialNeeds,
          showEnvironment: showSpecialNeeds,
        });
        const colors = getStudentColors(student);
        const badgeLayout =
          flags.length > 0
            ? calculateBadgePillLayout({
                availableWidth: seatDiameter - 14,
                iconCount: flags.length,
                baseIconSize: seatRadius >= 26 ? 9 : 8,
                minIconSize: 4,
                horizontalPadding: 4,
                verticalPadding: 1,
                rowGap: 2,
                maxRows: 3,
                maxHeight: badgeMaxHeight,
                minIconsForWrap: 5,
              })
            : null;
        const badgeOffset =
          badgeLayout && badgeLayout.height > 0
            ? computeBadgeOffset(seatRadius, badgeLayout.height)
            : 0;

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
          nameFontSize: seatFontSize,
          outward: {
            dirX: x - centerX,
            dirY: y - centerY,
            tokenRadius: seatRadius,
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

            <text
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={seatFontSize}
              fontWeight="400"
              fill="#0f172a"
              style={{ userSelect: 'none' }}
            >
              <title>{displayName}</title>
              {displayName}
            </text>

            {flags.length > 0 && badgeLayout && (
              <g>
                <g
                  transform={`translate(${x - badgeLayout.width / 2} ${y + badgeOffset})`}
                >
                  <rect
                    width={badgeLayout.width}
                    height={badgeLayout.height}
                    rx={badgeLayout.height / 2}
                    fill="#f8fafc"
                    stroke="rgba(148, 163, 184, 0.6)"
                    strokeWidth={0.8}
                  />
                  {flags.map((flag, index) => {
                    const Icon = flag.icon;
                    const color = 'color' in flag ? flag.color : '#d97706';
                    const position = badgeLayout.iconPositions[index];
                    if (!position) {
                      return null;
                    }
                    return (
                      <g
                        key={flag.key}
                        transform={`translate(${position.x} ${position.y})`}
                      >
                        <Icon size={badgeLayout.iconSize} color={color}>
                          <title>{flag.tooltip}</title>
                        </Icon>
                      </g>
                    );
                  })}
                </g>
              </g>
            )}
          </g>
        );
      })}

      {legendLayout && legendLayout.height > 0 && (
        <ExportLegend
          layout={legendLayout}
          x={isPortrait ? margin : 70}
          y={pageHeight - margin - legendBandHeight}
          title={t('legend.title', 'Legende')}
          fontSize={legendFontSize}
          iconSize={legendIconSize}
        />
      )}
    </svg>
  );
}

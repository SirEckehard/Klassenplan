// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ClassroomScene, SeatingArrangement, Student } from '@/types';
import TableIcon from './SceneTable';
import FeatureShape from './FeatureShape';
import {
  CLASSROOM_WIDTH,
  CLASSROOM_HEIGHT,
  formatDate,
  getDisplayNameForMode,
  svgFontFamily,
} from '@/utils';
import type { DataFamily, NameDisplayMode } from '@/utils';
import { getFeatureStyles } from '@/utils/ui';
import {
  createHiddenFamiliesFilter,
  type SeatBadgeView,
} from '@/utils/ui/seatBadges';
import type { FeatureVisibilityFlags } from '@/utils/ui';
import { buildLegendLayout } from '@/utils/ui/classBadgeLegend';
import {
  featuresForTableFrame,
  frameContentBounds,
  turnBox,
  type FrameBox,
} from '@/utils/ui/presentationFrame';
import { computePlanNameFontSize } from '@/utils/ui/planNameSize';
import { computePhotoCircles } from '@/utils/math/photoOverlap';
import ExportLegend from '@/components/scene/ExportLegend';
import {
  EXPORT_PAGE_MARGIN,
  ExportPageHeader,
  exportMetadataLines,
  getExportPageLayout,
  type ExportClassInfo,
} from '@/components/scene/ExportPageFrame';
import { useNameLabels } from '@/hooks/student/useNameLabels';

type ClassMetadataInfo = ExportClassInfo;

/** Room around what is drawn, for the chair dots outside the table edges. */
const FRAME_PADDING = 12;
/** A photo's halo ring around its circle. */
const PHOTO_HALO = 3;
/**
 * The largest scale a plan is drawn at: two tables framed on their own would
 * otherwise fill the page with seats a hand wide.
 */
const MAX_SCALE = 1.8;
const ROOM_BOX: FrameBox = {
  minX: 0,
  minY: 0,
  maxX: CLASSROOM_WIDTH,
  maxY: CLASSROOM_HEIGHT,
};

type SceneSvgProps = {
  scene: ClassroomScene;
  seating: SeatingArrangement;
  allStudents?: Student[];
  /** Pre-resolved studentId -> Data URL map for rendering photos in the export. */
  photoUrls?: ReadonlyMap<string, string>;
  title?: string;
  classMetadata?: ClassMetadataInfo;
  showSpecialNeeds?: boolean;
  featureVisibility?: FeatureVisibilityFlags;
  lockSeatLabelOrientation?: boolean;
  seatLabelRotation?: number;
  orientation?: 'landscape' | 'portrait';
  /**
   * Rotates the classroom a further 180° while seat labels, photos and badges
   * counter-rotate and stay upright. For plans read from the opposite side of
   * the room (e.g. a teacher's desk at the back), so the sheet can be laid down
   * in the real viewing direction without turning the page — and its header.
   */
  flipped?: boolean;
  /** Uniform name rule for the seat labels (see {@link NameDisplayMode}). */
  nameDisplay?: NameDisplayMode;
  /** Photo display on the seat dots for the export: 'all' shows them, 'off' hides. */
  photoDisplayMode?: 'all' | 'off';
  /** When true, append a legend (badge icons + gender colours) in the footer. */
  showLegend?: boolean;
  /** Badge families the sheet leaves out, on the seats and in the legend. */
  hiddenBadgeFamilies?: readonly DataFamily[];
  /**
   * Frame the sheet on the tables (the default): the board, the windows and
   * the door move up to them, furniture far from them is left out and the
   * room's outline is not drawn — as on the projection. Off, the whole room
   * is drawn with its outline and everything where it stands.
   */
  frameOnTables?: boolean;
};

export default function SceneSvg({
  scene,
  seating,
  allStudents = [],
  photoUrls,
  title,
  classMetadata,
  showSpecialNeeds = true,
  featureVisibility,
  lockSeatLabelOrientation = true,
  seatLabelRotation = 0,
  orientation = 'portrait',
  flipped = false,
  nameDisplay,
  photoDisplayMode = 'all',
  showLegend = false,
  hiddenBadgeFamilies,
  frameOnTables = true,
}: SceneSvgProps) {
  // Keyed on the families rather than the array, which a caller may rebuild
  // on every render.
  const hiddenFamiliesKey = (hiddenBadgeFamilies ?? []).join(',');
  const badgeView = React.useMemo<SeatBadgeView>(
    () => ({
      filter: createHiddenFamiliesFilter(
        hiddenFamiliesKey
          ? (hiddenFamiliesKey.split(',') as DataFamily[])
          : undefined,
      ),
    }),
    [hiddenFamiliesKey],
  );
  const { t, i18n } = useTranslation('generator');
  const nameLabels = useNameLabels(allStudents, nameDisplay);

  const isPortrait = orientation === 'portrait';
  const metadataLines = exportMetadataLines(classMetadata);

  // Optional legend (badge icons + gender colours) drawn as an un-rotated footer
  // band. Computed first so its height can be reserved below the plan.
  const legendFontSize = isPortrait ? 7 : 10;
  const legendIconSize = isPortrait ? 10 : 13;
  const pageWidth = isPortrait ? 595 : 842;
  const legendLayout =
    showLegend && allStudents.length > 0
      ? buildLegendLayout({
          students: allStudents,
          width: pageWidth - EXPORT_PAGE_MARGIN * 2,
          fontSize: legendFontSize,
          iconSize: legendIconSize,
          showSpecialNeeds,
          badgeFilter: badgeView.filter,
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

  // Portrait turns the classroom +90° (Tafel nach unten); the flip adds a
  // further 180°. Seat labels, photos and icons counter-rotate and stay
  // upright.
  const classroomRotation = ((isPortrait ? 90 : 0) + (flipped ? 180 : 0)) % 360;

  const visibleFeatures = React.useMemo(
    () =>
      (scene.features ?? []).filter(
        (feature) =>
          getFeatureStyles(feature, false, featureVisibility).shouldRender,
      ),
    [scene.features, featureVisibility],
  );
  // Framed on the tables, the board, the windows and the door come in from
  // their walls to just beside them, as on the projection.
  const drawnFeatures = React.useMemo(
    () =>
      frameOnTables
        ? featuresForTableFrame(scene.tables, visibleFeatures)
        : visibleFeatures,
    [frameOnTables, scene.tables, visibleFeatures],
  );
  const featureViewModels = React.useMemo(
    () =>
      drawnFeatures.map((feature) => ({
        feature,
        styles: getFeatureStyles(feature, false, featureVisibility),
      })),
    [drawnFeatures, featureVisibility],
  );

  // The photos docked outside the seats, where a student has one: they reach
  // past the tables and, at a wall, past the room.
  const photoBoxes = React.useMemo<FrameBox[]>(() => {
    if (photoDisplayMode === 'off' || !photoUrls || photoUrls.size === 0) {
      return [];
    }
    return computePhotoCircles(scene.tables)
      .filter((circle) => {
        const student = seating[circle.tableIndex]?.[circle.seatIndex];
        return Boolean(student && photoUrls.has(student.id));
      })
      .map((circle) => {
        const reach = circle.radius + PHOTO_HALO;
        return {
          minX: circle.x - reach,
          minY: circle.y - reach,
          maxX: circle.x + reach,
          maxY: circle.y + reach,
        };
      });
  }, [photoDisplayMode, photoUrls, scene.tables, seating]);

  // What the page frames, in scene units.
  const content = React.useMemo<FrameBox>(() => {
    const drawn = frameOnTables
      ? frameContentBounds(scene.tables, drawnFeatures, photoBoxes)
      : frameContentBounds([], [], [ROOM_BOX, ...photoBoxes]);
    const box = drawn ?? ROOM_BOX;
    const padding = frameOnTables ? FRAME_PADDING : 1;
    return {
      minX: box.minX - padding,
      minY: box.minY - padding,
      maxX: box.maxX + padding,
      maxY: box.maxY + padding,
    };
  }, [frameOnTables, scene.tables, drawnFeatures, photoBoxes]);

  // The framed content turned with the room, scaled into the plan area and
  // centred in it.
  const turned = turnBox(content, classroomRotation, {
    x: (content.minX + content.maxX) / 2,
    y: (content.minY + content.maxY) / 2,
  });
  const scale = Math.min(
    page.area.width / (turned.maxX - turned.minX),
    page.area.height / (turned.maxY - turned.minY),
    MAX_SCALE,
  );
  const classroomTransform =
    `translate(${page.area.x + page.area.width / 2} ${page.area.y + page.area.height / 2}) ` +
    `rotate(${classroomRotation}) scale(${scale}) ` +
    `translate(${-(content.minX + content.maxX) / 2} ${-(content.minY + content.maxY) / 2})`;

  const labelRotation = seatLabelRotation - classroomRotation;
  // One name size for the whole sheet; only a conspicuously long name
  // shrinks on its own seat.
  const nameFontSize = React.useMemo(
    () =>
      computePlanNameFontSize({
        tables: scene.tables,
        seating,
        labelFor: (student: Student) =>
          getDisplayNameForMode(student.name, 'table', nameDisplay, nameLabels),
        allStudents,
        showSpecialNeeds,
        badgeView,
        keepLabelsUpright: lockSeatLabelOrientation,
        labelRotation,
        split: nameDisplay === 'full',
      }),
    [
      scene.tables,
      seating,
      nameDisplay,
      nameLabels,
      allStudents,
      showSpecialNeeds,
      badgeView,
      lockSeatLabelOrientation,
      labelRotation,
    ],
  );

  const currentDate = formatDate(new Date(), i18n.language);
  const displayTitle = title || t('mode.table', 'Sitzplan');

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
      viewBox={`0 0 ${page.pageWidth} ${page.pageHeight}`}
      preserveAspectRatio="xMidYMid meet"
      fontFamily={svgFontFamily}
      style={{ display: 'block' }}
      role="img"
      aria-label={displayTitle}
    >
      {/* Names the exported SVG for assistive tech and SVG viewers. */}
      <title>{displayTitle}</title>
      <ExportPageHeader
        layout={page}
        title={displayTitle}
        dateLabel={`${t('circle.date', 'Datum')}: ${currentDate}`}
        metadataLines={metadataLines}
      />
      <g transform={classroomTransform}>
        {!frameOnTables && (
          <rect
            width={CLASSROOM_WIDTH}
            height={CLASSROOM_HEIGHT}
            fill="none"
            stroke="#000"
          />
        )}
        {featureViewModels.map(({ feature, styles }) => (
          <FeatureShape
            key={feature.id}
            feature={feature}
            styles={styles}
            extraIconRotation={classroomRotation}
          />
        ))}
        {scene.tables.map((t, i) => (
          <TableIcon
            key={i}
            table={t}
            index={i}
            students={seating[i] || []}
            allStudents={allStudents}
            photoUrls={photoUrls}
            selected={false}
            editable={false}
            showSpecialNeeds={showSpecialNeeds}
            badgeView={badgeView}
            isDark={false}
            lockSeatLabelOrientation={lockSeatLabelOrientation}
            seatLabelRotation={labelRotation}
            nameDisplay={nameDisplay}
            nameLabels={nameLabels}
            nameFontSize={nameFontSize}
            photoDisplayMode={photoDisplayMode}
          />
        ))}
      </g>
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

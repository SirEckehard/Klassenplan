// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type { ClassroomScene, SeatingArrangement, Student } from '@/types';
import TableIcon from './SceneTable';
import FeatureShape from './FeatureShape';
import { useStudentPhotoUrls } from '@/hooks/student/useStudentPhoto';
import { useNameLabels } from '@/hooks/student/useNameLabels';
import {
  CLASSROOM_WIDTH,
  CLASSROOM_HEIGHT,
  getDisplayNameForMode,
  type NameDisplayMode,
  svgFontFamily,
} from '@/utils';
import { getBackdropFeatureStyles, getFeatureStyles } from '@/utils/ui';
import { getTableColors } from '@/utils/ui/tableAppearance';
import {
  featuresForTableFrame,
  frameContentBounds,
  turnBox,
} from '@/utils/ui/presentationFrame';
import { computePlanNameFontSize } from '@/utils/ui/planNameSize';
import { buildSpotlightLookup } from '@/utils/ui/statisticsHighlight';
import {
  getPresentationRotation,
  type PresentationPerspective,
} from '@/utils/ui/boardOrientation';
import BadgeTooltipLayer from '@/components/scene/BadgeTooltip';
import { useTapGesture } from '@/hooks/ui/useDragGesture';
import {
  occupiedSeatShapes,
  seatAtPoint,
  type SeatShape,
} from '@/utils/ui/presentationSeats';
import type { SeatBadgeView } from '@/utils/ui/seatBadges';
import PresentationSpotlight, {
  presentationGroupTransform,
  type SpotlightTarget,
} from '@/components/scene/PresentationSpotlight';

/**
 * On the wall the badges stay legible and give way to a "+N"; the teacher at
 * the board can point at it for the rest.
 */
const PRESENT_BADGE_VIEW: SeatBadgeView = { collapse: true };

/**
 * Read-only, chrome-free classroom render for the smartboard projection view.
 *
 * The whole scene is rotated so the board sits at the bottom (teacher) or top
 * (student); seat names counter-rotate via `seatLabelRotation` so they stay
 * upright in every orientation (same mechanism as the PDF export in SceneSvg).
 */
type PresentationSceneProps = {
  scene: ClassroomScene;
  seating: SeatingArrangement;
  students: Student[];
  perspective: PresentationPerspective;
  /** Teacher view only: show class/special-needs badges. */
  showBadges?: boolean;
  /** Teacher view only: show student photos. */
  showPhotos?: boolean;
  /**
   * When false, the plan goes colourless: the seats drop their gender tint
   * and the windows, doors, board and desk turn grey.
   */
  showColors?: boolean;
  /**
   * When false, room elements (board, windows, doors, furniture) are hidden.
   * Deliberately independent of the editor's per-type visibility flags
   * (`spg.featureVisibility`) — this is a presentation-only master switch.
   */
  showFeatures?: boolean;
  /** Uniform name rule for the seat labels (see {@link NameDisplayMode}). */
  nameDisplay?: NameDisplayMode;
  /** Scale factor for the whole scene (1 = fit-to-container). */
  zoom?: number;
  /** Pan offset in screen pixels, applied after the zoom scale. */
  panX?: number;
  panY?: number;
  isDark?: boolean;
  /** Seat to spotlight: lit, ringed, and the rest dimmed unless `spotlightDims` is false. */
  spotlight?: SpotlightTarget | null;
  /** Whether the spotlight darkens the rest of the classroom (the projection does). */
  spotlightDims?: boolean;
  /**
   * Contrast mode for a bright room: black on white whatever the theme, with
   * thicker contours and no photos, badges or room colours. A projector
   * flattens the warm neutrals the interface is built from.
   */
  contrast?: boolean;
  /**
   * The students missing today (decision 0045): their seats stay and are
   * veiled, so the room still reads as it is set.
   */
  absentIds?: ReadonlySet<string>;
  /** A tap on an occupied seat, telling apart a tap from a pan. */
  onSeatTap?: (studentId: string) => void;
};

/** Padding around the classroom so seat photos docking outside seats aren't clipped. */
const EDGE_PADDING = 48;

/** How far the seat of a student missing today fades into its table. */
const ABSENT_VEIL_OPACITY = 0.72;

const NO_SEATS: readonly SeatShape[] = [];

export default function PresentationScene({
  scene,
  seating,
  students,
  perspective,
  showBadges = false,
  showPhotos = true,
  showColors = true,
  showFeatures = true,
  nameDisplay,
  zoom = 1,
  panX = 0,
  panY = 0,
  isDark = false,
  spotlight = null,
  spotlightDims = true,
  contrast = false,
  absentIds,
  onSeatTap,
}: PresentationSceneProps) {
  // Contrast mode brings its own palette, so the theme stands down; what is
  // left of the plan is the seats, the names and the room's outline.
  const dark = contrast ? false : isDark;
  const colors = contrast ? false : showColors;
  const photoUrls = useStudentPhotoUrls(students);
  const nameLabels = useNameLabels(students, nameDisplay);

  const rotation = getPresentationRotation(scene, perspective);
  const isQuarterTurn = rotation === 90 || rotation === 270;

  // Bounding box of the rotated classroom (dimensions swap on a quarter turn).
  const boxWidth =
    (isQuarterTurn ? CLASSROOM_HEIGHT : CLASSROOM_WIDTH) + EDGE_PADDING * 2;
  const boxHeight =
    (isQuarterTurn ? CLASSROOM_WIDTH : CLASSROOM_HEIGHT) + EDGE_PADDING * 2;

  const frame = React.useMemo(
    () => ({ rotation, boxWidth, boxHeight }),
    [rotation, boxWidth, boxHeight],
  );
  const groupTransform = presentationGroupTransform(frame);

  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const groupRef = React.useRef<SVGGElement | null>(null);
  const seatShapes = React.useMemo(
    () => occupiedSeatShapes(scene, seating),
    [scene, seating],
  );
  const beginTap = useTapGesture();
  // The seat under the finger, found by where the press lands in the room's
  // own coordinates: the seats of the projection carry no targets of their
  // own, and a layer of them would take the hover from the badges.
  const handlePointerDown = onSeatTap
    ? (event: React.PointerEvent<SVGSVGElement>) => {
        const matrix = groupRef.current?.getScreenCTM?.();
        if (!matrix) return;
        const point = new DOMPoint(
          event.clientX,
          event.clientY,
        ).matrixTransform(matrix.inverse());
        const seat = seatAtPoint(seatShapes, point);
        if (seat) beginTap(event, () => onSeatTap(seat.studentId));
      }
    : undefined;
  const absentSeats = React.useMemo(
    () =>
      absentIds && absentIds.size > 0
        ? seatShapes.filter((shape) => absentIds.has(shape.studentId))
        : NO_SEATS,
    [absentIds, seatShapes],
  );
  // The veil is the table's own surface: the seat reads as nearly empty, and
  // nothing of the veil shows where it ends.
  const veilFill = getTableColors(dark, contrast).fill;
  const photoDisplayMode =
    perspective === 'teacher' && showPhotos && !contrast ? 'all' : 'off';
  const showSpecialNeeds = perspective === 'teacher' && showBadges && !contrast;

  const featureViewModels = React.useMemo(() => {
    if (!showFeatures) {
      return [];
    }
    const shown = (scene.features ?? [])
      .map((feature) => ({
        feature,
        // The room recedes behind the students as on the plan layer; the
        // contrast mode, made for a weak beamer, keeps the full contour.
        styles: contrast
          ? {
              ...getFeatureStyles(feature, dark, undefined, true),
              inkContour: true,
            }
          : getBackdropFeatureStyles(feature, dark, { neutralColors: !colors }),
      }))
      .filter(({ styles }) => styles.shouldRender);
    const stylesById = new Map(
      shown.map(({ feature, styles }) => [feature.id, styles]),
    );
    return featuresForTableFrame(
      scene.tables,
      shown.map(({ feature }) => feature),
    ).flatMap((feature) => {
      const styles = stylesById.get(feature.id);
      return styles ? [{ feature, styles }] : [];
    });
  }, [scene.features, scene.tables, dark, showFeatures, colors, contrast]);

  // The drawn content, mapped through the same rotation the classroom group
  // gets, becomes the visible area. Without content (an empty room) the whole
  // room is framed as before.
  const viewBox = React.useMemo(() => {
    const fullRoom = { x: 0, y: 0, width: boxWidth, height: boxHeight };
    const content = frameContentBounds(
      scene.tables,
      featureViewModels.map(({ feature }) => feature),
    );
    if (!content) {
      return fullRoom;
    }

    const turned = turnBox(content, rotation, {
      x: CLASSROOM_WIDTH / 2,
      y: CLASSROOM_HEIGHT / 2,
    });
    // From the room's turned frame into the padded box the group is drawn in.
    const shiftX = boxWidth / 2 - CLASSROOM_WIDTH / 2;
    const shiftY = boxHeight / 2 - CLASSROOM_HEIGHT / 2;
    const minX = turned.minX + shiftX - EDGE_PADDING;
    const minY = turned.minY + shiftY - EDGE_PADDING;

    return {
      x: minX,
      y: minY,
      width: turned.maxX + shiftX + EDGE_PADDING - minX,
      height: turned.maxY + shiftY + EDGE_PADDING - minY,
    };
  }, [boxHeight, boxWidth, featureViewModels, rotation, scene.tables]);

  // One name size for the whole plan, as the editor and the export have.
  const nameFontSize = React.useMemo(
    () =>
      computePlanNameFontSize({
        tables: scene.tables,
        seating,
        labelFor: (student) =>
          getDisplayNameForMode(student.name, 'table', nameDisplay, nameLabels),
        allStudents: students,
        showSpecialNeeds,
        badgeView: PRESENT_BADGE_VIEW,
        labelRotation: -rotation,
        weight: contrast ? 700 : 400,
        split: nameDisplay === 'full',
      }),
    [
      scene.tables,
      seating,
      nameDisplay,
      nameLabels,
      students,
      showSpecialNeeds,
      rotation,
      contrast,
    ],
  );

  // The lit seat, handed to its table alone so the others keep their memo.
  const spotTable = spotlight?.tableIndex;
  const spotSeat = spotlight?.seatIndex;
  const spotlightLookup = React.useMemo(
    () =>
      spotTable === undefined || spotSeat === undefined
        ? null
        : buildSpotlightLookup({ tableIndex: spotTable, seatIndex: spotSeat }),
    [spotTable, spotSeat],
  );
  const spotlitTableIndex = spotTable ?? -1;
  // The same target for as long as it names the same seat, whatever object
  // the caller hands over on a render.
  const spotlightTarget = React.useMemo<SpotlightTarget | null>(
    () =>
      spotTable === undefined || spotSeat === undefined
        ? null
        : { tableIndex: spotTable, seatIndex: spotSeat },
    [spotTable, spotSeat],
  );

  // Everything the plan draws, kept apart from how it is zoomed and moved: a
  // pinch changes the transform sixty times a second and more, and none of
  // this with it.
  const content = React.useMemo(
    () => (
      <>
        <g ref={groupRef} transform={groupTransform}>
          {featureViewModels.map(({ feature, styles }) => (
            <FeatureShape
              key={feature.id}
              feature={feature}
              styles={styles}
              extraIconRotation={rotation}
            />
          ))}
          {scene.tables.map((table, index) => (
            <TableIcon
              key={index}
              table={table}
              index={index}
              students={seating[index] || []}
              allStudents={students}
              photoUrls={photoUrls}
              selected={false}
              editable={false}
              showSpecialNeeds={showSpecialNeeds}
              badgeView={PRESENT_BADGE_VIEW}
              isDark={dark}
              contrast={contrast}
              showGenderColors={colors}
              lockSeatLabelOrientation={true}
              seatLabelRotation={-rotation}
              photoDisplayMode={photoDisplayMode}
              nameDisplay={nameDisplay}
              nameLabels={nameLabels}
              nameFontSize={nameFontSize}
              seatHighlights={
                spotlitTableIndex === index ? spotlightLookup : null
              }
            />
          ))}
          {/* A veil over the seat of a student missing today, in the seat's
              own shape and never in the way of a pointer. */}
          {absentSeats.map((shape) => (
            <path
              key={`${shape.tableIndex}-${shape.seatIndex}`}
              d={shape.outline}
              transform={shape.outlineTransform}
              fill={veilFill}
              fillOpacity={ABSENT_VEIL_OPACITY}
              pointerEvents="none"
              data-absent={shape.studentId}
            />
          ))}
        </g>
        <PresentationSpotlight
          scene={scene}
          seating={seating}
          target={spotlightTarget}
          viewBox={viewBox}
          frame={frame}
          dim={spotlightDims}
        />
      </>
    ),
    [
      absentSeats,
      colors,
      contrast,
      dark,
      featureViewModels,
      frame,
      groupTransform,
      nameDisplay,
      nameFontSize,
      nameLabels,
      photoDisplayMode,
      photoUrls,
      rotation,
      scene,
      seating,
      showSpecialNeeds,
      spotlightDims,
      spotlightLookup,
      spotlightTarget,
      spotlitTableIndex,
      students,
      veilFill,
      viewBox,
    ],
  );

  return (
    <>
      <svg
        ref={svgRef}
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        preserveAspectRatio="xMidYMid meet"
        fontFamily={svgFontFamily}
        style={{
          display: 'block',
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: 'center',
        }}
        onPointerDown={handlePointerDown}
      >
        {content}
      </svg>
      {showSpecialNeeds && (
        <BadgeTooltipLayer svgRef={svgRef} allStudents={students} />
      )}
    </>
  );
}

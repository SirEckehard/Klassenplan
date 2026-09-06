// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type {
  ClassroomFeature,
  ClassroomScene,
  SeatingArrangement,
  Student,
} from '@/types';
import TableIcon from './SceneTable';
import FeatureShape from './FeatureShape';
import { useStudentPhotoUrls } from '@/hooks/student/useStudentPhoto';
import {
  CLASSROOM_WIDTH,
  CLASSROOM_HEIGHT,
  getRotatedAabbHalfExtents,
  type NameDisplayMode,
} from '@/utils';
import { getFeatureStyles } from '@/utils/ui';
import {
  getPresentationRotation,
  type PresentationPerspective,
} from '@/utils/ui/boardOrientation';
import PresentationSpotlight, {
  type SpotlightTarget,
} from '@/components/scene/PresentationSpotlight';

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
  /** When false, gender colors are dropped for a neutral (colorless) render. */
  showGenderColors?: boolean;
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
  /** Seat to spotlight; the rest of the classroom is dimmed. */
  spotlight?: SpotlightTarget | null;
};

/** Padding around the classroom so seat photos docking outside seats aren't clipped. */
const EDGE_PADDING = 48;

type Rect = { minX: number; minY: number; maxX: number; maxY: number };

/**
 * Axis-aligned box around everything that actually gets drawn, in scene units.
 *
 * The room is a fixed 900×600 no matter how much of it is furnished, so
 * projecting the whole rectangle wastes the screen — badly on a portrait
 * tablet, where the landscape room already only fills half the height. Framing
 * the furniture instead makes the names as large as the device allows.
 */
function getContentBounds(
  tables: ClassroomScene['tables'],
  features: ClassroomFeature[],
): Rect | null {
  let bounds: Rect | null = null;

  const add = (item: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation?: number;
  }) => {
    const { halfWidth, halfHeight } = getRotatedAabbHalfExtents(
      item.width,
      item.height,
      item.rotation ?? 0,
    );
    const centerX = item.x + item.width / 2;
    const centerY = item.y + item.height / 2;
    const next = {
      minX: centerX - halfWidth,
      minY: centerY - halfHeight,
      maxX: centerX + halfWidth,
      maxY: centerY + halfHeight,
    };
    bounds = bounds
      ? {
          minX: Math.min(bounds.minX, next.minX),
          minY: Math.min(bounds.minY, next.minY),
          maxX: Math.max(bounds.maxX, next.maxX),
          maxY: Math.max(bounds.maxY, next.maxY),
        }
      : next;
  };

  tables.forEach(add);
  features.forEach(add);

  return bounds;
}

export default function PresentationScene({
  scene,
  seating,
  students,
  perspective,
  showBadges = false,
  showPhotos = true,
  showGenderColors = true,
  showFeatures = true,
  nameDisplay,
  zoom = 1,
  panX = 0,
  panY = 0,
  isDark = false,
  spotlight = null,
}: PresentationSceneProps) {
  const photoUrls = useStudentPhotoUrls(students);

  const rotation = getPresentationRotation(scene, perspective);
  const isQuarterTurn = rotation === 90 || rotation === 270;

  // Bounding box of the rotated classroom (dimensions swap on a quarter turn).
  const boxWidth =
    (isQuarterTurn ? CLASSROOM_HEIGHT : CLASSROOM_WIDTH) + EDGE_PADDING * 2;
  const boxHeight =
    (isQuarterTurn ? CLASSROOM_WIDTH : CLASSROOM_HEIGHT) + EDGE_PADDING * 2;

  const groupTransform =
    `translate(${boxWidth / 2} ${boxHeight / 2}) rotate(${rotation}) ` +
    `translate(${-CLASSROOM_WIDTH / 2} ${-CLASSROOM_HEIGHT / 2})`;

  const photoDisplayMode =
    perspective === 'teacher' && showPhotos ? 'all' : 'off';
  const showSpecialNeeds = perspective === 'teacher' && showBadges;

  const featureViewModels = React.useMemo(
    () =>
      showFeatures
        ? (scene.features ?? [])
            .map((feature) => ({
              feature,
              styles: getFeatureStyles(
                feature,
                isDark,
                undefined,
                !showGenderColors,
              ),
            }))
            .filter(({ styles }) => styles.shouldRender)
        : [],
    [scene.features, isDark, showFeatures, showGenderColors],
  );

  // The drawn content, mapped through the same rotation the classroom group
  // gets, becomes the visible area. Without content (an empty room) the whole
  // room is framed as before.
  const viewBox = React.useMemo(() => {
    const fullRoom = { x: 0, y: 0, width: boxWidth, height: boxHeight };
    const content = getContentBounds(
      scene.tables,
      featureViewModels.map(({ feature }) => feature),
    );
    if (!content) {
      return fullRoom;
    }

    // Rotation is always a multiple of 90°, so mapping the two opposite
    // corners and re-ordering them is enough to get the rotated box.
    const toBox = (x: number, y: number) => {
      const radians = (rotation * Math.PI) / 180;
      const cos = Math.round(Math.cos(radians));
      const sin = Math.round(Math.sin(radians));
      const dx = x - CLASSROOM_WIDTH / 2;
      const dy = y - CLASSROOM_HEIGHT / 2;
      return {
        x: boxWidth / 2 + dx * cos - dy * sin,
        y: boxHeight / 2 + dx * sin + dy * cos,
      };
    };

    const a = toBox(content.minX, content.minY);
    const b = toBox(content.maxX, content.maxY);
    const minX = Math.min(a.x, b.x) - EDGE_PADDING;
    const minY = Math.min(a.y, b.y) - EDGE_PADDING;

    return {
      x: minX,
      y: minY,
      width: Math.max(a.x, b.x) + EDGE_PADDING - minX,
      height: Math.max(a.y, b.y) + EDGE_PADDING - minY,
    };
  }, [boxHeight, boxWidth, featureViewModels, rotation, scene.tables]);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
      preserveAspectRatio="xMidYMid meet"
      fontFamily="'DM Sans Variable', system-ui, sans-serif"
      style={{
        display: 'block',
        transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
        transformOrigin: 'center',
      }}
    >
      <g transform={groupTransform}>
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
            onUpdate={() => {}}
            editable={false}
            showSpecialNeeds={showSpecialNeeds}
            showGenderColors={showGenderColors}
            isDark={isDark}
            lockSeatLabelOrientation={true}
            seatLabelRotation={-rotation}
            photoDisplayMode={photoDisplayMode}
            nameDisplay={nameDisplay}
          />
        ))}
      </g>
      <PresentationSpotlight
        scene={scene}
        seating={seating}
        target={spotlight}
        viewBox={viewBox}
        groupTransform={groupTransform}
      />
    </svg>
  );
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type { ClassroomScene, SeatingArrangement, Student } from '@/types';
import TableIcon from './SceneTable';
import FeatureShape from './FeatureShape';
import { useStudentPhotoUrls } from '@/hooks/student/useStudentPhoto';
import { CLASSROOM_WIDTH, CLASSROOM_HEIGHT } from '@/utils';
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

export default function PresentationScene({
  scene,
  seating,
  students,
  perspective,
  showBadges = false,
  showPhotos = true,
  showGenderColors = true,
  showFeatures = true,
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

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
      viewBox={`0 0 ${boxWidth} ${boxHeight}`}
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
          />
        ))}
      </g>
      <PresentationSpotlight
        scene={scene}
        seating={seating}
        target={spotlight}
        boxWidth={boxWidth}
        boxHeight={boxHeight}
        groupTransform={groupTransform}
      />
    </svg>
  );
}

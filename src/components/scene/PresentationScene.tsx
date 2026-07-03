// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ClassroomScene, SeatingArrangement, Student } from '@/types';
import TableIcon from './SceneTable';
import { useStudentPhotoUrls } from '@/hooks/student/useStudentPhoto';
import {
  CLASSROOM_WIDTH,
  CLASSROOM_HEIGHT,
  FEATURE_CORNER_RADIUS,
} from '@/utils';
import { getFeatureStyles } from '@/utils/ui';
import type { FeatureVisibilityFlags } from '@/utils/ui';
import {
  getPresentationRotation,
  type PresentationPerspective,
} from '@/utils/ui/boardOrientation';

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
  isDark?: boolean;
};

/** Padding around the classroom so seat photos docking outside seats aren't clipped. */
const EDGE_PADDING = 48;

export default function PresentationScene({
  scene,
  seating,
  students,
  perspective,
  showBadges = false,
  isDark = false,
}: PresentationSceneProps) {
  const { t } = useTranslation('generator');
  const photoUrls = useStudentPhotoUrls(students);

  const rotation = getPresentationRotation(scene, perspective);
  const isQuarterTurn = rotation === 90 || rotation === 270;

  // Bounding box of the rotated classroom (dimensions swap on a quarter turn).
  const boxWidth = (isQuarterTurn ? CLASSROOM_HEIGHT : CLASSROOM_WIDTH) +
    EDGE_PADDING * 2;
  const boxHeight = (isQuarterTurn ? CLASSROOM_WIDTH : CLASSROOM_HEIGHT) +
    EDGE_PADDING * 2;

  const groupTransform =
    `translate(${boxWidth / 2} ${boxHeight / 2}) rotate(${rotation}) ` +
    `translate(${-CLASSROOM_WIDTH / 2} ${-CLASSROOM_HEIGHT / 2})`;

  const showPhotos = perspective === 'teacher';
  const photoDisplayMode = showPhotos ? 'all' : 'off';
  const showSpecialNeeds = perspective === 'teacher' && showBadges;

  const getFeatureLabel = (feature: {
    type: string;
    label?: string;
  }): string | undefined => {
    if (!feature.label) return undefined;
    const typeToKey: Record<string, string> = {
      window: 'layout.window',
      door: 'layout.door',
      board: 'layout.board',
      podium: 'layout.podium',
    };
    const key = typeToKey[feature.type];
    return key ? t(key, feature.label) : feature.label;
  };

  const featureVisibility = React.useMemo<FeatureVisibilityFlags>(
    () => ({ board: true, window: true, door: true, podium: true }),
    [],
  );
  const featureViewModels = React.useMemo(
    () =>
      (scene.features ?? [])
        .map((feature) => ({
          feature,
          styles: getFeatureStyles(feature, false, featureVisibility),
        }))
        .filter(({ styles }) => styles.shouldRender),
    [scene.features, featureVisibility],
  );

  const roomStroke = isDark ? 'rgba(148,163,184,0.35)' : 'rgba(100,116,139,0.4)';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
      viewBox={`0 0 ${boxWidth} ${boxHeight}`}
      preserveAspectRatio="xMidYMid meet"
      fontFamily="'DM Sans Variable', system-ui, sans-serif"
      style={{ display: 'block' }}
    >
      <g transform={groupTransform}>
        <rect
          width={CLASSROOM_WIDTH}
          height={CLASSROOM_HEIGHT}
          fill="none"
          stroke={roomStroke}
          strokeWidth={1.5}
          rx={8}
        />
        {featureViewModels.map(({ feature, styles }) => {
          const isFree = feature.anchor === 'free';
          const ownRotation = isFree ? (feature.rotation ?? 0) : 0;
          const centerX = feature.x + feature.width / 2;
          const centerY = feature.y + feature.height / 2;
          // Keep the label upright on screen: cancel the feature's own rotation
          // and the whole-room rotation.
          const labelRotation = -ownRotation - rotation;
          const labelTransform =
            labelRotation % 360 !== 0
              ? `rotate(${labelRotation} ${feature.width / 2} ${
                  feature.height / 2
                })`
              : undefined;

          const groupTransformFeature = isFree
            ? `translate(${centerX} ${centerY}) rotate(${ownRotation}) ` +
              `translate(${-feature.width / 2} ${-feature.height / 2})`
            : `translate(${feature.x} ${feature.y})`;

          return (
            <g key={feature.id} transform={groupTransformFeature}>
              <rect
                width={feature.width}
                height={feature.height}
                rx={FEATURE_CORNER_RADIUS}
                fill={styles.fill}
                stroke={styles.stroke}
                strokeWidth={2}
              />
              {feature.label && (
                <text
                  x={feature.width / 2}
                  y={feature.height / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={styles.text}
                  fontSize={14}
                  fontWeight="600"
                  transform={labelTransform}
                >
                  {getFeatureLabel(feature)}
                </text>
              )}
            </g>
          );
        })}
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
            isDark={isDark}
            lockSeatLabelOrientation={true}
            seatLabelRotation={-rotation}
            photoDisplayMode={photoDisplayMode}
          />
        ))}
      </g>
    </svg>
  );
}

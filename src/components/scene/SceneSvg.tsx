// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ClassroomScene, SeatingArrangement, Student } from '@/types';
import TableIcon from './SceneTable';
import {
  CLASSROOM_WIDTH,
  CLASSROOM_HEIGHT,
  FEATURE_CORNER_RADIUS,
} from '@/utils';
import { getFeatureStyles } from '@/utils/ui';
import type { FeatureVisibilityFlags } from '@/utils/ui';

type ClassMetadataInfo = {
  name?: string | null;
  label?: string | null;
  notes?: string | null;
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
  showBoard?: boolean;
  showWindows?: boolean;
  showDoor?: boolean;
  showPodium?: boolean;
  lockSeatLabelOrientation?: boolean;
  seatLabelRotation?: number;
  orientation?: 'landscape' | 'portrait';
  showFullNames?: boolean;
  /** Photo display on the seat dots for the export: 'all' shows them, 'off' hides. */
  photoDisplayMode?: 'all' | 'off';
};

export default function SceneSvg({
  scene,
  seating,
  allStudents = [],
  photoUrls,
  title,
  classMetadata,
  showSpecialNeeds = true,
  showBoard = true,
  showWindows = true,
  showDoor = true,
  showPodium = true,
  lockSeatLabelOrientation = true,
  seatLabelRotation = 0,
  orientation = 'portrait',
  showFullNames = false,
  photoDisplayMode = 'all',
}: SceneSvgProps) {
  const { t, i18n } = useTranslation('generator');

  // Helper to get translated feature label based on type
  const getFeatureLabel = (feature: {
    type: string;
    label?: string;
  }): string | undefined => {
    if (!feature.label) return undefined;
    // Translate dynamically based on feature type
    const typeToKey: Record<string, string> = {
      window: 'layout.window',
      door: 'layout.door',
      board: 'layout.board',
      podium: 'layout.podium',
    };
    const key = typeToKey[feature.type];
    return key ? t(key, feature.label) : feature.label;
  };

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
  const availableHeight = pageHeight - margin * 2 - headerHeight;

  // Portrait mode: account for 90° rotation (classroom dimensions swap)
  const scale = isPortrait
    ? Math.min(
        (pageWidth - margin * 2) / CLASSROOM_HEIGHT, // After rotation: height becomes width
        availableHeight / CLASSROOM_WIDTH, // After rotation: width becomes height
      )
    : Math.min(
        (pageWidth - margin * 2) / CLASSROOM_WIDTH,
        availableHeight / CLASSROOM_HEIGHT,
      );

  // Calculate precise centering offsets - simplified approach for portrait
  const offsetX = isPortrait
    ? pageWidth / 2 // Center for rotation pivot
    : (pageWidth - CLASSROOM_WIDTH * scale) / 2; // Standard classroom
  const offsetY = isPortrait
    ? margin + headerHeight + availableHeight / 2 // Center in available space
    : margin + headerHeight + (availableHeight - CLASSROOM_HEIGHT * scale) / 2;
  const currentDate = new Date().toLocaleDateString(
    i18n.language === 'de' ? 'de-DE' : 'en-US',
  );
  const displayTitle = title || t('mode.table', 'Sitzplan');
  const headerTitleY = isPortrait ? margin + 6 : 60;
  const headerGroupY = isPortrait ? headerTitleY - 6 : 47;
  const headerLogoX = isPortrait ? margin : 70;
  const headerTitleX = isPortrait
    ? margin + (pageWidth - margin * 2) / 2
    : pageWidth / 2;
  const headerDateX = isPortrait ? pageWidth - margin : pageWidth - 115;
  const metadataStartY = headerTitleY + (isPortrait ? 8 : 20);
  const metadataFontSize = isPortrait ? 6 : 12;

  // Portrait mode: Rotate classroom +90 degrees (Tafel nach unten)
  const classroomRotation = isPortrait ? 90 : 0;
  const features = React.useMemo(() => scene.features ?? [], [scene.features]);
  const featureVisibility = React.useMemo<FeatureVisibilityFlags>(
    () => ({
      board: showBoard,
      window: showWindows,
      door: showDoor,
      podium: showPodium,
    }),
    [showBoard, showDoor, showPodium, showWindows],
  );
  const featureViewModels = React.useMemo(
    () =>
      features
        .map((feature) => ({
          feature,
          styles: getFeatureStyles(feature, false, featureVisibility),
        }))
        .filter(({ styles }) => styles.shouldRender),
    [features, featureVisibility],
  );

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
      viewBox={`0 0 ${pageWidth} ${pageHeight}`}
      preserveAspectRatio="xMidYMid meet"
      fontFamily="'DM Sans Variable', system-ui, sans-serif"
      style={{ display: 'block' }}
    >
      {/* Header elements - responsive sizing for portrait mode */}
      <g
        transform={
          isPortrait
            ? `translate(${headerLogoX} ${headerGroupY})`
            : 'translate(70 47)'
        }
      >
        <g transform={`scale(${(isPortrait ? 8 : 16) / 240})`}>
          <g fill="#2563EB">
            <rect x="8" y="8" width="40" height="40" rx="8"/>
            <rect x="146" y="8" width="40" height="40" rx="8"/>
            <rect x="8" y="54" width="40" height="40" rx="8"/>
            <rect x="100" y="54" width="40" height="40" rx="8"/>
            <rect x="8" y="100" width="40" height="40" rx="8"/>
            <rect x="54" y="100" width="40" height="40" rx="8"/>
            <rect x="8" y="146" width="40" height="40" rx="8"/>
            <rect x="100" y="146" width="40" height="40" rx="8"/>
            <rect x="8" y="192" width="40" height="40" rx="8"/>
            <rect x="146" y="192" width="40" height="40" rx="8"/>
          </g>
          <rect x="192" y="100" width="40" height="40" rx="8" fill="#F59E0B"/>
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
      <text
        x={headerDateX}
        y={headerTitleY}
        textAnchor={isPortrait ? 'end' : 'middle'}
        fontSize={isPortrait ? 6 : 12}
        fill="#000"
      >
        {`${t('circle.date', 'Datum')}: ${currentDate}`}
      </text>
      {metadataLines.length > 0 &&
        metadataLines.map((line, index) => (
          <text
            key={`meta-${index}`}
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
      <g
        transform={
          isPortrait
            ? `translate(${offsetX} ${offsetY}) rotate(${classroomRotation}) translate(${(-CLASSROOM_WIDTH * scale) / 2} ${(-CLASSROOM_HEIGHT * scale) / 2}) scale(${scale})`
            : `translate(${offsetX} ${offsetY}) scale(${scale})`
        }
      >
        <rect
          width={CLASSROOM_WIDTH}
          height={CLASSROOM_HEIGHT}
          fill="none"
          stroke="#000"
        />
        {featureViewModels.map(({ feature, styles }) => {
          const isFree = feature.anchor === 'free';
          const rotation = isFree ? (feature.rotation ?? 0) : 0;
          const normalizedRotation = ((rotation % 360) + 360) % 360;
          const isPodium = feature.type === 'podium';
          const labelRotation = isPodium
            ? -normalizedRotation - classroomRotation
            : feature.width >= feature.height
              ? 0
              : -90;

          if (isFree) {
            const transform = `translate(${feature.x + feature.width / 2} ${
              feature.y + feature.height / 2
            }) rotate(${rotation}) translate(${-feature.width / 2} ${
              -feature.height / 2
            })`;
            return (
              <g key={feature.id} transform={transform}>
                <rect
                  x={0}
                  y={0}
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
                    fontSize={12}
                    transform={
                      labelRotation !== 0
                        ? `rotate(${labelRotation}, ${feature.width / 2}, ${
                            feature.height / 2
                          })`
                        : undefined
                    }
                  >
                    {getFeatureLabel(feature)}
                  </text>
                )}
              </g>
            );
          }

          const centerX = feature.x + feature.width / 2;
          const centerY = feature.y + feature.height / 2;
          const textTransform =
            labelRotation !== 0
              ? `rotate(${labelRotation} ${centerX} ${centerY})`
              : undefined;

          return (
            <g key={feature.id}>
              <rect
                x={feature.x}
                y={feature.y}
                width={feature.width}
                height={feature.height}
                rx={FEATURE_CORNER_RADIUS}
                fill={styles.fill}
                stroke={styles.stroke}
                strokeWidth={2}
              />
              {feature.label && (
                <text
                  x={centerX}
                  y={centerY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={styles.text}
                  fontSize={12}
                  transform={textTransform}
                >
                  {getFeatureLabel(feature)}
                </text>
              )}
            </g>
          );
        })}
        {scene.tables.map((t, i) => (
          <TableIcon
            key={i}
            table={t}
            index={i}
            students={seating[i] || []}
            allStudents={allStudents}
            photoUrls={photoUrls}
            selected={false}
            onUpdate={() => {}}
            editable={false}
            showSpecialNeeds={showSpecialNeeds}
            isDark={false}
            lockSeatLabelOrientation={lockSeatLabelOrientation}
            seatLabelRotation={
              isPortrait
                ? seatLabelRotation - classroomRotation
                : seatLabelRotation
            }
            showFullNames={showFullNames}
            photoDisplayMode={photoDisplayMode}
          />
        ))}
      </g>
    </svg>
  );
}

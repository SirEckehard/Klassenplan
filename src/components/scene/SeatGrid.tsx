// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type {
  SeatPhotoDensity,
  StatisticHighlightMode,
  StatisticStatus,
  Student,
} from '@/types';
import TableSeat, { TableSeatBadgeOverlay } from '@/components/scene/TableSeat';

type SeatPointerDownHandler = NonNullable<
  React.ComponentProps<typeof TableSeat>['onSeatPointerDown']
>;
type SeatPointerUpHandler = NonNullable<
  React.ComponentProps<typeof TableSeat>['onSeatPointerUp']
>;
type SeatHoverHandler = (seatIndex: number) => void;

export interface SeatConfig {
  student: Student | null;
  seatIndex: number;
  col: number;
  row: number;
  locked: boolean;
  isOriginSeat: boolean;
  isHoverSeat: boolean;
  isHoverLockedSeat: boolean;
  isLockedFeedbackSeat: boolean;
  highlightStatus?: StatisticStatus;
  highlightMode?: StatisticHighlightMode;
  highlightPercentage?: number;
}

interface SeatGridProps {
  clipPathId: string;
  seatConfigs: SeatConfig[];
  tableIndex: number;
  seatWidth: number;
  seatHeight: number;
  tableRotation: number;
  allStudents: Student[];
  showSpecialNeeds: boolean;
  showFullNames: boolean;
  /** When false, seat name labels and badges are hidden (colours/dividers stay). */
  showSeatLabels?: boolean;
  /** Photo density: 'card' renders a large photo per seat (name below, no badges). */
  photoDensity?: SeatPhotoDensity;
  /** studentId -> photo URL map, used by the card density. */
  photoUrls?: ReadonlyMap<string, string>;
  /** Mirror counter-flip for the student-perspective view. */
  mirrored?: boolean;
  lockSeatLabelOrientation: boolean;
  seatTextRotation: number;
  isDark: boolean;
  toggleLock?: (studentId: string, table: number, seat: number) => void;
  onSeatPointerDown?: SeatPointerDownHandler;
  onSeatPointerUp?: SeatPointerUpHandler;
  onSeatPointerEnter?: SeatHoverHandler;
  onSeatPointerLeave?: SeatHoverHandler;
}

function SeatGrid({
  clipPathId,
  seatConfigs,
  tableIndex,
  seatWidth,
  seatHeight,
  tableRotation,
  allStudents,
  showSpecialNeeds,
  showFullNames,
  showSeatLabels = true,
  photoDensity = 'compact',
  photoUrls,
  mirrored = false,
  lockSeatLabelOrientation,
  seatTextRotation,
  isDark,
  toggleLock,
  onSeatPointerDown,
  onSeatPointerUp,
  onSeatPointerEnter,
  onSeatPointerLeave,
}: SeatGridProps) {
  return (
    <>
      <g clipPath={`url(#${clipPathId})`}>
        {seatConfigs.map((config) => (
          <TableSeat
            key={config.seatIndex}
            student={config.student}
            seatIndex={config.seatIndex}
            tableIndex={tableIndex}
            col={config.col}
            row={config.row}
            seatWidth={seatWidth}
            seatHeight={seatHeight}
            tableRotation={tableRotation}
            allStudents={allStudents}
            isDark={isDark}
            showSeatLabels={showSeatLabels}
            photoDensity={photoDensity}
            photoUrl={
              config.student?.hasPhoto
                ? photoUrls?.get(config.student.id)
                : undefined
            }
            mirrored={mirrored}
            locked={config.locked}
            isOriginSeat={config.isOriginSeat}
            isHoverSeat={config.isHoverSeat}
            isHoverLockedSeat={config.isHoverLockedSeat}
            isLockedFeedbackSeat={config.isLockedFeedbackSeat}
            highlightStatus={config.highlightStatus}
            highlightMode={config.highlightMode}
            highlightPercentage={config.highlightPercentage}
            showSpecialNeeds={showSpecialNeeds}
            showFullNames={showFullNames}
            lockSeatLabelOrientation={lockSeatLabelOrientation}
            seatTextRotation={seatTextRotation}
            toggleLock={toggleLock}
            onSeatPointerDown={onSeatPointerDown}
            onSeatPointerUp={onSeatPointerUp}
            onSeatPointerEnter={onSeatPointerEnter}
            onSeatPointerLeave={onSeatPointerLeave}
          />
        ))}
      </g>
      <g clipPath={`url(#${clipPathId})`}>
        {showSeatLabels &&
          photoDensity !== 'card' &&
          seatConfigs.map((config) => (
            <TableSeatBadgeOverlay
              key={`badge-${config.seatIndex}`}
              student={config.student}
              col={config.col}
              row={config.row}
              seatWidth={seatWidth}
              seatHeight={seatHeight}
              allStudents={allStudents}
              showSpecialNeeds={showSpecialNeeds}
              isDark={isDark}
              isOriginSeat={config.isOriginSeat}
              lockSeatLabelOrientation={lockSeatLabelOrientation}
              seatTextRotation={seatTextRotation}
              mirrored={mirrored}
            />
          ))}
      </g>
    </>
  );
}

export default React.memo(SeatGrid);

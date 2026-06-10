// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type { StatisticHighlightMode, StatisticStatus, Student } from '@/types';
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
            />
          ))}
      </g>
    </>
  );
}

export default React.memo(SeatGrid);

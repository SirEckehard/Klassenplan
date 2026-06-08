import React from 'react';
import type { Icon } from '@phosphor-icons/react';
import type { Student } from '@/types';
import { triggerHapticFeedback } from '@/utils/touch/hapticFeedback';

export interface DragPreview {
  student: Student;
  x: number;
  y: number;
  seatWidth: number;
  seatHeight: number;
  appearance: {
    fill: string;
    stroke: string;
    text: string;
  };
  flags: SeatBadge[];
  showFullName: boolean;
}

interface SeatBadge {
  key: string;
  label: string;
  icon: Icon;
  tooltip: string;
}

interface DragDropStateHook {
  dragPreview: DragPreview | null;
  dragOrigin: DragOrigin | null;
  dragHover: DragHover | null;
  lockedDropTarget: LockedDropTarget | null;
  handleSeatDragStart: (student: Student, config: DragSeatConfig) => void;
  handleSeatDrag: (x: number, y: number) => void;
  handleSeatDragEnd: () => void;
  handleSeatHoverChange: (hover: DragHover | null) => void;
  handleLockedDrop: (target: DragHover) => void;
}

export interface DragOrigin {
  tableIndex: number;
  seatIndex: number;
}

export interface DragHover {
  tableIndex: number;
  seatIndex: number;
  locked: boolean;
}

export interface LockedDropTarget extends DragHover {
  id: number;
}

export interface DragSeatConfig {
  x: number;
  y: number;
  tableIndex: number;
  seatIndex: number;
  seatWidth: number;
  seatHeight: number;
  appearance: {
    fill: string;
    stroke: string;
    text: string;
  };
  flags: SeatBadge[];
  showFullName: boolean;
}

/**
 * Custom hook for managing drag and drop state for student seats
 * Provides drag preview state and handlers for seat dragging operations
 */
export function useDragDropState(): DragDropStateHook {
  const [dragPreview, setDragPreview] = React.useState<DragPreview | null>(
    null,
  );
  const [dragOrigin, setDragOrigin] = React.useState<DragOrigin | null>(null);
  const [dragHover, setDragHover] = React.useState<DragHover | null>(null);
  const [lockedDropTarget, setLockedDropTarget] =
    React.useState<LockedDropTarget | null>(null);
  const lockedTimeoutRef = React.useRef<number | null>(null);

  const handleSeatDragStart = React.useCallback(
    (student: Student, config: DragSeatConfig) => {
      triggerHapticFeedback('dragStart');
      setDragPreview({
        student,
        x: config.x,
        y: config.y,
        seatWidth: config.seatWidth,
        seatHeight: config.seatHeight,
        appearance: config.appearance,
        flags: config.flags,
        showFullName: config.showFullName,
      });
      setDragOrigin({
        tableIndex: config.tableIndex,
        seatIndex: config.seatIndex,
      });
      setDragHover({
        tableIndex: config.tableIndex,
        seatIndex: config.seatIndex,
        locked: false,
      });
      setLockedDropTarget(null);
    },
    [],
  );

  const handleSeatDrag = React.useCallback((x: number, y: number) => {
    setDragPreview((prev) => (prev ? { ...prev, x, y } : prev));
  }, []);

  const handleSeatDragEnd = React.useCallback(() => {
    triggerHapticFeedback('dragEnd');
    setDragPreview(null);
    setDragOrigin(null);
    setDragHover(null);
  }, []);

  const handleSeatHoverChange = React.useCallback((hover: DragHover | null) => {
    setDragHover((prev) => {
      if (
        prev?.tableIndex === hover?.tableIndex &&
        prev?.seatIndex === hover?.seatIndex &&
        prev?.locked === hover?.locked
      ) {
        return prev;
      }
      return hover;
    });
  }, []);

  const handleLockedDrop = React.useCallback((target: DragHover) => {
    setLockedDropTarget({
      ...target,
      id: Date.now(),
    });
  }, []);

  React.useEffect(() => {
    if (!lockedDropTarget) {
      return undefined;
    }
    if (lockedTimeoutRef.current) {
      window.clearTimeout(lockedTimeoutRef.current);
    }
    lockedTimeoutRef.current = window.setTimeout(() => {
      setLockedDropTarget(null);
      lockedTimeoutRef.current = null;
    }, 700);

    return () => {
      if (lockedTimeoutRef.current) {
        window.clearTimeout(lockedTimeoutRef.current);
        lockedTimeoutRef.current = null;
      }
    };
  }, [lockedDropTarget]);

  return {
    dragPreview,
    dragOrigin,
    dragHover,
    lockedDropTarget,
    handleSeatDragStart,
    handleSeatDrag,
    handleSeatDragEnd,
    handleSeatHoverChange,
    handleLockedDrop,
  };
}

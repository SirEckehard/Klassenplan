// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { triggerHapticFeedback } from '@/utils';
import { showToast, TOAST_MESSAGES } from '@/utils/ui/toast';
import type { DragHover, DragOrigin } from '@/hooks/ui/useDragDropState';

type MoveStudentHandler = (
  fromTable: number,
  fromSeat: number,
  toTable: number,
  toSeat: number,
) => boolean;

/** Seat description passed from TableSeat to the keyboard-move handlers. */
export interface SeatKeyboardEventInfo {
  tableIndex: number;
  seatIndex: number;
  locked: boolean;
  hasStudent: boolean;
  studentName: string | null;
}

interface KeyboardMoveOrigin extends DragOrigin {
  studentName: string;
}

interface UseSeatKeyboardMoveOptions {
  moveStudent?: MoveStudentHandler;
  onHoverChange?: (hover: DragHover | null) => void;
  onDropRejected?: (target: DragHover) => void;
}

interface UseSeatKeyboardMoveResult {
  /** Seat currently "picked up" via keyboard, rendered like a drag origin. */
  keyboardMoveOrigin: DragOrigin | null;
  /** Latest status message for an aria-live region (screen readers). */
  keyboardAnnouncement: string;
  handleSeatKeyDown: (
    event: React.KeyboardEvent<SVGRectElement>,
    info: SeatKeyboardEventInfo,
  ) => void;
  handleSeatFocus: (info: SeatKeyboardEventInfo) => void;
  handleSeatBlur: () => void;
  cancelKeyboardMove: () => void;
}

/**
 * Keyboard alternative to the pointer-based seat drag (useSeatDrag):
 * Enter/Space on an occupied seat picks the student up, Tab moves focus to a
 * target seat, Enter/Space drops, Escape cancels. Locked targets are rejected
 * with the same feedback as pointer drops; the grab stays active so the user
 * can pick another target. Visual feedback reuses the existing dragOrigin /
 * dragHover plumbing of the pointer path.
 */
export function useSeatKeyboardMove({
  moveStudent,
  onHoverChange,
  onDropRejected,
}: UseSeatKeyboardMoveOptions): UseSeatKeyboardMoveResult {
  const { t } = useTranslation('generator');
  const [origin, setOrigin] = React.useState<KeyboardMoveOrigin | null>(null);
  const [announcement, setAnnouncement] = React.useState('');

  const originRef = React.useRef<KeyboardMoveOrigin | null>(null);
  const optionsRef = React.useRef({
    moveStudent,
    onHoverChange,
    onDropRejected,
    t,
  });
  React.useEffect(() => {
    optionsRef.current = { moveStudent, onHoverChange, onDropRejected, t };
  });

  const updateOrigin = React.useCallback((next: KeyboardMoveOrigin | null) => {
    originRef.current = next;
    setOrigin(next);
  }, []);

  const cancelKeyboardMove = React.useCallback(() => {
    if (!originRef.current) {
      return;
    }
    updateOrigin(null);
    optionsRef.current.onHoverChange?.(null);
    setAnnouncement(
      optionsRef.current.t('seat.keyboard.cancelled', 'Umsetzen abgebrochen.'),
    );
  }, [updateOrigin]);

  const handleSeatKeyDown = React.useCallback(
    (
      event: React.KeyboardEvent<SVGRectElement>,
      info: SeatKeyboardEventInfo,
    ) => {
      const {
        moveStudent: move,
        onHoverChange: hover,
        t: translate,
      } = optionsRef.current;
      const activeOrigin = originRef.current;

      if (event.key === 'Escape') {
        if (activeOrigin) {
          event.preventDefault();
          event.stopPropagation();
          cancelKeyboardMove();
        }
        return;
      }

      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }
      event.preventDefault();
      event.stopPropagation();

      const tableNumber = info.tableIndex + 1;
      const seatNumber = info.seatIndex + 1;

      if (!activeOrigin) {
        if (!move || !info.hasStudent) {
          return;
        }
        if (info.locked) {
          setAnnouncement(
            translate(
              'seat.keyboard.sourceLocked',
              'Dieser Platz ist gesperrt und kann nicht aufgenommen werden.',
            ),
          );
          return;
        }
        updateOrigin({
          tableIndex: info.tableIndex,
          seatIndex: info.seatIndex,
          studentName: info.studentName ?? '',
        });
        hover?.({
          tableIndex: info.tableIndex,
          seatIndex: info.seatIndex,
          locked: false,
        });
        setAnnouncement(
          translate('seat.keyboard.grabbed', {
            name: info.studentName ?? '',
            defaultValue: `${info.studentName ?? ''} aufgenommen. Mit Tab zum Zielplatz wechseln, Eingabetaste zum Absetzen, Escape zum Abbrechen.`,
          }),
        );
        return;
      }

      // Dropping the grabbed student on its own seat toggles the grab off.
      if (
        activeOrigin.tableIndex === info.tableIndex &&
        activeOrigin.seatIndex === info.seatIndex
      ) {
        cancelKeyboardMove();
        return;
      }

      if (info.locked) {
        optionsRef.current.onDropRejected?.({
          tableIndex: info.tableIndex,
          seatIndex: info.seatIndex,
          locked: true,
        });
        triggerHapticFeedback('error');
        showToast('error', TOAST_MESSAGES.SEAT_LOCKED_DROP);
        setAnnouncement(
          translate('seat.keyboard.lockedTarget', {
            table: tableNumber,
            seat: seatNumber,
            defaultValue: `Tisch ${tableNumber}, Platz ${seatNumber} ist gesperrt. Bitte anderen Platz wählen.`,
          }),
        );
        return;
      }

      const moved = move
        ? move(
            activeOrigin.tableIndex,
            activeOrigin.seatIndex,
            info.tableIndex,
            info.seatIndex,
          )
        : false;
      updateOrigin(null);
      hover?.(null);
      if (moved) {
        triggerHapticFeedback('drop');
        setAnnouncement(
          translate('seat.keyboard.moved', {
            name: activeOrigin.studentName,
            table: tableNumber,
            seat: seatNumber,
            defaultValue: `${activeOrigin.studentName} auf Tisch ${tableNumber}, Platz ${seatNumber} abgesetzt.`,
          }),
        );
      } else {
        setAnnouncement(
          translate('seat.keyboard.moveFailed', 'Umsetzen nicht möglich.'),
        );
      }
    },
    [cancelKeyboardMove, updateOrigin],
  );

  const handleSeatFocus = React.useCallback((info: SeatKeyboardEventInfo) => {
    if (!originRef.current) {
      return;
    }
    optionsRef.current.onHoverChange?.({
      tableIndex: info.tableIndex,
      seatIndex: info.seatIndex,
      locked: info.locked,
    });
  }, []);

  const handleSeatBlur = React.useCallback(() => {
    if (!originRef.current) {
      return;
    }
    optionsRef.current.onHoverChange?.(null);
  }, []);

  return {
    keyboardMoveOrigin: origin,
    keyboardAnnouncement: announcement,
    handleSeatKeyDown,
    handleSeatFocus,
    handleSeatBlur,
    cancelKeyboardMove,
  };
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import type { CircleLayout } from '@/types/Circle';
import { getTooltipName, triggerHapticFeedback } from '@/utils';
import { showToast, TOAST_MESSAGES } from '@/utils/ui/toast';

interface UseCircleKeyboardMoveOptions {
  layout: CircleLayout;
  editable: boolean;
  isPositionLocked: (position: number) => boolean;
  onStudentMove?: (studentId: string, targetPosition: number) => void;
  onMoved?: (from: number, to: number) => void;
}

/**
 * The keyboard's way to move a student in the circle, as the table plan has
 * one: Enter or Space picks the student up, the arrow keys walk round the
 * circle, Enter or Space puts the student down, Escape lets go. Every step is
 * said out loud for a screen reader.
 */
export function useCircleKeyboardMove({
  layout,
  editable,
  isPositionLocked,
  onStudentMove,
  onMoved,
}: UseCircleKeyboardMoveOptions) {
  const { t } = useTranslation('generator');
  const [origin, setOrigin] = React.useState<number | null>(null);
  const [target, setTarget] = React.useState<number | null>(null);
  const [announcement, setAnnouncement] = React.useState('');
  const tokens = React.useRef(new Map<number, SVGElement>());

  const nameAt = React.useCallback(
    (position: number) =>
      getTooltipName(layout.students[position]?.student?.name ?? ''),
    [layout.students],
  );

  /** Ref for a place's focusable token, so the arrows can move focus. */
  const registerToken = React.useCallback(
    (position: number) => (element: SVGElement | null) => {
      if (element) tokens.current.set(position, element);
      else tokens.current.delete(position);
    },
    [],
  );

  const cancel = React.useCallback(() => {
    setOrigin(null);
    setTarget(null);
    setAnnouncement(t('seat.keyboard.cancelled'));
  }, [t]);

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent, position: number) => {
      if (!editable) return;
      const count = layout.students.length;

      if (
        event.key === 'ArrowRight' ||
        event.key === 'ArrowDown' ||
        event.key === 'ArrowLeft' ||
        event.key === 'ArrowUp'
      ) {
        event.preventDefault();
        const step =
          event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
        tokens.current.get((position + step + count) % count)?.focus();
        return;
      }

      if (event.key === 'Escape') {
        if (origin !== null) {
          event.preventDefault();
          cancel();
        }
        return;
      }

      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();

      if (origin === null) {
        if (isPositionLocked(position)) {
          setAnnouncement(t('seat.keyboard.sourceLocked'));
          return;
        }
        setOrigin(position);
        setTarget(null);
        setAnnouncement(
          t('circleView.keyboard.grabbed', { name: nameAt(position) }),
        );
        return;
      }

      if (position === origin) {
        cancel();
        return;
      }

      if (isPositionLocked(position)) {
        triggerHapticFeedback('error');
        showToast('error', TOAST_MESSAGES.SEAT_LOCKED_DROP);
        setAnnouncement(
          t('circleView.keyboard.lockedTarget', { position: position + 1 }),
        );
        return;
      }

      const studentId = layout.students[origin]?.student?.id;
      if (studentId) {
        onStudentMove?.(studentId, position);
        triggerHapticFeedback('drop');
        onMoved?.(origin, position);
        setAnnouncement(
          t('drag.announce.swapped', {
            name: nameAt(origin),
            other: nameAt(position),
          }),
        );
      }
      setOrigin(null);
      setTarget(null);
    },
    [
      cancel,
      editable,
      isPositionLocked,
      layout.students,
      nameAt,
      onMoved,
      onStudentMove,
      origin,
      t,
    ],
  );

  const handleFocus = React.useCallback(
    (position: number) => {
      if (origin !== null) setTarget(position === origin ? null : position);
    },
    [origin],
  );

  return {
    /** The place picked up by keyboard, drawn like a drag's origin. */
    keyboardOrigin: origin,
    /** The place the keyboard points at, drawn like a drag's target. */
    keyboardTarget: target,
    announcement,
    /** What a pointer drop did, said in the same live region. */
    announce: setAnnouncement,
    registerToken,
    handleKeyDown,
    handleFocus,
  };
}

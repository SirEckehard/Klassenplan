// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useSeatKeyboardMove,
  type SeatKeyboardEventInfo,
} from '../useSeatKeyboardMove';

vi.mock('@/utils/ui/toast', () => ({
  showToast: vi.fn(),
  TOAST_MESSAGES: { SEAT_LOCKED_DROP: 'toast:seating.seatLockedDrop' },
}));

import { showToast } from '@/utils/ui/toast';

const createKeyEvent = (key: string) =>
  ({
    key,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
  }) as unknown as React.KeyboardEvent<SVGRectElement>;

const seatInfo = (
  overrides: Partial<SeatKeyboardEventInfo> = {},
): SeatKeyboardEventInfo => ({
  tableIndex: 0,
  seatIndex: 0,
  locked: false,
  hasStudent: true,
  studentName: 'Ada Lovelace',
  ...overrides,
});

describe('useSeatKeyboardMove', () => {
  const moveStudent = vi.fn(() => true);
  const onHoverChange = vi.fn();
  const onDropRejected = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setup = () =>
    renderHook(() =>
      useSeatKeyboardMove({ moveStudent, onHoverChange, onDropRejected }),
    );

  it('grabs an occupied seat with Enter and announces it', () => {
    const { result } = setup();

    act(() => {
      result.current.handleSeatKeyDown(createKeyEvent('Enter'), seatInfo());
    });

    expect(result.current.keyboardMoveOrigin).toEqual({
      tableIndex: 0,
      seatIndex: 0,
      studentName: 'Ada Lovelace',
    });
    expect(onHoverChange).toHaveBeenCalledWith({
      tableIndex: 0,
      seatIndex: 0,
      locked: false,
    });
    expect(result.current.keyboardAnnouncement).toMatch(/Ada Lovelace/);
  });

  it('moves the student when dropping on another seat with Space', () => {
    const { result } = setup();

    act(() => {
      result.current.handleSeatKeyDown(createKeyEvent('Enter'), seatInfo());
    });
    act(() => {
      result.current.handleSeatKeyDown(
        createKeyEvent(' '),
        seatInfo({ tableIndex: 1, seatIndex: 2, hasStudent: false }),
      );
    });

    expect(moveStudent).toHaveBeenCalledWith(0, 0, 1, 2);
    expect(result.current.keyboardMoveOrigin).toBeNull();
    expect(onHoverChange).toHaveBeenLastCalledWith(null);
    expect(result.current.keyboardAnnouncement).toMatch(/Ada Lovelace/);
  });

  it('rejects a locked target and keeps the grab active', () => {
    const { result } = setup();

    act(() => {
      result.current.handleSeatKeyDown(createKeyEvent('Enter'), seatInfo());
    });
    act(() => {
      result.current.handleSeatKeyDown(
        createKeyEvent('Enter'),
        seatInfo({ tableIndex: 1, seatIndex: 1, locked: true }),
      );
    });

    expect(moveStudent).not.toHaveBeenCalled();
    expect(onDropRejected).toHaveBeenCalledWith({
      tableIndex: 1,
      seatIndex: 1,
      locked: true,
    });
    expect(showToast).toHaveBeenCalledWith(
      'error',
      'toast:seating.seatLockedDrop',
    );
    expect(result.current.keyboardMoveOrigin).not.toBeNull();
  });

  it('cancels the grab with Escape', () => {
    const { result } = setup();

    act(() => {
      result.current.handleSeatKeyDown(createKeyEvent('Enter'), seatInfo());
    });
    act(() => {
      result.current.handleSeatKeyDown(
        createKeyEvent('Escape'),
        seatInfo({ tableIndex: 1, seatIndex: 1 }),
      );
    });

    expect(result.current.keyboardMoveOrigin).toBeNull();
    expect(moveStudent).not.toHaveBeenCalled();
    expect(onHoverChange).toHaveBeenLastCalledWith(null);
  });

  it('toggles the grab off when dropping on the origin seat', () => {
    const { result } = setup();

    act(() => {
      result.current.handleSeatKeyDown(createKeyEvent('Enter'), seatInfo());
    });
    act(() => {
      result.current.handleSeatKeyDown(createKeyEvent('Enter'), seatInfo());
    });

    expect(result.current.keyboardMoveOrigin).toBeNull();
    expect(moveStudent).not.toHaveBeenCalled();
  });

  it('does not grab empty or locked seats', () => {
    const { result } = setup();

    act(() => {
      result.current.handleSeatKeyDown(
        createKeyEvent('Enter'),
        seatInfo({ hasStudent: false, studentName: null }),
      );
    });
    expect(result.current.keyboardMoveOrigin).toBeNull();

    act(() => {
      result.current.handleSeatKeyDown(
        createKeyEvent('Enter'),
        seatInfo({ locked: true }),
      );
    });
    expect(result.current.keyboardMoveOrigin).toBeNull();
    expect(result.current.keyboardAnnouncement).toMatch(/gesperrt|locked/i);
  });

  it('mirrors focus as hover feedback only while a grab is active', () => {
    const { result } = setup();

    act(() => {
      result.current.handleSeatFocus(seatInfo({ tableIndex: 1, seatIndex: 1 }));
    });
    expect(onHoverChange).not.toHaveBeenCalled();

    act(() => {
      result.current.handleSeatKeyDown(createKeyEvent('Enter'), seatInfo());
    });
    act(() => {
      result.current.handleSeatFocus(
        seatInfo({ tableIndex: 1, seatIndex: 1, locked: true }),
      );
    });
    expect(onHoverChange).toHaveBeenLastCalledWith({
      tableIndex: 1,
      seatIndex: 1,
      locked: true,
    });

    act(() => {
      result.current.handleSeatBlur();
    });
    expect(onHoverChange).toHaveBeenLastCalledWith(null);
  });

  it('clears the grab and announces failure when moveStudent rejects', () => {
    moveStudent.mockReturnValueOnce(false);
    const { result } = setup();

    act(() => {
      result.current.handleSeatKeyDown(createKeyEvent('Enter'), seatInfo());
    });
    act(() => {
      result.current.handleSeatKeyDown(
        createKeyEvent('Enter'),
        seatInfo({ tableIndex: 2, seatIndex: 0, hasStudent: false }),
      );
    });

    expect(result.current.keyboardMoveOrigin).toBeNull();
    expect(result.current.keyboardAnnouncement).toMatch(
      /nicht möglich|not possible/i,
    );
  });

  it('cancelKeyboardMove releases an active grab', () => {
    const { result } = setup();

    act(() => {
      result.current.handleSeatKeyDown(createKeyEvent('Enter'), seatInfo());
    });
    act(() => {
      result.current.cancelKeyboardMove();
    });

    expect(result.current.keyboardMoveOrigin).toBeNull();
    expect(onHoverChange).toHaveBeenLastCalledWith(null);
  });
});

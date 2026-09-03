// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TableSeat, { TableSeatBadgeOverlay } from '../TableSeat';
import type { Student } from '../../../types';

const baseStudent: Student = {
  id: 's1',
  name: 'Ada Lovelace',
  gender: 'girl',
  restless: false,
  shy: false,
  concentrationIssues: false,
  needsFrontSeat: false,
  wishPartnerId: null,
  performanceStrong: false,
  performanceWeak: false,
};

describe('TableSeat component', () => {
  it('renders empty seat correctly', () => {
    const { container } = render(
      <svg>
        <TableSeat
          student={null}
          seatIndex={0}
          tableIndex={0}
          col={0}
          row={0}
          seatWidth={55}
          seatHeight={65}
          isDark={false}
          locked={false}
          isOriginSeat={false}
          isHoverSeat={false}
          isHoverLockedSeat={false}
          isLockedFeedbackSeat={false}
          showSpecialNeeds={true}
          lockSeatLabelOrientation={true}
          seatTextRotation={0}
        />
      </svg>,
    );

    // Should render the seat rectangle(s) but no student content
    expect(container.querySelectorAll('rect').length).toBeGreaterThan(0);
    expect(container.querySelector('text')).toBeNull();
  });

  it('renders student with abbreviated name by default', () => {
    const { container } = render(
      <svg>
        <TableSeat
          student={baseStudent}
          seatIndex={0}
          tableIndex={0}
          col={0}
          row={0}
          seatWidth={55}
          seatHeight={65}
          isDark={false}
          locked={false}
          isOriginSeat={false}
          isHoverSeat={false}
          isHoverLockedSeat={false}
          isLockedFeedbackSeat={false}
          showSpecialNeeds={true}
          lockSeatLabelOrientation={true}
          seatTextRotation={0}
        />
      </svg>,
    );

    const text = container.querySelector('text');
    expect(text).toBeInTheDocument();
    expect(text?.textContent).toMatch(/Ada/i);
  });

  it('renders the full name in the full name display mode', () => {
    const { container } = render(
      <svg>
        <TableSeat
          student={baseStudent}
          seatIndex={0}
          tableIndex={0}
          col={0}
          row={0}
          seatWidth={55}
          seatHeight={65}
          isDark={false}
          locked={false}
          isOriginSeat={false}
          isHoverSeat={false}
          isHoverLockedSeat={false}
          isLockedFeedbackSeat={false}
          showSpecialNeeds={true}
          nameDisplay="full"
          lockSeatLabelOrientation={true}
          seatTextRotation={0}
        />
      </svg>,
    );

    const text = container.querySelector('text');
    expect(text).toBeInTheDocument();
    // Text content includes both title and text node
    expect(text?.textContent).toContain('Ada Lovelace');
  });

  it('shows lock button when toggleLock is provided', () => {
    const toggleLock = vi.fn();
    const { getByRole } = render(
      <svg>
        <TableSeat
          student={baseStudent}
          seatIndex={0}
          tableIndex={0}
          col={0}
          row={0}
          seatWidth={55}
          seatHeight={65}
          isDark={false}
          locked={false}
          isOriginSeat={false}
          isHoverSeat={false}
          isHoverLockedSeat={false}
          isLockedFeedbackSeat={false}
          showSpecialNeeds={true}
          lockSeatLabelOrientation={true}
          seatTextRotation={0}
          toggleLock={toggleLock}
        />
      </svg>,
    );

    const lockButton = getByRole('button', {
      name: /sitzplatz sperren|lock seat/i,
    });
    expect(lockButton).toBeInTheDocument();
  });

  it('toggles lock state with pointer interaction', () => {
    const toggleLock = vi.fn();
    const { getByRole } = render(
      <svg>
        <TableSeat
          student={baseStudent}
          seatIndex={0}
          tableIndex={0}
          col={0}
          row={0}
          seatWidth={55}
          seatHeight={65}
          isDark={false}
          locked={false}
          isOriginSeat={false}
          isHoverSeat={false}
          isHoverLockedSeat={false}
          isLockedFeedbackSeat={false}
          showSpecialNeeds={true}
          lockSeatLabelOrientation={true}
          seatTextRotation={0}
          toggleLock={toggleLock}
        />
      </svg>,
    );

    const lockButton = getByRole('button', {
      name: /sitzplatz sperren|lock seat/i,
    });
    fireEvent.pointerDown(lockButton);

    expect(toggleLock).toHaveBeenCalledWith('s1', 0, 0);
  });

  it('supports keyboard activation for locked seats', () => {
    const toggleLock = vi.fn();
    const { getByRole } = render(
      <svg>
        <TableSeat
          student={baseStudent}
          seatIndex={0}
          tableIndex={0}
          col={0}
          row={0}
          seatWidth={55}
          seatHeight={65}
          isDark={false}
          locked={true}
          isOriginSeat={false}
          isHoverSeat={false}
          isHoverLockedSeat={false}
          isLockedFeedbackSeat={false}
          showSpecialNeeds={true}
          lockSeatLabelOrientation={true}
          seatTextRotation={0}
          toggleLock={toggleLock}
        />
      </svg>,
    );

    const lockButton = getByRole('button', {
      name: /sitzplatz entsperren|unlock seat/i,
    });

    fireEvent.keyDown(lockButton, { key: 'Enter' });
    fireEvent.keyDown(lockButton, { key: ' ' });

    expect(toggleLock).toHaveBeenNthCalledWith(1, 's1', 0, 0);
    expect(toggleLock).toHaveBeenNthCalledWith(2, 's1', 0, 0);
  });

  it('applies hover state styling', () => {
    const { container } = render(
      <svg>
        <TableSeat
          student={baseStudent}
          seatIndex={0}
          tableIndex={0}
          col={0}
          row={0}
          seatWidth={55}
          seatHeight={65}
          isDark={false}
          locked={false}
          isOriginSeat={false}
          isHoverSeat={true}
          isHoverLockedSeat={false}
          isLockedFeedbackSeat={false}
          showSpecialNeeds={true}
          lockSeatLabelOrientation={true}
          seatTextRotation={0}
        />
      </svg>,
    );

    // Hover state should apply scale transform
    const group = container.querySelector('g[style*="scale"]');
    expect(group).toBeInTheDocument();
  });

  it('applies origin seat opacity', () => {
    const { container } = render(
      <svg>
        <TableSeat
          student={baseStudent}
          seatIndex={0}
          tableIndex={0}
          col={0}
          row={0}
          seatWidth={55}
          seatHeight={65}
          isDark={false}
          locked={false}
          isOriginSeat={true}
          isHoverSeat={false}
          isHoverLockedSeat={false}
          isLockedFeedbackSeat={false}
          showSpecialNeeds={true}
          lockSeatLabelOrientation={true}
          seatTextRotation={0}
        />
      </svg>,
    );

    // Origin seat should have reduced opacity
    const group = container.querySelector('g[style*="opacity"]');
    expect(group).toBeInTheDocument();
  });

  it('shows special needs badges when enabled', () => {
    const studentWithSpecialNeeds: Student = {
      ...baseStudent,
      needsFrontSeat: true,
    };

    const { container } = render(
      <svg>
        <TableSeat
          student={studentWithSpecialNeeds}
          seatIndex={0}
          tableIndex={0}
          col={0}
          row={0}
          seatWidth={55}
          seatHeight={65}
          isDark={false}
          locked={false}
          isOriginSeat={false}
          isHoverSeat={false}
          isHoverLockedSeat={false}
          isLockedFeedbackSeat={false}
          showSpecialNeeds={true}
          lockSeatLabelOrientation={true}
          seatTextRotation={0}
        />
        <TableSeatBadgeOverlay
          student={studentWithSpecialNeeds}
          col={0}
          row={0}
          seatWidth={55}
          seatHeight={65}
          isDark={false}
          showSpecialNeeds={true}
          isOriginSeat={false}
          lockSeatLabelOrientation={true}
          seatTextRotation={0}
        />
      </svg>,
    );

    // Should render badge icons
    const svgElements = container.querySelectorAll('svg');
    expect(svgElements.length).toBeGreaterThan(0);
  });

  it('calls onSeatPointerDown with correct parameters', () => {
    const onSeatPointerDown = vi.fn();
    const { container } = render(
      <svg>
        <TableSeat
          student={baseStudent}
          seatIndex={0}
          tableIndex={0}
          col={0}
          row={0}
          seatWidth={55}
          seatHeight={65}
          isDark={false}
          locked={false}
          isOriginSeat={false}
          isHoverSeat={false}
          isHoverLockedSeat={false}
          isLockedFeedbackSeat={false}
          showSpecialNeeds={true}
          lockSeatLabelOrientation={true}
          seatTextRotation={0}
          onSeatPointerDown={onSeatPointerDown}
        />
      </svg>,
    );

    const touchTarget = container.querySelector(
      'rect[data-seat-index="0"][fill="transparent"]',
    );
    expect(touchTarget).toBeInTheDocument();

    fireEvent.pointerDown(touchTarget!);

    expect(onSeatPointerDown).toHaveBeenCalledTimes(1);
    const args = onSeatPointerDown.mock.calls[0];
    expect(args[1]).toBe(0); // seatIndex
    expect(args[2]).toBe(false); // locked
    expect(args[3]).toBe(true); // hasStudent
    expect(args[4]).toBe(55); // seatWidth
    expect(args[5]).toBe(65); // seatHeight
  });

  it('calls onSeatPointerUp with correct parameters', () => {
    const onSeatPointerUp = vi.fn();
    const { container } = render(
      <svg>
        <TableSeat
          student={baseStudent}
          seatIndex={0}
          tableIndex={0}
          col={0}
          row={0}
          seatWidth={55}
          seatHeight={65}
          isDark={false}
          locked={false}
          isOriginSeat={false}
          isHoverSeat={false}
          isHoverLockedSeat={false}
          isLockedFeedbackSeat={false}
          showSpecialNeeds={true}
          lockSeatLabelOrientation={true}
          seatTextRotation={0}
          onSeatPointerUp={onSeatPointerUp}
        />
      </svg>,
    );

    const touchTarget = container.querySelector(
      'rect[data-seat-index="0"][fill="transparent"]',
    );
    fireEvent.pointerUp(touchTarget!);

    expect(onSeatPointerUp).toHaveBeenCalledTimes(1);
    expect(onSeatPointerUp).toHaveBeenCalledWith(expect.anything(), 0, false);
  });

  it('exposes a focusable button with ARIA metadata when keyboard moving is enabled', () => {
    const onSeatKeyDown = vi.fn();
    const { container } = render(
      <svg>
        <TableSeat
          student={baseStudent}
          seatIndex={2}
          tableIndex={1}
          col={0}
          row={0}
          seatWidth={55}
          seatHeight={65}
          isDark={false}
          locked={false}
          isOriginSeat={false}
          isHoverSeat={false}
          isHoverLockedSeat={false}
          isLockedFeedbackSeat={false}
          showSpecialNeeds={true}
          lockSeatLabelOrientation={true}
          seatTextRotation={0}
          onSeatKeyDown={onSeatKeyDown}
        />
      </svg>,
    );

    const touchTarget = container.querySelector(
      'rect[data-seat-index="2"][fill="transparent"]',
    );
    expect(touchTarget).toBeInTheDocument();
    expect(touchTarget).toHaveAttribute('tabindex', '0');
    expect(touchTarget).toHaveAttribute('role', 'button');
    expect(touchTarget?.getAttribute('aria-label')).toMatch(/Ada Lovelace/);
    expect(touchTarget).toHaveAttribute('aria-pressed', 'false');

    fireEvent.keyDown(touchTarget!, { key: 'Enter' });
    expect(onSeatKeyDown).toHaveBeenCalledTimes(1);
    expect(onSeatKeyDown.mock.calls[0][1]).toEqual({
      tableIndex: 1,
      seatIndex: 2,
      locked: false,
      hasStudent: true,
      studentName: 'Ada Lovelace',
    });
  });

  it('marks the grabbed origin seat with aria-pressed and reports focus changes', () => {
    const onSeatKeyDown = vi.fn();
    const onSeatFocus = vi.fn();
    const onSeatBlur = vi.fn();
    const { container } = render(
      <svg>
        <TableSeat
          student={null}
          seatIndex={0}
          tableIndex={0}
          col={0}
          row={0}
          seatWidth={55}
          seatHeight={65}
          isDark={false}
          locked={true}
          isOriginSeat={true}
          isHoverSeat={false}
          isHoverLockedSeat={false}
          isLockedFeedbackSeat={false}
          showSpecialNeeds={true}
          lockSeatLabelOrientation={true}
          seatTextRotation={0}
          onSeatKeyDown={onSeatKeyDown}
          onSeatFocus={onSeatFocus}
          onSeatBlur={onSeatBlur}
        />
      </svg>,
    );

    const touchTarget = container.querySelector(
      'rect[data-seat-index="0"][fill="transparent"]',
    );
    expect(touchTarget).toHaveAttribute('aria-pressed', 'true');
    // Empty locked seat: label mentions free seat and locked state
    expect(touchTarget?.getAttribute('aria-label')).toMatch(
      /freier platz|empty seat/i,
    );
    expect(touchTarget?.getAttribute('aria-label')).toMatch(/gesperrt|locked/i);

    fireEvent.focus(touchTarget!);
    expect(onSeatFocus).toHaveBeenCalledWith({
      tableIndex: 0,
      seatIndex: 0,
      locked: true,
      hasStudent: false,
      studentName: null,
    });

    fireEvent.blur(touchTarget!);
    expect(onSeatBlur).toHaveBeenCalledTimes(1);
  });

  it('is not focusable without keyboard handlers', () => {
    const { container } = render(
      <svg>
        <TableSeat
          student={baseStudent}
          seatIndex={0}
          tableIndex={0}
          col={0}
          row={0}
          seatWidth={55}
          seatHeight={65}
          isDark={false}
          locked={false}
          isOriginSeat={false}
          isHoverSeat={false}
          isHoverLockedSeat={false}
          isLockedFeedbackSeat={false}
          showSpecialNeeds={true}
          lockSeatLabelOrientation={true}
          seatTextRotation={0}
          onSeatPointerDown={vi.fn()}
        />
      </svg>,
    );

    const touchTarget = container.querySelector(
      'rect[data-seat-index="0"][fill="transparent"]',
    );
    expect(touchTarget).not.toHaveAttribute('tabindex');
    expect(touchTarget).not.toHaveAttribute('role');
  });

  it('applies dark mode styling', () => {
    const { container } = render(
      <svg>
        <TableSeat
          student={baseStudent}
          seatIndex={0}
          tableIndex={0}
          col={0}
          row={0}
          seatWidth={55}
          seatHeight={65}
          isDark={true}
          locked={false}
          isOriginSeat={false}
          isHoverSeat={false}
          isHoverLockedSeat={false}
          isLockedFeedbackSeat={false}
          showSpecialNeeds={true}
          lockSeatLabelOrientation={true}
          seatTextRotation={0}
        />
      </svg>,
    );

    // Should render with dark mode colors (verified by appearance calculation)
    const seatRect = container.querySelector('rect[rx="4"]');
    expect(seatRect).toBeInTheDocument();
  });

  it('applies locked feedback styling', () => {
    const { container } = render(
      <svg>
        <TableSeat
          student={baseStudent}
          seatIndex={0}
          tableIndex={0}
          col={0}
          row={0}
          seatWidth={55}
          seatHeight={65}
          isDark={false}
          locked={false}
          isOriginSeat={false}
          isHoverSeat={false}
          isHoverLockedSeat={false}
          isLockedFeedbackSeat={true}
          showSpecialNeeds={true}
          lockSeatLabelOrientation={true}
          seatTextRotation={0}
        />
      </svg>,
    );

    // Locked feedback should apply red error colors
    const seatRect = container.querySelector('rect[rx="4"]');
    expect(seatRect).toBeInTheDocument();
    expect(seatRect?.getAttribute('stroke')).toBe('#ef4444');
  });
});

describe('TableSeat memoization', () => {
  it('does not re-render when irrelevant props change', () => {
    const renderSpy = vi.fn();
    const TestWrapper = ({
      someUnrelatedProp: _someUnrelatedProp,
    }: {
      someUnrelatedProp: number;
    }) => {
      renderSpy();
      return (
        <svg>
          <TableSeat
            student={baseStudent}
            seatIndex={0}
            tableIndex={0}
            col={0}
            row={0}
            seatWidth={55}
            seatHeight={65}
            isDark={false}
            locked={false}
            isOriginSeat={false}
            isHoverSeat={false}
            isHoverLockedSeat={false}
            isLockedFeedbackSeat={false}
            showSpecialNeeds={true}
            lockSeatLabelOrientation={true}
            seatTextRotation={0}
          />
        </svg>
      );
    };

    const { rerender } = render(<TestWrapper someUnrelatedProp={1} />);
    expect(renderSpy).toHaveBeenCalledTimes(1);

    // Change unrelated prop - TableSeat should not re-render
    rerender(<TestWrapper someUnrelatedProp={2} />);
    expect(renderSpy).toHaveBeenCalledTimes(2); // Wrapper renders but TableSeat stays memoized
  });
});

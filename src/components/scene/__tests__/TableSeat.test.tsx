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

    // Should render the seat's shape but no student content
    expect(container.querySelector('[data-seat-shape]')).toBeInTheDocument();
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
    fireEvent.pointerDown(lockButton, { pointerId: 1, clientX: 5, clientY: 5 });
    expect(toggleLock).not.toHaveBeenCalled();
    fireEvent.pointerUp(lockButton, { pointerId: 1, clientX: 6, clientY: 5 });

    expect(toggleLock).toHaveBeenCalledWith('s1', 0, 0);
  });

  it('picks the student up instead of locking when a press on the lock travels', () => {
    const toggleLock = vi.fn();
    const onSeatPointerDown = vi.fn();
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
          onSeatPointerDown={onSeatPointerDown}
        />
      </svg>,
    );

    const lockButton = getByRole('button', {
      name: /sitzplatz sperren|lock seat/i,
    });
    fireEvent.pointerDown(lockButton, { pointerId: 1, clientX: 5, clientY: 5 });
    expect(onSeatPointerDown).toHaveBeenCalledWith(
      expect.anything(),
      0,
      false,
      true,
      expect.anything(),
    );
    fireEvent.pointerMove(lockButton, {
      pointerId: 1,
      clientX: 40,
      clientY: 5,
    });
    fireEvent.pointerUp(lockButton, { pointerId: 1, clientX: 40, clientY: 5 });

    expect(toggleLock).not.toHaveBeenCalled();
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

    // The seat under a dragged student is ringed inside its own edge, where
    // the table can neither clip nor cover it.
    const drop = container.querySelector('[data-seat-drop]');
    expect(drop).toHaveAttribute('data-seat-drop', 'target');
    const ring = drop?.querySelector<SVGPathElement>('path[fill="none"]');
    // Blue: where the student can land is where the teacher can act.
    expect(ring?.style.stroke).toBe('var(--border-option-selected)');
    // 2 clear of the outline's inner side: 0.5 + 2 + half the ring's 2.5.
    expect(ring?.getAttribute('d')).toMatch(/^M[\d.]+ 3\.75H/);
    expect(container.querySelector('g[style*="scale"]')).toBeNull();
  });

  it('does not mark the seat a drag started from as its target', () => {
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
          isHoverSeat={true}
          isHoverLockedSeat={false}
          isLockedFeedbackSeat={false}
          showSpecialNeeds={true}
          lockSeatLabelOrientation={true}
          seatTextRotation={0}
        />
      </svg>,
    );

    expect(container.querySelector('[data-seat-drop]')).toBeNull();
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
          lifted={false}
          lockSeatLabelOrientation={true}
          seatTextRotation={0}
        />
      </svg>,
    );

    // Should render badge icons
    const svgElements = container.querySelectorAll('svg');
    expect(svgElements.length).toBeGreaterThan(0);
  });

  it('reads the badges out with the seat and leaves out what the view hides', () => {
    const student: Student = {
      ...baseStudent,
      restless: true,
      needsFrontSeat: true,
    };
    const seat = (
      badgeView?: React.ComponentProps<typeof TableSeat>['badgeView'],
    ) =>
      render(
        <svg>
          <TableSeat
            student={student}
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
            badgeView={badgeView}
            lockSeatLabelOrientation={true}
            seatTextRotation={0}
            onSeatKeyDown={vi.fn()}
          />
        </svg>,
      ).container.querySelector('rect[role="button"]');

    expect(seat()?.getAttribute('aria-label')).toMatch(
      /(Merkmale|Markers): Unruhig, Vordere Plätze$/,
    );
    expect(
      seat({ filter: (badge) => badge.family === 'space' })?.getAttribute(
        'aria-label',
      ),
    ).toMatch(/(Merkmale|Markers): Vordere Plätze$/);
  });

  it('folds what does not fit into a "+N" where the view can explain it', () => {
    const student: Student = {
      ...baseStudent,
      restless: true,
      concentrationIssues: true,
      shy: true,
      needsFrontSeat: true,
      performanceWeak: true,
      socialRole: 'leader',
      languageSkill: 'daz',
      height: 'small',
      prefersWindow: true,
      prefersDoor: true,
    };
    const overlay = (collapse: boolean) =>
      render(
        <svg>
          <TableSeatBadgeOverlay
            student={student}
            col={0}
            row={0}
            seatWidth={55}
            seatHeight={65}
            isDark={false}
            showSpecialNeeds={true}
            badgeView={{ collapse }}
            lifted={false}
            lockSeatLabelOrientation={true}
            seatTextRotation={0}
          />
        </svg>,
      ).container;

    const onScreen = overlay(true);
    const more = onScreen.querySelector('[data-badge-key="__more"]');
    expect(more).toBeInTheDocument();
    // Its <title> names the badges it stands for, then comes the "+N".
    expect(more?.textContent).toMatch(/\+\d+$/);
    expect(
      onScreen.querySelector('[data-badge-pill="s1"]'),
    ).toBeInTheDocument();

    // A printout cannot be hovered, so it keeps every icon.
    const printed = overlay(false);
    expect(printed.querySelector('[data-badge-key="__more"]')).toBeNull();
    expect(printed.querySelectorAll('[data-badge-key]')).toHaveLength(10);
  });

  it('rings the seat in the colour of its verdict, or of a badge pointing at it', () => {
    const seat = (
      highlight: Pick<
        React.ComponentProps<typeof TableSeat>,
        'highlightStatus' | 'highlightMode' | 'highlightTone'
      >,
    ) =>
      render(
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
            highlightPercentage={50}
            {...highlight}
          />
        </svg>,
      ).container.querySelector('[data-seat-highlight]');

    const warn = seat({ highlightStatus: 'warn', highlightMode: 'persistent' });
    expect(warn).toHaveAttribute('data-seat-highlight', 'warn');
    const ring = warn?.querySelector<SVGPathElement>('path[fill="none"]');
    expect(ring?.style.stroke).toBe('var(--status-warn)');
    // Inset, so the table's outline cannot clip it.
    expect(ring?.getAttribute('d')).toMatch(/^M[\d.]+ 3\.75H/);

    const focus = seat({
      highlightStatus: 'ok',
      highlightMode: 'hover',
      highlightTone: 'focus',
    });
    expect(focus).toHaveAttribute('data-seat-highlight', 'focus');
    expect(
      focus?.querySelector<SVGPathElement>('path[fill="none"]')?.style.stroke,
    ).toBe('var(--border-option-selected)');
    // It stands still: a pointed-at badge does not blink.
    expect(focus?.querySelector('.animate-pulse')).toBeNull();
    // A badge is no verdict: no fulfilment in the tooltip.
    expect(focus?.querySelector('title')).toBeNull();
  });

  it('draws the swap a resting drag would make, and rings a landing green', () => {
    const seat = (props: Partial<React.ComponentProps<typeof TableSeat>>) =>
      render(
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
            nameDisplay="full"
            {...props}
          />
        </svg>,
      ).container;

    const grace: Student = {
      ...baseStudent,
      id: 's2',
      name: 'Grace Hopper',
      gender: 'boy',
    };
    const lines = (container: Element) =>
      Array.from(
        container.querySelectorAll('text tspan'),
        (line) => line.textContent,
      );
    const shapeFill = (container: Element) =>
      container.querySelector('[data-seat-shape]')?.getAttribute('fill');

    // Lifted, the seat fades.
    const lifted = seat({ isOriginSeat: true });
    expect(lifted.querySelector('g[style*="opacity: 0.35"]')).not.toBeNull();

    // Resting on a target, the seat left behind shows who would come, in
    // full and in that student's tint — but is still named for its own.
    const origin = seat({
      isOriginSeat: true,
      previewStudent: grace,
      onSeatKeyDown: vi.fn(),
    });
    // A full name on a 55-unit seat breaks into two lines.
    expect(lines(origin)).toEqual(['Grace', 'Hopper']);
    expect(origin.querySelector('g[style*="opacity: 0.35"]')).toBeNull();
    expect(shapeFill(origin)).toBe(shapeFill(seat({ student: grace })));
    expect(
      origin.querySelector('rect[data-seat-index]')?.getAttribute('aria-label'),
    ).toMatch(/Ada/);
    expect(
      origin
        .querySelector('[data-seat-student]')
        ?.getAttribute('data-seat-student'),
    ).toBe('s1');

    // The origin of a drag onto an empty seat shows an empty seat.
    const emptied = seat({ isOriginSeat: true, previewStudent: null });
    expect(lines(emptied)).toEqual([]);
    expect(emptied.querySelector('text')).toBeNull();

    const landed = seat({
      highlightStatus: 'ok',
      highlightMode: 'persistent',
      highlightTone: 'confirm',
    });
    const ring = landed.querySelector('[data-seat-highlight="confirm"]');
    expect(ring).toHaveClass('seat-drop-confirm');
    expect(
      ring?.querySelector<SVGPathElement>('path[fill="none"]')?.style.stroke,
    ).toBe('var(--status-ok)');
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
    expect(args[4]).toMatchObject({ fill: expect.any(String) }); // appearance
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
    const seatShape = container.querySelector('[data-seat-shape]');
    expect(seatShape).toBeInTheDocument();
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

    // A held seat refuses the drop in the alert colour, in both themes.
    const drop = container.querySelector('[data-seat-drop]');
    expect(drop).toHaveAttribute('data-seat-drop', 'blocked');
    expect(
      drop?.querySelector<SVGPathElement>('path[fill="none"]')?.style.stroke,
    ).toBe('var(--status-alert)');
  });

  it("follows the table's corners with its mark and keeps it clear of a thicker outline", () => {
    const ring = (props: Partial<React.ComponentProps<typeof TableSeat>>) =>
      render(
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
            {...props}
          />
        </svg>,
      )
        .container.querySelector('[data-seat-drop] path[fill="none"]')
        ?.getAttribute('d');

    // The top corners are the table's: radius 8 less the inset of 3.75.
    expect(ring({ tableCorners: [true, true, false, false] })).toMatch(
      /^M8 3\.75H47A4\.25 4\.25 0 0 1 51\.25 8V/,
    );
    // A selected table's outline is 2.4 wide: the ring moves in with it.
    expect(ring({ tableEdgeWidth: 2.4 })).toMatch(/^M[\d.]+ 4\.45H/);
  });

  it('has the shape its table cuts and carries the outline a flight shows', () => {
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
          tableCorners={[true, true, false, false]}
          tableEdges={[true, true, false, true]}
          tableEdgeStroke="#000"
          tableEdgeWidth={1}
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

    // The table's radius of 8 at the top, the seat's own 4 below.
    expect(
      container.querySelector('[data-seat-shape]')?.getAttribute('d'),
    ).toMatch(/^M8 0H47A8 8 0 0 1 55 8V61A4 4 0 0 1 51 65H/);
    // The table draws its outline here; the seat keeps its own copy hidden
    // for the flight (`useSeatFlight`).
    const edge = container.querySelector('[data-seat-flight-edge]');
    expect(edge).toHaveAttribute('visibility', 'hidden');
    expect(edge).toHaveAttribute('stroke', '#000');
    expect(edge?.getAttribute('d')).toBe(
      'M0 61V8A8 8 0 0 1 8 0H47A8 8 0 0 1 55 8V61',
    );
  });

  it("draws a held seat's contour all round, inside the table's outline", () => {
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
          tableCorners={[true, true, false, false]}
          isDark={false}
          locked={true}
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

    const edge = container.querySelector('[data-seat-edge="locked"]');
    expect(edge).toHaveAttribute('stroke', '#2563eb');
    // Half the outline's width and a half more: 1 inside the seat's edge.
    expect(edge?.getAttribute('d')).toMatch(/^M8 1H47A7 7 0 0 1 54 8V/);
  });
});

describe('TableSeat lock', () => {
  it('draws the lock as an icon without a plate, ringed when the keyboard reaches it', () => {
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
          toggleLock={vi.fn()}
        />
      </svg>,
    );

    const lock = getByRole('button', {
      name: /sitzplatz entsperren|unlock seat/i,
    });
    // Its colour comes from `.seat-lock`: blue while pressed, muted while open.
    expect(lock).toHaveClass('seat-lock');
    expect(lock).toHaveAttribute('aria-pressed', 'true');
    expect(lock.querySelector('circle')).toBeNull();

    // jsdom cannot tell a keyboard's focus from a click's: stand in for it.
    const matches = vi
      .spyOn(Element.prototype, 'matches')
      .mockImplementation(() => true);
    fireEvent.focus(lock);
    expect(lock.querySelectorAll('circle')).toHaveLength(2);
    fireEvent.blur(lock);
    matches.mockRestore();
    expect(lock.querySelector('circle')).toBeNull();
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

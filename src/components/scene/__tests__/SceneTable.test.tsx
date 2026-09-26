// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TableIcon from '../SceneTable';
import type { ClassroomTable, Student } from '../../../types';
import type { TableRotationHandler } from '@/hooks/scene/useTableRotation';

const baseTable: ClassroomTable = {
  x: 0,
  y: 0,
  width: 100,
  height: 60,
  rotation: 0,
  seatCount: 1,
  locked: false,
  zIndex: 0,
};

const student: Student = {
  id: 's1',
  name: 'Ada',
  gender: 'girl',
  restless: false,
  shy: false,
  concentrationIssues: false,
  needsFrontSeat: false,
  wishPartnerId: null,
  performanceStrong: false,
  performanceWeak: false,
};

describe('SceneTable seat locking', () => {
  it('toggles lock state with pointer interaction', () => {
    const toggleLock = vi.fn();
    const isSeatLocked = vi.fn().mockReturnValue(false);

    const { getByRole } = render(
      <svg>
        <TableIcon
          table={baseTable}
          index={0}
          students={[student]}
          selected={false}
          draggable
          isSeatLocked={isSeatLocked}
          toggleLock={toggleLock}
          editable={false}
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
    const isSeatLocked = vi.fn().mockReturnValue(true);

    const { getByRole } = render(
      <svg>
        <TableIcon
          table={baseTable}
          index={0}
          students={[student]}
          selected={false}
          draggable
          isSeatLocked={isSeatLocked}
          toggleLock={toggleLock}
          editable={false}
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
});

describe('SceneTable seat lock hover reveal', () => {
  const stubHoverPointer = () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: query === '(hover: hover) and (pointer: fine)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
  };

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const renderTable = (locked: boolean) => {
    const toggleLock = vi.fn();
    const utils = render(
      <svg>
        <TableIcon
          table={baseTable}
          index={0}
          students={[student]}
          selected={false}
          draggable
          isSeatLocked={vi.fn().mockReturnValue(locked)}
          toggleLock={toggleLock}
          editable={false}
        />
      </svg>,
    );
    const lockButton = utils.getByRole('button', {
      name: locked
        ? /sitzplatz entsperren|unlock seat/i
        : /sitzplatz sperren|lock seat/i,
    });
    return { ...utils, lockButton, toggleLock };
  };

  it('hides the open lock until the seat is hovered on hover pointers', () => {
    stubHoverPointer();
    const { container, lockButton } = renderTable(false);

    expect(lockButton.style.opacity).toBe('0');
    expect(lockButton.style.pointerEvents).toBe('none');

    const seatTarget = container.querySelector('rect[data-seat-index="0"]');
    expect(seatTarget).toBeTruthy();
    fireEvent.pointerEnter(seatTarget as Element);
    expect(lockButton.style.opacity).toBe('1');
    expect(lockButton.style.pointerEvents).toBe('auto');

    fireEvent.pointerLeave(seatTarget as Element);
    expect(lockButton.style.opacity).toBe('0');
  });

  it('keeps the closed lock always visible', () => {
    stubHoverPointer();
    const { lockButton } = renderTable(true);
    expect(lockButton.style.opacity).toBe('1');
    expect(lockButton.style.pointerEvents).toBe('auto');
  });

  it('reveals the lock on keyboard focus', () => {
    stubHoverPointer();
    const { lockButton } = renderTable(false);
    fireEvent.focus(lockButton);
    expect(lockButton.style.opacity).toBe('1');
    fireEvent.blur(lockButton);
    expect(lockButton.style.opacity).toBe('0');
  });

  it('stays always visible without hover capability (touch fallback)', () => {
    // No matchMedia stub → jsdom fallback = no hover pointer
    const { lockButton } = renderTable(false);
    expect(lockButton.style.opacity).toBe('1');
    expect(lockButton.style.pointerEvents).toBe('auto');
  });
});

describe('SceneTable seat label rotation', () => {
  it('applies additional rotation when labels stay upright', () => {
    const toggleLock = vi.fn();
    const isSeatLocked = vi.fn().mockReturnValue(false);

    const { getAllByText, getByRole } = render(
      <svg>
        <TableIcon
          table={{ ...baseTable, rotation: 30 }}
          index={0}
          students={[student]}
          selected={false}
          toggleLock={toggleLock}
          isSeatLocked={isSeatLocked}
          editable={false}
          seatLabelRotation={15}
        />
      </svg>,
    );

    const labels = getAllByText('Ada');
    const textLabel = labels.find((el) => el.tagName === 'text');
    expect(textLabel).toHaveAttribute('transform', 'rotate(-15 50 30)');

    const lockButton = getByRole('button', {
      name: /sitzplatz sperren|lock seat/i,
    });
    // LockIcon button stays anchored while the background keeps upright orientation
    const transform = lockButton.getAttribute('transform');
    expect(transform).toBe('translate(1 1)');

    const circle = lockButton.querySelector('circle');
    expect(circle).toHaveAttribute('transform', 'rotate(-30 10 10)');
  });

  it('keeps transforms unchanged when names rotate with the table', () => {
    const toggleLock = vi.fn();
    const isSeatLocked = vi.fn().mockReturnValue(false);

    const { getAllByText, getByRole } = render(
      <svg>
        <TableIcon
          table={{ ...baseTable, rotation: 45 }}
          index={0}
          students={[student]}
          selected={false}
          toggleLock={toggleLock}
          isSeatLocked={isSeatLocked}
          editable={false}
          lockSeatLabelOrientation={false}
          seatLabelRotation={20}
        />
      </svg>,
    );

    const labels = getAllByText('Ada');
    const textLabel = labels.find((el) => el.tagName === 'text');
    expect(textLabel).not.toHaveAttribute('transform');
    const button = getByRole('button', {
      name: /sitzplatz sperren|lock seat/i,
    });
    expect(button).toHaveAttribute('transform', 'translate(1 1)');

    const circle = button.querySelector('circle');
    expect(circle).not.toHaveAttribute('transform');
  });
});

describe('SceneTable rotate handle visibility', () => {
  it('shows the rotate handle only while selected or hovered', () => {
    const { container } = render(
      <svg>
        <TableIcon
          table={baseTable}
          index={0}
          students={[student]}
          selected={false}
          editable={true}
        />
      </svg>,
    );

    expect(container.querySelector('circle[r="10"]')).toBeNull();

    const tableGroup = container.querySelector(
      'g[data-table-index="0"]',
    ) as Element;
    fireEvent.pointerEnter(tableGroup);
    expect(container.querySelector('circle[r="10"]')).toBeTruthy();

    fireEvent.pointerLeave(tableGroup);
    expect(container.querySelector('circle[r="10"]')).toBeNull();
  });
});

describe('SceneTable rotation with parent updates', () => {
  const getBoundingBox = () => ({
    left: 100,
    top: 100,
    width: 100,
    height: 60,
    right: 200,
    bottom: 160,
    x: 100,
    y: 100,
    toJSON: () => ({}),
  });

  function RotatingScene() {
    const [tables, setTables] = React.useState<ClassroomTable[]>([
      { ...baseTable },
    ]);

    // The parent turns the table from the angle it had when the handle was
    // pressed, as the room layer does.
    const handleRotate = React.useCallback<TableRotationHandler>(
      (phase, delta) => {
        if (phase !== 'move') return;
        setTables((prev) =>
          prev.map((tableItem) => ({
            ...tableItem,
            rotation: baseTable.rotation + delta,
          })),
        );
      },
      [],
    );

    return (
      <svg>
        <TableIcon
          table={tables[0]}
          index={0}
          students={[student]}
          selected
          editable={true}
          onRotate={handleRotate}
        />
      </svg>
    );
  }

  it('keeps rotation responsive when parent state updates during drag', async () => {
    const boundingSpy = vi
      .spyOn(SVGElement.prototype, 'getBoundingClientRect')
      .mockImplementation(getBoundingBox as unknown as () => DOMRect);

    try {
      const { container } = render(<RotatingScene />);

      const rotationHandle = container.querySelector('circle[r="10"]')
        ?.parentElement as Element | null;
      expect(rotationHandle).toBeTruthy();
      if (!rotationHandle) {
        return;
      }

      const bbox = getBoundingBox();
      const centerX = bbox.left + bbox.width / 2;
      const centerY = bbox.top + bbox.height / 2;
      const radius = 50;
      const pointerId = 10;

      fireEvent.pointerDown(rotationHandle, {
        pointerId,
        clientX: centerX + radius,
        clientY: centerY,
      });

      const coordsForAngle = (angle: number) => {
        const rad = (angle * Math.PI) / 180;
        return {
          clientX: centerX + radius * Math.cos(rad),
          clientY: centerY + radius * Math.sin(rad),
        };
      };

      const firstMove = coordsForAngle(45);
      fireEvent(
        window,
        new PointerEvent('pointermove', { pointerId, ...firstMove }),
      );

      await waitFor(() => {
        const tableNode = container.querySelector('g[data-table-index="0"]');
        expect(tableNode).toBeTruthy();
        expect(tableNode?.getAttribute('transform') ?? '').toMatch(
          /rotate\(45(\.\d+)?\)/,
        );
      });

      const secondMove = coordsForAngle(135);
      fireEvent(
        window,
        new PointerEvent('pointermove', { pointerId, ...secondMove }),
      );

      await waitFor(() => {
        const tableNode = container.querySelector('g[data-table-index="0"]');
        expect(tableNode).toBeTruthy();
        expect(tableNode?.getAttribute('transform') ?? '').toMatch(
          /rotate\(135(\.\d+)?\)/,
        );
      });

      fireEvent(window, new PointerEvent('pointerup', { pointerId }));
    } finally {
      boundingSpy.mockRestore();
    }
  });
});

describe('SceneTable drag cleanup', () => {
  it('cleans up event listeners on unmount during active drag', () => {
    const onSeatDragStart = vi.fn();
    const onSeatDrag = vi.fn();
    const onSeatDragEnd = vi.fn();
    const moveStudent = vi.fn();
    const isSeatLocked = vi.fn().mockReturnValue(false);

    const { container, unmount } = render(
      <svg>
        <TableIcon
          table={baseTable}
          index={0}
          students={[student]}
          selected={false}
          draggable
          isSeatLocked={isSeatLocked}
          moveStudent={moveStudent}
          onSeatDragStart={onSeatDragStart}
          onSeatDrag={onSeatDrag}
          onSeatDragEnd={onSeatDragEnd}
          editable={false}
        />
      </svg>,
    );

    // Start drag
    const seatElement = container.querySelector(
      '[data-seat-index="0"]',
    ) as Element;
    fireEvent.pointerDown(seatElement, {
      pointerId: 1,
      clientX: 50,
      clientY: 50,
    });
    // A press only becomes a drag once it travels.
    expect(onSeatDragStart).not.toHaveBeenCalled();
    fireEvent(
      window,
      new PointerEvent('pointermove', {
        pointerId: 1,
        clientX: 70,
        clientY: 50,
      }),
    );

    expect(onSeatDragStart).toHaveBeenCalledTimes(1);

    // Unmount during active drag
    unmount();

    // onSeatDragEnd should be called during cleanup
    expect(onSeatDragEnd).toHaveBeenCalledTimes(1);
  });

  it('handles pointercancel event for seat drag', () => {
    const onSeatDragStart = vi.fn();
    const onSeatDrag = vi.fn();
    const onSeatDragEnd = vi.fn();
    const moveStudent = vi.fn();
    const isSeatLocked = vi.fn().mockReturnValue(false);

    const { container } = render(
      <svg>
        <TableIcon
          table={baseTable}
          index={0}
          students={[student]}
          selected={false}
          draggable
          isSeatLocked={isSeatLocked}
          moveStudent={moveStudent}
          onSeatDragStart={onSeatDragStart}
          onSeatDrag={onSeatDrag}
          onSeatDragEnd={onSeatDragEnd}
          editable={false}
        />
      </svg>,
    );

    // Start drag
    const seatElement = container.querySelector(
      '[data-seat-index="0"]',
    ) as Element;
    fireEvent.pointerDown(seatElement, {
      pointerId: 1,
      clientX: 50,
      clientY: 50,
    });
    // A press only becomes a drag once it travels.
    expect(onSeatDragStart).not.toHaveBeenCalled();
    fireEvent(
      window,
      new PointerEvent('pointermove', {
        pointerId: 1,
        clientX: 70,
        clientY: 50,
      }),
    );

    expect(onSeatDragStart).toHaveBeenCalledTimes(1);

    // Trigger pointercancel
    fireEvent(window, new PointerEvent('pointercancel', { pointerId: 1 }));

    // onSeatDragEnd should be called
    expect(onSeatDragEnd).toHaveBeenCalledTimes(1);
  });

  it('handles pointercancel event for rotation', () => {
    const onRotate = vi.fn<TableRotationHandler>();

    const { container } = render(
      <svg>
        <TableIcon
          table={baseTable}
          index={0}
          students={[student]}
          // The rotate handle only renders while selected or hovered
          selected
          onRotate={onRotate}
          editable={true}
        />
      </svg>,
    );

    // Find rotation handle (blue circle with ArrowClockwiseIcon icon)
    const rotationHandle = container.querySelector('circle[r="10"]')
      ?.parentElement as Element;
    expect(rotationHandle).toBeInTheDocument();

    // Start rotation
    fireEvent.pointerDown(rotationHandle, {
      pointerId: 1,
      clientX: 100,
      clientY: 100,
    });
    expect(onRotate).toHaveBeenLastCalledWith('start', 0);

    // Move to trigger rotation
    fireEvent(
      window,
      new PointerEvent('pointermove', {
        pointerId: 1,
        clientX: 110,
        clientY: 110,
      }),
    );
    expect(onRotate).toHaveBeenLastCalledWith('move', expect.any(Number));

    // Trigger pointercancel - ends the gesture and cleans up listeners
    fireEvent(window, new PointerEvent('pointercancel', { pointerId: 1 }));
    expect(onRotate).toHaveBeenLastCalledWith('end', 0);
    const callsAfterCancel = onRotate.mock.calls.length;

    // Move after cancel should not trigger updates
    fireEvent(
      window,
      new PointerEvent('pointermove', {
        pointerId: 1,
        clientX: 120,
        clientY: 120,
      }),
    );

    expect(onRotate.mock.calls.length).toBe(callsAfterCancel);
  });
});

// Snapping, what turns with the table and the locked tables are the room
// layer's (useSelectionRotation); the table only measures the turn.
describe('SceneTable rotation measuring', () => {
  const getBoundingBox = () => ({
    left: 100,
    top: 100,
    width: 100,
    height: 60,
    right: 200,
    bottom: 160,
    x: 100,
    y: 100,
    toJSON: () => ({}),
  });

  const setupRotationTest = () => {
    const table = { ...baseTable };
    const onRotate = vi.fn<TableRotationHandler>();
    const { container } = render(
      <svg>
        <TableIcon
          table={table}
          index={0}
          students={[student]}
          // The rotate handle only renders while selected or hovered
          selected
          onRotate={onRotate}
          editable={true}
        />
      </svg>,
    );
    const tableElement = container.querySelector('g');
    expect(tableElement).toBeTruthy();
    if (tableElement) {
      tableElement.getBoundingClientRect = getBoundingBox;
    }
    const rotationHandle = container.querySelector('circle[r="10"]')
      ?.parentElement as Element;
    expect(rotationHandle).toBeTruthy();
    return { table, onRotate, rotationHandle };
  };

  const turnHandleTo = (rotationHandle: Element, angle: number) => {
    const bbox = getBoundingBox();
    const centerX = bbox.left + bbox.width / 2;
    const centerY = bbox.top + bbox.height / 2;
    const radius = 50;
    const rad = (angle * Math.PI) / 180;

    fireEvent.pointerDown(rotationHandle, {
      pointerId: 2,
      clientX: centerX + radius,
      clientY: centerY,
    });
    fireEvent(
      window,
      new PointerEvent('pointermove', {
        pointerId: 2,
        clientX: centerX + radius * Math.cos(rad),
        clientY: centerY + radius * Math.sin(rad),
      }),
    );
    fireEvent(window, new PointerEvent('pointerup', { pointerId: 2 }));
  };

  it('reports the angle turned around the table centre, unsnapped', () => {
    const { table, onRotate, rotationHandle } = setupRotationTest();

    turnHandleTo(rotationHandle, 92);

    expect(onRotate.mock.calls.map(([phase]) => phase)).toEqual([
      'start',
      'move',
      'end',
    ]);
    expect(onRotate.mock.calls[1][1]).toBeCloseTo(92, 2);
    // The handle reports the angle; it never turns the table object itself.
    expect(table.rotation).toBe(0);
  });

  it('reports nothing without a handler to report to', () => {
    const { container } = render(
      <svg>
        <TableIcon
          table={baseTable}
          index={0}
          students={[student]}
          selected
          editable={true}
        />
      </svg>,
    );
    const rotationHandle = container.querySelector('circle[r="10"]')
      ?.parentElement as Element;

    expect(() => turnHandleTo(rotationHandle, 45)).not.toThrow();
  });
});

describe('SceneTable seat highlights', () => {
  it('marks the seat a criterion concerns, never the whole table', () => {
    const neighbour: Student = { ...student, id: 's2', name: 'Ben' };
    const { container } = render(
      <svg>
        <TableIcon
          table={{
            ...baseTable,
            width: 55,
            height: 130,
            seatCount: 2,
            templateType: 'double',
          }}
          index={3}
          students={[student, neighbour]}
          selected={false}
          editable={false}
          seatHighlights={
            new Map([
              [
                '3-1',
                {
                  status: 'alert',
                  percentage: 0,
                  mode: 'persistent',
                  target: { type: 'seat', tableIndex: 3, seatIndex: 1 },
                },
              ],
            ])
          }
        />
      </svg>,
    );

    const highlights = container.querySelectorAll('[data-seat-highlight]');
    expect(highlights).toHaveLength(1);
    expect(highlights[0]).toHaveAttribute('data-seat-highlight', 'alert');
    // No ring around the table: its outline keeps its own width.
    expect(container.querySelector('rect[stroke-width="4.8"]')).toBeNull();
  });
});

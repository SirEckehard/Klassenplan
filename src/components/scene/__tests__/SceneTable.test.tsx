// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TableIcon from '../SceneTable';
import type { ClassroomTable, Student } from '../../../types';

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
          onUpdate={() => {}}
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
          onUpdate={() => {}}
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
          onUpdate={() => {}}
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
          onUpdate={() => {}}
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
          onUpdate={() => {}}
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

    const handleUpdate = React.useCallback(() => {
      setTables((prev) =>
        prev.map((tableItem, idx) => ({
          ...tableItem,
          zIndex: idx,
        })),
      );
    }, []);

    return (
      <svg>
        <TableIcon
          table={tables[0]}
          index={0}
          students={[student]}
          selected
          editable={true}
          sceneTables={tables}
          selectedTableIds={[0]}
          onUpdate={handleUpdate}
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
          onUpdate={() => {}}
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
          onUpdate={() => {}}
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

    expect(onSeatDragStart).toHaveBeenCalledTimes(1);

    // Trigger pointercancel
    fireEvent(window, new PointerEvent('pointercancel', { pointerId: 1 }));

    // onSeatDragEnd should be called
    expect(onSeatDragEnd).toHaveBeenCalledTimes(1);
  });

  it('handles pointercancel event for rotation', () => {
    const onUpdate = vi.fn();
    const onTransformStart = vi.fn();

    const { container } = render(
      <svg>
        <TableIcon
          table={baseTable}
          index={0}
          students={[student]}
          // The rotate handle only renders while selected or hovered
          selected
          onUpdate={onUpdate}
          onTransformStart={onTransformStart}
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
    expect(onTransformStart).toHaveBeenCalledTimes(1);

    // Move to trigger rotation
    fireEvent(
      window,
      new PointerEvent('pointermove', {
        pointerId: 1,
        clientX: 110,
        clientY: 110,
      }),
    );
    expect(onUpdate).toHaveBeenCalled();

    // Trigger pointercancel - should cleanup listeners
    fireEvent(window, new PointerEvent('pointercancel', { pointerId: 1 }));
    const callsAfterCancel = onUpdate.mock.calls.length;

    // Move after cancel should not trigger updates
    fireEvent(
      window,
      new PointerEvent('pointermove', {
        pointerId: 1,
        clientX: 120,
        clientY: 120,
      }),
    );

    expect(onUpdate.mock.calls.length).toBe(callsAfterCancel);
  });
});

describe('SceneTable rotation snapping', () => {
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
    const onUpdate = vi.fn();
    const { container } = render(
      <svg>
        <TableIcon
          table={table}
          index={0}
          students={[student]}
          // The rotate handle only renders while selected or hovered
          selected
          onUpdate={onUpdate}
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
    return { table, onUpdate, rotationHandle };
  };

  it('snaps rotation to 90 degrees when close to threshold', () => {
    const { table, onUpdate, rotationHandle } = setupRotationTest();
    const bbox = getBoundingBox();
    const centerX = bbox.left + bbox.width / 2;
    const centerY = bbox.top + bbox.height / 2;
    const radius = 50;

    fireEvent.pointerDown(rotationHandle, {
      pointerId: 2,
      clientX: centerX + radius,
      clientY: centerY,
    });

    const targetAngle = 92;
    const targetRad = (targetAngle * Math.PI) / 180;
    const moveX = centerX + radius * Math.cos(targetRad);
    const moveY = centerY + radius * Math.sin(targetRad);

    fireEvent(
      window,
      new PointerEvent('pointermove', {
        pointerId: 2,
        clientX: moveX,
        clientY: moveY,
      }),
    );

    fireEvent(window, new PointerEvent('pointerup', { pointerId: 2 }));

    expect(table.rotation).toBe(90);
    expect(onUpdate).toHaveBeenCalled();
  });

  it('keeps free rotation when outside snap tolerance', () => {
    const { table, rotationHandle } = setupRotationTest();
    const bbox = getBoundingBox();
    const centerX = bbox.left + bbox.width / 2;
    const centerY = bbox.top + bbox.height / 2;
    const radius = 50;

    fireEvent.pointerDown(rotationHandle, {
      pointerId: 3,
      clientX: centerX + radius,
      clientY: centerY,
    });

    const targetAngle = 63;
    const targetRad = (targetAngle * Math.PI) / 180;
    const moveX = centerX + radius * Math.cos(targetRad);
    const moveY = centerY + radius * Math.sin(targetRad);

    fireEvent(
      window,
      new PointerEvent('pointermove', {
        pointerId: 3,
        clientX: moveX,
        clientY: moveY,
      }),
    );

    fireEvent(window, new PointerEvent('pointerup', { pointerId: 3 }));

    expect(table.rotation).toBeCloseTo(targetAngle, 2);
  });

  it('rotates all selected tables together when one handle is used', () => {
    const bbox = getBoundingBox();
    const tables: ClassroomTable[] = [
      { ...baseTable },
      { ...baseTable, x: 150 },
    ];
    const onUpdate = vi.fn();
    const { container } = render(
      <svg>
        <TableIcon
          table={tables[0]}
          index={0}
          students={[student]}
          selected
          editable={true}
          sceneTables={tables}
          selectedTableIds={[0, 1]}
          onUpdate={onUpdate}
        />
      </svg>,
    );

    const tableElement = container.querySelector('g[data-table-index="0"]');
    expect(tableElement).toBeTruthy();
    if (!tableElement) {
      return;
    }
    tableElement.getBoundingClientRect = getBoundingBox;

    const rotationHandle = container.querySelector('circle[r="10"]')
      ?.parentElement as Element | null;
    expect(rotationHandle).toBeTruthy();
    if (!rotationHandle) {
      return;
    }

    const pointerId = 4;
    const centerX = bbox.left + bbox.width / 2;
    const centerY = bbox.top + bbox.height / 2;
    const radius = 50;

    fireEvent.pointerDown(rotationHandle, {
      pointerId,
      clientX: centerX + radius,
      clientY: centerY,
    });

    fireEvent(
      window,
      new PointerEvent('pointermove', {
        pointerId,
        clientX: centerX,
        clientY: centerY + radius,
      }),
    );

    expect(tables[0].rotation).not.toBe(0);
    expect(tables[1].rotation).toBeCloseTo(tables[0].rotation, 1);
    expect(onUpdate).toHaveBeenCalled();

    fireEvent(window, new PointerEvent('pointerup', { pointerId }));
  });

  it('skips locked tables when rotating a selection', () => {
    const bbox = getBoundingBox();
    const tables: ClassroomTable[] = [
      { ...baseTable },
      { ...baseTable, x: 150, locked: true },
    ];
    const onUpdate = vi.fn();
    const { container } = render(
      <svg>
        <TableIcon
          table={tables[0]}
          index={0}
          students={[student]}
          selected
          editable={true}
          sceneTables={tables}
          selectedTableIds={[0, 1]}
          onUpdate={onUpdate}
        />
      </svg>,
    );

    const rotationHandle = container.querySelector('circle[r="10"]')
      ?.parentElement as Element | null;
    expect(rotationHandle).toBeTruthy();
    if (!rotationHandle) {
      return;
    }

    const pointerId = 5;
    const centerX = bbox.left + bbox.width / 2;
    const centerY = bbox.top + bbox.height / 2;
    const radius = 50;

    fireEvent.pointerDown(rotationHandle, {
      pointerId,
      clientX: centerX + radius,
      clientY: centerY,
    });

    fireEvent(
      window,
      new PointerEvent('pointermove', {
        pointerId,
        clientX: centerX,
        clientY: centerY + radius,
      }),
    );

    expect(tables[0].rotation).not.toBe(0);
    expect(tables[1].rotation).toBe(0);
    expect(onUpdate).toHaveBeenCalled();

    fireEvent(window, new PointerEvent('pointerup', { pointerId }));
  });
});

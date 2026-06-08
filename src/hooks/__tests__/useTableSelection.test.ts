import { renderHook, act } from '@testing-library/react';
import { expect, test } from 'vitest';
import useTableSelection from '../useTableSelection';
import type { ClassroomTable } from '../../types';

const baseTable = (): ClassroomTable => ({
  x: 0,
  y: 0,
  width: 50,
  height: 50,
  rotation: 0,
  seatCount: 1,
  locked: false,
  zIndex: 0,
});

test('selects tables with multi selection', () => {
  const tables = [baseTable(), baseTable()];
  const { result } = renderHook(() => useTableSelection(tables));

  act(() => {
    result.current.toggleSelect(0);
    result.current.toggleSelect(1, true);
  });

  expect(result.current.selectedTables).toEqual([0, 1]);
});

test('z-index helpers adjust order', () => {
  const tables = [baseTable(), baseTable()];
  tables[0].zIndex = 1;
  tables[1].zIndex = 2;
  const { result } = renderHook(() => useTableSelection(tables));

  let updated: ClassroomTable[] = [];

  act(() => {
    updated = result.current.bringForward(0);
  });

  expect(tables[0].zIndex).toBe(1); // original array unchanged
  expect(updated[0].zIndex).toBe(2);
  expect(updated).not.toBe(tables);
  expect(updated[0]).not.toBe(tables[0]);

  act(() => {
    updated = result.current.sendBackward(1);
  });

  expect(tables[1].zIndex).toBe(2); // original array unchanged
  expect(updated[1].zIndex).toBe(1);
  expect(updated).not.toBe(tables);
  expect(updated[1]).not.toBe(tables[1]);
});

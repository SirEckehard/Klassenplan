// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type { ClassroomTable } from '@/types';

// Hook managing table selection and z-order
export default function useTableSelection(
  tables: ClassroomTable[],
  setTables?: React.Dispatch<React.SetStateAction<ClassroomTable[]>>,
) {
  const [selectedTables, setSelectedTables] = React.useState<number[]>([]);

  // Toggle selection for a table; multi allows additive selection
  const toggleSelect = (index: number, multi = false): number[] => {
    let nextSelection: number[] = [];
    setSelectedTables((prev) => {
      nextSelection = multi
        ? prev.includes(index)
          ? prev.filter((i) => i !== index)
          : [...prev, index]
        : [index];
      return nextSelection;
    });
    return nextSelection;
  };

  // Remove all selections
  const clearSelection = () => setSelectedTables([]);

  // Increase z-index of a table without mutating original array
  const bringForward = (index: number): ClassroomTable[] => {
    const next = tables.map((t, i) =>
      i === index ? { ...t, zIndex: t.zIndex + 1 } : t,
    );
    setTables?.(next); // update external state if provided
    return next;
  };

  // Decrease z-index of a table without mutating original array
  const sendBackward = (index: number): ClassroomTable[] => {
    const next = tables.map((t, i) =>
      i === index ? { ...t, zIndex: Math.max(0, t.zIndex - 1) } : t,
    );
    setTables?.(next); // update external state if provided
    return next;
  };

  return {
    selectedTables,
    setSelectedTables,
    toggleSelect,
    clearSelection,
    bringForward,
    sendBackward,
  };
}

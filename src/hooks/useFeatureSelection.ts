// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';

/**
 * Hook managing room-feature selection.
 *
 * Mirrors {@link useTableSelection} but tracks features by their stable id
 * instead of array index. Kept as a separate id-space; unified selection
 * behaviour (see LayoutEditorView / useCanvasInteraction) operates on both the
 * table and feature selection simultaneously.
 */
export default function useFeatureSelection() {
  const [selectedFeatureIds, setSelectedFeatureIds] = React.useState<string[]>(
    [],
  );

  // Toggle selection for a feature; multi allows additive selection
  const toggleFeatureSelect = (id: string, multi = false): string[] => {
    let nextSelection: string[] = [];
    setSelectedFeatureIds((prev) => {
      nextSelection = multi
        ? prev.includes(id)
          ? prev.filter((existing) => existing !== id)
          : [...prev, id]
        : [id];
      return nextSelection;
    });
    return nextSelection;
  };

  // Remove all feature selections
  const clearFeatureSelection = () => setSelectedFeatureIds([]);

  return {
    selectedFeatureIds,
    setSelectedFeatureIds,
    toggleFeatureSelect,
    clearFeatureSelection,
  };
}

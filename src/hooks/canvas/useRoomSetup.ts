// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import type { TableTemplateType } from '@/types';

interface UseRoomSetupParams {
  /** No tables stand in the room. */
  isRoomEmpty: boolean;
  /** From `lg` up the inspector is a column; below it is a drawer. */
  isDesktop: boolean;
  /** Takes an undo snapshot of the room as it stands. */
  snapshot: () => void;
  /** Lets a loaded template go (`null`), before the room is set up anew. */
  onTemplateChange: (templateId: number | null) => void;
  /**
   * Loads a template as a room of its own, which opens (decision 0024); the
   * room that was open keeps its plan.
   */
  onLoadTemplateAsRoom: (templateId: number) => void;
  /** Rebuilds the tables from one kind; `force` ignores a loaded template. */
  onTableTypeChange: (type: TableTemplateType, force?: boolean) => void;
  /** Lets the canvas selection go, tables and room elements alike. */
  clearSelection: () => void;
  setDrawerOpen: (open: boolean) => void;
  /** From `lg` up: brings a folded column back (`InspectorContext.folded`). */
  unfoldInspector: () => void;
  /**
   * The room was set up anew: what is on screen is another plan now, so the
   * open one is let go and no save writes the new tables over it.
   */
  onRoomReplaced?: () => void;
}

/**
 * Setting the room up as a whole, from the inspector's room panel.
 *
 * The panel shows while nothing is selected — from `lg` up in the inspector's
 * column, below that in the drawer the status bar opens. Asking for the setup
 * (Ctrl/⌘+E, the phone's button) therefore lets the selection go, opens the
 * drawer where there is one — or unfolds the column where it was folded away
 * — and hands the panel a request to take the focus.
 *
 * Setting up replaces the tables of the open room in one go, so it takes an
 * undo snapshot first and lets go of the open plan — the next save starts a
 * new plan in this room rather than writing the new tables over the old one.
 * A template is a room of its own: loading one opens it as a new room of the
 * class (decision 0024), and the room left keeps its plan. Below `lg` the
 * drawer then steps aside to show the result. An empty room has one thing to
 * do, so its panel shows by itself — below `lg` the drawer opens, from `lg`
 * up a folded column unfolds — as the setup used to open over the canvas.
 */
export function useRoomSetup({
  isRoomEmpty,
  isDesktop,
  snapshot,
  onTemplateChange,
  onLoadTemplateAsRoom,
  onTableTypeChange,
  clearSelection,
  setDrawerOpen,
  unfoldInspector,
  onRoomReplaced,
}: UseRoomSetupParams) {
  const [setupFocusRequest, setSetupFocusRequest] = React.useState(0);

  const showPanel = React.useCallback(() => {
    if (isDesktop) {
      unfoldInspector();
    } else {
      setDrawerOpen(true);
    }
  }, [isDesktop, setDrawerOpen, unfoldInspector]);

  const revealSetup = React.useCallback(() => {
    clearSelection();
    showPanel();
    setSetupFocusRequest((count) => count + 1);
  }, [clearSelection, showPanel]);

  React.useEffect(() => {
    if (isRoomEmpty) {
      showPanel();
    }
  }, [isRoomEmpty, showPanel]);

  const setUpRoom = React.useCallback(
    (type: TableTemplateType) => {
      snapshot();
      onRoomReplaced?.();
      onTemplateChange(null);
      // Forced: the template just let go of is still selected in this render.
      onTableTypeChange(type, true);
      if (!isDesktop) {
        setDrawerOpen(false);
      }
    },
    [
      isDesktop,
      onRoomReplaced,
      onTableTypeChange,
      onTemplateChange,
      setDrawerOpen,
      snapshot,
    ],
  );

  const loadTemplate = React.useCallback(
    (templateId: number) => {
      onLoadTemplateAsRoom(templateId);
      if (!isDesktop) {
        setDrawerOpen(false);
      }
    },
    [isDesktop, onLoadTemplateAsRoom, setDrawerOpen],
  );

  return { setupFocusRequest, revealSetup, setUpRoom, loadTemplate };
}

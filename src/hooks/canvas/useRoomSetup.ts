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
  /** Loads a template into the room, or lets the loaded one go (`null`). */
  onTemplateChange: (templateId: number | null) => void;
  /** Rebuilds the tables from one kind; `force` ignores a loaded template. */
  onTableTypeChange: (type: TableTemplateType, force?: boolean) => void;
  /** Lets the canvas selection go, tables and room elements alike. */
  clearSelection: () => void;
  setDrawerOpen: (open: boolean) => void;
}

/**
 * Setting the room up as a whole, from the inspector's room panel.
 *
 * The panel shows while nothing is selected — from `lg` up in the inspector's
 * column, below that in the drawer the status bar opens. Asking for the setup
 * (Ctrl/⌘+E, the phone's button) therefore lets the selection go, opens the
 * drawer where there is one and hands the panel a request to take the focus.
 *
 * Setting up and loading a template replace the room in one go, so both take
 * an undo snapshot first; below `lg` the drawer then steps aside to show the
 * result. An empty room has one thing to do, so below `lg` the drawer opens
 * by itself — as the setup used to open over the canvas.
 */
export function useRoomSetup({
  isRoomEmpty,
  isDesktop,
  snapshot,
  onTemplateChange,
  onTableTypeChange,
  clearSelection,
  setDrawerOpen,
}: UseRoomSetupParams) {
  const [setupFocusRequest, setSetupFocusRequest] = React.useState(0);

  const revealSetup = React.useCallback(() => {
    clearSelection();
    if (!isDesktop) {
      setDrawerOpen(true);
    }
    setSetupFocusRequest((count) => count + 1);
  }, [clearSelection, isDesktop, setDrawerOpen]);

  React.useEffect(() => {
    if (isRoomEmpty && !isDesktop) {
      setDrawerOpen(true);
    }
  }, [isDesktop, isRoomEmpty, setDrawerOpen]);

  const setUpRoom = React.useCallback(
    (type: TableTemplateType) => {
      snapshot();
      onTemplateChange(null);
      // Forced: the template just let go of is still selected in this render.
      onTableTypeChange(type, true);
      if (!isDesktop) {
        setDrawerOpen(false);
      }
    },
    [isDesktop, onTableTypeChange, onTemplateChange, setDrawerOpen, snapshot],
  );

  const loadTemplate = React.useCallback(
    (templateId: number) => {
      snapshot();
      onTemplateChange(templateId);
      if (!isDesktop) {
        setDrawerOpen(false);
      }
    },
    [isDesktop, onTemplateChange, setDrawerOpen, snapshot],
  );

  return { setupFocusRequest, revealSetup, setUpRoom, loadTemplate };
}

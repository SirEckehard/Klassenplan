// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useSeatingPlanContextMenus } from '@/components/SeatingPlanGenerator/SeatingPlanContextMenus';

/**
 * Custom hook for managing context menu integration in SeatingPlanView
 * Provides a clean interface for all context menu operations
 */
export function useContextMenuIntegration() {
  const {
    registerTableContextMenuSetter,
    registerCanvasContextMenuSetter,
    registerFeatureContextMenuSetter,
    closeTableContextMenu,
    closeCanvasContextMenu,
    closeFeatureContextMenu,
    openTableContextMenu,
    openCanvasContextMenu,
    openFeatureContextMenu,
  } = useSeatingPlanContextMenus();

  return {
    // Registration functions for context menu setters
    registerTableContextMenuSetter,
    registerCanvasContextMenuSetter,
    registerFeatureContextMenuSetter,

    // Context menu control functions
    closeTableContextMenu,
    closeCanvasContextMenu,
    closeFeatureContextMenu,
    openTableContextMenu,
    openCanvasContextMenu,
    openFeatureContextMenu,
  };
}

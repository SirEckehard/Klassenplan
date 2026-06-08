// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useEffect, useCallback } from 'react';
import {
  useContextMenus,
  type TableContextMenuState,
  type CanvasContextMenuState,
  type FeatureContextMenuState,
} from '@/hooks/useContextMenus';

type ContextMenuPosition = {
  left: number;
  top: number;
};

interface UseCanvasContextMenusOptions {
  /**
   * Container ref for position calculations
   */
  containerRef: React.RefObject<HTMLElement | null>;
  /**
   * Table menu ref for click-outside detection
   */
  tableMenuRef: React.RefObject<HTMLElement | null>;
  /**
   * Canvas menu ref for click-outside detection
   */
  canvasMenuRef: React.RefObject<HTMLElement | null>;
  /**
   * Feature menu ref for click-outside detection
   */
  featureMenuRef: React.RefObject<HTMLElement | null>;
  /**
   * Callback when table context menu closes
   */
  onCloseTableContextMenu: () => void;
  /**
   * Callback when canvas context menu closes
   */
  onCloseCanvasContextMenu: () => void;
  /**
   * Callback when feature context menu closes
   */
  onCloseFeatureContextMenu: () => void;
  /**
   * Callback to focus the canvas container
   */
  focusCanvasContainer?: () => void;
  /**
   * Whether paste is currently available
   */
  canPasteTables: boolean;
  /**
   * Whether feature paste is available
   */
  canPasteFeatures: boolean;
}

interface UseCanvasContextMenusReturn {
  // State from useContextMenus
  tableContextMenu: TableContextMenuState | null;
  setTableContextMenu: React.Dispatch<
    React.SetStateAction<TableContextMenuState | null>
  >;
  canvasContextMenu: CanvasContextMenuState | null;
  setCanvasContextMenu: React.Dispatch<
    React.SetStateAction<CanvasContextMenuState | null>
  >;
  featureContextMenu: FeatureContextMenuState | null;
  setFeatureContextMenu: React.Dispatch<
    React.SetStateAction<FeatureContextMenuState | null>
  >;
  closeTableContextMenu: () => void;
  closeCanvasContextMenu: () => void;
  closeFeatureContextMenu: () => void;

  // Calculated positions
  tableContextMenuPosition: ContextMenuPosition | null;
  canvasContextMenuPosition: ContextMenuPosition | null;
  featureContextMenuPosition: ContextMenuPosition | null;

  // Handlers
  handleCloseTableMenu: () => void;
  handleCloseCanvasMenu: () => void;
  handleCloseFeatureMenu: () => void;
  handleEscapeKey: () => void;
  openFeatureContextMenu: (
    state: FeatureContextMenuState,
    position?: ContextMenuPosition,
  ) => void;
}

/**
 * Manages context menu state and positioning for the classroom canvas.
 * Handles click-outside detection, position calculation, and keyboard shortcuts.
 */
export function useCanvasContextMenus(
  options: UseCanvasContextMenusOptions,
): UseCanvasContextMenusReturn {
  const {
    containerRef,
    tableMenuRef,
    canvasMenuRef,
    featureMenuRef,
    onCloseTableContextMenu,
    onCloseCanvasContextMenu,
    onCloseFeatureContextMenu,
    focusCanvasContainer,
    canPasteTables,
    canPasteFeatures,
  } = options;

  const {
    tableContextMenu,
    setTableContextMenu,
    tableContextMenuPosition,
    setTableContextMenuPosition,
    canvasContextMenu,
    setCanvasContextMenu,
    canvasContextMenuPosition,
    setCanvasContextMenuPosition,
    featureContextMenu,
    setFeatureContextMenu,
    featureContextMenuPosition,
    setFeatureContextMenuPosition,
    closeTableContextMenu,
    closeCanvasContextMenu,
    closeFeatureContextMenu,
    openFeatureContextMenu,
  } = useContextMenus();

  // Calculate table context menu position
  useEffect(() => {
    if (tableContextMenu && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setTableContextMenuPosition({
        left: tableContextMenu.clientX - rect.left,
        top: tableContextMenu.clientY - rect.top,
      });
    } else {
      setTableContextMenuPosition(null);
    }
  }, [tableContextMenu, containerRef, setTableContextMenuPosition]);

  // Calculate canvas context menu position
  useEffect(() => {
    if (canvasContextMenu && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCanvasContextMenuPosition({
        left: canvasContextMenu.clientX - rect.left,
        top: canvasContextMenu.clientY - rect.top,
      });
    } else {
      setCanvasContextMenuPosition(null);
    }
  }, [canvasContextMenu, containerRef, setCanvasContextMenuPosition]);

  // Calculate feature context menu position
  useEffect(() => {
    if (featureContextMenu && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setFeatureContextMenuPosition({
        left: featureContextMenu.clientX - rect.left,
        top: featureContextMenu.clientY - rect.top,
      });
    } else {
      setFeatureContextMenuPosition(null);
    }
  }, [featureContextMenu, containerRef, setFeatureContextMenuPosition]);

  // Close table menu handler
  const handleCloseTableMenu = useCallback(() => {
    closeTableContextMenu();
    onCloseTableContextMenu();
    focusCanvasContainer?.();
  }, [closeTableContextMenu, onCloseTableContextMenu, focusCanvasContainer]);

  // Close canvas menu handler
  const handleCloseCanvasMenu = useCallback(() => {
    closeCanvasContextMenu();
    onCloseCanvasContextMenu();
    focusCanvasContainer?.();
  }, [closeCanvasContextMenu, onCloseCanvasContextMenu, focusCanvasContainer]);

  const handleCloseFeatureMenu = useCallback(() => {
    closeFeatureContextMenu();
    onCloseFeatureContextMenu();
    focusCanvasContainer?.();
  }, [
    closeFeatureContextMenu,
    onCloseFeatureContextMenu,
    focusCanvasContainer,
  ]);

  // Click-outside detection
  useEffect(() => {
    if (!tableContextMenu && !canvasContextMenu && !featureContextMenu) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      const insideTableMenu =
        !!tableMenuRef.current &&
        !!target &&
        tableMenuRef.current.contains(target);
      const insideCanvasMenu =
        !!canvasMenuRef.current &&
        !!target &&
        canvasMenuRef.current.contains(target);
      const insideFeatureMenu =
        !!featureMenuRef.current &&
        !!target &&
        featureMenuRef.current.contains(target);

      if (insideTableMenu || insideCanvasMenu || insideFeatureMenu) {
        return;
      }

      if (tableContextMenu) {
        handleCloseTableMenu();
      }
      if (canvasContextMenu) {
        handleCloseCanvasMenu();
      }
      if (featureContextMenu) {
        handleCloseFeatureMenu();
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [
    canvasContextMenu,
    tableContextMenu,
    featureContextMenu,
    handleCloseTableMenu,
    handleCloseCanvasMenu,
    handleCloseFeatureMenu,
    tableMenuRef,
    canvasMenuRef,
    featureMenuRef,
  ]);

  // Auto-close canvas menu when paste becomes unavailable
  useEffect(() => {
    if (!canPasteTables && !canPasteFeatures && canvasContextMenu) {
      handleCloseCanvasMenu();
    }
  }, [
    canPasteTables,
    canPasteFeatures,
    canvasContextMenu,
    handleCloseCanvasMenu,
  ]);

  // ESC key handler
  const handleEscapeKey = useCallback(() => {
    if (tableContextMenu) {
      handleCloseTableMenu();
    }
    if (canvasContextMenu) {
      handleCloseCanvasMenu();
    }
    if (featureContextMenu) {
      handleCloseFeatureMenu();
    }
  }, [
    tableContextMenu,
    canvasContextMenu,
    featureContextMenu,
    handleCloseTableMenu,
    handleCloseCanvasMenu,
    handleCloseFeatureMenu,
  ]);

  return {
    tableContextMenu,
    setTableContextMenu,
    canvasContextMenu,
    setCanvasContextMenu,
    featureContextMenu,
    setFeatureContextMenu,
    closeTableContextMenu,
    closeCanvasContextMenu,
    closeFeatureContextMenu,
    tableContextMenuPosition,
    canvasContextMenuPosition,
    featureContextMenuPosition,
    handleCloseTableMenu,
    handleCloseCanvasMenu,
    handleCloseFeatureMenu,
    handleEscapeKey,
    openFeatureContextMenu,
  };
}

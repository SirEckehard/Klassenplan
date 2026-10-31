// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useEffect, useCallback } from 'react';
import {
  useContextMenus,
  type TableContextMenuState,
  type CanvasContextMenuState,
  type FeatureContextMenuState,
} from '@/hooks/useContextMenus';

interface UseCanvasContextMenusOptions {
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
   * Whether paste is currently available (tables or features)
   */
  canPaste: boolean;
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

  // Handlers
  handleCloseTableMenu: () => void;
  handleCloseCanvasMenu: () => void;
  handleCloseFeatureMenu: () => void;
  handleEscapeKey: () => void;
  openFeatureContextMenu: (state: FeatureContextMenuState) => void;
}

/**
 * Manages context menu state for the classroom canvas: click-outside
 * detection and the Escape key. The shared menu places itself
 * (`ContextMenu`).
 */
export function useCanvasContextMenus(
  options: UseCanvasContextMenusOptions,
): UseCanvasContextMenusReturn {
  const {
    tableMenuRef,
    canvasMenuRef,
    featureMenuRef,
    onCloseTableContextMenu,
    onCloseCanvasContextMenu,
    onCloseFeatureContextMenu,
    focusCanvasContainer,
    canPaste,
  } = options;

  const {
    tableContextMenu,
    setTableContextMenu,
    canvasContextMenu,
    setCanvasContextMenu,
    featureContextMenu,
    setFeatureContextMenu,
    closeTableContextMenu,
    closeCanvasContextMenu,
    closeFeatureContextMenu,
    openFeatureContextMenu,
  } = useContextMenus();

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
    if (!canPaste && canvasContextMenu) {
      handleCloseCanvasMenu();
    }
  }, [canPaste, canvasContextMenu, handleCloseCanvasMenu]);

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
    handleCloseTableMenu,
    handleCloseCanvasMenu,
    handleCloseFeatureMenu,
    handleEscapeKey,
    openFeatureContextMenu,
  };
}

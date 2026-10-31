// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { swallowReleaseClick } from '@/utils';

export type PointerKind = 'mouse' | 'touch' | 'pen' | 'keyboard' | 'unknown';
export type MenuTrigger = 'contextmenu' | 'longpress' | 'keyboard';

export type TableContextMenuState = {
  tableIndex: number;
  clientX: number;
  clientY: number;
  pointerType?: PointerKind;
  trigger?: MenuTrigger;
};

export type CanvasContextMenuState = {
  clientX: number;
  clientY: number;
  sceneX?: number;
  sceneY?: number;
  pointerType?: PointerKind;
  trigger?: MenuTrigger;
};

export type FeatureContextMenuState = {
  featureId: string;
  clientX: number;
  clientY: number;
  pointerType?: PointerKind;
  trigger?: MenuTrigger;
};

export function useContextMenus() {
  const [tableContextMenu, setTableContextMenu] =
    React.useState<TableContextMenuState | null>(null);
  const [canvasContextMenu, setCanvasContextMenu] =
    React.useState<CanvasContextMenuState | null>(null);
  const [featureContextMenu, setFeatureContextMenu] =
    React.useState<FeatureContextMenuState | null>(null);

  const tableContextMenuSetter = React.useRef<React.Dispatch<
    React.SetStateAction<TableContextMenuState | null>
  > | null>(null);
  const canvasContextMenuSetter = React.useRef<React.Dispatch<
    React.SetStateAction<CanvasContextMenuState | null>
  > | null>(null);
  const featureContextMenuSetter = React.useRef<React.Dispatch<
    React.SetStateAction<FeatureContextMenuState | null>
  > | null>(null);
  // A menu a long press opened must survive the click some browsers send
  // when that finger lifts (`swallowReleaseClick`).
  const releaseClickGuardRef = React.useRef<(() => void) | null>(null);
  const guardReleaseClick = React.useCallback((trigger?: MenuTrigger) => {
    releaseClickGuardRef.current?.();
    releaseClickGuardRef.current =
      trigger === 'longpress' && typeof window !== 'undefined'
        ? swallowReleaseClick()
        : null;
  }, []);
  React.useEffect(() => () => releaseClickGuardRef.current?.(), []);

  const registerTableContextMenuSetter = React.useCallback(
    (
      setter: React.Dispatch<
        React.SetStateAction<TableContextMenuState | null>
      > | null,
    ) => {
      tableContextMenuSetter.current = setter;
    },
    [],
  );

  const registerCanvasContextMenuSetter = React.useCallback(
    (
      setter: React.Dispatch<
        React.SetStateAction<CanvasContextMenuState | null>
      > | null,
    ) => {
      canvasContextMenuSetter.current = setter;
    },
    [],
  );

  const registerFeatureContextMenuSetter = React.useCallback(
    (
      setter: React.Dispatch<
        React.SetStateAction<FeatureContextMenuState | null>
      > | null,
    ) => {
      featureContextMenuSetter.current = setter;
    },
    [],
  );

  const closeTableContextMenu = React.useCallback(() => {
    setTableContextMenu(null);
    tableContextMenuSetter.current?.(null);
  }, []);

  const closeCanvasContextMenu = React.useCallback(() => {
    setCanvasContextMenu(null);
    canvasContextMenuSetter.current?.(null);
  }, []);

  const closeFeatureContextMenu = React.useCallback(() => {
    setFeatureContextMenu(null);
    featureContextMenuSetter.current?.(null);
  }, []);

  const openTableContextMenu = React.useCallback(
    (menu: TableContextMenuState) => {
      closeCanvasContextMenu();
      closeFeatureContextMenu();
      guardReleaseClick(menu.trigger);
      setTableContextMenu(menu);
      tableContextMenuSetter.current?.(menu);
    },
    [closeCanvasContextMenu, closeFeatureContextMenu, guardReleaseClick],
  );

  const openCanvasContextMenu = React.useCallback(
    (menu: CanvasContextMenuState) => {
      closeTableContextMenu();
      closeFeatureContextMenu();
      guardReleaseClick(menu.trigger);
      setCanvasContextMenu(menu);
      canvasContextMenuSetter.current?.(menu);
    },
    [closeFeatureContextMenu, closeTableContextMenu, guardReleaseClick],
  );

  const openFeatureContextMenu = React.useCallback(
    (menu: FeatureContextMenuState) => {
      closeTableContextMenu();
      closeCanvasContextMenu();
      guardReleaseClick(menu.trigger);
      setFeatureContextMenu(menu);
      featureContextMenuSetter.current?.(menu);
    },
    [closeCanvasContextMenu, closeTableContextMenu, guardReleaseClick],
  );

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // A click inside the menu is its own: an entry closes the menu after
      // acting, and the padding or a disabled entry leaves it open.
      if (
        event.target instanceof Element &&
        event.target.closest('[data-context-menu]')
      ) {
        return;
      }
      if (tableContextMenu || canvasContextMenu || featureContextMenu) {
        closeTableContextMenu();
        closeCanvasContextMenu();
        closeFeatureContextMenu();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeTableContextMenu();
        closeCanvasContextMenu();
        closeFeatureContextMenu();
      }
    };

    if (tableContextMenu || canvasContextMenu || featureContextMenu) {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    tableContextMenu,
    canvasContextMenu,
    featureContextMenu,
    closeTableContextMenu,
    closeCanvasContextMenu,
    closeFeatureContextMenu,
  ]);

  return {
    tableContextMenu,
    setTableContextMenu,
    canvasContextMenu,
    setCanvasContextMenu,
    featureContextMenu,
    setFeatureContextMenu,
    registerTableContextMenuSetter,
    registerCanvasContextMenuSetter,
    registerFeatureContextMenuSetter,
    closeTableContextMenu,
    closeCanvasContextMenu,
    closeFeatureContextMenu,
    openTableContextMenu,
    openCanvasContextMenu,
    openFeatureContextMenu,
  };
}

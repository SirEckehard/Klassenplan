import React from 'react';

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

type ContextMenuPosition = {
  left: number;
  top: number;
} | null;

export function useContextMenus() {
  const [tableContextMenu, setTableContextMenu] =
    React.useState<TableContextMenuState | null>(null);
  const [tableContextMenuPosition, setTableContextMenuPosition] =
    React.useState<ContextMenuPosition>(null);
  const [canvasContextMenu, setCanvasContextMenu] =
    React.useState<CanvasContextMenuState | null>(null);
  const [canvasContextMenuPosition, setCanvasContextMenuPosition] =
    React.useState<ContextMenuPosition>(null);
  const [featureContextMenu, setFeatureContextMenu] =
    React.useState<FeatureContextMenuState | null>(null);
  const [featureContextMenuPosition, setFeatureContextMenuPosition] =
    React.useState<ContextMenuPosition>(null);

  const tableContextMenuSetter = React.useRef<React.Dispatch<
    React.SetStateAction<TableContextMenuState | null>
  > | null>(null);
  const canvasContextMenuSetter = React.useRef<React.Dispatch<
    React.SetStateAction<CanvasContextMenuState | null>
  > | null>(null);
  const featureContextMenuSetter = React.useRef<React.Dispatch<
    React.SetStateAction<FeatureContextMenuState | null>
  > | null>(null);

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
    setTableContextMenuPosition(null);
    tableContextMenuSetter.current?.(null);
  }, []);

  const closeCanvasContextMenu = React.useCallback(() => {
    setCanvasContextMenu(null);
    setCanvasContextMenuPosition(null);
    canvasContextMenuSetter.current?.(null);
  }, []);

  const closeFeatureContextMenu = React.useCallback(() => {
    setFeatureContextMenu(null);
    setFeatureContextMenuPosition(null);
    featureContextMenuSetter.current?.(null);
  }, []);

  const openTableContextMenu = React.useCallback(
    (menu: TableContextMenuState, position?: ContextMenuPosition) => {
      closeCanvasContextMenu();
      closeFeatureContextMenu();
      setTableContextMenu(menu);
      if (position) {
        setTableContextMenuPosition(position);
      }
      tableContextMenuSetter.current?.(menu);
    },
    [closeCanvasContextMenu, closeFeatureContextMenu],
  );

  const openCanvasContextMenu = React.useCallback(
    (menu: CanvasContextMenuState, position?: ContextMenuPosition) => {
      closeTableContextMenu();
      closeFeatureContextMenu();
      setCanvasContextMenu(menu);
      if (position) {
        setCanvasContextMenuPosition(position);
      }
      canvasContextMenuSetter.current?.(menu);
    },
    [closeFeatureContextMenu, closeTableContextMenu],
  );

  const openFeatureContextMenu = React.useCallback(
    (menu: FeatureContextMenuState, position?: ContextMenuPosition) => {
      closeTableContextMenu();
      closeCanvasContextMenu();
      setFeatureContextMenu(menu);
      if (position) {
        setFeatureContextMenuPosition(position);
      }
      featureContextMenuSetter.current?.(menu);
    },
    [closeCanvasContextMenu, closeTableContextMenu],
  );

  React.useEffect(() => {
    const handleClickOutside = () => {
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

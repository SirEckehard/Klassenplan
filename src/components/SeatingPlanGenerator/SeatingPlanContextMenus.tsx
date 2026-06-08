import React from 'react';
import { useContextMenus } from '@/hooks/useContextMenus';
import type {
  CanvasContextMenuState,
  TableContextMenuState,
  FeatureContextMenuState,
} from '@/hooks/useContextMenus';

interface SeatingPlanContextMenusProps {
  children: React.ReactNode;
}

interface SeatingPlanContextMenusContextType {
  registerTableContextMenuSetter: (
    setter: React.Dispatch<
      React.SetStateAction<TableContextMenuState | null>
    > | null,
  ) => void;
  registerCanvasContextMenuSetter: (
    setter: React.Dispatch<
      React.SetStateAction<CanvasContextMenuState | null>
    > | null,
  ) => void;
  registerFeatureContextMenuSetter: (
    setter: React.Dispatch<
      React.SetStateAction<FeatureContextMenuState | null>
    > | null,
  ) => void;
  closeTableContextMenu: () => void;
  closeCanvasContextMenu: () => void;
  closeFeatureContextMenu: () => void;
  openTableContextMenu: (menu: TableContextMenuState) => void;
  openCanvasContextMenu: (menu: CanvasContextMenuState) => void;
  openFeatureContextMenu: (menu: FeatureContextMenuState) => void;
}

const SeatingPlanContextMenusContext =
  React.createContext<SeatingPlanContextMenusContextType | null>(null);

export const useSeatingPlanContextMenus = () => {
  const context = React.useContext(SeatingPlanContextMenusContext);
  if (!context) {
    throw new Error(
      'useSeatingPlanContextMenus must be used within SeatingPlanContextMenus',
    );
  }
  return context;
};

const SeatingPlanContextMenus = React.memo(
  ({ children }: SeatingPlanContextMenusProps) => {
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
    } = useContextMenus();

    const contextValue = React.useMemo(
      () => ({
        registerTableContextMenuSetter,
        registerCanvasContextMenuSetter,
        registerFeatureContextMenuSetter,
        closeTableContextMenu,
        closeCanvasContextMenu,
        closeFeatureContextMenu,
        openTableContextMenu,
        openCanvasContextMenu,
        openFeatureContextMenu,
      }),
      [
        registerTableContextMenuSetter,
        registerCanvasContextMenuSetter,
        registerFeatureContextMenuSetter,
        closeTableContextMenu,
        closeCanvasContextMenu,
        closeFeatureContextMenu,
        openTableContextMenu,
        openCanvasContextMenu,
        openFeatureContextMenu,
      ],
    );

    return (
      <SeatingPlanContextMenusContext.Provider value={contextValue}>
        {children}
      </SeatingPlanContextMenusContext.Provider>
    );
  },
);

SeatingPlanContextMenus.displayName = 'SeatingPlanContextMenus';

export default SeatingPlanContextMenus;

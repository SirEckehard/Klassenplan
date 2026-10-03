// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import {
  useCollapsibleSidebar,
  type UseCollapsibleSidebarOptions,
} from '@/hooks/ui/useCollapsibleSidebar';
import { useLayoutMode } from '@/hooks/ui/useLayoutMode';
import { isBreakpointUp } from '@/hooks/ui/useBreakpoint';

/**
 * Whether the layer's toolbar shows its labels — one answer for the whole
 * workspace.
 *
 * The toolbar used to carry its own switch in a header above the tools, which
 * cost it a row and made it announce itself as a panel. The switch belongs
 * with the other things that act on the workspace rather than on the class, so
 * it sits in the status bar and the state has to be reachable from both ends
 * of the window.
 *
 * A phone has no column, only a drawer, and its switch sits in the status bar
 * too — so whether the drawer is open is shared state as well.
 *
 * A sidebar outside the shell finds no provider and keeps its own state and
 * its own switch. Every layer and the export page wear the shell, so that is
 * a sidebar in a test or one yet to be written.
 */
export type ToolRailState = {
  isExpanded: boolean;
  expand: () => void;
  collapse: () => void;
  toggle: () => void;
  /** Whether the phone's drawer is open; meaningless from `md` up. */
  sheetOpen: boolean;
  setSheetOpen: (open: boolean) => void;
};

const ToolRailContext = React.createContext<ToolRailState | null>(null);

/** The phone's toolbar drawer, for the status bar switch that opens it. */
export const TOOL_RAIL_DRAWER_ID = 'shell-tool-rail';

/**
 * The state itself, for the provider and for a sidebar standing on its own.
 *
 * On a tablet the rail starts collapsed and its expansion lives for the
 * session only: 208px of toolbar would leave a 900px scene barely 500px of
 * width, and the stored preference belongs to the desktop layout it was made
 * in — a laptop choice must not decide how the iPad opens.
 */
export function useToolRailState(
  options: UseCollapsibleSidebarOptions = {},
): ToolRailState {
  const stored = useCollapsibleSidebar(options);
  const isTablet = useLayoutMode() === 'tablet';
  const [tabletExpanded, setTabletExpanded] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const expand = React.useCallback(() => {
    if (isTablet) {
      setTabletExpanded(true);
      return;
    }
    stored.expand();
  }, [isTablet, stored]);

  const collapse = React.useCallback(() => {
    if (isTablet) {
      setTabletExpanded(false);
      return;
    }
    stored.collapse();
  }, [isTablet, stored]);

  const toggle = React.useCallback(() => {
    if (isTablet) {
      setTabletExpanded((previous) => !previous);
      return;
    }
    stored.toggle();
  }, [isTablet, stored]);

  return React.useMemo(
    () => ({
      isExpanded: isTablet ? tabletExpanded : stored.isExpanded,
      expand,
      collapse,
      toggle,
      sheetOpen,
      setSheetOpen,
    }),
    [
      collapse,
      expand,
      isTablet,
      sheetOpen,
      stored.isExpanded,
      tabletExpanded,
      toggle,
    ],
  );
}

/**
 * Where the toolbar starts out before the teacher chose: with its labels on a
 * touch screen from `xl` up — an interactive whiteboard — where no tooltip
 * explains an icon and the room has width to spare; as icons everywhere else.
 * An iPad in landscape stays at icons, since its plan needs the width the
 * folded inspector gave it.
 */
function startsExpanded(): boolean {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return false;
  }
  return window.matchMedia('(pointer: coarse)').matches && isBreakpointUp('xl');
}

export function ToolRailProvider({ children }: { children: React.ReactNode }) {
  // Read once, on the first render: the default decides how a device starts,
  // the stored choice everything after.
  const [defaultExpanded] = React.useState(startsExpanded);
  const value = useToolRailState({ defaultExpanded });
  return (
    <ToolRailContext.Provider value={value}>
      {children}
    </ToolRailContext.Provider>
  );
}

/** Null outside the workspace shell, where a sidebar owns its own switch. */
export function useShellToolRail(): ToolRailState | null {
  return React.useContext(ToolRailContext);
}

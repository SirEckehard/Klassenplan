// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import {
  useCollapsibleSidebar,
  type UseCollapsibleSidebarOptions,
} from '@/hooks/ui/useCollapsibleSidebar';
import { useLayoutMode } from '@/hooks/ui/useLayoutMode';

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
 * A sidebar outside the shell — the export page's — finds no provider and
 * keeps its own state and its own switch.
 */
export type ToolRailState = {
  isExpanded: boolean;
  expand: () => void;
  collapse: () => void;
  toggle: () => void;
};

const ToolRailContext = React.createContext<ToolRailState | null>(null);

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
    }),
    [collapse, expand, isTablet, stored.isExpanded, tabletExpanded, toggle],
  );
}

export function ToolRailProvider({ children }: { children: React.ReactNode }) {
  const value = useToolRailState();
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

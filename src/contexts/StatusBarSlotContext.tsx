// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';

/**
 * Where a layer puts controls of its own into the shell's status bar.
 *
 * Two of the three histories are in the seating-plan context and the status
 * bar reads them itself. The room layer's scene history is not: it lives in
 * the layout editor together with the canvas state it snapshots, and so does
 * the plan layer's "mix again", which needs the view's mix handler. Both
 * render into the slots below through `StatusBarPortal` — the same trade as
 * the inspector's, markup travelling down instead of state travelling up.
 */
export type StatusBarSlot = 'start' | 'end';

type StatusBarSlotContextValue = {
  /** Beside the status line: the layer's own history. */
  startNode: HTMLElement | null;
  setStartNode: (node: HTMLElement | null) => void;
  /** The right end: the layer's one primary action. */
  endNode: HTMLElement | null;
  setEndNode: (node: HTMLElement | null) => void;
};

const StatusBarSlotContext =
  React.createContext<StatusBarSlotContextValue | null>(null);

export function StatusBarSlotProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [startNode, setStartNode] = React.useState<HTMLElement | null>(null);
  const [endNode, setEndNode] = React.useState<HTMLElement | null>(null);
  const value = React.useMemo(
    () => ({ startNode, setStartNode, endNode, setEndNode }),
    [endNode, startNode],
  );
  return (
    <StatusBarSlotContext.Provider value={value}>
      {children}
    </StatusBarSlotContext.Provider>
  );
}

/** Inert outside a provider, so a layer can be rendered on its own in a test. */
export function useStatusBarSlot(): StatusBarSlotContextValue {
  return React.useContext(StatusBarSlotContext) ?? FALLBACK;
}

const FALLBACK: StatusBarSlotContextValue = {
  startNode: null,
  setStartNode: () => {},
  endNode: null,
  setEndNode: () => {},
};

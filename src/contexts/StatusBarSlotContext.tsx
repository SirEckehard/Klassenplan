// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';

/**
 * Where a layer puts controls of its own into the shell's status bar.
 *
 * Two of the three histories are in the seating-plan context and the status
 * bar reads them itself. The room layer's scene history is not: it lives in
 * the layout editor together with the canvas state it snapshots, and so does
 * the plan layer's "Mischen", which needs the view's mix handler. Both
 * render into the slots below through `StatusBarPortal` — the same trade as
 * the inspector's, markup travelling down instead of state travelling up.
 */
export type StatusBarSlot = 'history' | 'action';

type StatusBarSlotContextValue = {
  /** The middle of the bar, under the stage: the layer's own history. */
  historyNode: HTMLElement | null;
  setHistoryNode: (node: HTMLElement | null) => void;
  /**
   * Beside the history: the layer's one primary action, which acts on the
   * stage and which undo takes back — mixing the plan, fitting the circle.
   */
  actionNode: HTMLElement | null;
  setActionNode: (node: HTMLElement | null) => void;
};

const StatusBarSlotContext =
  React.createContext<StatusBarSlotContextValue | null>(null);

export function StatusBarSlotProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [historyNode, setHistoryNode] = React.useState<HTMLElement | null>(
    null,
  );
  const [actionNode, setActionNode] = React.useState<HTMLElement | null>(null);
  const value = React.useMemo(
    () => ({ historyNode, setHistoryNode, actionNode, setActionNode }),
    [actionNode, historyNode],
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
  historyNode: null,
  setHistoryNode: () => {},
  actionNode: null,
  setActionNode: () => {},
};

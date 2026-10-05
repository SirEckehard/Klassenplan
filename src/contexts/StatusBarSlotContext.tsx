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
 * The class list's jump to its ends hangs above the bar's right end the same
 * way (`float`). The plan layer states its fulfilment at the bar's left end,
 * where the other layers state their numbers (`status`).
 */
export type StatusBarSlot = 'history' | 'action' | 'float' | 'status';

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
  /**
   * Above the bar's right end: a control that stands over the stage but
   * belongs to the bar, so it moves with it — a `fixed` one measured from the
   * window's edge slid into the bar wherever Safari ends the window below it.
   */
  floatNode: HTMLElement | null;
  setFloatNode: (node: HTMLElement | null) => void;
  /** The bar's left end, beside the toolbar's switch: what a view states. */
  statusNode: HTMLElement | null;
  setStatusNode: (node: HTMLElement | null) => void;
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
  const [floatNode, setFloatNode] = React.useState<HTMLElement | null>(null);
  const [statusNode, setStatusNode] = React.useState<HTMLElement | null>(null);
  const value = React.useMemo(
    () => ({
      historyNode,
      setHistoryNode,
      actionNode,
      setActionNode,
      floatNode,
      setFloatNode,
      statusNode,
      setStatusNode,
    }),
    [actionNode, floatNode, historyNode, statusNode],
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
  floatNode: null,
  setFloatNode: () => {},
  statusNode: null,
  setStatusNode: () => {},
};

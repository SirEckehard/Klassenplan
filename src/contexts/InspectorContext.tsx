// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';

/**
 * What the inspector is currently looking at.
 *
 * Deliberately separate from the list's multi-select: ticking three students
 * for a bulk edit is a different intent from opening one to read its
 * properties, and conflating the two made the old row do both jobs badly.
 *
 * Only students so far. Tables and room features join once the room layer
 * gets its inspector.
 */
export type InspectorSelection = { kind: 'student'; id: string } | null;

type InspectorContextValue = {
  selection: InspectorSelection;
  selectStudent: (id: string) => void;
  toggleStudent: (id: string) => void;
  clear: () => void;
  /**
   * True while the active view has nothing for the inspector to show and
   * wants the width instead — the attribute focus mode asks one question of
   * the whole class at once, so there is no "the selected one" to inspect.
   */
  suspended: boolean;
  setSuspended: (suspended: boolean) => void;
  /**
   * Where `InspectorPortal` renders. A layer that owns its own selection —
   * the room layer holds table and feature ids deep inside its canvas state —
   * fills the shell's panel from where that state already is, instead of
   * threading a dozen mutators up through context.
   */
  slotNode: HTMLElement | null;
  setSlotNode: (node: HTMLElement | null) => void;
  /**
   * Whether an `InspectorPortal` is mounted. The room and plan layers always
   * fill the panel that way; the class layer does so only while several
   * students are ticked, and the inspector shows its slot instead of the one
   * student for as long as that lasts.
   */
  portalMounted: boolean;
  /**
   * What the mounted portal calls its panel, for the column's landmark; null
   * leaves the name to the layer.
   */
  portalLabel: string | null;
  /** Called by `InspectorPortal` on mount; returns the release for unmount. */
  mountPortal: (label?: string) => () => void;
};

const InspectorContext = React.createContext<InspectorContextValue | null>(
  null,
);

export function InspectorProvider({ children }: { children: React.ReactNode }) {
  const [selection, setSelection] = React.useState<InspectorSelection>(null);

  const selectStudent = React.useCallback((id: string) => {
    setSelection({ kind: 'student', id });
  }, []);

  const toggleStudent = React.useCallback((id: string) => {
    setSelection((current) =>
      current?.kind === 'student' && current.id === id
        ? null
        : { kind: 'student', id },
    );
  }, []);

  const clear = React.useCallback(() => setSelection(null), []);

  const [suspended, setSuspended] = React.useState(false);
  const [slotNode, setSlotNode] = React.useState<HTMLElement | null>(null);
  const [portalCount, setPortalCount] = React.useState(0);
  const [portalLabel, setPortalLabel] = React.useState<string | null>(null);

  const mountPortal = React.useCallback((label?: string) => {
    setPortalCount((count) => count + 1);
    setPortalLabel(label ?? null);
    return () => {
      setPortalCount((count) => count - 1);
      setPortalLabel(null);
    };
  }, []);

  const value = React.useMemo(
    () => ({
      selection,
      selectStudent,
      toggleStudent,
      clear,
      suspended,
      setSuspended,
      slotNode,
      setSlotNode,
      portalMounted: portalCount > 0,
      portalLabel,
      mountPortal,
    }),
    [
      clear,
      mountPortal,
      portalCount,
      portalLabel,
      selectStudent,
      selection,
      slotNode,
      suspended,
      toggleStudent,
    ],
  );

  return (
    <InspectorContext.Provider value={value}>
      {children}
    </InspectorContext.Provider>
  );
}

/**
 * Reads the inspector selection.
 *
 * Returns an inert value outside a provider so a view can be rendered on its
 * own in a test without dragging the whole shell along.
 */
export function useInspector(): InspectorContextValue {
  const context = React.useContext(InspectorContext);
  return context ?? FALLBACK;
}

const noop = () => {};
const FALLBACK: InspectorContextValue = {
  selection: null,
  selectStudent: noop,
  toggleStudent: noop,
  clear: noop,
  suspended: false,
  setSuspended: noop,
  slotNode: null,
  setSlotNode: noop,
  portalMounted: false,
  portalLabel: null,
  mountPortal: () => noop,
};

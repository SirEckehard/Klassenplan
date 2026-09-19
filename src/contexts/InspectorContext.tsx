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
    }),
    [clear, selectStudent, selection, slotNode, suspended, toggleStudent],
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
};

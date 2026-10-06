// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import usePersistentState from '@/hooks/usePersistentState';
import { isBreakpointUp } from '@/hooks/ui/useBreakpoint';
import { LOCAL_STORAGE_KEYS } from '@/utils';

/**
 * What the inspector is currently looking at.
 *
 * Deliberately separate from the list's multi-select: ticking three students
 * for a bulk edit is a different intent from opening one to read its
 * properties, and conflating the two made the old row do both jobs badly.
 *
 * Only students are selected here. The room, the plan and the circle fill
 * the panel through `InspectorPortal` from where their own state lives.
 */
export type InspectorSelection = {
  kind: 'student';
  id: string;
  /**
   * Opened by stepping through the list with the keyboard. The focus stays
   * where it is, so the next arrow key still steps: an unnamed student's
   * name field opens without taking it.
   */
  keepFocus?: boolean;
} | null;

/** How a student is opened; see `InspectorSelection`. */
export type SelectStudentOptions = { keepFocus?: boolean };

/** The inspector's element, for the switches that fold or open it. */
export const INSPECTOR_DRAWER_ID = 'shell-inspector';

type InspectorContextValue = {
  selection: InspectorSelection;
  selectStudent: (id: string, options?: SelectStudentOptions) => void;
  toggleStudent: (id: string) => void;
  clear: () => void;
  /**
   * The order the class list shows — searched, filtered and sorted — as ids,
   * so the inspector's arrows step through the students in the order the
   * list numbers them. Null where no list publishes one: the class order.
   */
  studentOrder: readonly string[] | null;
  setStudentOrder: (order: readonly string[] | null) => void;
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
   * fill the panel that way; the class layer does so only while students
   * are ticked, and the inspector shows its slot instead of the opened
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
  /**
   * From `lg` up the column can be folded away on every layer, so the stage
   * takes its width: on an iPad in landscape the toolbar and a 320px column
   * left the plan barely 500px. The button in the panel's head folds it, a
   * narrow strip at the window's right edge brings it back, remembered per
   * device. A touch screen narrower than `xl` starts folded, anything else
   * with the column shown. Opening a student unfolds it: the column is where
   * a student is edited.
   */
  folded: boolean;
  setFolded: (folded: boolean) => void;
  /**
   * Below `lg` there is no room for the inspector's column, so what a layer
   * portals in opens as a drawer over the stage — from the strip at the right
   * edge on a tablet, from the button beside the toolbar's on a phone.
   */
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  /**
   * True inside the shell's provider. A panel rendered on its own — in a
   * test, or anywhere without the shell — has no column to fold.
   */
  inShell: boolean;
};

const InspectorContext = React.createContext<InspectorContextValue | null>(
  null,
);

/**
 * Where the column starts out before the teacher chose: folded on a touch
 * screen narrower than `xl` — an iPad in landscape — where a column beside
 * the toolbar squeezes the plan, shown everywhere else.
 */
function foldsByDefault(): boolean {
  if (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return false;
  }
  return (
    window.matchMedia('(pointer: coarse)').matches && !isBreakpointUp('xl')
  );
}

export function InspectorProvider({ children }: { children: React.ReactNode }) {
  const [selection, setSelection] = React.useState<InspectorSelection>(null);
  // What `toggleStudent` compares against, without re-creating it on every
  // selection.
  const selectionRef = React.useRef<InspectorSelection>(null);
  React.useLayoutEffect(() => {
    selectionRef.current = selection;
  }, [selection]);

  const [suspended, setSuspended] = React.useState(false);
  const [studentOrder, setStudentOrder] = React.useState<
    readonly string[] | null
  >(null);
  const [slotNode, setSlotNode] = React.useState<HTMLElement | null>(null);
  const [portalCount, setPortalCount] = React.useState(0);
  const [portalLabel, setPortalLabel] = React.useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  // Read once, on the first render: the default decides how a device starts,
  // the stored choice everything after.
  const [defaultFolded] = React.useState(foldsByDefault);
  const [folded, setFolded] = usePersistentState<boolean>(
    LOCAL_STORAGE_KEYS.inspectorFolded,
    defaultFolded,
  );

  // A student opened from `lg` up is to be edited in the column, so a folded
  // one comes back. Below `lg` the drawer and the sheet open on their own,
  // and the stored choice stays the teacher's for the wider window.
  const revealColumn = React.useCallback(() => {
    if (isBreakpointUp('lg')) setFolded(false);
  }, [setFolded]);

  const selectStudent = React.useCallback(
    (id: string, options?: SelectStudentOptions) => {
      setSelection(
        options?.keepFocus
          ? { kind: 'student', id, keepFocus: true }
          : { kind: 'student', id },
      );
      revealColumn();
    },
    [revealColumn],
  );

  const toggleStudent = React.useCallback(
    (id: string) => {
      const current = selectionRef.current;
      if (current?.kind === 'student' && current.id === id) {
        setSelection(null);
        return;
      }
      setSelection({ kind: 'student', id });
      revealColumn();
    },
    [revealColumn],
  );

  const clear = React.useCallback(() => setSelection(null), []);

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
      studentOrder,
      setStudentOrder,
      suspended,
      setSuspended,
      slotNode,
      setSlotNode,
      portalMounted: portalCount > 0,
      portalLabel,
      mountPortal,
      folded,
      setFolded,
      drawerOpen,
      setDrawerOpen,
      inShell: true,
    }),
    [
      clear,
      drawerOpen,
      folded,
      mountPortal,
      portalCount,
      portalLabel,
      selectStudent,
      selection,
      setFolded,
      slotNode,
      studentOrder,
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
  studentOrder: null,
  setStudentOrder: noop,
  suspended: false,
  setSuspended: noop,
  slotNode: null,
  setSlotNode: noop,
  portalMounted: false,
  portalLabel: null,
  mountPortal: () => noop,
  folded: false,
  setFolded: noop,
  drawerOpen: false,
  setDrawerOpen: noop,
  inShell: false,
};

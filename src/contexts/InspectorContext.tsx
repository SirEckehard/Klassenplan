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
  /**
   * Opens a student, or puts the one already open away — and folds the
   * column back when opening it had unfolded it. What a row of the class
   * list does when pressed.
   */
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
  /**
   * How the mounted portal asks to be shown on a phone (`PortalPresentation`):
   * as the sheet from the bottom an opened student gets, and with a number on
   * the status bar's switch. Both are off for the room, the plan and the
   * circle, whose panels open as the drawer.
   */
  portalPresentation: PortalPresentation;
  /** Called by `InspectorPortal` on mount; returns the release for unmount. */
  mountPortal: (
    label?: string,
    presentation?: PortalPresentation,
  ) => () => void;
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
   * Whether the help stands in the inspector's place (`HelpButton`): the
   * column from `lg` up — unfolded for it, and folded back when it closes if
   * it was folded before — the drawer below. Whatever the layer portals in
   * stays mounted underneath, only out of sight. Opening a student, the
   * column's switch and a drawer opened by the layer put the help away.
   */
  helpOpen: boolean;
  setHelpOpen: (open: boolean) => void;
  /** Where the help renders while it is open; the inspector draws it. */
  helpSlotNode: HTMLElement | null;
  setHelpSlotNode: (node: HTMLElement | null) => void;
  /**
   * True inside the shell's provider. A panel rendered on its own — in a
   * test, or anywhere without the shell — has no column to fold.
   */
  inShell: boolean;
};

/**
 * What a portal asks of the phone. The class layer's ticked students are
 * edited in the sheet an opened student gets, so they look alike; the switch
 * that opens it says how many are ticked.
 */
export type PortalPresentation = {
  /** On a phone, open as the sheet from the bottom instead of the drawer. */
  sheet?: boolean;
  /** A number on the status bar's switch, on a phone. */
  badge?: number;
};

const NO_PRESENTATION: PortalPresentation = {};

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
  const [portalPresentation, setPortalPresentation] =
    React.useState<PortalPresentation>(NO_PRESENTATION);
  const [drawerOpen, setDrawerOpenState] = React.useState(false);
  const [helpOpen, setHelpOpenState] = React.useState(false);
  const helpOpenRef = React.useRef(false);
  React.useLayoutEffect(() => {
    helpOpenRef.current = helpOpen;
  }, [helpOpen]);
  const [helpSlotNode, setHelpSlotNode] = React.useState<HTMLElement | null>(
    null,
  );
  // Read once, on the first render: the default decides how a device starts,
  // the stored choice everything after.
  const [defaultFolded] = React.useState(foldsByDefault);
  const [folded, setFolded] = usePersistentState<boolean>(
    LOCAL_STORAGE_KEYS.inspectorFolded,
    defaultFolded,
  );

  // A student opened from `lg` up is to be edited in the column, so a folded
  // one comes back. Below `lg` the drawer and the sheet open on their own,
  // and the stored choice stays the teacher's for the wider window. Whether
  // the column was folded before is kept, so putting the student away again
  // folds it back — an iPad in landscape starts folded.
  const foldedRef = React.useRef(folded);
  const unfoldedForStudentRef = React.useRef(false);
  const unfoldedForHelpRef = React.useRef(false);
  React.useLayoutEffect(() => {
    foldedRef.current = folded;
  }, [folded]);
  const revealColumn = React.useCallback(() => {
    if (!isBreakpointUp('lg') || !foldedRef.current) return;
    unfoldedForStudentRef.current = true;
    setFolded(false);
  }, [setFolded]);
  // Something else takes the help's place. A column the help unfolded stays
  // open for it, and folds back when that is put away, as for a student.
  const dismissHelp = React.useCallback(() => {
    setHelpOpenState(false);
    if (unfoldedForHelpRef.current) {
      unfoldedForHelpRef.current = false;
      unfoldedForStudentRef.current = true;
    }
  }, []);
  // The teacher's own switch makes the state theirs again.
  const setFoldedByHand = React.useCallback(
    (next: boolean) => {
      unfoldedForStudentRef.current = false;
      unfoldedForHelpRef.current = false;
      setHelpOpenState(false);
      setFolded(next);
    },
    [setFolded],
  );
  const setDrawerOpen = React.useCallback(
    (open: boolean) => {
      if (open) dismissHelp();
      setDrawerOpenState(open);
    },
    [dismissHelp],
  );
  const setHelpOpen = React.useCallback(
    (open: boolean) => {
      if (open) {
        if (isBreakpointUp('lg') && foldedRef.current) {
          unfoldedForHelpRef.current = true;
          setFolded(false);
        }
        setHelpOpenState(true);
        return;
      }
      setHelpOpenState(false);
      if (unfoldedForHelpRef.current) {
        unfoldedForHelpRef.current = false;
        setFolded(true);
      }
    },
    [setFolded],
  );

  const selectStudent = React.useCallback(
    (id: string, options?: SelectStudentOptions) => {
      setSelection(
        options?.keepFocus
          ? { kind: 'student', id, keepFocus: true }
          : { kind: 'student', id },
      );
      dismissHelp();
      revealColumn();
    },
    [dismissHelp, revealColumn],
  );

  const toggleStudent = React.useCallback(
    (id: string) => {
      const current = selectionRef.current;
      // The row of the student under the help brings that student back
      // rather than putting it away unseen.
      if (helpOpenRef.current) {
        setSelection({ kind: 'student', id });
        dismissHelp();
        return;
      }
      if (current?.kind === 'student' && current.id === id) {
        setSelection(null);
        if (unfoldedForStudentRef.current) {
          unfoldedForStudentRef.current = false;
          setFolded(true);
        }
        return;
      }
      setSelection({ kind: 'student', id });
      dismissHelp();
      revealColumn();
    },
    [dismissHelp, revealColumn, setFolded],
  );

  const clear = React.useCallback(() => setSelection(null), []);

  const mountPortal = React.useCallback(
    (label?: string, presentation?: PortalPresentation) => {
      setPortalCount((count) => count + 1);
      setPortalLabel(label ?? null);
      setPortalPresentation(presentation ?? NO_PRESENTATION);
      return () => {
        setPortalCount((count) => count - 1);
        setPortalLabel(null);
        setPortalPresentation(NO_PRESENTATION);
      };
    },
    [],
  );

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
      portalPresentation,
      mountPortal,
      folded,
      setFolded: setFoldedByHand,
      drawerOpen,
      setDrawerOpen,
      helpOpen,
      setHelpOpen,
      helpSlotNode,
      setHelpSlotNode,
      inShell: true,
    }),
    [
      clear,
      drawerOpen,
      folded,
      helpOpen,
      helpSlotNode,
      mountPortal,
      portalCount,
      portalLabel,
      portalPresentation,
      selectStudent,
      selection,
      setDrawerOpen,
      setFoldedByHand,
      setHelpOpen,
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
  portalPresentation: NO_PRESENTATION,
  mountPortal: () => noop,
  folded: false,
  setFolded: noop,
  drawerOpen: false,
  setDrawerOpen: noop,
  helpOpen: false,
  setHelpOpen: noop,
  helpSlotNode: null,
  setHelpSlotNode: noop,
  inShell: false,
};

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
export type InspectorSelection = { kind: 'student'; id: string } | null;

/** The inspector's element, for the status bar switch that opens its drawer. */
export const INSPECTOR_DRAWER_ID = 'shell-inspector';

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
   * Whether the mounted portal lets the column fold away from `lg` up — the
   * room, the plan, the circle and the export sheet do; the class layer's
   * ticked students do not, since only the column shows them there.
   */
  portalFoldable: boolean;
  /** Called by `InspectorPortal` on mount; returns the release for unmount. */
  mountPortal: (label?: string, foldable?: boolean) => () => void;
  /**
   * From `lg` up the column of a foldable panel can be folded away, so the
   * stage takes its width: on an iPad in landscape the toolbar and a 320px
   * column left the plan barely 500px. The switch at the right end of the
   * status bar folds it, remembered per device. A touch screen narrower than
   * `xl` starts folded, anything else with the column shown.
   */
  folded: boolean;
  setFolded: (folded: boolean) => void;
  /**
   * Below `lg` there is no room for the inspector's column, so what a layer
   * portals in opens as a drawer over the stage — from the status bar
   * (`StatusBarFrame`), which is where this is switched.
   */
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
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
  const [portalFoldable, setPortalFoldable] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  // Read once, on the first render: the default decides how a device starts,
  // the stored choice everything after.
  const [defaultFolded] = React.useState(foldsByDefault);
  const [folded, setFolded] = usePersistentState<boolean>(
    LOCAL_STORAGE_KEYS.inspectorFolded,
    defaultFolded,
  );

  const mountPortal = React.useCallback((label?: string, foldable = false) => {
    setPortalCount((count) => count + 1);
    setPortalLabel(label ?? null);
    setPortalFoldable(foldable);
    return () => {
      setPortalCount((count) => count - 1);
      setPortalLabel(null);
      setPortalFoldable(false);
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
      portalFoldable,
      mountPortal,
      folded,
      setFolded,
      drawerOpen,
      setDrawerOpen,
    }),
    [
      clear,
      drawerOpen,
      folded,
      mountPortal,
      portalCount,
      portalFoldable,
      portalLabel,
      selectStudent,
      selection,
      setFolded,
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
  portalFoldable: false,
  mountPortal: () => noop,
  folded: false,
  setFolded: noop,
  drawerOpen: false,
  setDrawerOpen: noop,
};

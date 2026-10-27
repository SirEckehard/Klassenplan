// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { createPortal } from 'react-dom';
import { useInspector } from '@/contexts/InspectorContext';
import { isBreakpointUp } from '@/hooks/ui/useBreakpoint';

/**
 * Renders a layer's own panel content into the shell's inspector frame.
 *
 * One student needs nothing like this — the inspector can read a student
 * straight from the seating-plan context. The room layer cannot: its selection
 * is a list of table indices and feature ids living inside the canvas state,
 * together with the mutators that go with them. Sending that up through context
 * would mean a dozen callbacks crossing the shell; sending the markup down is
 * one node. The same holds for the class layer's selection, whose ticks
 * and batch actions live in the list view.
 *
 * Mounting says so to the inspector (`mountPortal`), which is how the class
 * layer's panel knows to hand its slot over. It happens before paint, so the
 * panel it replaces is never drawn for a frame.
 */
export default function InspectorPortal({
  label,
  reveal = false,
  sheet = false,
  badge,
  children,
}: {
  /** Names the inspector column while this content fills it. */
  label?: string;
  /**
   * Brings the inspector into view when this content arrives — the column
   * from `lg` up, unfolded, the drawer below it — and closes the drawer again
   * when it leaves: the class layer's ticked students are edited nowhere else
   * there. The room, the plan and the sheet leave the inspector as the
   * teacher left it.
   */
  reveal?: boolean;
  /**
   * On a phone, opens as the sheet from the bottom an opened student gets,
   * and only from the status bar's switch: a sheet that came with every tick
   * would cover the list being ticked. It still closes when this content
   * leaves.
   */
  sheet?: boolean;
  /** A number on the status bar's switch on a phone — how many are ticked. */
  badge?: number;
  children: React.ReactNode;
}) {
  const { slotNode, mountPortal, setFolded, setDrawerOpen } = useInspector();
  React.useLayoutEffect(
    () => mountPortal(label, { sheet, badge }),
    [badge, label, mountPortal, sheet],
  );
  React.useLayoutEffect(() => {
    if (!reveal) return undefined;
    if (isBreakpointUp('lg')) {
      setFolded(false);
      return undefined;
    }
    if (!sheet || isBreakpointUp('md')) setDrawerOpen(true);
    return () => setDrawerOpen(false);
  }, [reveal, setDrawerOpen, setFolded, sheet]);
  return slotNode ? createPortal(children, slotNode) : null;
}

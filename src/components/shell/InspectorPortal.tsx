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
  children,
}: {
  /** Names the inspector column while this content fills it. */
  label?: string;
  /**
   * Unfolds a folded column from `lg` up when this content arrives: the
   * class layer's ticked students are edited nowhere else there. The room,
   * the plan and the sheet leave the column as the teacher left it.
   */
  reveal?: boolean;
  children: React.ReactNode;
}) {
  const { slotNode, mountPortal, setFolded } = useInspector();
  React.useLayoutEffect(() => mountPortal(label), [label, mountPortal]);
  React.useLayoutEffect(() => {
    if (reveal && isBreakpointUp('lg')) setFolded(false);
  }, [reveal, setFolded]);
  return slotNode ? createPortal(children, slotNode) : null;
}

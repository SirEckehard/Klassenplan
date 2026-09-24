// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { createPortal } from 'react-dom';
import { useInspector } from '@/contexts/InspectorContext';

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
  children,
}: {
  /** Names the inspector column while this content fills it. */
  label?: string;
  children: React.ReactNode;
}) {
  const { slotNode, mountPortal } = useInspector();
  React.useLayoutEffect(() => mountPortal(label), [label, mountPortal]);
  return slotNode ? createPortal(children, slotNode) : null;
}

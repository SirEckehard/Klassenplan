// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { createPortal } from 'react-dom';
import { useInspector } from '@/contexts/InspectorContext';

/**
 * Renders a layer's own panel content into the shell's inspector frame.
 *
 * The class layer needs nothing like this — the inspector can read a student
 * straight from the seating-plan context. The room layer cannot: its selection
 * is a list of table indices and feature ids living inside the canvas state,
 * together with the mutators that go with them. Sending that up through context
 * would mean a dozen callbacks crossing the shell; sending the markup down is
 * one node.
 */
export default function InspectorPortal({
  children,
}: {
  children: React.ReactNode;
}) {
  const { slotNode } = useInspector();
  return slotNode ? createPortal(children, slotNode) : null;
}

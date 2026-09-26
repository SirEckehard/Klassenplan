// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { createPortal } from 'react-dom';
import {
  useStatusBarSlot,
  type StatusBarSlot,
} from '@/contexts/StatusBarSlotContext';

/**
 * Renders a layer's own controls into the shell's status bar: `history` for
 * the layer's undo/redo in the middle, `end` for its one primary action.
 */
export default function StatusBarPortal({
  slot = 'history',
  children,
}: {
  slot?: StatusBarSlot;
  children: React.ReactNode;
}) {
  const { historyNode, endNode } = useStatusBarSlot();
  const target = slot === 'end' ? endNode : historyNode;
  return target ? createPortal(children, target) : null;
}

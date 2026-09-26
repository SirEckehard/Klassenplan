// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { createPortal } from 'react-dom';
import {
  useStatusBarSlot,
  type StatusBarSlot,
} from '@/contexts/StatusBarSlotContext';

/**
 * Renders a layer's own controls into the middle of the shell's status bar:
 * `history` for the layer's undo/redo, `action` for its one primary action
 * beside them.
 */
export default function StatusBarPortal({
  slot = 'history',
  children,
}: {
  slot?: StatusBarSlot;
  children: React.ReactNode;
}) {
  const { historyNode, actionNode } = useStatusBarSlot();
  const target = slot === 'action' ? actionNode : historyNode;
  return target ? createPortal(children, target) : null;
}

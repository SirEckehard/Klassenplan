// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { createPortal } from 'react-dom';
import {
  useStatusBarSlot,
  type StatusBarSlot,
} from '@/contexts/StatusBarSlotContext';

/**
 * Renders a layer's own controls into the shell's status bar: `start` for the
 * layer's history, `end` for its one primary action.
 */
export default function StatusBarPortal({
  slot = 'start',
  children,
}: {
  slot?: StatusBarSlot;
  children: React.ReactNode;
}) {
  const { startNode, endNode } = useStatusBarSlot();
  const target = slot === 'end' ? endNode : startNode;
  return target ? createPortal(children, target) : null;
}

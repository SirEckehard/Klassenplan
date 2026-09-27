// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';

import { isFormElementFocused } from '@/utils';

export type KeyboardShortcuts = Record<string, () => void>;

export interface KeyboardShortcutOptions {
  preventDefault?: boolean;
  target?: 'window' | 'document';
  condition?: () => boolean;
  ignoreWhileTyping?: boolean;
  /**
   * Listen during the capture phase, so the handler runs before any bubble
   * listener of the same event. Needed when `condition` inspects state that
   * another handler tears down — React can commit that update between two
   * bubble listeners, which would make the order of mounting decide the
   * outcome.
   */
  capture?: boolean;
}

/**
 * Splits a shortcut into its key and its modifiers.
 *
 * The key is whatever follows the last "+". Two keys need care, because a
 * plain split on "+" followed by a trim loses them: the plus key itself
 * ("+", "ctrl++") and the space bar (" "). Both used to parse to an empty key
 * and so never fired. `space` and `plus` are accepted as readable aliases.
 */
function parseShortcut(shortcut: string) {
  const normalized = shortcut.toLowerCase();
  let key: string;
  let modifierPart: string;

  if (normalized === ' ') {
    key = ' ';
    modifierPart = '';
  } else if (normalized.endsWith('+')) {
    // "+" on its own, or a combination that ends in the plus key ("ctrl++").
    key = '+';
    modifierPart = normalized.slice(0, -1);
  } else {
    const separator = normalized.lastIndexOf('+');
    key = normalized.slice(separator + 1).trim();
    modifierPart = separator === -1 ? '' : normalized.slice(0, separator);
  }

  if (key === 'space') key = ' ';
  if (key === 'plus') key = '+';

  const parts = modifierPart
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean);
  const modifiers = {
    ctrl: parts.includes('ctrl'),
    meta: parts.includes('cmd') || parts.includes('meta'),
    alt: parts.includes('alt'),
    shift: parts.includes('shift'),
  };

  return { key, modifiers };
}

/**
 * A symbol some keyboard layouts can only type with Shift — "+" on a US
 * keyboard, "?" on most. Such a key matches with or without Shift unless the
 * shortcut asks for Shift itself.
 */
const isShiftableSymbol = (key: string) =>
  key.length === 1 && !/[a-z0-9 ]/.test(key);

function matchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
  const { key, modifiers } = parseShortcut(shortcut);
  const eventKey = event.key.toLowerCase();
  const shiftMatches =
    modifiers.shift || !isShiftableSymbol(key)
      ? event.shiftKey === modifiers.shift
      : true;

  return (
    eventKey === key &&
    event.ctrlKey === modifiers.ctrl &&
    event.metaKey === modifiers.meta &&
    event.altKey === modifiers.alt &&
    shiftMatches
  );
}

export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcuts,
  options: KeyboardShortcutOptions = {},
) {
  const {
    preventDefault = true,
    target = 'window',
    condition,
    ignoreWhileTyping = true,
    capture = false,
  } = options;

  const shortcutsRef = React.useRef(shortcuts);
  const conditionRef = React.useRef(condition);

  React.useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  React.useEffect(() => {
    conditionRef.current = condition;
  }, [condition]);

  React.useEffect(() => {
    const handleKeyDown = (event: Event) => {
      const keyboardEvent = event as KeyboardEvent;
      const currentCondition = conditionRef.current;
      if (currentCondition && !currentCondition()) {
        return;
      }

      if (ignoreWhileTyping && isFormElementFocused()) {
        return;
      }

      for (const [shortcut, handler] of Object.entries(shortcutsRef.current)) {
        if (matchesShortcut(keyboardEvent, shortcut)) {
          if (preventDefault) {
            keyboardEvent.preventDefault();
          }
          handler();
          break;
        }
      }
    };

    const targetElement = target === 'window' ? window : document;
    targetElement.addEventListener('keydown', handleKeyDown, capture);

    return () => {
      targetElement.removeEventListener('keydown', handleKeyDown, capture);
    };
  }, [preventDefault, target, ignoreWhileTyping, capture]);
}

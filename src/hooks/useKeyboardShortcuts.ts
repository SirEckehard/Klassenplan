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

function parseShortcut(shortcut: string) {
  const parts = shortcut
    .toLowerCase()
    .split('+')
    .map((p) => p.trim());
  const key = parts[parts.length - 1];
  const modifiers = {
    ctrl: parts.includes('ctrl'),
    meta: parts.includes('cmd') || parts.includes('meta'),
    alt: parts.includes('alt'),
    shift: parts.includes('shift'),
  };

  return { key, modifiers };
}

function matchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
  const { key, modifiers } = parseShortcut(shortcut);
  const eventKey = event.key.toLowerCase();

  return (
    eventKey === key &&
    event.ctrlKey === modifiers.ctrl &&
    event.metaKey === modifiers.meta &&
    event.altKey === modifiers.alt &&
    event.shiftKey === modifiers.shift
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

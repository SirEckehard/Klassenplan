// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { withBrowserLocalStorage } from './browserEnvironment';
import { LOCAL_STORAGE_KEYS } from './data/storageKeys';

/**
 * Shortcuts on a single character key can be switched off (WCAG 2.1.4).
 *
 * "?" for Help, P for the PDF, F, + and − in the projection, 1–3 for the
 * layers, Q/E to turn a table, C for the circle's connections: quick for a
 * teacher at the keyboard, but speech input turns words into keystrokes, and
 * a misheard command outside a text field would press them. A field never
 * triggers them anyway (`isFormElementFocused`); this switch, in the settings
 * menu, silences them everywhere else. Shortcuts with Ctrl/⌘ or Alt, the
 * arrows, Enter, Escape and the space bar are not character keys and stay.
 */
type CharacterKeyEvent = Pick<
  KeyboardEvent,
  'key' | 'ctrlKey' | 'metaKey' | 'altKey'
>;

/** A key that types a character and no modifier that makes it a command. */
function isCharacterKey(event: CharacterKeyEvent): boolean {
  return (
    event.key.length === 1 &&
    event.key !== ' ' &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey
  );
}

/** On unless the teacher switched them off; unreadable storage means on. */
export function characterKeyShortcutsEnabled(): boolean {
  return (
    withBrowserLocalStorage(
      (storage) =>
        storage.getItem(LOCAL_STORAGE_KEYS.characterKeyShortcuts) !== 'false',
      true,
    ) ?? true
  );
}

export function setCharacterKeyShortcutsEnabled(enabled: boolean): void {
  withBrowserLocalStorage((storage) =>
    storage.setItem(LOCAL_STORAGE_KEYS.characterKeyShortcuts, String(enabled)),
  );
}

/** True for a keystroke that would fire a shortcut the teacher switched off. */
export function isSilencedCharacterKey(event: CharacterKeyEvent): boolean {
  return isCharacterKey(event) && !characterKeyShortcutsEnabled();
}

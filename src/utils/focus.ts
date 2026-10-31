// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { getBrowserDocument } from './browserEnvironment';

/**
 * Detect whether the currently focused element is a form control or contentEditable.
 * Useful to prevent global shortcuts from hijacking regular text inputs.
 */
export const isFormElementFocused = (): boolean => {
  const documentRef = getBrowserDocument();
  if (!documentRef) {
    return false;
  }

  const activeElement = documentRef.activeElement;
  if (!activeElement) {
    return false;
  }

  if (
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement ||
    activeElement instanceof HTMLSelectElement
  ) {
    return true;
  }

  return (
    activeElement instanceof HTMLElement && activeElement.isContentEditable
  );
};

/**
 * Hides the focus ring (`data-quiet-focus`) until the element loses focus.
 * For a row whose own mark — the opened row's blue bar — already says where
 * the focus is, so the ring would say it twice. The element styles it with
 * `data-quiet-focus:focus-visible:ring-0`; the ring comes back when the focus
 * arrives another way, by Tab.
 */
export const quietFocusRing = (element: HTMLElement) => {
  if ('quietFocus' in element.dataset) return;
  element.dataset.quietFocus = '';
  element.addEventListener(
    'blur',
    () => {
      delete element.dataset.quietFocus;
    },
    { once: true },
  );
};

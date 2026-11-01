// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { announce } from '@/utils/ui/toast';

/** How long a tapped, blocked control keeps saying why. */
const REFUSAL_HINT_MS = 4000;

/**
 * A blocked control that answers at itself when it is pressed.
 *
 * Its `HintTooltip` says why on hover and focus — but a finger has neither,
 * and Safari does not focus a tapped button, so a tablet never saw it, and a
 * press raised a card far from the control instead. Pressed, the hint shows
 * for a few seconds where the finger is, and a screen reader hears it
 * (decision 0037). A shortcut, which has no control in view, keeps its card.
 */
export function useRefusalHint(hint: string | null | undefined): {
  open: boolean;
  show: () => void;
} {
  const [shownAt, setShownAt] = React.useState(0);

  React.useEffect(() => {
    if (shownAt === 0) return undefined;
    const timer = window.setTimeout(() => setShownAt(0), REFUSAL_HINT_MS);
    return () => window.clearTimeout(timer);
  }, [shownAt]);

  const show = React.useCallback(() => {
    if (!hint) return;
    setShownAt(Date.now());
    announce(hint);
  }, [hint]);

  // A control that is no longer blocked has nothing left to say.
  return { open: Boolean(hint) && shownAt !== 0, show };
}

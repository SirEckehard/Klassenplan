// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { MOTION_DURATION, motionEnabled } from '@/utils/ui/motion';

/**
 * Another layer of the same classroom fades in: the workspace between the
 * header and the status bar — the toolbar, the stage and the inspector,
 * whose contents all change with the layer — starts transparent and is there
 * in 180 ms. The layer itself changes at once, as it always did; only the
 * view of it fades. (The browser's View Transitions would cross-fade old and
 * new, but they change the state a frame late, after code that has already
 * gone on as if the layer had changed.) Nothing on the first drawing, nothing
 * under reduced motion.
 */
export function useLayerFade(
  ref: React.RefObject<HTMLElement | null>,
  layer: unknown,
): void {
  const lastLayer = React.useRef(layer);
  React.useLayoutEffect(() => {
    if (lastLayer.current === layer) return;
    lastLayer.current = layer;
    const node = ref.current;
    // The shell's `<main>` holds the inspector beside the layer.
    const workspace = node?.closest('main') ?? node;
    if (!workspace || !motionEnabled(workspace)) return;
    workspace.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: MOTION_DURATION.layer,
      easing: 'linear',
    });
  }, [ref, layer]);
}

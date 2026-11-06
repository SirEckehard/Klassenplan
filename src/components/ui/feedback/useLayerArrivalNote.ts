// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { noteLayerArrived } from '@/utils/ui/motion';

/**
 * A layer's skeleton notes when it gives way, in the same commit the layer
 * arrives in, so what the layer changes then does not move (`isLayerArriving`).
 */
export function useLayerArrivalNote(): void {
  React.useLayoutEffect(() => noteLayerArrived, []);
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer

/**
 * The two layout classes every layer shares, so the four views that fill the
 * shell (class, room, plan, circle) cannot disagree about its geometry.
 *
 * From `lg` up the workspace is a window, not a document: header and status bar
 * stand still, and the three columns between them — toolbar, stage, inspector —
 * scroll on their own. Below `lg` the layer stays a stacked, scrolling page,
 * which is what a phone and an iPad in portrait need.
 */

/** The root of a layer: the toolbar and the stage side by side. */
export const workspaceLayerClass =
  'flex flex-col gap-4 lg:min-h-0 lg:flex-1 lg:flex-row lg:gap-0';

/**
 * The stage: the one column that belongs to the layer's own subject. It is the
 * sunken surface of the workspace, so the toolbar and the inspector read as the
 * paper around it.
 */
export const workspaceStageClass =
  'min-w-0 flex-1 lg:min-h-0 lg:overflow-y-auto lg:bg-(--surface-sunken) lg:p-5';

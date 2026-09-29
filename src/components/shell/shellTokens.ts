// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer

/**
 * The two layout classes every layer shares, so the four views that fill the
 * shell (class, room, plan, circle) cannot disagree about its geometry.
 *
 * From `lg` up the workspace is a window, not a document: header and status bar
 * stand still, and the three columns between them — toolbar, stage, inspector —
 * scroll on their own. Below `lg` the layer stays a scrolling page. A tablet
 * keeps the toolbar beside the stage, as a column that stays in view while the
 * page scrolls (`SmartSidebar`); stacked above the stage it pushed an iPad's
 * room out of sight. A phone has no toolbar in the flow at all — it opens as a
 * drawer — so there the stage is all the layer shows.
 */

/**
 * How much of the window's bottom edge the status bar takes: its 36px
 * controls, the 38px undo/redo frame on most layers, padding and hairline come
 * to 53–55px. Whatever sits above the bar keeps clear of this much — the
 * drawers and the focus mode's thumb bar through `--shell-bottom-inset`, the
 * tablet's toolbar column through its measured height.
 */
export const SHELL_STATUS_BAR_HEIGHT = 56;

/** The root of a layer: the toolbar and the stage side by side. */
export const workspaceLayerClass =
  'flex flex-col gap-4 md:flex-row md:items-start lg:min-h-0 lg:flex-1 lg:items-stretch lg:gap-0';

/**
 * The stage: the one column that belongs to the layer's own subject. It is the
 * sunken surface of the workspace, so the toolbar and the inspector read as the
 * paper around it.
 */
export const workspaceStageClass =
  'min-w-0 flex-1 lg:min-h-0 lg:overflow-y-auto lg:bg-(--surface-sunken) lg:p-5';

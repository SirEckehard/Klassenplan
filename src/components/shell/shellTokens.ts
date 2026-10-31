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
 * How much of the window's bottom edge the status bar takes at the browser's
 * default text size: its row is at least 44px (`min-h-11`), with 8px of
 * padding above and below and the hairline on top, 61px. Whatever sits above
 * the bar keeps clear of it — the drawers and the focus mode's thumb bar
 * through `--shell-bottom-inset`, which `AppShell` sets from the bar's
 * measured height (a larger text size makes it taller) and from this until it
 * is measured; the tablet's toolbar column through its measured height.
 */
export const SHELL_STATUS_BAR_HEIGHT = 61;

/** The root of a layer: the toolbar and the stage side by side. */
export const workspaceLayerClass =
  'flex flex-col gap-4 md:flex-row md:items-start lg:min-h-0 lg:flex-1 lg:items-stretch lg:gap-0';

/**
 * The plan layer's root and stage below `lg`, added to the two above: there
 * the layer stays a page, but the plan and the circle fill what it leaves
 * between the header and the status bar instead of growing it
 * (`canvasFillClass`), so it scrolls only where the plan would otherwise get
 * too small. Below `md` the stage keeps clear of the layer's actions, which
 * hang from the status bar over its bottom edge (`AppStatusBar`).
 *
 * Below `md` the root is a row as well, though the stage is all it holds
 * there (a phone's toolbar is a drawer): a column under the page's
 * `min-h-dvh` gives the stage a height Chromium does not count as definite,
 * so its `100cqh` came to 0 and the plan's frame to nothing. Stretched across
 * a row, as on a tablet, the height counts.
 */
export const workspaceFitLayerClass = 'max-lg:flex-1 max-md:flex-row';
export const workspaceFitStageClass =
  'max-lg:flex max-lg:flex-col max-lg:self-stretch max-md:pb-12';

/**
 * The stage: the one column that belongs to the layer's own subject. It is the
 * sunken surface of the workspace, so the toolbar and the inspector read as the
 * paper around it.
 */
export const workspaceStageClass =
  'min-w-0 flex-1 lg:min-h-0 lg:overflow-y-auto lg:bg-(--surface-sunken) lg:p-5';

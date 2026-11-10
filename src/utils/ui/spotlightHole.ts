// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** An ellipse turned by `rotation` degrees about its centre. */
export interface SpotlightHole {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rotation: number;
}

/**
 * One path that covers `area` and leaves the ellipse out, drawn with
 * `fill-rule="evenodd"`.
 *
 * The spotlight used to punch its hole with an SVG mask. A mask is drawn
 * into a bitmap the size of what it covers, and the dimming reaches far
 * past the plan (`DIM_BLEED`); Safari shrinks a bitmap that large, so the
 * hole blurred away and the drawn seat stayed as dark as the rest. A path
 * has no bitmap and stays sharp at every size.
 */
export function dimPathWithHole(area: Area, hole: SpotlightHole): string {
  const { x, y, width, height } = area;
  const angle = (hole.rotation * Math.PI) / 180;
  const dx = hole.rx * Math.cos(angle);
  const dy = hole.rx * Math.sin(angle);
  const start = `${hole.cx + dx} ${hole.cy + dy}`;
  const end = `${hole.cx - dx} ${hole.cy - dy}`;
  const arc = `A ${hole.rx} ${hole.ry} ${hole.rotation} 1 1`;
  return (
    `M ${x} ${y} H ${x + width} V ${y + height} H ${x} Z ` +
    `M ${start} ${arc} ${end} ${arc} ${start} Z`
  );
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type React from 'react';
import { nameLineOffsets, type NameFit } from '@/utils/ui/seatLabelLayout';

type SeatNameTextProps = {
  /** Centre of the seat; the fit's `centerX`/`centerY` move the block from there. */
  x: number;
  y: number;
  fit: NameFit;
  /** The whole name, for the tooltip a shortened label needs. */
  title: string;
  fill: string;
  fontWeight: number;
  transform?: string;
  style?: React.CSSProperties;
};

/**
 * A name on a seat, as `fitNameInBox` / `fitNameInCircle` laid it out: one
 * line drawn as before, two as a `tspan` each, the block centred where the fit
 * put it. Every view that draws a seat — the plan, the circle, the projection,
 * the exports — draws its name through here.
 */
export default function SeatNameText({
  x,
  y,
  fit,
  title,
  fill,
  fontWeight,
  transform,
  style,
}: SeatNameTextProps) {
  const centerX = x + fit.centerX;
  const centerY = y + fit.centerY;
  const offsets = nameLineOffsets(fit);
  return (
    <text
      x={centerX}
      y={centerY}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={fit.fontSize}
      fontWeight={fontWeight}
      transform={transform}
      fill={fill}
      style={style}
    >
      <title>{title}</title>
      {fit.lines.length > 1
        ? fit.lines.map((line, index) => (
            <tspan
              key={index}
              x={centerX}
              y={centerY + offsets[index]}
              dominantBaseline="central"
            >
              {line}
            </tspan>
          ))
        : fit.lines[0]}
    </text>
  );
}

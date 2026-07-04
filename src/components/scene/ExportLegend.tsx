// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type { LegendLayout } from '@/utils/ui/classBadgeLegend';

interface ExportLegendProps {
  layout: LegendLayout;
  /** Top-left of the legend band in page coordinates. */
  x: number;
  y: number;
  title: string;
  fontSize: number;
  iconSize: number;
}

/**
 * Renders the pre-computed {@link LegendLayout} as an SVG group. Used in the
 * PDF exports ({@link SceneSvg} / {@link CirclePrintView}) as an un-rotated
 * footer band so a printed plan explains its badge icons and gender colours.
 */
export default function ExportLegend({
  layout,
  x,
  y,
  title,
  fontSize,
  iconSize,
}: ExportLegendProps) {
  if (layout.items.length === 0) {
    return null;
  }

  const half = iconSize / 2;

  return (
    <g transform={`translate(${x} ${y})`}>
      <text
        x={0}
        y={layout.titleY}
        fontSize={fontSize}
        fontWeight="bold"
        fill="#334155"
      >
        {title}
      </text>
      {layout.items.map((item, index) => {
        if (item.kind === 'gender') {
          return (
            <g key={`g-${index}`} transform={`translate(${item.x} ${item.y})`}>
              <rect
                x={0}
                y={-half}
                width={iconSize}
                height={iconSize}
                rx={3}
                fill={item.fill}
                stroke={item.stroke}
                strokeWidth={1}
              />
              <text
                x={iconSize + 4}
                y={0}
                fontSize={fontSize}
                dominantBaseline="central"
                fill="#475569"
              >
                {item.label}
              </text>
            </g>
          );
        }
        const Icon = item.icon;
        return (
          <g key={`b-${item.label}-${index}`} transform={`translate(${item.x} ${item.y})`}>
            <g transform={`translate(0 ${-half})`}>
              <Icon size={iconSize} color={item.color} />
            </g>
            <text
              x={iconSize + 4}
              y={0}
              fontSize={fontSize}
              dominantBaseline="central"
              fill="#475569"
            >
              {item.label}
            </text>
          </g>
        );
      })}
    </g>
  );
}

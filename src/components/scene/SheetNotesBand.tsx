// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { svgFontFamily } from '@/utils';
import {
  SHEET_NOTES_METRICS,
  type SheetNotesLayout,
} from '@/utils/ui/substituteSheet';

/**
 * The band at the foot of the substitute's sheet (decision 0034): the note
 * typed for it and ruled lines to write on, the width of the page between
 * its margins. Laid out by `layoutSheetNotes`, whose height the page frame
 * keeps free below the plan.
 */
export default function SheetNotesBand({
  layout,
  x,
  y,
  width,
}: {
  layout: SheetNotesLayout;
  x: number;
  y: number;
  width: number;
}) {
  const { t } = useTranslation('generator');
  return (
    <g transform={`translate(${x} ${y})`} fontFamily={svgFontFamily}>
      <text
        y={layout.headingBaseline}
        fontSize={SHEET_NOTES_METRICS.headingSize}
        fontWeight="bold"
        fill="#000"
      >
        {t('export.substitute.notes')}
      </text>
      {layout.text.map(({ line, baseline }, index) => (
        <text
          key={`note-${index}`}
          y={baseline}
          fontSize={SHEET_NOTES_METRICS.textSize}
          fill="#0f172a"
        >
          {line}
        </text>
      ))}
      {layout.rules.map((ruleY, index) => (
        <line
          key={`rule-${index}`}
          x1={0}
          x2={width}
          y1={ruleY}
          y2={ruleY}
          stroke="#94a3b8"
          strokeWidth={0.5}
        />
      ))}
    </g>
  );
}

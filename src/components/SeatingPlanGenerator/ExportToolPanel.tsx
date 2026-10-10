// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import {
  CircleDashedIcon,
  FileImageIcon,
  FilePdfIcon,
  GridNineIcon,
  ListChecksIcon,
  VectorTwoIcon,
} from '@phosphor-icons/react';
import {
  ToolRail,
  ToolRailButton,
  ToolRailGroup,
  type ToolRailDensity,
} from '@/components/shell/ToolRail';

/** What the sheet shows: the plan, the circle or the note list. */
export type ExportView = 'table' | 'circle' | 'list';

type Props = {
  density: ToolRailDensity;
  /** What the sheet shows. */
  mode: ExportView;
  onModeChange: (mode: ExportView) => void;
  /** While the circle is still being built there is nothing to switch to. */
  modeDisabled?: boolean;
  onPdf: () => void;
  onPng: () => void;
  onSvg: () => void;
};

/**
 * The export page's toolbar, in the shape every layer's has: the view on top,
 * what to do with it below, and the foot every rail shares (`ToolRail`).
 *
 * The view is the plan layer's own pair of entries, so the sheet is switched
 * the way the plan is, and the note list beside them — the class with room
 * to write. The files save the sheet as it stands — the PDF of whatever is
 * shown, which is why there is one PDF entry rather than one per view. The
 * list may run to several pages, so it is a PDF only. Printing is the page's
 * primary action and lives at the end of the status bar.
 */
export default function ExportToolPanel({
  density,
  mode,
  onModeChange,
  modeDisabled = false,
  onPdf,
  onPng,
  onSvg,
}: Props) {
  const { t } = useTranslation('generator');
  const isList = mode === 'list';

  return (
    <ToolRail density={density}>
      <ToolRailGroup title={t('toolRail.view')}>
        <ToolRailButton
          icon={<GridNineIcon size={18} />}
          label={t('shell.layers.plan')}
          active={mode === 'table'}
          disabled={modeDisabled}
          onClick={() => onModeChange('table')}
        />
        <ToolRailButton
          icon={<CircleDashedIcon size={18} />}
          label={t('shell.layers.circle')}
          active={mode === 'circle'}
          disabled={modeDisabled}
          onClick={() => onModeChange('circle')}
        />
        <ToolRailButton
          icon={<ListChecksIcon size={18} />}
          label={t('export.noteList.view')}
          active={mode === 'list'}
          disabled={modeDisabled}
          onClick={() => onModeChange('list')}
        />
      </ToolRailGroup>

      <ToolRailGroup title={t('export.saveAs')}>
        <ToolRailButton
          icon={<FilePdfIcon size={18} />}
          label={t('export.pdfButton')}
          title={
            mode === 'circle'
              ? t('export.circlePdfShortcut')
              : mode === 'list'
                ? t('export.noteList.pdfShortcut')
                : t('export.tablePdfShortcut')
          }
          onClick={onPdf}
        />
        <ToolRailButton
          icon={<FileImageIcon size={18} />}
          label={t('export.pngButton')}
          title={isList ? t('export.noteList.pdfOnly') : t('export.pngTitle')}
          disabled={isList}
          onClick={onPng}
        />
        <ToolRailButton
          icon={<VectorTwoIcon size={18} />}
          label={t('export.svgButton')}
          title={isList ? t('export.noteList.pdfOnly') : t('export.svgTitle')}
          disabled={isList}
          onClick={onSvg}
        />
      </ToolRailGroup>
    </ToolRail>
  );
}

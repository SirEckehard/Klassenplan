// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import {
  CircleDashedIcon,
  FileImageIcon,
  FilePdfIcon,
  GridNineIcon,
  VectorTwoIcon,
} from '@phosphor-icons/react';
import {
  ToolRail,
  ToolRailButton,
  ToolRailGroup,
  type ToolRailDensity,
} from '@/components/shell/ToolRail';

type Props = {
  density: ToolRailDensity;
  /** Which arrangement the sheet shows. */
  mode: 'table' | 'circle';
  onModeChange: (mode: 'table' | 'circle') => void;
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
 * the way the plan is. The files save the sheet as it stands — the PDF of
 * whichever arrangement is shown, which is why there is one PDF entry rather
 * than one per arrangement. Printing is the page's primary action and lives at
 * the end of the status bar.
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
      </ToolRailGroup>

      <ToolRailGroup title={t('export.saveAs')}>
        <ToolRailButton
          icon={<FilePdfIcon size={18} />}
          label={t('export.pdfButton')}
          title={
            mode === 'circle'
              ? t('export.circlePdfShortcut')
              : t('export.tablePdfShortcut')
          }
          onClick={onPdf}
        />
        <ToolRailButton
          icon={<FileImageIcon size={18} />}
          label={t('export.pngButton')}
          title={t('export.pngShortcut')}
          onClick={onPng}
        />
        <ToolRailButton
          icon={<VectorTwoIcon size={18} />}
          label={t('export.svgButton')}
          title={t('export.svgTitle')}
          onClick={onSvg}
        />
      </ToolRailGroup>
    </ToolRail>
  );
}

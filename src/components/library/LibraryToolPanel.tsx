// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { FolderPlusIcon, GraduationCapIcon } from '@phosphor-icons/react';
import {
  ToolRail,
  ToolRailButton,
  ToolRailGroup,
  type ToolRailDensity,
} from '@/components/shell/ToolRail';

/**
 * The toolbar of "Pläne & Verlauf", in the shape every layer's has: what can
 * be added — a class, a room of the class that is chosen — above the foot
 * every rail shares. Plans are made where they are mixed, on the plan layer.
 */
export default function LibraryToolPanel({
  density,
  onNewClass,
  onNewRoom,
}: {
  density: ToolRailDensity;
  onNewClass: () => void;
  /** Absent while no class is chosen to add the room to. */
  onNewRoom?: () => void;
}) {
  const { t } = useTranslation('generator');

  return (
    <ToolRail density={density}>
      <ToolRailGroup title={t('toolRail.add')}>
        <ToolRailButton
          icon={<GraduationCapIcon size={18} />}
          label={t('common.newClassName')}
          opensDialog
          onClick={onNewClass}
        />
        <ToolRailButton
          icon={<FolderPlusIcon size={18} />}
          label={t('rooms.newName')}
          disabled={!onNewRoom}
          onClick={onNewRoom}
        />
      </ToolRailGroup>
    </ToolRail>
  );
}

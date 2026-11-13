// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { FolderPlusIcon, UploadIcon } from '@phosphor-icons/react';
import { TOUR_ANCHORS } from '@/components/onboarding/tours';
import { ENTITY_ICONS } from '@/components/shell/entityIcons';
import {
  ToolRail,
  ToolRailButton,
  ToolRailGroup,
  type ToolRailDensity,
} from '@/components/shell/ToolRail';

/**
 * The toolbar of "Bibliothek", in the shape every layer's has: what can
 * be added — a class, a room of the class that is chosen, a room template, a
 * mixing preset, each under a free name that the inspector then offers to
 * type over — or a template or a preset from a colleague's file, above the
 * foot every rail shares. Plans are made where they are mixed, on the plan
 * layer.
 */
export default function LibraryToolPanel({
  density,
  onNewClass,
  onNewRoom,
  onNewTemplate,
  onNewPreset,
  onOpenFile,
}: {
  density: ToolRailDensity;
  onNewClass: () => void;
  /** Absent while no class is chosen to add the room to. */
  onNewRoom?: () => void;
  onNewTemplate: () => void;
  onNewPreset: () => void;
  /** A room template's or a preset's file (decision 0046), or a backup. */
  onOpenFile: () => void;
}) {
  const { t } = useTranslation('generator');

  return (
    <ToolRail density={density}>
      <ToolRailGroup
        title={t('toolRail.add')}
        data-tour={TOUR_ANCHORS.libraryToolbar}
      >
        <ToolRailButton
          icon={<ENTITY_ICONS.class size={18} />}
          label={t('common.newClassName')}
          onClick={onNewClass}
        />
        <ToolRailButton
          icon={<FolderPlusIcon size={18} />}
          label={t('rooms.newName')}
          disabled={!onNewRoom}
          onClick={onNewRoom}
        />
        <ToolRailButton
          icon={<ENTITY_ICONS.template size={18} />}
          label={t('library.template.newName')}
          onClick={onNewTemplate}
        />
        <ToolRailButton
          icon={<ENTITY_ICONS.preset size={18} />}
          label={t('library.preset.newName')}
          onClick={onNewPreset}
        />
        <ToolRailButton
          icon={<UploadIcon size={18} />}
          label={t('library.share.open')}
          onClick={onOpenFile}
        />
      </ToolRailGroup>
    </ToolRail>
  );
}

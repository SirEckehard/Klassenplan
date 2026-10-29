// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CircleDashedIcon,
  GridNineIcon,
  SlidersHorizontalIcon,
} from '@phosphor-icons/react';
import {
  ToolRail,
  ToolRailButton,
  ToolRailGroup,
  type ToolRailDensity,
} from '@/components/shell/ToolRail';
import {
  CanvasSettingsGroups,
  type CanvasSettingsGroup,
} from '@/components/SeatingPlanGenerator/canvas/CanvasSettingsGroups';
import { VIEW_SETTING_ICONS } from '@/components/SeatingPlanGenerator/canvas/viewSettingIcons';
import { menuSurfaceClass } from '@/utils';
import { TOUR_ANCHORS } from '@/components/onboarding/tours';

type Props = {
  density: ToolRailDensity;
  /** Table plan or sitting circle — the same students, seated differently. */
  seatingMode?: 'table' | 'circle';
  onModeChange?: (mode: 'table' | 'circle') => void;
  showModeToggle?: boolean;
  /** What the canvas shows: names, photos, room elements, the grid. */
  settingsGroups: CanvasSettingsGroup[];
};

/** One icon per settings group, so the rail stays readable without labels. */
const {
  photos: PhotosIcon,
  names: NamesIcon,
  badges: BadgesIcon,
  features: FeaturesIcon,
  connections: ConnectionsIcon,
} = VIEW_SETTING_ICONS;
const GROUP_ICONS: Record<string, React.ReactNode> = {
  'editor-canvas': <GridNineIcon size={18} />,
  'editor-photos': <PhotosIcon size={18} />,
  'editor-names': <NamesIcon size={18} />,
  'editor-badges': <BadgesIcon size={18} />,
  'editor-features': <FeaturesIcon size={18} />,
  'circle-connections': <ConnectionsIcon size={18} />,
  'circle-photos': <PhotosIcon size={18} />,
  'circle-names': <NamesIcon size={18} />,
  'circle-badges': <BadgesIcon size={18} />,
};

/**
 * The plan layer's toolbar: which view of the plan is on the stage and what
 * it shows — the same two groups as the room's.
 *
 * The plan itself is the inspector's, as the room is: its name, saving it
 * and opening another (`PlanSection`), then the criteria, which answer "why
 * does the plan look like this". The class tools and "Bibliothek" are not
 * here either: every layer needs them, so they sit in the foot every rail
 * shares (`ToolRail`). Ctrl/⌘+S saves straight away under the plan's name.
 */
export default function PlanToolPanel({
  density,
  seatingMode = 'table',
  onModeChange,
  showModeToggle = false,
  settingsGroups,
}: Props) {
  const { t } = useTranslation('generator');

  const groups = settingsGroups.filter((group) => group.options.length > 0);

  return (
    <ToolRail density={density} planPresent>
      {showModeToggle && onModeChange && (
        // The tour explains the switch, so it frames both of its entries.
        <ToolRailGroup
          title={t('toolRail.view')}
          data-tour={TOUR_ANCHORS.seatingModeToggle}
        >
          <ToolRailButton
            icon={<GridNineIcon size={18} />}
            label={t('shell.layers.plan')}
            active={seatingMode === 'table'}
            onClick={() => onModeChange('table')}
          />
          <ToolRailButton
            icon={<CircleDashedIcon size={18} />}
            label={t('shell.layers.circle')}
            active={seatingMode === 'circle'}
            onClick={() => onModeChange('circle')}
          />
        </ToolRailGroup>
      )}

      <ToolRailGroup
        title={t('toolRail.viewSettings')}
        data-tour={TOUR_ANCHORS.canvasSettings}
      >
        {groups.map((group) => (
          <ToolRailButton
            key={group.id}
            icon={GROUP_ICONS[group.id] ?? <SlidersHorizontalIcon size={18} />}
            label={group.title ?? t('editor.viewSettings')}
            panel={() => (
              <div className={`${menuSurfaceClass} p-1`}>
                <CanvasSettingsGroups groups={[group]} />
              </div>
            )}
          />
        ))}
      </ToolRailGroup>
    </ToolRail>
  );
}

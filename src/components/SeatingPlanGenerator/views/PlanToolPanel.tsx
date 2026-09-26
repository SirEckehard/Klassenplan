// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArmchairIcon,
  CircleDashedIcon,
  FloppyDiskIcon,
  GridNineIcon,
  ImageIcon,
  LinkSimpleIcon,
  SlidersHorizontalIcon,
  TextAaIcon,
  UserSquareIcon,
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
} from '@/components/SeatingPlanGenerator/canvas/CanvasSettingsButton';
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
  onSavePlan: () => void;
  canSavePlan: boolean;
  /** Entries only one arrangement has — the circle's shuffle. */
  extraTools?: React.ReactNode;
};

/** One icon per settings group, so the rail stays readable without labels. */
const GROUP_ICONS: Record<string, React.ReactNode> = {
  'editor-canvas': <GridNineIcon size={18} />,
  'editor-photos': <ImageIcon size={18} />,
  'editor-names': <TextAaIcon size={18} />,
  'editor-badges': <UserSquareIcon size={18} />,
  'editor-features': <ArmchairIcon size={18} />,
  'circle-connections': <LinkSimpleIcon size={18} />,
  'circle-photos': <ImageIcon size={18} />,
  'circle-names': <TextAaIcon size={18} />,
  'circle-badges': <UserSquareIcon size={18} />,
};

/**
 * The plan layer's toolbar: which view of the plan is on the stage, what it
 * shows, and what to do with the finished plan.
 *
 * The criteria are not here — they answer "why does the plan look like this",
 * which is a property of the plan and so belongs in the inspector. The class
 * tools and the plans' history are not here either: every layer needs them,
 * so they sit in the foot every rail shares (`ToolRail`).
 */
export default function PlanToolPanel({
  density,
  seatingMode = 'table',
  onModeChange,
  showModeToggle = false,
  settingsGroups,
  onSavePlan,
  canSavePlan,
  extraTools,
}: Props) {
  const { t } = useTranslation('generator');

  const groups = settingsGroups.filter((group) => group.options.length > 0);

  return (
    <ToolRail density={density}>
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

      <ToolRailGroup title={t('toolRail.manage')}>
        {extraTools}
        <ToolRailButton
          icon={<FloppyDiskIcon size={18} />}
          label={t('actions.savePlan')}
          title={t('actions.saveShortcut')}
          disabled={!canSavePlan}
          onClick={onSavePlan}
        />
      </ToolRailGroup>
    </ToolRail>
  );
}

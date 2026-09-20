// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChartBarIcon,
  CircleDashedIcon,
  ClockCounterClockwiseIcon,
  FloppyDiskIcon,
  GridNineIcon,
  HandPointingIcon,
  ImageIcon,
  MagnifyingGlassIcon,
  SlidersHorizontalIcon,
  TextAaIcon,
  UsersThreeIcon,
  ArmchairIcon,
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
import StorageHistoryModal, {
  type StorageHistoryTab,
} from '@/components/ui/navigation/StorageHistoryModal';
import { cardSurfaceClass } from '@/utils';
import { useLocalizedNavigate } from '@/hooks/useLocalizedNavigate';
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
  /** Entries only one arrangement has — the circle's sync and shuffle. */
  extraTools?: React.ReactNode;
};

/** One icon per settings group, so the rail stays readable without labels. */
const GROUP_ICONS: Record<string, React.ReactNode> = {
  'editor-canvas': <GridNineIcon size={18} />,
  'editor-photos': <ImageIcon size={18} />,
  'editor-names': <TextAaIcon size={18} />,
  'editor-features': <ArmchairIcon size={18} />,
};

/**
 * The plan layer's toolbar: how the students are seated, what the plan shows,
 * and what to do with the finished plan.
 *
 * The criteria are not here — they answer "why does the plan look like this",
 * which is a property of the plan and so belongs in the inspector. What is
 * left on this side is what every layer's toolbar holds: the arrangement to
 * work in, the view switches, and the plan's own actions at the bottom.
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
  const navigate = useLocalizedNavigate();
  const [historyTab, setHistoryTab] = React.useState<StorageHistoryTab | null>(
    null,
  );

  const groups = settingsGroups.filter((group) => group.options.length > 0);

  return (
    <>
      <ToolRail density={density}>
        {showModeToggle && onModeChange && (
          <ToolRailGroup title={t('planToolbar.arrangement')}>
            <ToolRailButton
              icon={<GridNineIcon size={18} />}
              label={t('shell.layers.plan')}
              active={seatingMode === 'table'}
              onClick={() => onModeChange('table')}
              data-tour={TOUR_ANCHORS.seatingModeToggle}
            />
            <ToolRailButton
              icon={<CircleDashedIcon size={18} />}
              label={t('shell.layers.circle')}
              active={seatingMode === 'circle'}
              onClick={() => onModeChange('circle')}
            />
          </ToolRailGroup>
        )}

        <ToolRailGroup title={t('planToolbar.show')}>
          {groups.map((group) => (
            <ToolRailButton
              key={group.id}
              icon={
                GROUP_ICONS[group.id] ?? <SlidersHorizontalIcon size={18} />
              }
              label={group.title ?? t('editor.viewSettings')}
              data-tour={
                group.id === 'editor-canvas'
                  ? TOUR_ANCHORS.canvasSettings
                  : undefined
              }
              panel={() => (
                <div className={`${cardSurfaceClass} border p-4`}>
                  <CanvasSettingsGroups groups={[group]} />
                </div>
              )}
            />
          ))}
        </ToolRailGroup>

        <ToolRailGroup title={t('planToolbar.tools')}>
          {extraTools}
          {/* The three classroom tools: each one a screen of its own, because
              each is used standing up rather than at the desk. */}
          <ToolRailButton
            icon={<HandPointingIcon size={18} />}
            label={t('tools.whoIsNext.title')}
            onClick={() => navigate('/wer-kommt-dran')}
          />
          <ToolRailButton
            icon={<MagnifyingGlassIcon size={18} />}
            label={t('tools.seatFinder.title')}
            onClick={() => navigate('/wo-sitzt-wer')}
          />
          <ToolRailButton
            icon={<UsersThreeIcon size={18} />}
            label={t('tools.groups.title')}
            onClick={() => navigate('/gruppen')}
          />
          <ToolRailButton
            icon={<ChartBarIcon size={18} />}
            label={t('storage.neighbors.tab')}
            onClick={() => setHistoryTab('neighbors')}
          />
          <ToolRailButton
            icon={<ClockCounterClockwiseIcon size={18} />}
            label={t('storage.savedPlans')}
            onClick={() => setHistoryTab('plans')}
          />
        </ToolRailGroup>

        <ToolRailGroup title={t('planToolbar.manage')} atEnd>
          <ToolRailButton
            icon={<FloppyDiskIcon size={18} />}
            label={t('actions.savePlan')}
            title={t('actions.saveShortcut')}
            disabled={!canSavePlan}
            onClick={onSavePlan}
          />
        </ToolRailGroup>
      </ToolRail>

      {/* Keyed on the tab: opening it from the other entry remounts it, so
          it lands on what that entry promised. */}
      <StorageHistoryModal
        key={historyTab ?? 'closed'}
        open={historyTab !== null}
        initialTab={historyTab ?? 'plans'}
        onClose={() => setHistoryTab(null)}
      />
    </>
  );
}

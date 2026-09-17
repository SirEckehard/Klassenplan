// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowCounterClockwiseIcon,
  ToggleLeftIcon,
  ToggleRightIcon,
} from '@phosphor-icons/react';
import { CRITERIA_ICON_MAP } from '@/utils/ui/criteriaIcons';
import type { MixSettings, ScalarMixSettingKey, Student } from '@/types';
import {
  LOCAL_STORAGE_KEYS,
  SCALAR_MIX_SETTING_KEYS,
  getSidebarIconClasses,
  getSidebarSurfaceClasses,
  quietIconButtonClass,
  secondaryButtonClass,
} from '@/utils';
import usePersistentState from '@/hooks/usePersistentState';
import {
  useMixCriteria,
  type MixCriterion,
  type SuspendedWeights,
} from '@/hooks/ui/useMixCriteria';
import SidebarFlyout from '@/components/ui/panels/SidebarFlyout';
import SectionHeader from '../layout/SectionHeader';
import SectionSeparator from '../feedback/SectionSeparator';
import RailButton from './RailButton';
import ToggleSwitch from './ToggleSwitch';

/**
 * - `comfortable`: the expanded sidebar and the phone sheet. Every criterion is
 *   a card with its explanation and slider in view.
 * - `compact`: the collapsed sidebar and the row under the canvas on a phone.
 *   Every criterion is a round button whose ring shows the weight; explanation
 *   and slider are in its flyout.
 */
type Density = 'comfortable' | 'compact';

type SmartMixControlsProps = {
  settings: MixSettings;
  setMixSettings: React.Dispatch<React.SetStateAction<MixSettings>>;
  students: Student[];
  suspendedWeights?: SuspendedWeights;
  density?: Density;
  /** Compact only: a wrapping row, as under the canvas on a phone. */
  direction?: 'column' | 'row';
};

type FlyoutTarget = ScalarMixSettingKey | 'all';

type FlyoutState = {
  target: FlyoutTarget;
  anchor: HTMLElement;
  autoFocus: boolean;
  /** Opened by itself on a first switch-on, to teach how to open it again. */
  showHint: boolean;
};

const compactFrameClass = {
  column: 'flex flex-col items-center gap-1 px-1',
  row: 'flex flex-wrap items-center justify-center gap-2 px-1',
};

function WeightBadge({ value }: { value: number }) {
  return (
    <span
      className={`shrink-0 rounded-full px-3 py-1 text-xs tabular-nums shadow-sm ${
        value > 0
          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
          : 'bg-gray-100 text-gray-600 dark:bg-gray-900/60 dark:text-gray-300'
      }`}
    >
      {value}/10
    </span>
  );
}

function WeightSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const { t } = useTranslation('generator');
  const isActive = value > 0;

  // The input is a tall transparent hit area with a thin track drawn inside,
  // so a finger on a tablet finds the thumb.
  return (
    <input
      type="range"
      min="0"
      max="10"
      step="1"
      value={value}
      // Inside a card, a press on the slider must not also switch the card.
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => onChange(parseInt(event.target.value, 10))}
      aria-label={t('mix.weightSliderLabel', { label })}
      className={`h-6 w-full cursor-pointer appearance-none rounded-full bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400
        [&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0
        [&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full
        [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full
        [&::-webkit-slider-thumb]:-mt-1 [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
        pointer-coarse:[&::-moz-range-thumb]:size-5
        pointer-coarse:[&::-webkit-slider-thumb]:-mt-2 pointer-coarse:[&::-webkit-slider-thumb]:size-5
        ${
          isActive
            ? '[&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-track]:bg-blue-200 dark:[&::-moz-range-track]:bg-blue-800 [&::-webkit-slider-runnable-track]:bg-blue-200 dark:[&::-webkit-slider-runnable-track]:bg-blue-800 [&::-webkit-slider-thumb]:bg-blue-600'
            : '[&::-moz-range-thumb]:bg-gray-400 [&::-moz-range-track]:bg-gray-200 dark:[&::-moz-range-track]:bg-gray-600 [&::-webkit-slider-runnable-track]:bg-gray-200 dark:[&::-webkit-slider-runnable-track]:bg-gray-600 [&::-webkit-slider-thumb]:bg-gray-400'
        }`}
    />
  );
}

/**
 * The weight drawn on the button's own border: a 5 fills half of it. `pathLength`
 * turns the dash pattern into weight units, so no circumference is computed.
 */
function WeightRing({ value }: { value: number }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 48 48"
      className="pointer-events-none absolute -top-0.5 -left-0.5 size-12 -rotate-90 text-blue-500 dark:text-blue-400"
    >
      <circle
        cx="24"
        cy="24"
        r="23"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        pathLength={10}
        strokeDasharray="10 10"
        strokeDashoffset={10 - value}
        className="transition-[stroke-dashoffset] duration-300 motion-reduce:transition-none"
      />
    </svg>
  );
}

/**
 * Name, weight, explanation and slider of one criterion: the body of its card,
 * and of its flyout in the compact density.
 */
function CriterionWeight({
  criterion,
  value,
  onChange,
}: {
  criterion: MixCriterion;
  value: number;
  onChange: (value: number) => void;
}) {
  const { t } = useTranslation('generator');

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        {/* A block, so the card's accessible name reads "Restlessness 5/10",
            not "Restlessness5/10". */}
        <div className="text-sm font-medium text-gray-800 dark:text-gray-200">
          {criterion.label}
        </div>
        <WeightBadge value={value} />
      </div>
      <div
        className="mb-2 text-xs text-gray-500 dark:text-gray-400"
        title={t('mix.weightTooltip', { value })}
      >
        {criterion.description}
      </div>
      <div className="rounded-xl border border-blue-200 bg-white/80 px-3 dark:border-blue-900/40 dark:bg-gray-950/70">
        <WeightSlider
          label={criterion.label}
          value={value}
          onChange={onChange}
        />
      </div>
    </div>
  );
}

type CriterionControlProps = {
  criterion: MixCriterion;
  value: number;
  onPress: (button: HTMLButtonElement) => void;
};

function CriterionCard({
  criterion,
  value,
  onPress,
  onWeightChange,
}: CriterionControlProps & { onWeightChange: (value: number) => void }) {
  const isActive = value > 0;
  const Icon = CRITERIA_ICON_MAP[criterion.key];
  const surfaceClass = getSidebarSurfaceClasses({
    variant: 'expanded',
    isActive,
  });

  return (
    <button
      type="button"
      onClick={(event) => onPress(event.currentTarget)}
      className={`group relative w-full rounded-2xl p-3 text-left shadow-sm ${surfaceClass}`}
      title={`${criterion.label}: ${value}/10`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`${getSidebarIconClasses({ isActive })} mt-1 inline-flex items-center justify-center`}
          aria-hidden="true"
        >
          <Icon size={16} />
        </span>
        <div className="flex-1 cursor-pointer">
          <CriterionWeight
            criterion={criterion}
            value={value}
            onChange={onWeightChange}
          />
        </div>
      </div>
    </button>
  );
}

function CriterionRailButton({
  criterion,
  value,
  onPress,
  describedBy,
  onOpenFlyout,
}: CriterionControlProps & {
  describedBy: string;
  onOpenFlyout: (button: HTMLButtonElement) => void;
}) {
  const { t } = useTranslation('generator');
  const isActive = value > 0;
  const Icon = CRITERIA_ICON_MAP[criterion.key];

  return (
    <RailButton
      label={
        isActive
          ? t('mix.railCriterionActiveLabel', { label: criterion.label, value })
          : criterion.label
      }
      title={t('mix.railCriterionTitle', { label: criterion.label, value })}
      pressed={isActive}
      className={getSidebarSurfaceClasses({ variant: 'collapsed', isActive })}
      describedBy={describedBy}
      onPress={onPress}
      onOpenFlyout={onOpenFlyout}
    >
      <span className={getSidebarIconClasses({ isActive })}>
        <Icon size={16} />
      </span>
      <WeightRing value={value} />
    </RailButton>
  );
}

type AllCriteriaControlProps = {
  isRandom: boolean;
  /** What switching all criteria would do now. */
  actionLabel: string;
};

function AllCriteriaSwitch({
  isRandom,
  actionLabel,
  onChange,
  onResetToDefaults,
}: AllCriteriaControlProps & {
  onChange: (on: boolean) => void;
  onResetToDefaults: () => void;
}) {
  const { t } = useTranslation('generator');

  return (
    <div className="px-2">
      <div className="flex items-center justify-between gap-3 rounded-2xl bg-gray-100 px-4 py-3 dark:bg-gray-800/60">
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
          {t('mix.toggleAll')}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onResetToDefaults}
            className={`${quietIconButtonClass} h-8 w-8`}
            title={t('mix.resetDefaultsTitle')}
            aria-label={t('mix.resetDefaultsTitle')}
          >
            <ArrowCounterClockwiseIcon size={16} aria-hidden="true" />
          </button>
          <ToggleSwitch
            checked={!isRandom}
            onChange={onChange}
            label={t('mix.toggleAll')}
            title={actionLabel}
          />
        </div>
      </div>
    </div>
  );
}

function AllCriteriaRailButton({
  isRandom,
  actionLabel,
  describedBy,
  onPress,
  onOpenFlyout,
}: AllCriteriaControlProps & {
  describedBy: string;
  onPress: () => void;
  onOpenFlyout: (button: HTMLButtonElement) => void;
}) {
  const { t } = useTranslation('generator');
  // A switch, like the one in the comfortable density.
  const Icon = isRandom ? ToggleLeftIcon : ToggleRightIcon;

  return (
    <RailButton
      label={t('mix.toggleAll')}
      title={t('mix.railAllTitle', { action: actionLabel })}
      pressed={!isRandom}
      className={getSidebarSurfaceClasses({
        variant: 'collapsed',
        tone: 'amber',
        isActive: isRandom,
      })}
      describedBy={describedBy}
      onPress={onPress}
      onOpenFlyout={onOpenFlyout}
    >
      <span
        className={getSidebarIconClasses({ tone: 'amber', isActive: isRandom })}
      >
        <Icon size={16} />
      </span>
    </RailButton>
  );
}

function AllCriteriaFlyoutContent({
  isRandom,
  onResetToDefaults,
}: {
  isRandom: boolean;
  onResetToDefaults: () => void;
}) {
  const { t } = useTranslation('generator');

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
        {t('mix.toggleAll')}
      </p>
      {isRandom && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          {t('mix.randomWarning')}
        </p>
      )}
      <button
        type="button"
        onClick={onResetToDefaults}
        className={`${secondaryButtonClass} w-full justify-center gap-2 px-3 py-2 text-sm`}
      >
        <ArrowCounterClockwiseIcon size={16} aria-hidden="true" />
        {t('mix.resetDefaults')}
      </button>
    </div>
  );
}

/** A category: a labelled group of cards, or plainly its buttons on the rail. */
function CriteriaGroup({
  density,
  label,
  isFirst,
  children,
}: {
  density: Density;
  label: string;
  isFirst: boolean;
  children: React.ReactNode;
}) {
  if (density === 'compact') {
    return <>{children}</>;
  }

  return (
    <div>
      {label && !isFirst && <div className="py-1" />}
      {label && <SectionSeparator label={label} />}
      <div className="space-y-3 px-2 pt-2">{children}</div>
    </div>
  );
}

/**
 * The mixing criteria in both sidebar densities. Each part of the panel — the
 * switch for all criteria, a criterion, the warning when mixing is random — is
 * one place with a comfortable and a compact form, so a change to it reaches
 * both, and the compact form keeps everything the comfortable one offers.
 */
function SmartMixControls({
  settings,
  setMixSettings,
  students,
  suspendedWeights,
  density = 'comfortable',
  direction = 'column',
}: SmartMixControlsProps) {
  const { t } = useTranslation('generator');
  const mix = useMixCriteria({
    settings,
    setMixSettings,
    students,
    suspendedWeights,
  });
  const isCompact = density === 'compact';
  const [flyout, setFlyout] = React.useState<FlyoutState | null>(null);
  const [hintSeen, setHintSeen] = usePersistentState(
    LOCAL_STORAGE_KEYS.mixWeightHintSeen,
    false,
  );
  const weightHintId = React.useId();
  const defaultsHintId = React.useId();

  const criteria = React.useMemo(
    () => mix.categories.flatMap((category) => category.criteria),
    [mix.categories],
  );
  const flyoutCriterion =
    flyout && flyout.target !== 'all'
      ? criteria.find((criterion) => criterion.key === flyout.target)
      : undefined;

  const openFlyout = React.useCallback(
    (
      target: FlyoutTarget,
      anchor: HTMLElement,
      { autoFocus = true, showHint = false } = {},
    ) => {
      setFlyout({ target, anchor, autoFocus, showHint });
      setHintSeen(true);
    },
    [setHintSeen],
  );

  const closeFlyout = React.useCallback(
    ({ restoreFocus }: { restoreFocus: boolean }) => {
      if (restoreFocus) {
        flyout?.anchor.focus();
      }
      setFlyout(null);
    },
    [flyout],
  );

  const handleCriterionPress = (
    key: ScalarMixSettingKey,
    button: HTMLButtonElement,
  ) => {
    const switchingOn = mix.weightOf(key) === 0;
    mix.toggle(key);
    // Teaches the flyout the first time it would be useful, then never again.
    if (isCompact && switchingOn && !hintSeen) {
      openFlyout(key, button, { autoFocus: false, showHint: true });
    }
  };

  const setAllCriteria = (on: boolean) => {
    if (on) {
      mix.enableAll();
    } else {
      mix.disableAll();
    }
  };

  const allCriteria: AllCriteriaControlProps = {
    isRandom: mix.isRandom,
    actionLabel: mix.isRandom ? t('mix.enableAll') : t('mix.disableAll'),
  };

  return (
    <div
      className={isCompact ? compactFrameClass[direction] : 'space-y-4 pb-2'}
    >
      {isCompact ? (
        <>
          <span id={weightHintId} className="sr-only">
            {t('mix.railWeightHint')}
          </span>
          <span id={defaultsHintId} className="sr-only">
            {t('mix.railDefaultsHint')}
          </span>
        </>
      ) : (
        <SectionHeader
          title={t('mix.title')}
          description={t('mix.description')}
        />
      )}

      {isCompact ? (
        <AllCriteriaRailButton
          {...allCriteria}
          describedBy={defaultsHintId}
          onPress={() => setAllCriteria(mix.isRandom)}
          onOpenFlyout={(button) => openFlyout('all', button)}
        />
      ) : (
        <AllCriteriaSwitch
          {...allCriteria}
          onChange={setAllCriteria}
          onResetToDefaults={mix.resetToDefaults}
        />
      )}
      {isCompact && direction === 'column' && (
        <div
          aria-hidden="true"
          className="my-1 h-px w-8 bg-blue-100 dark:bg-blue-900/50"
        />
      )}

      {mix.categories.map((category, categoryIndex) => (
        <CriteriaGroup
          key={category.id}
          density={density}
          label={category.label}
          isFirst={categoryIndex === 0}
        >
          {category.criteria.map((criterion) => {
            const control = {
              criterion,
              value: mix.weightOf(criterion.key),
              onPress: (button: HTMLButtonElement) =>
                handleCriterionPress(criterion.key, button),
            };
            return isCompact ? (
              <CriterionRailButton
                key={criterion.key}
                {...control}
                describedBy={weightHintId}
                onOpenFlyout={(button) => openFlyout(criterion.key, button)}
              />
            ) : (
              <CriterionCard
                key={criterion.key}
                {...control}
                onWeightChange={(value) => mix.setWeight(criterion.key, value)}
              />
            );
          })}
        </CriteriaGroup>
      ))}

      {/* In the compact density the warning is in the flyout of "all criteria",
          whose button turns amber. */}
      {!isCompact && mix.isRandom && (
        <div className="px-2 pb-2">
          <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-900/20">
            <p className="text-center text-xs font-medium text-amber-700 dark:text-amber-400">
              ⚠️ {t('mix.randomWarning')}
            </p>
          </div>
        </div>
      )}

      {/* Keyed by target: moving from one button's flyout straight to
          another's starts afresh, with its own placement and focus. Widening
          the sidebar removes the anchor, and the flyout closes itself. */}
      {flyout && flyout.target === 'all' && (
        <SidebarFlyout
          key="all"
          anchor={flyout.anchor}
          label={t('mix.toggleAll')}
          autoFocus={flyout.autoFocus}
          onClose={closeFlyout}
        >
          <AllCriteriaFlyoutContent
            isRandom={mix.isRandom}
            onResetToDefaults={() => {
              mix.resetToDefaults();
              closeFlyout({ restoreFocus: true });
            }}
          />
        </SidebarFlyout>
      )}
      {flyout && flyoutCriterion && (
        <SidebarFlyout
          key={flyoutCriterion.key}
          anchor={flyout.anchor}
          label={flyoutCriterion.label}
          autoFocus={flyout.autoFocus}
          onClose={closeFlyout}
        >
          <CriterionWeight
            criterion={flyoutCriterion}
            value={mix.weightOf(flyoutCriterion.key)}
            onChange={(value) => mix.setWeight(flyoutCriterion.key, value)}
          />
          {flyout.showHint && (
            <p className="mt-2 border-t border-blue-100 pt-2 text-xs text-blue-700 dark:border-blue-900/50 dark:text-blue-300">
              {t('mix.flyoutHint')}
            </p>
          )}
        </SidebarFlyout>
      )}
    </div>
  );
}

const areSettingsEqual = (prev: MixSettings, next: MixSettings) => {
  return SCALAR_MIX_SETTING_KEYS.every((key) => prev[key] === next[key]);
};

const arePropsEqual = (
  prev: SmartMixControlsProps,
  next: SmartMixControlsProps,
) => {
  return (
    prev.setMixSettings === next.setMixSettings &&
    prev.students === next.students &&
    prev.suspendedWeights === next.suspendedWeights &&
    prev.density === next.density &&
    prev.direction === next.direction &&
    areSettingsEqual(prev.settings, next.settings)
  );
};

export default React.memo(SmartMixControls, arePropsEqual);

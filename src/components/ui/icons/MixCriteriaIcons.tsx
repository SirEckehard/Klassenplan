// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowCounterClockwiseIcon,
  DiceFiveIcon,
  SlidersHorizontalIcon,
} from '@phosphor-icons/react';
import { CRITERIA_ICON_MAP } from '@/utils/ui/criteriaIcons';
import type { MixSettings, ScalarMixSettingKey, Student } from '@/types';
import {
  LOCAL_STORAGE_KEYS,
  getSidebarIconClasses,
  getSidebarSurfaceClasses,
  secondaryButtonClass,
} from '@/utils';
import usePersistentState from '@/hooks/usePersistentState';
import { useLongPress } from '@/hooks/ui/useLongPress';
import {
  useMixCriteria,
  type MixCriterion,
  type SuspendedWeights,
} from '@/hooks/ui/useMixCriteria';
import SidebarFlyout from '@/components/ui/panels/SidebarFlyout';

interface MixCriteriaIconsProps {
  settings: MixSettings;
  setMixSettings: React.Dispatch<React.SetStateAction<MixSettings>>;
  students: Student[];
  suspendedWeights?: SuspendedWeights;
  /** Wrapping row under the canvas on a phone instead of the sidebar column. */
  compactLayout?: boolean;
}

type FlyoutTarget = ScalarMixSettingKey | 'all';

type FlyoutState = {
  target: FlyoutTarget;
  anchor: HTMLElement;
  autoFocus: boolean;
  /** Opened by itself on a first switch-on, to teach how to open it again. */
  showHint: boolean;
};

const railButtonClass =
  'group relative inline-flex h-12 w-12 select-none items-center justify-center rounded-full p-0 [-webkit-touch-callout:none]';

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

type RailButtonProps = {
  label: string;
  title: string;
  pressed: boolean;
  className: string;
  describedBy: string;
  onPress: (button: HTMLButtonElement) => void;
  onOpenFlyout: (button: HTMLButtonElement) => void;
  children: React.ReactNode;
};

/**
 * A round sidebar button with two actions: a press runs the primary one, a
 * right click, a long press, Shift+F10 or → opens its flyout.
 */
function RailButton({
  label,
  title,
  pressed,
  className,
  describedBy,
  onPress,
  onOpenFlyout,
  children,
}: RailButtonProps) {
  const longPress = useLongPress<HTMLButtonElement>(onOpenFlyout);

  return (
    <button
      type="button"
      {...longPress.handlers}
      onClick={(event) => {
        if (!longPress.isClickAfterLongPress()) {
          onPress(event.currentTarget);
        }
      }}
      // Also the keyboard path: Shift+F10 and the context menu key fire it.
      onContextMenu={(event) => {
        event.preventDefault();
        onOpenFlyout(event.currentTarget);
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          onOpenFlyout(event.currentTarget);
        }
      }}
      className={`${railButtonClass} ${className}`}
      title={title}
      aria-label={label}
      aria-pressed={pressed}
      aria-describedby={describedBy}
      aria-keyshortcuts="Shift+F10 ArrowRight"
    >
      {children}
    </button>
  );
}

function WeightFlyoutContent({
  criterion,
  value,
  showHint,
  onChange,
}: {
  criterion: MixCriterion;
  value: number;
  showHint: boolean;
  onChange: (value: number) => void;
}) {
  const { t } = useTranslation('generator');
  const isActive = value > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
          {criterion.label}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${
            isActive
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-900/60 dark:text-gray-300'
          }`}
        >
          {value}/10
        </span>
      </div>
      {/* The input is a tall transparent hit area with a thin track drawn
          inside, so a finger on a tablet finds the thumb. */}
      <input
        type="range"
        min="0"
        max="10"
        step="1"
        value={value}
        onChange={(event) => onChange(parseInt(event.target.value, 10))}
        aria-label={t('mix.weightSliderLabel', { label: criterion.label })}
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
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {criterion.description}
      </p>
      {showHint && (
        <p className="border-t border-blue-100 pt-2 text-xs text-blue-700 dark:border-blue-900/50 dark:text-blue-300">
          {t('mix.flyoutHint')}
        </p>
      )}
    </div>
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

/**
 * The mixing criteria as round buttons: in the collapsed sidebar and, on a
 * phone, in a row under the canvas. A press switches a criterion on or off, a
 * ring on its border shows the weight, and the flyout sets it — so nothing the
 * expanded panel offers is out of reach here.
 */
export default function MixCriteriaIcons({
  settings,
  setMixSettings,
  students,
  suspendedWeights,
  compactLayout = false,
}: MixCriteriaIconsProps) {
  const { t } = useTranslation('generator');
  const mix = useMixCriteria({
    settings,
    setMixSettings,
    students,
    suspendedWeights,
  });
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
    const switchingOn = settings[key] === 0;
    mix.toggle(key);
    // Teaches the flyout the first time it would be useful, then never again.
    if (switchingOn && !hintSeen) {
      openFlyout(key, button, { autoFocus: false, showHint: true });
    }
  };

  const handleAllPress = () => {
    if (mix.isRandom) {
      mix.enableAll();
    } else {
      mix.disableAll();
    }
  };

  const allSurfaceClass = getSidebarSurfaceClasses({
    variant: 'collapsed',
    tone: 'amber',
    isActive: mix.isRandom,
  });
  const AllIcon = mix.isRandom ? DiceFiveIcon : SlidersHorizontalIcon;
  const allActionLabel = mix.isRandom
    ? t('mix.enableAll')
    : t('mix.disableAll');

  return (
    <div
      className={
        compactLayout
          ? 'flex flex-wrap items-center justify-center gap-2 px-1'
          : 'flex flex-col items-center gap-1 px-1'
      }
    >
      <span id={weightHintId} className="sr-only">
        {t('mix.railWeightHint')}
      </span>
      <span id={defaultsHintId} className="sr-only">
        {t('mix.railDefaultsHint')}
      </span>

      <RailButton
        label={t('mix.toggleAll')}
        title={t('mix.railAllTitle', { action: allActionLabel })}
        pressed={!mix.isRandom}
        className={allSurfaceClass}
        describedBy={defaultsHintId}
        onPress={handleAllPress}
        onOpenFlyout={(button) => openFlyout('all', button)}
      >
        <span
          className={getSidebarIconClasses({
            tone: 'amber',
            isActive: mix.isRandom,
          })}
        >
          <AllIcon size={16} />
        </span>
      </RailButton>
      {!compactLayout && (
        <div
          aria-hidden="true"
          className="my-1 h-px w-8 bg-blue-100 dark:bg-blue-900/50"
        />
      )}

      {criteria.map((criterion) => {
        const value = settings[criterion.key];
        const isActive = value > 0;
        const Icon = CRITERIA_ICON_MAP[criterion.key];
        return (
          <RailButton
            key={criterion.key}
            label={
              isActive
                ? t('mix.railCriterionActiveLabel', {
                    label: criterion.label,
                    value,
                  })
                : criterion.label
            }
            title={t('mix.railCriterionTitle', {
              label: criterion.label,
              value,
            })}
            pressed={isActive}
            className={getSidebarSurfaceClasses({
              variant: 'collapsed',
              isActive,
            })}
            describedBy={weightHintId}
            onPress={(button) => handleCriterionPress(criterion.key, button)}
            onOpenFlyout={(button) => openFlyout(criterion.key, button)}
          >
            <span className={getSidebarIconClasses({ isActive })}>
              <Icon size={16} />
            </span>
            <WeightRing value={value} />
          </RailButton>
        );
      })}

      {/* Keyed by target: moving from one button's flyout straight to
          another's starts afresh, with its own placement and focus. */}
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
          <WeightFlyoutContent
            criterion={flyoutCriterion}
            value={settings[flyoutCriterion.key]}
            showHint={flyout.showHint}
            onChange={(value) => mix.setWeight(flyoutCriterion.key, value)}
          />
        </SidebarFlyout>
      )}
    </div>
  );
}

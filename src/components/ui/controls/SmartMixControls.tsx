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
  getStatisticStatusMeta,
  quietIconButtonClass,
  secondaryButtonClass,
} from '@/utils';
import {
  calculateCriteriaWeightedScore,
  type CriterionFulfillment,
} from '@/utils/algorithm/seatingStatistics';
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

/**
 * How well the last mix met the criteria, shown beside the weights that caused
 * it. Setting and result read as one line, and the plan keeps the width a
 * second panel would have taken.
 */
type FulfillmentProps = {
  /** Only what the mix actually scored; see `getTopFulfilledCriteria`. */
  fulfillment?: CriterionFulfillment[];
  /** Marks the criterion's seats while pointer or focus rests on it. */
  onHighlightHover?: (criterion: CriterionFulfillment) => void;
  onHighlightLeave?: () => void;
  /** Pins the marking so it survives the way over to the canvas. */
  onHighlightToggle?: (criterion: CriterionFulfillment) => void;
  activeHighlightKey?: CriterionFulfillment['key'] | null;
  activeHighlightMode?: 'hover' | 'persistent' | null;
};

type SmartMixControlsProps = FulfillmentProps & {
  settings: MixSettings;
  setMixSettings: React.Dispatch<React.SetStateAction<MixSettings>>;
  students: Student[];
  suspendedWeights?: SuspendedWeights;
  density?: Density;
  /** Compact only: a wrapping row, as under the canvas on a phone. */
  direction?: 'column' | 'row';
};

/** What one criterion's control needs of {@link FulfillmentProps}. */
type CriterionFulfillmentProps = Omit<
  FulfillmentProps,
  'fulfillment' | 'activeHighlightKey' | 'activeHighlightMode'
> & {
  /** Absent until the plan has been mixed with this criterion switched on. */
  fulfillment?: CriterionFulfillment;
  /** Its marking is the pinned one. */
  pinned: boolean;
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
 * How well the last mix met one criterion — the counterpart of the weight set
 * right above it. The dot repeats the number as a colour, so the three states
 * read without reading the value.
 *
 * Without `onToggle` it is plain text: on a phone the marking it would pin sits
 * behind the sheet this badge is shown in.
 */
function FulfillmentBadge({
  criterion,
  label,
  pinned,
  onToggle,
  onHoverStart,
  onHoverEnd,
  className = '',
}: {
  criterion: CriterionFulfillment;
  /**
   * The criterion's translated name. `CriterionFulfillment.label` is the
   * algorithm's own German string and would reach an English reader untouched.
   */
  label: string;
  pinned: boolean;
  onToggle?: (criterion: CriterionFulfillment) => void;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
  className?: string;
}) {
  const { t } = useTranslation('generator');
  const percentage = Math.round(criterion.percentage);
  const { status, dotClass } = getStatisticStatusMeta(criterion.percentage);
  const statusLabel = t(`statisticsBadge.status.${status}`);
  const shapeClass = `inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-xs tabular-nums shadow-sm ${
    pinned
      ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-400 dark:bg-blue-900/40 dark:text-blue-200'
      : 'bg-gray-100 text-gray-600 dark:bg-gray-900/60 dark:text-gray-300'
  } ${className}`;
  // Hidden from the accessible name, which the label below spells out in full:
  // read out on their own the two would be "green, 78%".
  const body = (
    <>
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${dotClass}`}
      />
      <span aria-hidden="true">
        {t('mix.fulfillment.value', { percentage })}
      </span>
    </>
  );

  if (!onToggle) {
    return (
      <span className={`${shapeClass} pointer-events-none`} title={statusLabel}>
        <span className="sr-only">
          {t('mix.fulfillment.plainLabel', { label, percentage })}
        </span>
        {body}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onToggle(criterion)}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      onFocus={onHoverStart}
      onBlur={onHoverEnd}
      aria-pressed={pinned}
      aria-label={t(
        pinned ? 'mix.fulfillment.unpinLabel' : 'mix.fulfillment.pinLabel',
        { label, percentage },
      )}
      title={statusLabel}
      className={`${shapeClass} cursor-pointer transition hover:ring-1 hover:ring-blue-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500`}
    >
      {body}
    </button>
  );
}

/**
 * The same value on a rail button, which has no room for the number. It sits on
 * the button's edge, not off its corner like `getSidebarIndicatorClasses`: the
 * rail leaves 4px between buttons, which a corner dot would reach into, and the
 * weight ring — drawn up and to the left of the button's own circle — passes
 * just inside the dot here.
 */
function FulfillmentDot({ percentage }: { percentage: number }) {
  const { dotClass } = getStatisticStatusMeta(percentage);
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-white dark:border-gray-800 ${dotClass}`}
    />
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
  reserveTrailingSpace = false,
}: {
  criterion: MixCriterion;
  value: number;
  onChange: (value: number) => void;
  /** Keeps the label clear of the fulfilment badge laid over the card's corner. */
  reserveTrailingSpace?: boolean;
}) {
  const { t } = useTranslation('generator');

  return (
    <div>
      {/* A block, so the card's accessible name reads "Restlessness Separate
          students…", not one run-on word. */}
      <div
        className={`mb-1 text-sm font-medium text-gray-800 dark:text-gray-200${
          reserveTrailingSpace ? ' pr-16' : ''
        }`}
      >
        {criterion.label}
      </div>
      <div
        className="mb-2 text-xs text-gray-500 dark:text-gray-400"
        title={t('mix.weightTooltip', { value })}
      >
        {criterion.description}
      </div>
      {/* The weight reads next to the slider that sets it — the card's top
          right corner belongs to the fulfilment badge. */}
      <div className="flex items-center gap-2">
        <WeightBadge value={value} />
        <div className="flex-1 rounded-xl border border-blue-200 bg-white/80 px-3 dark:border-blue-900/40 dark:bg-gray-950/70">
          <WeightSlider
            label={criterion.label}
            value={value}
            onChange={onChange}
          />
        </div>
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
  fulfillment,
  pinned,
  onHighlightHover,
  onHighlightLeave,
  onHighlightToggle,
}: CriterionControlProps &
  CriterionFulfillmentProps & { onWeightChange: (value: number) => void }) {
  const isActive = value > 0;
  const Icon = CRITERIA_ICON_MAP[criterion.key];
  const surfaceClass = getSidebarSurfaceClasses({
    variant: 'expanded',
    isActive,
  });
  // One region over card and badge: moving between the two must not flicker
  // the marking off and straight back on.
  const preview =
    fulfillment && onHighlightHover
      ? {
          onMouseEnter: () => onHighlightHover(fulfillment),
          onMouseLeave: onHighlightLeave,
          onFocus: () => onHighlightHover(fulfillment),
          onBlur: onHighlightLeave,
        }
      : undefined;

  return (
    <div className="relative" {...preview}>
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
              reserveTrailingSpace={Boolean(fulfillment)}
            />
          </div>
        </div>
      </button>
      {/* A sibling of the card, not a child: a button inside the card's button
          would fold its text into the card's name and eat the press. */}
      {fulfillment && (
        <FulfillmentBadge
          criterion={fulfillment}
          label={criterion.label}
          pinned={pinned}
          onToggle={onHighlightToggle}
          className="absolute top-3 right-3 z-10"
        />
      )}
    </div>
  );
}

function CriterionRailButton({
  criterion,
  value,
  onPress,
  describedBy,
  onOpenFlyout,
  fulfillment,
  onHighlightHover,
  onHighlightLeave,
}: CriterionControlProps &
  CriterionFulfillmentProps & {
    describedBy: string;
    onOpenFlyout: (button: HTMLButtonElement) => void;
  }) {
  const { t } = useTranslation('generator');
  const isActive = value > 0;
  const Icon = CRITERIA_ICON_MAP[criterion.key];
  // `aria-label` replaces the button's content, so the dot's meaning has to be
  // spelled into it rather than left to the markup.
  const fulfillmentSuffix = fulfillment
    ? t('mix.fulfillment.suffix', {
        percentage: Math.round(fulfillment.percentage),
      })
    : '';
  const preview =
    fulfillment && onHighlightHover
      ? { start: () => onHighlightHover(fulfillment), end: onHighlightLeave }
      : undefined;

  return (
    <RailButton
      label={
        (isActive
          ? t('mix.railCriterionActiveLabel', { label: criterion.label, value })
          : criterion.label) + fulfillmentSuffix
      }
      title={
        t('mix.railCriterionTitle', { label: criterion.label, value }) +
        fulfillmentSuffix
      }
      pressed={isActive}
      className={getSidebarSurfaceClasses({ variant: 'collapsed', isActive })}
      describedBy={describedBy}
      onPress={onPress}
      onOpenFlyout={onOpenFlyout}
      onHoverStart={preview?.start}
      onHoverEnd={preview?.end}
    >
      <span className={getSidebarIconClasses({ isActive })}>
        <Icon size={16} />
      </span>
      <WeightRing value={value} />
      {fulfillment && <FulfillmentDot percentage={fulfillment.percentage} />}
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
  fulfillment,
  onHighlightHover,
  onHighlightLeave,
  onHighlightToggle,
  activeHighlightKey = null,
  activeHighlightMode = null,
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

  // The statistics carry only the criteria the mix scored, in the order of the
  // categories above — a lookup keeps the two lists from having to line up.
  const fulfillmentByKey = React.useMemo(() => {
    const byKey = new Map<string, CriterionFulfillment>();
    for (const criterion of fulfillment ?? []) {
      byKey.set(criterion.key, criterion);
    }
    return byKey;
  }, [fulfillment]);
  const overallScore =
    fulfillment && fulfillment.length > 0
      ? Math.round(calculateCriteriaWeightedScore(fulfillment))
      : null;
  const flyoutFulfillment = flyoutCriterion
    ? fulfillmentByKey.get(flyoutCriterion.key)
    : undefined;
  const pinnedKey =
    activeHighlightMode === 'persistent' ? activeHighlightKey : null;

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
        <div>
          <SectionHeader
            title={t('mix.title')}
            description={t('mix.description')}
          />
          {overallScore !== null && (
            <p className="px-3 pb-1 text-xs font-medium text-blue-700 dark:text-blue-300">
              {t('mix.fulfillment.overall', { percentage: overallScore })}
            </p>
          )}
        </div>
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
              fulfillment: fulfillmentByKey.get(criterion.key),
              pinned: pinnedKey === criterion.key,
              onHighlightHover,
              onHighlightLeave,
              onHighlightToggle,
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
          {/* On the rail the button itself only previews while the pointer
              rests on it; pinning the marking lives here, next to the value. */}
          {flyoutFulfillment && (
            <div className="mt-2 flex items-center justify-between gap-2 border-t border-blue-100 pt-2 dark:border-blue-900/50">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {t('mix.fulfillment.label')}
              </span>
              <FulfillmentBadge
                criterion={flyoutFulfillment}
                label={flyoutCriterion.label}
                pinned={pinnedKey === flyoutFulfillment.key}
                onToggle={onHighlightToggle}
                onHoverStart={
                  onHighlightHover
                    ? () => onHighlightHover(flyoutFulfillment)
                    : undefined
                }
                onHoverEnd={onHighlightLeave}
              />
            </div>
          )}
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

const areFulfillmentsEqual = (
  prev: CriterionFulfillment[] | undefined,
  next: CriterionFulfillment[] | undefined,
) => {
  if (prev === next) {
    return true;
  }
  if (!prev || !next || prev.length !== next.length) {
    return false;
  }
  return prev.every((criterion, index) => {
    const other = next[index];
    return (
      criterion.key === other.key &&
      criterion.percentage === other.percentage &&
      criterion.weight === other.weight
    );
  });
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
    prev.onHighlightHover === next.onHighlightHover &&
    prev.onHighlightLeave === next.onHighlightLeave &&
    prev.onHighlightToggle === next.onHighlightToggle &&
    prev.activeHighlightKey === next.activeHighlightKey &&
    prev.activeHighlightMode === next.activeHighlightMode &&
    areFulfillmentsEqual(prev.fulfillment, next.fulfillment) &&
    areSettingsEqual(prev.settings, next.settings)
  );
};

export default React.memo(SmartMixControls, arePropsEqual);

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowCounterClockwiseIcon,
  NotebookIcon,
  ToggleLeftIcon,
  ToggleRightIcon,
} from '@phosphor-icons/react';
import {
  CRITERIA_FAMILY_MAP,
  CRITERIA_ICON_MAP,
} from '@/utils/ui/criteriaIcons';
import type { MixSettings, ScalarMixSettingKey, Student } from '@/types';
import {
  LOCAL_STORAGE_KEYS,
  MIX_IMPORTANCE_LEVELS,
  SCALAR_MIX_SETTING_KEYS,
  dataFamilyClass,
  getSidebarIconClasses,
  getSidebarSurfaceClasses,
  getStatisticStatusMeta,
  quietIconButtonClass,
  secondaryButtonClass,
  type MixImportance,
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
import { useMixRecipes } from '@/hooks/ui/useMixRecipes';
import SidebarFlyout from '@/components/ui/panels/SidebarFlyout';
import SectionHeader from '../layout/SectionHeader';
import SectionSeparator from '../feedback/SectionSeparator';
import { MixRecipeList, MixRecipePanel } from './MixRecipes';
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

type FlyoutTarget = ScalarMixSettingKey | 'all' | 'recipes';

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

/**
 * How important a criterion is, in the four words a teacher can decide
 * between. The weight behind them is still there — the fine tuning switch
 * shows it — but nobody has to think in tenths to set a plan up.
 */
function ImportanceChoice({
  label,
  value,
  onChange,
}: {
  label: string;
  value: MixImportance;
  onChange: (level: MixImportance) => void;
}) {
  const { t } = useTranslation('generator');

  return (
    <div
      role="group"
      aria-label={t('mix.importance.groupLabel', { label })}
      className="flex gap-1"
    >
      {MIX_IMPORTANCE_LEVELS.map((level) => {
        const isActive = value === level;
        const levelLabel = t(`mix.importance.${level}`);
        return (
          <button
            key={level}
            type="button"
            // Inside a card whose own press would switch the criterion.
            onClick={(event) => {
              event.stopPropagation();
              onChange(level);
            }}
            aria-pressed={isActive}
            aria-label={t('mix.importance.optionLabel', {
              label,
              level: levelLabel,
            })}
            title={t(`mix.importance.${level}Hint`)}
            className={`flex-1 cursor-pointer rounded-md border px-1 py-1 text-[11px] leading-tight transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary) ${
              isActive
                ? 'border-(--border-option-selected) bg-(--surface-option-selected) font-medium text-(--text-badge)'
                : 'border-(--border-card) bg-(--surface-card) text-(--text-muted) hover:border-(--border-option-hover)'
            }`}
          >
            {levelLabel}
          </button>
        );
      })}
    </div>
  );
}

function WeightBadge({ value }: { value: number }) {
  return (
    <span
      className={`shrink-0 rounded-full px-3 py-1 text-xs tabular-nums shadow-sm ${
        value > 0
          ? 'bg-(--surface-option-selected) text-(--text-badge)'
          : 'bg-(--surface-sunken) text-(--text-muted)'
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
      className={`h-6 w-full cursor-pointer appearance-none rounded-full bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary)
        [&::-moz-range-thumb]:size-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0
        [&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full
        [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full
        [&::-webkit-slider-thumb]:-mt-1 [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
        pointer-coarse:[&::-moz-range-thumb]:size-5
        pointer-coarse:[&::-webkit-slider-thumb]:-mt-2 pointer-coarse:[&::-webkit-slider-thumb]:size-5
        ${
          isActive
            ? '[&::-moz-range-thumb]:bg-(--button-primary-bg) [&::-moz-range-track]:bg-(--surface-option-selected) [&::-webkit-slider-runnable-track]:bg-(--surface-option-selected) [&::-webkit-slider-thumb]:bg-(--button-primary-bg)'
            : '[&::-moz-range-thumb]:bg-(--text-muted) [&::-moz-range-track]:bg-(--border-card) [&::-webkit-slider-runnable-track]:bg-(--border-card) [&::-webkit-slider-thumb]:bg-(--text-muted)'
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
      className="pointer-events-none absolute -top-0.5 -left-0.5 size-12 -rotate-90 text-(--button-primary-bg)"
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
 * How well the last mix met one criterion — under the levels that caused it.
 * A bar the length of the percentage, and beside it the plain counting where
 * there is one: "4/4" says more than "100 %" about four restless students.
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
  const count = criterion.count;
  // The accessible name spells the value out; on screen the count wins where
  // there is one, because it names the cases rather than a share of them.
  const accessibleValue = count
    ? t('mix.fulfillment.countValue', {
        percentage,
        fulfilled: count.fulfilled,
        total: count.total,
      })
    : t('mix.fulfillment.value', { percentage });
  const shapeClass = `flex w-full items-center gap-2 rounded-md px-1 py-1 text-xs tabular-nums ${
    pinned ? 'bg-(--surface-option-selected)' : ''
  } ${className}`;
  const body = (
    <>
      <span
        aria-hidden="true"
        className="h-1 flex-1 overflow-hidden rounded-full bg-(--surface-sunken)"
      >
        <span
          className={`block h-1 rounded-full ${dotClass} transition-[width] duration-300 motion-reduce:transition-none`}
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </span>
      <span aria-hidden="true" className="shrink-0 text-(--text-muted)">
        {count
          ? t('mix.fulfillment.count', {
              fulfilled: count.fulfilled,
              total: count.total,
            })
          : t('mix.fulfillment.value', { percentage })}
      </span>
    </>
  );

  if (!onToggle) {
    return (
      <span className={`${shapeClass} pointer-events-none`} title={statusLabel}>
        <span className="sr-only">
          {t('mix.fulfillment.plainLabel', { label, value: accessibleValue })}
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
        { label, value: accessibleValue },
      )}
      title={statusLabel}
      className={`${shapeClass} cursor-pointer transition hover:bg-(--surface-sunken) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary)`}
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
      className={`pointer-events-none absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-(--surface-card) ${dotClass}`}
    />
  );
}

/**
 * Name, explanation and importance of one criterion: the body of its card, and
 * of its flyout in the compact density. The weight from 0 to 10 comes along
 * only where the fine tuning asks for it.
 */
function CriterionWeight({
  criterion,
  value,
  importance,
  onImportanceChange,
  onChange,
  fineTuning,
}: {
  criterion: MixCriterion;
  value: number;
  importance: MixImportance;
  onImportanceChange: (level: MixImportance) => void;
  onChange: (value: number) => void;
  /** Shows the weight the level stands for, and lets it be set exactly. */
  fineTuning: boolean;
}) {
  const { t } = useTranslation('generator');

  return (
    <div>
      {/* A block, so the card's accessible name reads "Restlessness Separate
          students…", not one run-on word. */}
      <div className="mb-1 text-sm font-medium text-(--text-page)">
        {criterion.label}
      </div>
      <div
        className="mb-2 text-xs text-(--text-muted)"
        title={t('mix.weightTooltip', { value })}
      >
        {criterion.description}
      </div>
      <ImportanceChoice
        label={criterion.label}
        value={importance}
        onChange={onImportanceChange}
      />
      {/* The number behind the words, for whoever wants to set it exactly. */}
      {fineTuning && (
        <div className="mt-2 flex items-center gap-2">
          <WeightBadge value={value} />
          <div className="flex-1 rounded-lg border border-(--border-card) bg-(--surface-card) px-3">
            <WeightSlider
              label={criterion.label}
              value={value}
              onChange={onChange}
            />
          </div>
        </div>
      )}
    </div>
  );
}

type CriterionControlProps = {
  criterion: MixCriterion;
  value: number;
  onPress: (button: HTMLButtonElement) => void;
};

/**
 * One criterion in the inspector: what it is, what it does, how important it
 * is — and, once the plan has been mixed, how far it got.
 *
 * The card is paper, not a button: the four levels inside it are the controls,
 * and a criterion that is off wears a grey icon instead of its family's colour,
 * so the list says at a glance what is acting on the plan.
 */
function CriterionCard({
  criterion,
  value,
  importance,
  onImportanceChange,
  onWeightChange,
  fineTuning,
  fulfillment,
  pinned,
  onHighlightHover,
  onHighlightLeave,
  onHighlightToggle,
}: Omit<CriterionControlProps, 'onPress'> &
  CriterionFulfillmentProps & {
    importance: MixImportance;
    onImportanceChange: (level: MixImportance) => void;
    onWeightChange: (value: number) => void;
    fineTuning: boolean;
  }) {
  const isActive = value > 0;
  const Icon = CRITERIA_ICON_MAP[criterion.key];
  const family = dataFamilyClass[CRITERIA_FAMILY_MAP[criterion.key]];
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
    <div
      data-criterion={criterion.key}
      className="rounded-lg px-2.5 py-2"
      {...preview}
    >
      <div className="flex items-start gap-2.5">
        {/* The family's colour, always with its icon beside the name — a
            criterion is pedagogy, so it is not chrome-coloured. */}
        <span
          className={`${
            isActive
              ? `${family} bg-(--data-chip-surface) text-(--data-chip-text)`
              : 'bg-(--surface-sunken) text-(--text-muted)'
          } mt-0.5 inline-flex size-5.5 shrink-0 items-center justify-center rounded-md`}
          aria-hidden="true"
        >
          <Icon size={13} />
        </span>
        <div className="min-w-0 flex-1">
          <CriterionWeight
            criterion={criterion}
            value={value}
            importance={importance}
            onImportanceChange={onImportanceChange}
            onChange={onWeightChange}
            fineTuning={fineTuning}
          />
        </div>
      </div>
      {/* Under the levels that caused it, indented to their line. */}
      {fulfillment && (
        <div className="mt-1.5 pl-8">
          <FulfillmentBadge
            criterion={fulfillment}
            label={criterion.label}
            pinned={pinned}
            onToggle={onHighlightToggle}
          />
        </div>
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
      <div className="flex items-center justify-between gap-3 rounded-lg bg-(--surface-sunken) px-4 py-3">
        <span className="text-sm font-medium text-(--text-page)">
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
      <p className="text-sm font-medium text-(--text-page)">
        {t('mix.toggleAll')}
      </p>
      {isRandom && (
        <p className="text-xs text-(--text-muted)">{t('mix.randomWarning')}</p>
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
  const recipes = useMixRecipes({ settings, setMixSettings, students });
  const isCompact = density === 'compact';
  const [flyout, setFlyout] = React.useState<FlyoutState | null>(null);
  const [hintSeen, setHintSeen] = usePersistentState(
    LOCAL_STORAGE_KEYS.mixWeightHintSeen,
    false,
  );
  // A way of looking at the panel, not a property of the plan — so it is
  // remembered per browser, like the sidebar's density.
  const [fineTuning, setFineTuning] = usePersistentState(
    LOCAL_STORAGE_KEYS.mixFineTuning,
    false,
  );
  const weightHintId = React.useId();
  const defaultsHintId = React.useId();

  const criteria = React.useMemo(
    () => mix.categories.flatMap((category) => category.criteria),
    [mix.categories],
  );
  const flyoutCriterion =
    flyout && flyout.target !== 'all' && flyout.target !== 'recipes'
      ? criteria.find((criterion) => criterion.key === flyout.target)
      : undefined;
  // Of the criteria this class has data for — the ones the panel shows.
  const activeCriteriaCount = criteria.filter(
    (criterion) => mix.weightOf(criterion.key) > 0,
  ).length;

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
            <p className="px-3 pb-1 text-xs font-medium text-(--text-muted)">
              {t('mix.fulfillment.overall', { percentage: overallScore })}
            </p>
          )}
          {/* The weights never went away; this is where they come back. */}
          <div className="flex justify-end px-3 pb-1">
            <button
              type="button"
              onClick={() => setFineTuning(!fineTuning)}
              aria-pressed={fineTuning}
              title={t('mix.fineTuningHint')}
              className="cursor-pointer rounded-md px-2 py-1 text-xs font-medium text-(--text-muted) transition hover:text-(--text-page) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary)"
            >
              {t('mix.fineTuning')}
            </button>
          </div>
        </div>
      )}

      {/* What the plan is for, above the criteria it sets. */}
      {isCompact ? (
        <RailButton
          label={t('mix.recipes.title')}
          title={t('mix.recipes.railTitle', {
            recipe: recipes.activeId
              ? t(`mix.recipes.${recipes.activeId}.label`)
              : t('mix.recipes.custom'),
          })}
          pressed={false}
          className={getSidebarSurfaceClasses({ variant: 'collapsed' })}
          onPress={(button) => openFlyout('recipes', button)}
          onOpenFlyout={(button) => openFlyout('recipes', button)}
        >
          <span className={getSidebarIconClasses({})}>
            <NotebookIcon size={16} />
          </span>
        </RailButton>
      ) : (
        <MixRecipePanel
          activeId={recipes.activeId}
          activeCount={activeCriteriaCount}
          total={criteria.length}
          onSelect={recipes.apply}
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
        <div aria-hidden="true" className="my-1 h-px w-8 bg-(--border-card)" />
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
                onPress={(button) =>
                  handleCriterionPress(criterion.key, button)
                }
                describedBy={weightHintId}
                onOpenFlyout={(button) => openFlyout(criterion.key, button)}
              />
            ) : (
              <CriterionCard
                key={criterion.key}
                {...control}
                importance={mix.importanceOf(criterion.key)}
                onImportanceChange={(level) =>
                  mix.setImportance(criterion.key, level)
                }
                onWeightChange={(value) => mix.setWeight(criterion.key, value)}
                fineTuning={fineTuning}
              />
            );
          })}
        </CriteriaGroup>
      ))}

      {/* In the compact density the warning is in the flyout of "all criteria",
          whose button turns amber. */}
      {!isCompact && mix.isRandom && (
        <div className="px-2 pb-2">
          <div className="rounded-lg border border-(--border-card) bg-(--surface-sunken) p-3">
            <p className="text-center text-xs font-medium text-(--text-page)">
              ⚠️ {t('mix.randomWarning')}
            </p>
          </div>
        </div>
      )}

      {/* Keyed by target: moving from one button's flyout straight to
          another's starts afresh, with its own placement and focus. Widening
          the sidebar removes the anchor, and the flyout closes itself. */}
      {flyout && flyout.target === 'recipes' && (
        <SidebarFlyout
          key="recipes"
          anchor={flyout.anchor}
          label={t('mix.recipes.title')}
          autoFocus={flyout.autoFocus}
          onClose={closeFlyout}
        >
          <MixRecipeList
            activeId={recipes.activeId}
            onSelect={(id) => {
              recipes.apply(id);
              closeFlyout({ restoreFocus: true });
            }}
          />
        </SidebarFlyout>
      )}
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
          {/* The rail has no room for the levels, so its flyout carries them —
              together with the weight, which is what it was opened for. */}
          <CriterionWeight
            criterion={flyoutCriterion}
            value={mix.weightOf(flyoutCriterion.key)}
            importance={mix.importanceOf(flyoutCriterion.key)}
            onImportanceChange={(level) =>
              mix.setImportance(flyoutCriterion.key, level)
            }
            onChange={(value) => mix.setWeight(flyoutCriterion.key, value)}
            fineTuning
          />
          {/* On the rail the button itself only previews while the pointer
              rests on it; pinning the marking lives here, next to the value. */}
          {flyoutFulfillment && (
            <div className="mt-2 flex items-center justify-between gap-2 border-t border-(--border-card) pt-2">
              <span className="text-xs text-(--text-muted)">
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
            <p className="mt-2 border-t border-(--border-card) pt-2 text-xs text-(--text-muted)">
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

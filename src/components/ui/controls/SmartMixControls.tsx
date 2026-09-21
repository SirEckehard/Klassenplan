// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowCounterClockwiseIcon,
  NotebookIcon,
  ToggleLeftIcon,
  ToggleRightIcon,
  WarningIcon,
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
  secondaryButtonClass,
  type MixImportance,
} from '@/utils';
import type { CriterionFulfillment } from '@/utils/algorithm/seatingStatistics';
import usePersistentState from '@/hooks/usePersistentState';
import {
  useMixCriteria,
  type MixCriterion,
  type SuspendedWeights,
} from '@/hooks/ui/useMixCriteria';
import { useMixRecipes } from '@/hooks/ui/useMixRecipes';
import SidebarFlyout from '@/components/ui/panels/SidebarFlyout';
import SectionSeparator from '../feedback/SectionSeparator';
import { MixRecipeList, MixRecipePanel } from './MixRecipes';
import RailButton from './RailButton';
import ToggleSwitch from './ToggleSwitch';

/**
 * - `comfortable`: the inspector. Every criterion is a card with its
 *   explanation and its four levels in view.
 * - `compact`: the row under the canvas on a phone. Every criterion is a round
 *   button whose ring shows the weight; explanation and levels are in its
 *   flyout.
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
 * between. The weight behind them is still there for the algorithm, but
 * nobody has to think in tenths to set a plan up — so the panel no longer
 * offers them at all.
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
 * A bar the length of the percentage, and the percentage beside it.
 *
 * It showed the plain counting for a while ("3/4"), which read as a number of
 * students next to a bar and a total that are shares; one scale for every
 * criterion and for the whole plan reads faster.
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
  const value = t('mix.fulfillment.value', { percentage });
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
        {value}
      </span>
    </>
  );

  if (!onToggle) {
    return (
      <span className={`${shapeClass} pointer-events-none`} title={statusLabel}>
        <span className="sr-only">
          {t('mix.fulfillment.plainLabel', { label, value })}
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
        { label, value },
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
 * of its flyout in the compact density.
 */
function CriterionWeight({
  criterion,
  importance,
  onImportanceChange,
}: {
  criterion: MixCriterion;
  importance: MixImportance;
  onImportanceChange: (level: MixImportance) => void;
}) {
  return (
    <div>
      {/* A block, so the card's accessible name reads "Restlessness Separate
          students…", not one run-on word. */}
      <div className="mb-1 text-sm font-medium text-(--text-page)">
        {criterion.label}
      </div>
      <div className="mb-2 text-xs text-(--text-muted)">
        {criterion.description}
      </div>
      <ImportanceChoice
        label={criterion.label}
        value={importance}
        onChange={onImportanceChange}
      />
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
  fulfillment,
  pinned,
  onHighlightHover,
  onHighlightLeave,
  onHighlightToggle,
}: Omit<CriterionControlProps, 'onPress'> &
  CriterionFulfillmentProps & {
    importance: MixImportance;
    onImportanceChange: (level: MixImportance) => void;
  }) {
  const isActive = value > 0;
  const Icon = CRITERIA_ICON_MAP[criterion.key];
  const family = dataFamilyClass[CRITERIA_FAMILY_MAP[criterion.key]];

  return (
    <div data-criterion={criterion.key} className="rounded-lg px-2.5 py-2">
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
            importance={importance}
            onImportanceChange={onImportanceChange}
          />
        </div>
      </div>
      {/* Under the levels that caused it, indented to their line. */}
      {fulfillment && (
        <div className="mt-1.5 pl-8">
          {/* The seats are marked while the pointer or the focus rests on
              this bar, and only then: the levels above it are pressed on
              the way through, and a plan lighting up under every pass was
              noise. */}
          <FulfillmentBadge
            criterion={fulfillment}
            label={criterion.label}
            pinned={pinned}
            onToggle={onHighlightToggle}
            onHoverStart={
              onHighlightHover ? () => onHighlightHover(fulfillment) : undefined
            }
            onHoverEnd={onHighlightLeave}
          />
        </div>
      )}
    </div>
  );
}

function CriterionRailButton({
  criterion,
  value,
  importance,
  onPress,
  describedBy,
  onOpenFlyout,
  fulfillment,
  onHighlightHover,
  onHighlightLeave,
}: CriterionControlProps &
  CriterionFulfillmentProps & {
    importance: MixImportance;
    describedBy: string;
    onOpenFlyout: (button: HTMLButtonElement) => void;
  }) {
  const { t } = useTranslation('generator');
  const isActive = value > 0;
  const level = t(`mix.importance.${importance}`);
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
          ? t('mix.railCriterionActiveLabel', { label: criterion.label, level })
          : criterion.label) + fulfillmentSuffix
      }
      title={
        t('mix.railCriterionTitle', { label: criterion.label, level }) +
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
 * The mixing criteria in both densities: the inspector's panel and the row
 * under the canvas on a phone. Each part — the recipes, a criterion, the
 * warning when mixing is random — is one place with a comfortable and a compact
 * form, so a change to it reaches both, and the compact form keeps everything
 * the comfortable one offers. The switch for all criteria is the one part that
 * lives apart: in the inspector it sits beside the heading
 * (`MixCriteriaSwitch`), on the phone it leads the row.
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
        // The inspector's heading already names the panel and carries the
        // switch for all criteria (`MixCriteriaSwitch`); what is left up here
        // is the one thing that switch cannot say by itself.
        mix.isRandom && (
          <div
            role="status"
            className="mx-2 flex items-center gap-2 rounded-lg border border-(--border-card) bg-(--surface-sunken) px-3 py-2 text-xs font-medium text-(--text-page)"
          >
            <WarningIcon
              size={16}
              aria-hidden="true"
              className="shrink-0 text-(--status-warn)"
            />
            {t('mix.randomWarning')}
          </div>
        )
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

      {isCompact && (
        <AllCriteriaRailButton
          {...allCriteria}
          describedBy={defaultsHintId}
          onPress={() => setAllCriteria(mix.isRandom)}
          onOpenFlyout={(button) => openFlyout('all', button)}
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
                importance={mix.importanceOf(criterion.key)}
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
              />
            );
          })}
        </CriteriaGroup>
      ))}

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
          {/* The rail has no room for the levels, so its flyout carries
              them — which is what it was opened for. */}
          <CriterionWeight
            criterion={flyoutCriterion}
            importance={mix.importanceOf(flyoutCriterion.key)}
            onImportanceChange={(level) =>
              mix.setImportance(flyoutCriterion.key, level)
            }
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

/**
 * "Alle Kriterien" as a switch beside the inspector's heading: the one control
 * that acts on every criterion sits above all of them, where the heading names
 * what it switches. It reads the weights itself, so the header strip and the
 * panel under it stay two separate pieces of the inspector. The way back to
 * the recommended weights is the recipe of that name.
 */
export function MixCriteriaSwitch({
  settings,
  setMixSettings,
  students,
  suspendedWeights,
}: Pick<
  SmartMixControlsProps,
  'settings' | 'setMixSettings' | 'students' | 'suspendedWeights'
>) {
  const { t } = useTranslation('generator');
  const mix = useMixCriteria({
    settings,
    setMixSettings,
    students,
    suspendedWeights,
  });

  return (
    <ToggleSwitch
      checked={!mix.isRandom}
      onChange={(on) => (on ? mix.enableAll() : mix.disableAll())}
      label={t('mix.toggleAll')}
      title={mix.isRandom ? t('mix.enableAll') : t('mix.disableAll')}
    />
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

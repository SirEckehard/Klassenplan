// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { WarningIcon } from '@phosphor-icons/react';
import {
  CRITERIA_FAMILY_MAP,
  CRITERIA_ICON_MAP,
} from '@/utils/ui/criteriaIcons';
import type { MixSettings, Student } from '@/types';
import {
  MIX_IMPORTANCE_LEVELS,
  SCALAR_MIX_SETTING_KEYS,
  dataFamilyClass,
  formatPercent,
  getStatisticStatusMeta,
  type MixImportance,
} from '@/utils';
import type { CriterionFulfillment } from '@/utils/algorithm/seatingStatistics';
import {
  useMixCriteria,
  type MixCriterion,
  type SuspendedWeights,
} from '@/hooks/ui/useMixCriteria';
import { useMixRecipes } from '@/hooks/ui/useMixRecipes';
import SectionSeparator from '../feedback/SectionSeparator';
import { MixRecipePanel } from './MixRecipes';
import ToggleSwitch from './ToggleSwitch';

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
  const value = formatPercent(percentage);
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

/** Name, explanation and importance of one criterion: the body of its card. */
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
}: CriterionFulfillmentProps & {
  criterion: MixCriterion;
  value: number;
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

/** A category: a labelled group of cards. */
function CriteriaGroup({
  label,
  isFirst,
  children,
}: {
  label: string;
  isFirst: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      {label && !isFirst && <div className="py-1" />}
      {label && <SectionSeparator label={label} />}
      <div className="space-y-3 px-2 pt-2">{children}</div>
    </div>
  );
}

/**
 * The mixing criteria as the inspector shows them — on a phone and a tablet in
 * its drawer: the recipes, then every criterion as a card with its four levels
 * and, once the plan has been mixed, how far it got. The switch for all
 * criteria lives apart, beside the inspector's heading (`MixCriteriaSwitch`).
 */
function SmartMixControls({
  settings,
  setMixSettings,
  students,
  suspendedWeights,
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

  const criteria = React.useMemo(
    () => mix.categories.flatMap((category) => category.criteria),
    [mix.categories],
  );
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
  const pinnedKey =
    activeHighlightMode === 'persistent' ? activeHighlightKey : null;

  return (
    <div className="space-y-4 pb-2">
      {/* The inspector's heading already names the panel and carries the
          switch for all criteria (`MixCriteriaSwitch`); what is left up here
          is the one thing that switch cannot say by itself. */}
      {mix.isRandom && (
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
      )}

      {/* What the plan is for, above the criteria it sets. */}
      <MixRecipePanel
        activeId={recipes.activeId}
        activeCount={activeCriteriaCount}
        total={criteria.length}
        onSelect={recipes.apply}
      />

      {mix.categories.map((category, categoryIndex) => (
        <CriteriaGroup
          key={category.id}
          label={category.label}
          isFirst={categoryIndex === 0}
        >
          {category.criteria.map((criterion) => (
            <CriterionCard
              key={criterion.key}
              criterion={criterion}
              value={mix.weightOf(criterion.key)}
              fulfillment={fulfillmentByKey.get(criterion.key)}
              pinned={pinnedKey === criterion.key}
              onHighlightHover={onHighlightHover}
              onHighlightLeave={onHighlightLeave}
              onHighlightToggle={onHighlightToggle}
              importance={mix.importanceOf(criterion.key)}
              onImportanceChange={(level) =>
                mix.setImportance(criterion.key, level)
              }
            />
          ))}
        </CriteriaGroup>
      ))}
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

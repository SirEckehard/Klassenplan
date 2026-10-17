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
  type DataFamily,
  type MixImportance,
} from '@/utils';
import type { CriterionFulfillment } from '@/utils/algorithm/seatingStatistics';
import {
  useMixCriteria,
  type MixCriterion,
  type SuspendedWeights,
} from '@/hooks/ui/useMixCriteria';
import { useMixRecipes } from '@/hooks/ui/useMixRecipes';
import {
  InspectorIcon,
  InspectorRow,
  InspectorSection,
} from '@/components/shell/InspectorPanel';
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
 * How tall each level's bar stands. "Off" is the step before the first: a
 * dash on the baseline, so the scale reads as one run from nothing to much —
 * and "Beachten" stands taller than wide, or it reads as a dot.
 */
const LEVEL_BAR_CLASS: Record<MixImportance, string> = {
  off: 'h-0.5',
  consider: 'h-2',
  important: 'h-3',
  essential: 'h-4',
};

/**
 * How important a criterion is, as a scale beside its name: a dash on the
 * baseline for "Aus" and three bars rising to "Sehr wichtig", filled up to the
 * level in the criterion's family ink — the dash dark while it is the level. The four words a teacher decides between are still
 * there — on every step's tooltip and in its accessible name — but the scale
 * fits the criterion's own line, where four word chips took a second one, and
 * sixteen criteria read as one list as the student inspector's do.
 */
function ImportanceScale({
  label,
  family,
  value,
  onChange,
}: {
  label: string;
  family: DataFamily;
  value: MixImportance;
  onChange: (level: MixImportance) => void;
}) {
  const { t } = useTranslation('generator');
  const valueIndex = MIX_IMPORTANCE_LEVELS.indexOf(value);

  return (
    <div
      role="group"
      aria-label={t('mix.importance.groupLabel', { label })}
      className={`${dataFamilyClass[family]} flex items-stretch`}
    >
      {MIX_IMPORTANCE_LEVELS.map((level, index) => {
        const isActive = value === level;
        const levelLabel = t(`mix.importance.${level}`);
        const isFilled = index > 0 && index <= valueIndex;
        return (
          <button
            key={level}
            type="button"
            onClick={() => onChange(level)}
            aria-pressed={isActive}
            aria-label={t('mix.importance.optionLabel', {
              label,
              level: levelLabel,
            })}
            title={`${levelLabel} – ${t(`mix.importance.${level}Hint`)}`}
            // Bars share a baseline, as a signal meter's do. A finger gets
            // the 44px of every inspector control.
            className="flex h-7 w-4.5 cursor-pointer items-end justify-center rounded-sm pb-1.5 transition hover:bg-(--surface-sunken) pointer-coarse:h-11 pointer-coarse:w-7 pointer-coarse:pb-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary)"
          >
            <span
              aria-hidden="true"
              className={`block w-1.5 rounded-xs ${LEVEL_BAR_CLASS[level]} ${
                isFilled
                  ? 'bg-(--data-chip-accent)'
                  : level === 'off' && isActive
                    ? 'bg-(--text-page)'
                    : 'bg-(--border-card)'
              }`}
            />
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
  const shapeClass = `flex w-full items-center gap-2 rounded-md px-1 py-0.5 text-xs tabular-nums ${
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
 * One criterion in the inspector, read as the student inspector's attributes
 * are: its icon and name on the left, how important it is on the right — then
 * what it does, and, once the plan has been mixed, how far it got, both on the
 * name's edge.
 *
 * A criterion that is off wears a grey icon instead of its family's ink, so
 * the list says at a glance what is acting on the plan.
 */
function CriterionRow({
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
  const family = CRITERIA_FAMILY_MAP[criterion.key];

  return (
    <div data-criterion={criterion.key} className="flex flex-col">
      <InspectorRow
        label={criterion.label}
        icon={
          <InspectorIcon
            icon={CRITERIA_ICON_MAP[criterion.key]}
            family={family}
            muted={value <= 0}
          />
        }
      >
        <ImportanceScale
          label={criterion.label}
          family={family}
          value={importance}
          onChange={onImportanceChange}
        />
      </InspectorRow>
      {/* On the name's edge: the icon's 14px and the row's gap. */}
      <p className="pl-5.5 text-xs text-(--text-muted)">
        {criterion.description}
      </p>
      {fulfillment && (
        <div className="pt-0.5 pl-4.5">
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

/**
 * The mixing criteria as the inspector shows them — on a phone and a tablet in
 * its drawer: the recipe, then every criterion as a row with its scale under
 * the family it acts on, headed as in the student inspector, and, once the plan
 * has been mixed, how far it got. The switch for all criteria and their count
 * live apart, in the inspector's heading (`MixCriteriaSwitch`,
 * `MixCriteriaCount`).
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
    <>
      {/* The inspector's heading already names the panel and carries the
          switch for all criteria (`MixCriteriaSwitch`); what is left up here
          is what the plan is for and the one thing that switch cannot say by
          itself. */}
      <div className="flex flex-col gap-2 pb-3">
        <MixRecipePanel activeId={recipes.activeId} onSelect={recipes.apply} />
        {mix.isRandom && (
          <div
            role="status"
            className="flex items-center gap-2 rounded-md border border-(--border-card) bg-(--surface-sunken) px-2.5 py-1.5 text-xs font-medium text-(--text-page)"
          >
            <WarningIcon
              size={16}
              aria-hidden="true"
              className="shrink-0 text-(--status-warn)"
            />
            {t('mix.randomWarning')}
          </div>
        )}
      </div>

      {mix.categories.map((category) => (
        <InspectorSection
          key={category.id}
          family={category.id}
          title={category.label}
        >
          {category.criteria.map((criterion) => (
            <CriterionRow
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
        </InspectorSection>
      ))}
    </>
  );
}

/**
 * How many of the criteria this class has data for carry weight — under the
 * inspector's heading, as the student inspector states the position in the
 * list there. It reads the weights itself, as `MixCriteriaSwitch` does.
 */
export function MixCriteriaCount({
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
  const criteria = mix.categories.flatMap((category) => category.criteria);
  const active = criteria.filter(
    (criterion) => mix.weightOf(criterion.key) > 0,
  ).length;

  return (
    <>{t('mix.recipes.activeCount', { active, total: criteria.length })}</>
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

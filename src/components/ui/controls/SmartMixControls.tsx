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
  MIX_RECIPES,
  SCALAR_MIX_SETTING_KEYS,
  dataFamilyClass,
  findMixRecipe,
  formatPercent,
  getStatisticStatusMeta,
  isEditableBuiltin,
  presetWeightsFrom,
  showToast,
  type DataFamily,
  type MixImportance,
  type MixRecipe,
} from '@/utils';
import { announce } from '@/utils/ui/toast';
import {
  addMixPreset,
  deleteMixPreset,
  setMixPresetOverride,
  updateMixPreset,
} from '@/repositories/mixPresetStore';
import { useMixPresets } from '@/hooks/ui/useMixPresets';
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
import {
  MixPresetActions,
  MixRecipePanel,
  useMixRecipeText,
} from './MixRecipes';
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
  /** Every criterion, whatever data the class has: a preset's. */
  allCriteria?: boolean;
  /** The levels shown, not changed: "Standard" in "Bibliothek". */
  readOnly?: boolean;
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
  off: 'h-1',
  consider: 'h-2.5',
  important: 'h-3.5',
  essential: 'h-4.5',
};

/**
 * How important a criterion is, as a scale beside its name: a dash on the
 * baseline for "Aus" and three bars rising to "Sehr wichtig", filled up to the
 * level in the criterion's family ink — the dash dark while it is the level.
 * Empty steps take `--scale-empty`, not a hairline's colour, so the scale
 * stands out against the page in both themes. Under a mouse the steps show
 * the level the pointer rests on before it is pressed: the bars it would add
 * half-filled, the ones it would take away already empty. The four words a
 * teacher decides between are still there — on every step's tooltip and in
 * its accessible name — but the scale fits the criterion's own line, where
 * four word chips took a second one, and sixteen criteria read as one list as
 * the student inspector's do.
 */
function ImportanceScale({
  label,
  family,
  value,
  onChange,
  readOnly = false,
}: {
  label: string;
  family: DataFamily;
  value: MixImportance;
  onChange: (level: MixImportance) => void;
  readOnly?: boolean;
}) {
  const { t } = useTranslation('generator');
  const valueIndex = MIX_IMPORTANCE_LEVELS.indexOf(value);
  // The step under the mouse. A finger's tap would leave it behind, since a
  // touch screen sends no leave until the next touch elsewhere.
  const [previewIndex, setPreviewIndex] = React.useState<number | null>(null);
  const targetIndex = previewIndex ?? valueIndex;

  return (
    <div
      role="group"
      aria-label={t('mix.importance.groupLabel', { label })}
      className={`${dataFamilyClass[family]} flex items-stretch`}
      onPointerLeave={() => setPreviewIndex(null)}
    >
      {MIX_IMPORTANCE_LEVELS.map((level, index) => {
        const isActive = value === level;
        const levelLabel = t(`mix.importance.${level}`);
        let barColorClass = 'bg-(--scale-empty)';
        if (index === 0) {
          if (targetIndex === 0) {
            barColorClass = isActive
              ? 'bg-(--text-page)'
              : 'bg-(--text-page)/50';
          }
        } else if (index <= targetIndex) {
          barColorClass =
            index <= valueIndex
              ? 'bg-(--data-chip-accent)'
              : 'bg-(--data-chip-accent)/50';
        }
        return (
          <button
            key={level}
            type="button"
            onPointerEnter={(event) => {
              if (event.pointerType === 'mouse' && !readOnly) {
                setPreviewIndex(index);
              }
            }}
            onClick={() => onChange(level)}
            disabled={readOnly}
            aria-pressed={isActive}
            aria-label={t('mix.importance.optionLabel', {
              label,
              level: levelLabel,
            })}
            title={`${levelLabel} – ${t(`mix.importance.${level}Hint`)}`}
            // Bars share a baseline, as a signal meter's do. A finger gets
            // the 44px of every inspector control, a mouse the 24px of
            // WCAG 2.5.8.
            className="flex h-7 w-6 cursor-pointer items-end justify-center rounded-sm pb-1.5 transition hover:bg-(--surface-sunken) disabled:cursor-default disabled:hover:bg-transparent pointer-coarse:h-11 pointer-coarse:w-7 pointer-coarse:pb-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring)"
          >
            <span
              aria-hidden="true"
              className={`block w-2 rounded-xs ${LEVEL_BAR_CLASS[level]} ${barColorClass}`}
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
      className={`${shapeClass} cursor-pointer transition hover:bg-(--surface-sunken) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring)`}
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
  readOnly,
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
  readOnly?: boolean;
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
        description={criterion.description}
      >
        <ImportanceScale
          label={criterion.label}
          family={family}
          value={importance}
          onChange={onImportanceChange}
          readOnly={readOnly}
        />
      </InspectorRow>
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
 * its drawer: every criterion as a row with its scale under the family it acts
 * on, headed as in the student inspector, and, once the plan has been mixed,
 * how far it got. The switch for all criteria and their count live apart, with
 * the recipe (`MixRecipeSection`).
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
  allCriteria = false,
  readOnly = false,
}: SmartMixControlsProps) {
  const mix = useMixCriteria({
    settings,
    setMixSettings,
    students,
    suspendedWeights,
    allCriteria,
  });

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
              readOnly={readOnly}
            />
          ))}
        </InspectorSection>
      ))}
    </>
  );
}

/**
 * What the plan is being mixed for — the recipe, the first section of the
 * mixing under the plan's own, since it sets every criterion below at once.
 * Beside its heading the one control that acts on all of them, "Alle
 * Kriterien" as a switch — the way back to the recommended weights is
 * "Standard" — and under the recipe what can be kept of it (decision 0038):
 * a change in the preset it came from, a mix as a preset of one's own, a
 * shipped preset's own weights back. Under that how many of the criteria
 * this class has data for carry weight, and, when none does, that nothing is
 * weighed.
 */
export function MixRecipeSection({
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
  const text = useMixRecipeText();
  const presets = useMixPresets();
  const recipes = useMixRecipes({
    settings,
    setMixSettings,
    students,
    recipes: presets.recipes,
  });
  const [renamingId, setRenamingId] = React.useState<string | null>(null);
  const renaming = presets.recipes.find((recipe) => recipe.id === renamingId);
  const criteria = mix.categories.flatMap((category) => category.criteria);
  const active = criteria.filter(
    (criterion) => mix.weightOf(criterion.key) > 0,
  ).length;

  // A preset kept is on screen at once — the button names it — so it is
  // only said to a screen reader; a write that failed is said to everyone
  // (decision 0037).
  const report = (written: boolean, message: string) => {
    if (written) announce(message);
    else showToast('error', 'toast:mixPresets.saveFailed');
  };

  const saveNew = async (name: string) => {
    const preset = await addMixPreset(
      name,
      presetWeightsFrom(settings, students, recipes.base),
    );
    if (preset) recipes.choose(preset.id);
    report(!!preset, t('mix.recipes.saved', { name }));
  };

  const keepChanges = async (recipe: MixRecipe) => {
    const weights = presetWeightsFrom(settings, students, recipe);
    const written = isEditableBuiltin(recipe.builtin)
      ? await setMixPresetOverride(recipe.builtin, weights)
      : await updateMixPreset(recipe.id, { weights });
    report(written, t('mix.recipes.kept', { name: text.label(recipe) }));
  };

  // Gives the shipped preset its weights back and sets them here, so the
  // button keeps naming it.
  const restore = async (recipe: MixRecipe) => {
    if (!isEditableBuiltin(recipe.builtin)) return;
    const original = findMixRecipe(recipe.builtin, MIX_RECIPES);
    const written = await setMixPresetOverride(recipe.builtin, null);
    if (written && original) recipes.apply(original.id, original);
    report(written, t('mix.recipes.restored', { name: text.label(recipe) }));
  };

  const rename = async (recipe: MixRecipe, name: string) => {
    const written = await updateMixPreset(recipe.id, { name });
    if (!written) showToast('error', 'toast:mixPresets.saveFailed');
  };

  // Its row has asked: deleting a preset is in no undo history.
  const remove = async (recipe: MixRecipe) => {
    if (!(await deleteMixPreset(recipe.id))) {
      showToast('error', 'toast:mixPresets.saveFailed');
    }
  };

  return (
    <InspectorSection
      title={t('mix.recipes.title')}
      actions={
        <ToggleSwitch
          checked={!mix.isRandom}
          onChange={(on) => (on ? mix.enableAll() : mix.disableAll())}
          label={t('mix.toggleAll')}
          title={mix.isRandom ? t('mix.enableAll') : t('mix.disableAll')}
          size="sm"
        />
      }
    >
      <MixRecipePanel
        recipes={presets.recipes}
        activeId={recipes.activeId}
        base={recipes.base}
        onSelect={(id) => {
          setRenamingId(null);
          recipes.apply(id);
        }}
        onRename={(recipe) => setRenamingId(recipe.id)}
        onDelete={(recipe) => {
          void remove(recipe);
        }}
      />
      {/* Nothing to keep while every criterion is off: that is the
          switch's, and the warning below says so. */}
      {(!mix.isRandom || renaming) && (
        <MixPresetActions
          recipes={presets.recipes}
          active={recipes.active}
          base={recipes.base}
          onSaveNew={(name) => {
            void saveNew(name);
          }}
          onKeepChanges={(recipe) => {
            void keepChanges(recipe);
          }}
          onRestore={(recipe) => {
            void restore(recipe);
          }}
          renaming={renaming}
          onRename={(recipe, name) => {
            void rename(recipe, name);
          }}
          onRenameDone={() => setRenamingId(null)}
        />
      )}
      <p className="text-xs tabular-nums text-(--text-muted)">
        {t('mix.recipes.activeCount', { active, total: criteria.length })}
      </p>
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
    </InspectorSection>
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

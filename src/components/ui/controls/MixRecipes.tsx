// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowCounterClockwiseIcon,
  FloppyDiskIcon,
  PlusIcon,
} from '@phosphor-icons/react';
import {
  checkName,
  inputFieldClass,
  MAX_MIX_PRESETS,
  MAX_NAME_LENGTH,
  recipeLevels,
  uniqueName,
  type MixRecipe,
} from '@/utils';
import type { ScalarMixSettingKey } from '@/types';
import {
  InspectorActionRow,
  InspectorMenuButton,
} from '@/components/shell/InspectorPanel';

/**
 * The lesson above the criteria. A recipe sets all sixteen weights at once;
 * what it sets stays visible and changeable in the criteria below it, and the
 * moment one of them is moved the panel says so — "· geändert" after the
 * recipe it came from, or "eigene" — and offers to keep it (decision 0038).
 */

/**
 * A recipe's name and the line under it: a shipped one's in words, written
 * for it; an own or a changed one's from its weights, which no written line
 * could keep up with.
 */
export function useMixRecipeText() {
  const { t } = useTranslation('generator');
  return React.useMemo(() => {
    const criterionNames = (keys: ScalarMixSettingKey[]) =>
      keys.map((key) => t(`mix.criteria.${key}.label`)).join(', ');
    const describeWeights = (weights: MixRecipe['weights']) => {
      const levels = recipeLevels(weights);
      const parts = (['essential', 'important', 'consider'] as const)
        .filter((level) => levels[level].length > 0)
        .map(
          (level) =>
            `${t(`mix.importance.${level}`)}: ${criterionNames(levels[level])}`,
        );
      return parts.length > 0 ? parts.join(' · ') : t('mix.recipes.allOff');
    };
    return {
      label: (recipe: MixRecipe) =>
        recipe.builtin
          ? t(`mix.recipes.${recipe.builtin}.label`)
          : (recipe.name ?? ''),
      description: (recipe: MixRecipe) =>
        recipe.builtin && !recipe.changed
          ? t(`mix.recipes.${recipe.builtin}.desc`)
          : describeWeights(recipe.weights),
    };
  }, [t]);
}

/**
 * What the plan is being mixed for: one button the width of the inspector,
 * naming the recipe the weights match — "Klassenarbeit · geändert" once they
 * left it, or "Eigene Mischung" — that opens the recipes as a menu: the
 * shipped ones, a changed one marked "angepasst", and under a rule the
 * teacher's own with a pencil and a bin. The menu lies over the criteria, as
 * the student inspector's values do (`InspectorSelect`), instead of pushing
 * every one of them down.
 */
export function MixRecipePanel({
  recipes,
  activeId,
  base,
  onSelect,
  onRename,
  onDelete,
}: {
  recipes: readonly MixRecipe[];
  activeId: string | null;
  /** The recipe the weights were set from and have since left. */
  base?: MixRecipe;
  onSelect: (id: string) => void;
  onRename: (recipe: MixRecipe) => void;
  onDelete: (recipe: MixRecipe) => void;
}) {
  const { t } = useTranslation('generator');
  const text = useMixRecipeText();
  const title = t('mix.recipes.title');
  const active = recipes.find((recipe) => recipe.id === activeId);
  const shownLabel = active
    ? text.label(active)
    : base
      ? t('mix.recipes.changed', { name: text.label(base) })
      : t('mix.recipes.custom');
  const firstOwn = recipes.find((recipe) => !recipe.builtin);

  return (
    <InspectorMenuButton
      label={shownLabel}
      ariaLabel={`${title}: ${shownLabel}`}
      menuLabel={title}
      rows={recipes.map((recipe) => {
        const name = text.label(recipe);
        return {
          key: recipe.id,
          label: name,
          description: text.description(recipe),
          meta: recipe.changed ? t('mix.recipes.adjusted') : undefined,
          checked: recipe.id === activeId,
          separatorBefore: recipe === firstOwn,
          onSelect: () => onSelect(recipe.id),
          ...(!recipe.builtin && {
            rename: {
              label: t('mix.recipes.renameNamed', { name }),
              onSelect: () => onRename(recipe),
            },
            remove: {
              label: t('mix.recipes.deleteNamed', { name }),
              onSelect: () => onDelete(recipe),
            },
          }),
        };
      })}
    />
  );
}

/**
 * A preset's name in its own row: Enter keeps it, Escape drops it. A name
 * another preset carries — the shipped ones' included — is refused here, as a
 * room's is. A new preset is made only on purpose, so leaving the field drops
 * it; a rename is kept.
 */
function MixPresetNameRow({
  initialName,
  takenNames,
  renaming = false,
  onCommit,
  onDone,
}: {
  initialName: string;
  takenNames: readonly string[];
  renaming?: boolean;
  onCommit: (name: string) => void;
  onDone: () => void;
}) {
  const { t } = useTranslation('generator');
  const [draft, setDraft] = React.useState(initialName);
  const errorId = React.useId();
  const problem = checkName(draft, takenNames, MAX_NAME_LENGTH);
  const taken = problem === 'taken';

  const commit = () => {
    if (draft.trim() === '' || (renaming && draft.trim() === initialName)) {
      onDone();
      return;
    }
    if (problem) return;
    onCommit(draft.trim());
    onDone();
  };

  return (
    <div className="-mx-3 flex flex-col gap-1 px-3 py-1">
      <input
        type="text"
        value={draft}
        maxLength={MAX_NAME_LENGTH}
        autoFocus
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          if (renaming) commit();
          else onDone();
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commit();
          } else if (event.key === 'Escape') {
            // Only "not this name" — the canvas would take Escape as
            // clearing its selection.
            event.preventDefault();
            event.stopPropagation();
            onDone();
          }
        }}
        aria-label={t('mix.recipes.name')}
        aria-invalid={taken || undefined}
        aria-describedby={taken ? errorId : undefined}
        className={`${inputFieldClass} h-8 w-full py-0 text-sm`}
      />
      {taken && (
        <p id={errorId} className="text-xs text-(--status-alert-text)">
          {t('mix.recipes.nameTaken')}
        </p>
      )}
    </div>
  );
}

/**
 * What can be done with the preset under the button, only while it can:
 * after a recipe was left, keep the change in it — not in "Standard", the way
 * back — or as a new one; for a mix of one's own, keep it as a preset; for a
 * shipped preset the teacher changed, give it back its own weights.
 */
export function MixPresetActions({
  recipes,
  active,
  base,
  onSaveNew,
  onKeepChanges,
  onRestore,
  renaming,
  onRename,
  onRenameDone,
}: {
  recipes: readonly MixRecipe[];
  active?: MixRecipe;
  base?: MixRecipe;
  onSaveNew: (name: string) => void;
  onKeepChanges: (recipe: MixRecipe) => void;
  onRestore: (recipe: MixRecipe) => void;
  /** The own preset whose name is being changed from the menu's pencil. */
  renaming?: MixRecipe;
  onRename: (recipe: MixRecipe, name: string) => void;
  onRenameDone: () => void;
}) {
  const { t } = useTranslation('generator');
  const text = useMixRecipeText();
  const [naming, setNaming] = React.useState(false);
  const names = recipes.map((recipe) => text.label(recipe));
  const ownCount = recipes.filter((recipe) => !recipe.builtin).length;
  const full = ownCount >= MAX_MIX_PRESETS;
  const changedFrom = base && base.builtin !== 'standard' ? base : undefined;
  const canSave = !active;

  if (renaming) {
    const current = text.label(renaming);
    return (
      <MixPresetNameRow
        key={renaming.id}
        initialName={current}
        takenNames={names.filter((name) => name !== current)}
        renaming
        onCommit={(name) => onRename(renaming, name)}
        onDone={onRenameDone}
      />
    );
  }

  return (
    <>
      {changedFrom && (
        <InspectorActionRow
          icon={FloppyDiskIcon}
          label={t('mix.recipes.keepChanges', {
            name: text.label(changedFrom),
          })}
          onClick={() => onKeepChanges(changedFrom)}
        />
      )}
      {canSave && !full && (
        <InspectorActionRow
          icon={PlusIcon}
          label={
            changedFrom ? t('mix.recipes.saveAsNew') : t('mix.recipes.saveAs')
          }
          expanded={naming}
          onClick={() => setNaming((previous) => !previous)}
        />
      )}
      {canSave && full && (
        // Where the row would stand, so the teacher learns why it is not.
        <p className="text-xs text-(--text-muted)">
          {t('mix.recipes.limit', { count: MAX_MIX_PRESETS })}
        </p>
      )}
      {canSave && !full && naming && (
        <MixPresetNameRow
          initialName={uniqueName(
            changedFrom ? text.label(changedFrom) : t('mix.recipes.newName'),
            names,
            MAX_NAME_LENGTH,
          )}
          takenNames={names}
          onCommit={onSaveNew}
          onDone={() => setNaming(false)}
        />
      )}
      {active?.changed && (
        <InspectorActionRow
          icon={ArrowCounterClockwiseIcon}
          label={t('mix.recipes.restore')}
          onClick={() => onRestore(active)}
        />
      )}
    </>
  );
}

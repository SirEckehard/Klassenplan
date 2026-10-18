// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { MIX_RECIPES, type MixRecipeId } from '@/utils';
import { InspectorMenuButton } from '@/components/shell/InspectorPanel';

/**
 * The lesson above the criteria. A recipe sets all sixteen weights at once;
 * what it sets stays visible and changeable in the criteria below it, and the
 * moment one of them is moved the panel says so by naming the mix "eigene".
 */

/**
 * What the plan is being mixed for: one button the width of the inspector,
 * naming the recipe the weights match — or "Eigene Mischung" — that opens the
 * recipes as a menu. It used to fold the list out in place, which pushed every
 * criterion down by five recipes; the menu lies over them, as the student
 * inspector's values do (`InspectorSelect`).
 */
export function MixRecipePanel({
  activeId,
  onSelect,
}: {
  activeId: MixRecipeId | null;
  onSelect: (id: MixRecipeId) => void;
}) {
  const { t } = useTranslation('generator');
  const title = t('mix.recipes.title');
  const shownLabel = activeId
    ? t(`mix.recipes.${activeId}.label`)
    : t('mix.recipes.custom');

  return (
    <InspectorMenuButton
      label={shownLabel}
      ariaLabel={`${title}: ${shownLabel}`}
      menuLabel={title}
      rows={MIX_RECIPES.map((recipe) => ({
        key: recipe.id,
        label: t(`mix.recipes.${recipe.id}.label`),
        description: t(`mix.recipes.${recipe.id}.desc`),
        checked: recipe.id === activeId,
        onSelect: () => onSelect(recipe.id),
      }))}
    />
  );
}

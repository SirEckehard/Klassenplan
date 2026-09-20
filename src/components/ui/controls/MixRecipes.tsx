// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CaretDownIcon,
  CaretRightIcon,
  CheckIcon,
} from '@phosphor-icons/react';
import { MIX_RECIPES, type MixRecipeId } from '@/utils';

/**
 * The lesson above the criteria. A recipe sets all sixteen weights at once;
 * what it sets stays visible and changeable in the criteria below it, and the
 * moment one of them is moved the panel says so by naming the mix "eigene".
 */

/** The recipes as a list to choose from, in the panel and in the rail flyout. */
export function MixRecipeList({
  activeId,
  onSelect,
}: {
  activeId: MixRecipeId | null;
  onSelect: (id: MixRecipeId) => void;
}) {
  const { t } = useTranslation('generator');

  return (
    <div role="group" aria-label={t('mix.recipes.title')} className="space-y-1">
      {MIX_RECIPES.map((recipe) => {
        const isActive = recipe.id === activeId;
        return (
          <button
            key={recipe.id}
            type="button"
            onClick={() => onSelect(recipe.id)}
            aria-pressed={isActive}
            className={`flex w-full cursor-pointer items-start gap-2 rounded-md px-2 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary) ${
              isActive
                ? 'bg-(--surface-option-selected) text-(--text-badge)'
                : 'text-(--text-page) hover:bg-(--surface-sunken)'
            }`}
          >
            <span className="mt-0.5 size-4 shrink-0" aria-hidden="true">
              {isActive && <CheckIcon size={16} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium">
                {t(`mix.recipes.${recipe.id}.label`)}
              </span>
              <span className="block text-xs text-(--text-muted)">
                {t(`mix.recipes.${recipe.id}.desc`)}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * What the plan is being mixed for, and how much of the class's data is in
 * play — the one line above the criteria that says what all of them add up to.
 */
export function MixRecipePanel({
  activeId,
  activeCount,
  total,
  onSelect,
}: {
  activeId: MixRecipeId | null;
  /** Criteria carrying weight, of those this class has data for. */
  activeCount: number;
  total: number;
  onSelect: (id: MixRecipeId) => void;
}) {
  const { t } = useTranslation('generator');
  const [isOpen, setIsOpen] = React.useState(false);
  const Caret = isOpen ? CaretDownIcon : CaretRightIcon;

  return (
    <div className="px-2">
      <div className="px-1 pb-1 text-[10px] font-semibold tracking-wider text-(--text-muted) uppercase">
        {t('mix.recipes.title')}
      </div>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-(--border-card) bg-(--surface-card) px-3 py-2 text-left transition hover:border-(--border-option-hover) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary)"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-(--text-page)">
            {activeId
              ? t(`mix.recipes.${activeId}.label`)
              : t('mix.recipes.custom')}
          </span>
          <span className="block text-xs text-(--text-muted)">
            {t('mix.recipes.activeCount', { active: activeCount, total })}
          </span>
        </span>
        <Caret size={14} className="shrink-0 text-(--text-muted)" />
      </button>
      {isOpen && (
        <div className="mt-1">
          <MixRecipeList
            activeId={activeId}
            onSelect={(id) => {
              onSelect(id);
              setIsOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

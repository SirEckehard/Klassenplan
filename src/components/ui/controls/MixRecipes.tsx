// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { CaretDownIcon, CheckIcon } from '@phosphor-icons/react';
import { useClickOutside } from '@/hooks/ui/useClickOutside';
import { usePopoverFocus } from '@/hooks/ui/usePopoverFocus';
import {
  MIX_RECIPES,
  menuItemClass,
  menuSurfaceClass,
  type MixRecipeId,
} from '@/utils';
import FloatingDropdown from '@/components/students/FloatingDropdown';

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
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef<HTMLDivElement | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const outsideRefs = React.useMemo(() => [anchorRef, contentRef], []);
  const close = React.useCallback(() => setOpen(false), []);
  useClickOutside(outsideRefs, close, open);
  usePopoverFocus({
    open,
    contentRef,
    anchorRef: triggerRef,
    onClose: close,
    initialFocusSelector: '[aria-pressed="true"]',
  });

  const title = t('mix.recipes.title');
  const shownLabel = activeId
    ? t(`mix.recipes.${activeId}.label`)
    : t('mix.recipes.custom');

  const choose = (id: MixRecipeId) => {
    onSelect(id);
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className="relative" ref={anchorRef}>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setOpen((previous) => !previous)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${title}: ${shownLabel}`}
        className="flex min-h-7 w-full cursor-pointer items-center gap-2 rounded-md border border-(--border-card) bg-(--surface-card) px-2 py-1 text-left text-control text-(--text-page) transition hover:border-(--border-option-hover) pointer-coarse:min-h-11 pointer-coarse:px-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary)"
      >
        <span className="min-w-0 flex-1 truncate">{shownLabel}</span>
        <CaretDownIcon
          size={10}
          aria-hidden="true"
          className="shrink-0 text-(--text-muted)"
        />
      </button>

      {open && (
        <FloatingDropdown
          anchorRef={anchorRef}
          portalRef={contentRef}
          matchAnchorWidth
          className="z-50"
        >
          <div role="dialog" aria-label={title} className={menuSurfaceClass}>
            {MIX_RECIPES.map((recipe) => {
              const isActive = recipe.id === activeId;
              return (
                <button
                  key={recipe.id}
                  type="button"
                  className={menuItemClass}
                  onClick={() => choose(recipe.id)}
                  aria-pressed={isActive}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block">
                      {t(`mix.recipes.${recipe.id}.label`)}
                    </span>
                    <span className="block text-xs text-(--text-muted)">
                      {t(`mix.recipes.${recipe.id}.desc`)}
                    </span>
                  </span>
                  {isActive && (
                    <CheckIcon
                      size={14}
                      weight="bold"
                      aria-hidden="true"
                      className="shrink-0 text-(--button-primary-bg)"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </FloatingDropdown>
      )}
    </div>
  );
}

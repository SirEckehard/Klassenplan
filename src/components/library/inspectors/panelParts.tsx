// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { TrashIcon, type Icon } from '@phosphor-icons/react';
import {
  InspectorFooter,
  InspectorRow,
} from '@/components/shell/InspectorPanel';
import HintTooltip from '@/components/ui/feedback/HintTooltip';
import { dangerButtonClass, menuItemClass } from '@/utils';

/** A row that states a value: what it is on the left, the value on the right. */
export function ValueRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <InspectorRow label={label}>
      <span className="text-right text-[13px] tabular-nums text-(--text-muted)">
        {children}
      </span>
    </InspectorRow>
  );
}

/** Something the selected entry can do, as a row of a menu. */
export function ActionRow({
  icon: IconComponent,
  label,
  title,
  onClick,
}: {
  icon: Icon;
  label: string;
  title?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`${menuItemClass} -mx-3 pointer-coarse:min-h-11`}
    >
      <IconComponent
        size={16}
        aria-hidden="true"
        className="shrink-0 text-(--text-muted)"
      />
      {label}
    </button>
  );
}

/** What stands for an entry in the inspector's head: an icon on a tile. */
export function IconTile({ icon: IconComponent }: { icon: Icon }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-(--surface-sunken) text-(--text-muted)"
    >
      <IconComponent size={20} />
    </span>
  );
}

/**
 * The one destructive action, pinned to the inspector's foot. Where it cannot
 * be taken, it stays in its place and says why on hover and focus.
 */
export function DeleteFooter({
  label,
  onDelete,
  blockedHint,
}: {
  label: string;
  onDelete: () => void;
  blockedHint?: string | null;
}) {
  const hintId = React.useId();
  return (
    <InspectorFooter>
      <div className="group relative">
        <button
          type="button"
          onClick={blockedHint ? undefined : onDelete}
          aria-disabled={blockedHint ? true : undefined}
          aria-describedby={blockedHint ? hintId : undefined}
          className={`${dangerButtonClass} h-8 gap-2 px-3 text-xs ${
            blockedHint ? 'cursor-not-allowed opacity-60' : ''
          }`}
        >
          <TrashIcon size={14} aria-hidden="true" />
          {label}
        </button>
        {blockedHint && <HintTooltip id={hintId} hint={blockedHint} />}
      </div>
    </InspectorFooter>
  );
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import ToggleSwitch from '@/components/ui/controls/ToggleSwitch';
import MenuCheckRow from '@/components/ui/controls/MenuCheckRow';

type CanvasSettingsToggleOption = {
  kind?: 'toggle';
  id: string;
  label: string;
  icon: React.ReactNode;
  checked: boolean;
  onChange: (next: boolean) => void;
  description?: string;
  disabled?: boolean;
};

type CanvasSettingsSegmentChoice = {
  value: string;
  label: string;
  icon?: React.ReactNode;
};

/**
 * A setting with a handful of values, one of which is on — e.g. the
 * student-photo display mode. One row per value, the chosen one checked.
 */
type CanvasSettingsSegmentOption = {
  kind: 'segment';
  id: string;
  /** Optional heading above the values; omitted → no heading. */
  label?: string;
  /** Accessible name of the group when no visible heading is rendered. */
  ariaLabel?: string;
  icon?: React.ReactNode;
  value: string;
  choices: CanvasSettingsSegmentChoice[];
  onChange: (next: string) => void;
  description?: string;
  disabled?: boolean;
};

type CanvasSettingsCheckListItem = {
  id: string;
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
};

/**
 * Several switches that belong together, e.g. which room elements are shown:
 * one row per item, each an icon and a word, checked while it is on.
 */
type CanvasSettingsCheckListOption = {
  kind: 'checkList';
  id: string;
  /** Accessible name of the group. */
  label?: string;
  items: CanvasSettingsCheckListItem[];
};

type CanvasSettingsOption =
  | CanvasSettingsToggleOption
  | CanvasSettingsSegmentOption
  | CanvasSettingsCheckListOption;

/** Small switch rendered next to the group title, e.g. to toggle a whole group on/off. */
type CanvasSettingsHeaderToggle = {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
};

type CanvasSettingsGroup = {
  id: string;
  title?: string;
  headerToggle?: CanvasSettingsHeaderToggle;
  options: CanvasSettingsOption[];
  /** Read-only content under the rows, e.g. the key to what they switch. */
  footer?: React.ReactNode;
};

/**
 * The settings themselves, as the inside of a dropdown menu: one row per
 * setting, an icon and a word, checked while it is on.
 *
 * The workspace speaks in rows of icon and word, and so do the settings. What
 * holds the rows brings the menu surface; the room's and the plan's toolbars
 * both render this, so a new option appears in every place the settings are
 * reachable from.
 */
export function CanvasSettingsGroups({
  groups,
}: {
  groups: CanvasSettingsGroup[];
}) {
  return (
    // A menu, not a page: its words are not text to select, so they take the
    // arrow like the rest of the menu instead of the text cursor. The rows
    // themselves point (`menuItemClass`).
    <div className="flex cursor-default flex-col select-none">
      {groups
        .filter((group) => group.options.length > 0)
        .map((group, index) => (
          <div key={group.id} className="flex flex-col">
            {index > 0 && (
              <div
                className="my-1 h-px bg-(--border-card)"
                aria-hidden="true"
              />
            )}
            {group.title && (
              <div className="flex items-center justify-between gap-2 px-3 pt-2 pb-1">
                <span className={menuHeadingClass}>{group.title}</span>
                {group.headerToggle && (
                  <ToggleSwitch
                    size="sm"
                    checked={group.headerToggle.checked}
                    onChange={group.headerToggle.onChange}
                    label={group.headerToggle.label}
                    title={group.headerToggle.label}
                    disabled={group.headerToggle.disabled}
                  />
                )}
              </div>
            )}
            {group.options.map((option) =>
              option.kind === 'checkList' ? (
                <div key={option.id} role="group" aria-label={option.label}>
                  {option.items.map((item) => (
                    <MenuCheckRow
                      key={item.id}
                      icon={item.icon}
                      label={item.label}
                      checked={item.checked}
                      disabled={item.disabled}
                      onChange={item.onChange}
                    />
                  ))}
                </div>
              ) : option.kind === 'segment' ? (
                <SegmentSetting key={option.id} option={option} />
              ) : (
                <MenuCheckRow
                  key={option.id}
                  icon={option.icon}
                  label={option.label}
                  description={option.description}
                  checked={option.checked}
                  disabled={option.disabled}
                  onChange={option.onChange}
                />
              ),
            )}
            {group.footer}
          </div>
        ))}
    </div>
  );
}

/** The small caps above a group of rows, as in the header's own menus. */
export const menuHeadingClass =
  'text-caption font-semibold uppercase tracking-wider text-(--text-muted)';

/**
 * A setting with a handful of values as rows of the menu, the chosen one
 * checked (e.g. the student photos: on / on hover / off). The hint under them
 * previews what the choice does.
 */
function SegmentSetting({ option }: { option: CanvasSettingsSegmentOption }) {
  return (
    <div className="flex flex-col">
      {option.label && (
        <div className="px-3 pt-2 pb-1">
          <span className={menuHeadingClass}>{option.label}</span>
        </div>
      )}
      <div role="group" aria-label={option.label ?? option.ariaLabel}>
        {option.choices.map((choice) => {
          const active = choice.value === option.value;
          return (
            <MenuCheckRow
              key={choice.value}
              icon={choice.icon}
              label={choice.label}
              checked={active}
              disabled={option.disabled}
              // Pressing the value it already has keeps it: one of them is
              // always on.
              onChange={() => {
                if (!active) option.onChange(choice.value);
              }}
            />
          );
        })}
      </div>
      {option.description && (
        <p className="px-3 pt-1 pb-2 text-xs text-(--text-muted)">
          {option.description}
        </p>
      )}
    </div>
  );
}

export type {
  CanvasSettingsGroup,
  CanvasSettingsOption,
  CanvasSettingsSegmentOption,
  CanvasSettingsCheckListOption,
  CanvasSettingsCheckListItem,
};

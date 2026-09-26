// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { CheckIcon, SlidersHorizontalIcon } from '@phosphor-icons/react';
import { TOUR_ANCHORS } from '@/components/onboarding/tours';
import ToggleSwitch from '@/components/ui/controls/ToggleSwitch';
import { menuItemClass, menuSurfaceClass, mutedIconButtonClass } from '@/utils';
import { useClickOutside } from '@/hooks/ui/useClickOutside';

const PANEL_MARGIN = 12;
const DEFAULT_PANEL_WIDTH = 288;

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

interface CanvasSettingsButtonProps {
  groups: CanvasSettingsGroup[];
  buttonAriaLabel?: string;
  buttonTitle?: string;
}

export type CanvasSettingsButtonHandle = {
  close: () => void;
};

export const CanvasSettingsButton = React.forwardRef<
  CanvasSettingsButtonHandle,
  CanvasSettingsButtonProps
>(function CanvasSettingsButton(
  { groups, buttonAriaLabel = 'Ansichtseinstellungen', buttonTitle },
  ref,
) {
  const effectiveTitle = buttonTitle ?? buttonAriaLabel;
  const [open, setOpen] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement | null>(null);
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  const [panelPlacement, setPanelPlacement] = React.useState<'top' | 'bottom'>(
    'top',
  );
  const [panelMaxHeight, setPanelMaxHeight] = React.useState<string>();
  const [panelWidth, setPanelWidth] = React.useState(DEFAULT_PANEL_WIDTH);

  useClickOutside([buttonRef, panelRef], () => setOpen(false), open);
  React.useImperativeHandle(ref, () => ({
    close: () => setOpen(false),
  }));

  const hasOptions = React.useMemo(
    () => groups.some((group) => group.options.length > 0),
    [groups],
  );

  React.useEffect(() => {
    if (!open) {
      return;
    }

    const updatePanelLayout = () => {
      const buttonElement = buttonRef.current;
      const panelElement = panelRef.current;

      if (!buttonElement || !panelElement) {
        return;
      }

      const containerElement =
        (buttonElement.closest('.canvas-frame') as HTMLElement | null) ??
        (buttonElement.closest(
          '[data-canvas-container]',
        ) as HTMLElement | null);

      const referenceRect =
        containerElement?.getBoundingClientRect() ??
        document.documentElement.getBoundingClientRect();

      const buttonRect = buttonElement.getBoundingClientRect();

      const availableAbove = Math.max(
        buttonRect.top - referenceRect.top - PANEL_MARGIN,
        0,
      );
      const availableBelow = Math.max(
        referenceRect.bottom - buttonRect.bottom - PANEL_MARGIN,
        0,
      );
      const availableRight = Math.max(
        referenceRect.right - buttonRect.left - PANEL_MARGIN,
        0,
      );

      const desiredHeight = panelElement.scrollHeight;
      const fitsAbove = desiredHeight <= availableAbove;
      const fitsBelow = desiredHeight <= availableBelow;

      let nextPlacement: 'top' | 'bottom';
      if (fitsAbove && !fitsBelow) {
        nextPlacement = 'top';
      } else if (fitsBelow && !fitsAbove) {
        nextPlacement = 'bottom';
      } else if (fitsAbove && fitsBelow) {
        nextPlacement = availableAbove >= availableBelow ? 'top' : 'bottom';
      } else {
        nextPlacement = availableBelow >= availableAbove ? 'bottom' : 'top';
      }

      const nextMaxHeight =
        nextPlacement === 'top' ? availableAbove : availableBelow;
      const nextWidth = Math.min(DEFAULT_PANEL_WIDTH, availableRight);

      setPanelPlacement((prev) =>
        prev === nextPlacement ? prev : nextPlacement,
      );
      setPanelMaxHeight(nextMaxHeight > 0 ? `${nextMaxHeight}px` : undefined);
      setPanelWidth(nextWidth > 0 ? nextWidth : DEFAULT_PANEL_WIDTH);
    };

    updatePanelLayout();
    window.addEventListener('resize', updatePanelLayout);

    return () => {
      window.removeEventListener('resize', updatePanelLayout);
    };
  }, [open, groups]);

  if (!hasOptions) {
    return null;
  }

  const panelPositionClass =
    panelPlacement === 'top'
      ? 'bottom-full mb-3 origin-bottom'
      : 'top-full mt-3 origin-top';

  return (
    <div className="absolute bottom-3 left-3 z-30">
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className={`${mutedIconButtonClass} h-12 w-12 text-(--text-muted) transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary)`}
          aria-label={buttonAriaLabel}
          title={effectiveTitle}
          aria-haspopup="true"
          aria-expanded={open}
          data-tour={TOUR_ANCHORS.canvasSettings}
        >
          <SlidersHorizontalIcon size={16} />
        </button>

        {open && (
          <div
            ref={panelRef}
            className={`${menuSurfaceClass} absolute left-0 ${panelPositionClass} max-w-sm overflow-y-auto p-1`}
            style={{
              maxHeight: panelMaxHeight,
              width: `${panelWidth}px`,
            }}
          >
            <CanvasSettingsGroups groups={groups} />
          </div>
        )}
      </div>
    </div>
  );
});

/**
 * The settings themselves, as the inside of a dropdown menu: one row per
 * setting, an icon and a word, checked while it is on.
 *
 * They used to be a card of their own — a coloured heading, switches in
 * bordered tiles, a grid of bare icons whose meaning lived in their tooltips.
 * Next to a workspace that otherwise speaks in rows of icon and word, that read
 * like a second application. What holds the rows brings the menu surface; the
 * layer toolbars and the export page's canvas button both render this, so a new
 * option appears in every place the settings are reachable from.
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
                    <CheckRow
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
                <CheckRow
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
  'text-[11px] font-semibold uppercase tracking-wider text-(--text-muted)';

/**
 * One row of the menu: its icon, its word and — while it is on — a check. The
 * row itself is the switch, pressed or not; the check says the same thing
 * without colour.
 */
function CheckRow({
  icon,
  label,
  description,
  checked,
  disabled = false,
  onChange,
}: {
  icon?: React.ReactNode;
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={menuItemClass}
    >
      {icon && (
        <span
          aria-hidden="true"
          className={`inline-flex size-4.5 shrink-0 items-center justify-center ${
            checked ? 'text-(--text-page)' : 'text-(--text-muted)'
          }`}
        >
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block">{label}</span>
        {description && (
          <span className="block text-xs text-(--text-muted)">
            {description}
          </span>
        )}
      </span>
      <CheckIcon
        size={16}
        aria-hidden="true"
        className={`shrink-0 text-(--text-badge) ${checked ? '' : 'invisible'}`}
      />
    </button>
  );
}

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
            <CheckRow
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

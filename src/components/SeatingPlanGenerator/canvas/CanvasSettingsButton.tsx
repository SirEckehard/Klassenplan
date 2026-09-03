// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { SlidersHorizontalIcon } from '@phosphor-icons/react';
import SettingToggle from '@/components/ui/controls/SettingToggle';
import ToggleSwitch from '@/components/ui/controls/ToggleSwitch';
import { cardSurfaceClass, mutedIconButtonClass } from '@/utils';
import { useClickOutside } from '@/hooks/ui/useClickOutside';

const PANEL_MARGIN = 12;
const DEFAULT_PANEL_WIDTH = 256;

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

/** A multi-state (segmented) setting, e.g. the student-photo display mode. */
type CanvasSettingsSegmentOption = {
  kind: 'segment';
  id: string;
  /** Optional row heading above the segmented control; omitted → no heading. */
  label?: string;
  /** Accessible name of the control when no visible heading is rendered. */
  ariaLabel?: string;
  icon?: React.ReactNode;
  value: string;
  choices: CanvasSettingsSegmentChoice[];
  onChange: (next: string) => void;
  description?: string;
  disabled?: boolean;
  /**
   * Renders the choices as icon-only buttons carrying their label as tooltip
   * and accessible name. For labels too long to fit three across the panel.
   */
  iconOnly?: boolean;
};

type CanvasSettingsIconGridItem = {
  id: string;
  icon: React.ReactNode;
  /** Accessible name and tooltip of the chip. */
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
};

/**
 * A compact grid of icon-only toggle chips, e.g. the per-type room-element
 * visibility. Saves vertical space compared to one toggle row per item.
 */
type CanvasSettingsIconGridOption = {
  kind: 'iconGrid';
  id: string;
  /** Accessible name of the chip group. */
  label?: string;
  items: CanvasSettingsIconGridItem[];
};

type CanvasSettingsOption =
  | CanvasSettingsToggleOption
  | CanvasSettingsSegmentOption
  | CanvasSettingsIconGridOption;

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
          className={`${mutedIconButtonClass} h-12 w-12 text-gray-700 transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-gray-100`}
          aria-label={buttonAriaLabel}
          title={effectiveTitle}
          aria-haspopup="true"
          aria-expanded={open}
        >
          <SlidersHorizontalIcon size={16} />
        </button>

        {open && (
          <div
            ref={panelRef}
            className={`${cardSurfaceClass} absolute left-0 ${panelPositionClass} max-w-sm overflow-y-auto rounded-2xl border border-blue-100 bg-white/95 p-4 shadow-xl backdrop-blur-sm dark:border-blue-900/50 dark:bg-gray-900/95`}
            style={{
              maxHeight: panelMaxHeight,
              width: `${panelWidth}px`,
            }}
          >
            <div className="space-y-4 pr-1">
              {groups
                .filter((group) => group.options.length > 0)
                .map((group) => (
                  <div key={group.id} className="space-y-2">
                    {group.title && (
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-300">
                          {group.title}
                        </p>
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
                    <div className="space-y-2">
                      {group.options.map((option) =>
                        option.kind === 'iconGrid' ? (
                          <IconGridSetting key={option.id} option={option} />
                        ) : option.kind === 'segment' ? (
                          <SegmentSetting key={option.id} option={option} />
                        ) : (
                          <SettingToggle
                            key={option.id}
                            icon={option.icon}
                            label={option.label}
                            description={option.description}
                            checked={option.checked}
                            onChange={(checked) => option.onChange(checked)}
                            hideCheckboxIndicator
                            disabled={option.disabled}
                          />
                        ),
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

/**
 * Renders a multi-state setting as a labelled row with a segmented control
 * underneath (used for the student-photo display mode: all / hover / off).
 */
function SegmentSetting({ option }: { option: CanvasSettingsSegmentOption }) {
  return (
    <div className="space-y-2">
      {option.label && (
        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-100">
          <span className="text-gray-500 dark:text-gray-300">
            {option.icon}
          </span>
          <span className="font-medium">{option.label}</span>
        </div>
      )}
      <div
        role="group"
        aria-label={option.label ?? option.ariaLabel}
        className="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-gray-800"
      >
        {option.choices.map((choice) => {
          const active = choice.value === option.value;
          return (
            <button
              key={choice.value}
              type="button"
              disabled={option.disabled}
              aria-pressed={active}
              aria-label={option.iconOnly ? choice.label : undefined}
              title={option.iconOnly ? choice.label : undefined}
              onClick={() => option.onChange(choice.value)}
              className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-center text-xs font-medium leading-tight transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 ${
                active
                  ? 'bg-white text-blue-700 shadow-sm dark:bg-gray-900 dark:text-blue-200'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
              }`}
            >
              {choice.icon}
              {!option.iconOnly && <span>{choice.label}</span>}
            </button>
          );
        })}
      </div>
      {option.description && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {option.description}
        </p>
      )}
    </div>
  );
}

/**
 * Renders icon-only toggle chips in a wrapping row. Active chips are colored,
 * inactive chips grayed out; each chip carries its label as tooltip and
 * accessible name.
 */
function IconGridSetting({ option }: { option: CanvasSettingsIconGridOption }) {
  return (
    <div
      role="group"
      aria-label={option.label}
      className="flex flex-wrap gap-1.5"
    >
      {option.items.map((item) => (
        <button
          key={item.id}
          type="button"
          disabled={item.disabled}
          aria-pressed={item.checked}
          aria-label={item.label}
          title={item.label}
          onClick={() => item.onChange(!item.checked)}
          className={`flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40 ${
            item.checked
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200'
              : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:bg-gray-800 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300'
          }`}
        >
          {item.icon}
        </button>
      ))}
    </div>
  );
}

export type {
  CanvasSettingsGroup,
  CanvasSettingsOption,
  CanvasSettingsSegmentOption,
  CanvasSettingsIconGridOption,
  CanvasSettingsIconGridItem,
};

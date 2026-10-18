// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CaretDownIcon,
  CheckIcon,
  MinusIcon,
  PencilLineIcon,
  TrashIcon,
  type Icon,
} from '@phosphor-icons/react';
import HintTooltip from '@/components/ui/feedback/HintTooltip';
import { LocalizedLink } from '@/components/LocalizedLink';
import FloatingDropdown from '@/components/students/FloatingDropdown';
import { useClickOutside } from '@/hooks/ui/useClickOutside';
import { usePopoverFocus } from '@/hooks/ui/usePopoverFocus';
import {
  dangerButtonClass,
  dataFamilyClass,
  dataHeadingClass,
  menuItemClass,
  menuSurfaceClass,
  quietDangerIconButtonClass,
  quietIconButtonClass,
} from '@/utils';

/**
 * The three parts every inspector is built from, so a student, a table and a
 * window are read the same way.
 *
 * The panel is a wall, not a stack of cards: one strip at the top saying what
 * is selected, sections below it divided by hairlines rather than by gaps, and
 * — where there is one — the destructive action pinned to the bottom. A layer
 * fills them; none of them invents a frame of its own.
 */

/** What is selected: a face or a glyph, its name, and where it sits. */
export function InspectorHeader({
  media,
  title,
  subtitle,
  actions,
}: {
  /** Avatar, swatch or icon — whatever stands for the thing. */
  media?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Stepping through the selection, at the far end of the strip. */
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-(--border-card) px-4 py-3">
      {media}
      {/* Takes the width between the media and the actions: a title that is
          a field — the student's name — has to fit whole, not be cut off by
          the heading's truncation. */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {/* A heading, so the panel has a place in the document outline and a
            test can ask for what is selected by name. It wraps rather than
            truncates: a student's name cut to "Lina Schneid…" names nobody. */}
        <h2 className="min-w-0 wrap-break-word text-[1.0625rem] font-semibold text-(--text-page)">
          {title}
        </h2>
        {subtitle && (
          <span className="text-xs tabular-nums text-(--text-muted)">
            {subtitle}
          </span>
        )}
      </div>
      {actions && (
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {actions}
        </div>
      )}
    </div>
  );
}

/**
 * What stands for the selected thing in the header where it has no photo of
 * its own: a tile the size of a student's photo with an icon — a class, a
 * mix, a room element — or a shape such as a table's.
 */
export function InspectorMediaTile({
  icon: IconComponent,
  children,
}: {
  icon?: Icon;
  children?: React.ReactNode;
}) {
  return (
    <span
      aria-hidden="true"
      className="flex size-11 shrink-0 items-center justify-center rounded-md bg-(--surface-sunken) text-(--text-muted)"
    >
      {IconComponent ? <IconComponent size={20} /> : children}
    </span>
  );
}

/** Everything between the header and the footer, scrolling on its own. */
export function InspectorBody({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-3">
      {children}
    </div>
  );
}

/**
 * One group of controls under the family it belongs to. `first:` keeps the
 * dividing line off the top of the panel, the same way the toolbar does it.
 */
export function InspectorSection({
  family,
  title,
  tourAnchor,
  actions,
  children,
}: {
  /** Pedagogical family the group speaks for; neutral where it has none. */
  family?: keyof typeof dataFamilyClass;
  title: string;
  /** The coach mark that points at this group, if one does. */
  tourAnchor?: string;
  /**
   * What acts on every row of the group at once — a switch for all of them —
   * beside the heading, as the criteria's switch sits beside the panel's.
   */
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const heading = (
    <h3
      className={`${dataHeadingClass} ${family ? dataFamilyClass[family] : 'text-(--text-muted)'}`}
    >
      {title}
    </h3>
  );
  return (
    <section
      data-tour={tourAnchor}
      className="flex flex-col gap-2 border-t border-(--border-card) pt-3 pb-3 first:border-t-0 first:pt-0 last:pb-0"
    >
      {actions ? (
        <div className="flex items-center justify-between gap-2">
          {heading}
          {actions}
        </div>
      ) : (
        heading
      )}
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

/**
 * The symbol an attribute wears on a seat, in its family's ink, beside the
 * control that sets it — so the icon on the plan is one the teacher has
 * already seen next to its word. Without a family it is grey: a switch of the
 * room or the sheet, which describes no pedagogy, still wears an icon, as
 * every switch row does.
 */
export function InspectorIcon({
  icon: IconComponent,
  family,
  muted = false,
}: {
  icon: Icon;
  family?: keyof typeof dataFamilyClass;
  /** Grey instead of the family's ink — a criterion that is switched off. */
  muted?: boolean;
}) {
  return (
    <IconComponent
      size={14}
      aria-hidden="true"
      className={
        muted || !family
          ? 'shrink-0 text-(--text-muted)'
          : `${dataFamilyClass[family]} shrink-0 text-(--data-chip-text)`
      }
    />
  );
}

/**
 * One setting: what it is on the left, what it is set to on the right.
 *
 * The inspector used to stack 44px icon tiles with a word underneath, which
 * said what an attribute is but never what it is set to without reading the
 * colour. A row states both, and eleven of them read as one list.
 */
export function InspectorRow({
  label,
  hint,
  icon,
  description,
  labelsControl = false,
  stacked = false,
  children,
}: {
  label: string;
  /**
   * The icon before the name: an attribute's badge icon (`InspectorIcon`),
   * or a neutral one for a switch that is not about pedagogy.
   */
  icon?: React.ReactNode;
  /** A word on what the setting does, where the label cannot carry it. */
  hint?: string;
  /**
   * What the setting does, in a sentence under its name — on the name's edge,
   * past the icon. Outside a `labelsControl` row's label, so a tap on the
   * sentence does not flip the switch.
   */
  description?: React.ReactNode;
  /**
   * The row holds a single switch, and the whole row is its label: a tap on
   * the name operates it as well. On a touch screen that makes the row the
   * target, 44px tall, where the switch alone is 28×16px — never set it on a
   * row of chips, whose first chip the label would press.
   */
  labelsControl?: boolean;
  /**
   * The name above the value, the value the row's full width: for a choice
   * among more options than fit beside a name (`InspectorChoice` as a list).
   */
  stacked?: boolean;
  children: React.ReactNode;
}) {
  // Every row is as tall as the controls in it — a switch, a row of chips,
  // a button that opens a menu — so the rows of a panel stand at one pitch
  // whatever they hold: 28px under a mouse, 44px where a finger taps.
  const rowClass = stacked
    ? 'flex w-full flex-col gap-1.5'
    : 'flex min-h-7 w-full flex-wrap items-center justify-between gap-x-3 gap-y-1.5 pointer-coarse:min-h-11';
  const content = (
    <>
      <span
        className="flex min-w-0 items-center gap-2 text-control text-(--text-page)"
        title={hint}
      >
        {icon}
        {label}
      </span>
      <span
        className={
          stacked ? 'flex w-full' : 'flex flex-wrap items-center gap-1'
        }
      >
        {children}
      </span>
    </>
  );
  const row = labelsControl ? (
    <label className={`${rowClass} cursor-pointer`}>{content}</label>
  ) : (
    <div className={rowClass}>{content}</div>
  );
  if (!description) return row;
  return (
    <div className="flex flex-col">
      {row}
      {/* On the name's edge: the icon's 14px and the row's gap. */}
      <p className={`text-xs text-(--text-muted) ${icon ? 'pl-5.5' : ''}`}>
        {description}
      </p>
    </div>
  );
}

/**
 * The value of a setting with a handful of options: as chips beside the name
 * where three short words fit, as a list under it where more do not — a run
 * of chips wrapping onto a second line reads as a scatter, not as a scale.
 */
export function InspectorChoice<T extends string>({
  value,
  options,
  onChange,
  label,
  mixedValues,
  layout = 'chips',
}: {
  value: T | undefined;
  options: ReadonlyArray<{
    value: T;
    label: string;
    title?: string;
    icon?: React.ReactNode;
    /**
     * Colours the chip takes while it is pressed, in place of the selection
     * blue — for a value the plan itself draws in a colour of its own.
     */
    tint?: { fill: string; stroke: string };
  }>;
  onChange: (value: T | undefined) => void;
  /** Names the group for a screen reader; the row's label repeats it on screen. */
  label: string;
  /**
   * Several students who do not agree: the values some of them have. Those
   * chips are outlined in dashes and announced as half pressed — otherwise a
   * mixed selection looks exactly like one where nothing is set. Pressing one
   * sets it for all, as pressing any other chip does.
   */
  mixedValues?: ReadonlySet<string>;
  /** `list` stacks the options as rows, for a row set `stacked`. */
  layout?: 'chips' | 'list';
}) {
  const { t } = useTranslation('students');
  if (layout === 'list') {
    return (
      <span
        role="group"
        aria-label={label}
        className="flex w-full flex-col divide-y divide-(--border-card) overflow-hidden rounded-md border border-(--border-card) bg-(--surface-card)"
      >
        {options.map((option) => {
          const isActive = value === option.value;
          const isMixed =
            !isActive && (mixedValues?.has(option.value) ?? false);
          const title = option.title ?? option.label;
          return (
            <button
              key={option.value}
              type="button"
              // Pressing the value it already has clears it, as with a chip.
              onClick={() => onChange(isActive ? undefined : option.value)}
              aria-pressed={isActive ? true : isMixed ? 'mixed' : false}
              title={
                isMixed ? t('bulkEdit.choiceMixed', { label: title }) : title
              }
              className={`flex w-full cursor-pointer items-center gap-2 px-2.5 py-1.5 text-left text-control transition pointer-coarse:min-h-11 focus-visible:relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--focus-ring-primary) ${
                isActive
                  ? 'bg-(--surface-option-selected) font-medium text-(--text-page)'
                  : 'text-(--text-page) hover:bg-(--surface-sunken)'
              }`}
            >
              {option.icon}
              <span className="min-w-0 flex-1">{option.label}</span>
              {isActive && (
                <CheckIcon
                  size={14}
                  weight="bold"
                  aria-hidden="true"
                  className="shrink-0 text-(--button-primary-bg)"
                />
              )}
              {/* Some of the selection have it: a dash where the check of
                  "all of them" would stand. */}
              {isMixed && (
                <MinusIcon
                  size={14}
                  weight="bold"
                  aria-hidden="true"
                  className="shrink-0 text-(--text-muted)"
                />
              )}
            </button>
          );
        })}
      </span>
    );
  }
  return (
    <span role="group" aria-label={label} className="flex flex-wrap gap-1">
      {options.map((option) => {
        const isActive = value === option.value;
        const isMixed = !isActive && (mixedValues?.has(option.value) ?? false);
        const title = option.title ?? option.label;
        return (
          <button
            key={option.value}
            type="button"
            // Pressing the value it already has clears it: "not decided" has
            // to stay reachable, or every student ends up with an opinion.
            onClick={() => onChange(isActive ? undefined : option.value)}
            aria-pressed={isActive ? true : isMixed ? 'mixed' : false}
            title={
              isMixed ? t('bulkEdit.choiceMixed', { label: title }) : title
            }
            style={
              isActive && option.tint
                ? {
                    backgroundColor: option.tint.fill,
                    borderColor: option.tint.stroke,
                  }
                : undefined
            }
            // A fingertip needs 44px; with the mouse the chips stay compact.
            // The same height and padding as the buttons that open a menu
            // (`familyValueControl`), so chips and menus line up.
            className={`inline-flex min-h-7 cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-xs transition pointer-coarse:min-h-11 pointer-coarse:px-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary) ${
              isActive && option.tint
                ? 'font-medium text-(--text-page)'
                : isActive
                  ? 'border-(--border-option-selected) bg-(--surface-option-selected) text-(--text-badge)'
                  : isMixed
                    ? 'border-dashed border-(--border-option-selected) bg-(--surface-card) text-(--text-page) hover:bg-(--surface-option-selected)'
                    : 'border-(--border-card) bg-(--surface-card) text-(--text-muted) hover:border-(--border-option-hover)'
            }`}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </span>
  );
}

/** The bottom strip: what acts on the whole selection, destructive last. */
function InspectorFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex shrink-0 items-center justify-end gap-2 border-t border-(--border-card) px-4 py-3">
      {children}
    </div>
  );
}

/**
 * Something the selection can do — duplicate, copy, keep as a template — as
 * a row of a menu: an icon and a word. Actions are not settings, so they are
 * not `InspectorRow`s; the row carries its own padding, as in a menu, and
 * stands out of the section by as much, so its icon lines up with the
 * section's heading.
 */
export function InspectorActionRow({
  icon: IconComponent,
  label,
  title,
  onClick,
  to,
  expanded,
  disabled = false,
}: {
  icon: Icon;
  label: string;
  /** Tooltip — the keyboard shortcut, where there is one. */
  title?: string;
  onClick?: () => void;
  /** Whether what the row unfolds below it is open. */
  expanded?: boolean;
  /** Nothing to act on yet — a plan with nobody seated. */
  disabled?: boolean;
  /** A page to go to instead — the row is then a link. */
  to?: string;
}) {
  const content = (
    <>
      <IconComponent
        size={16}
        aria-hidden="true"
        className="shrink-0 text-(--text-muted)"
      />
      {label}
    </>
  );
  const className = `${menuItemClass} pointer-coarse:min-h-11`;
  // The wrapper stands out of the section on both sides and the row fills
  // it: on the row itself, the negative margin only shifted a box that is
  // `menu-item`'s full width, so its hover fill hung out on the left and
  // stopped short on the right.
  return (
    <div className="-mx-3 flex flex-col">
      {to ? (
        <LocalizedLink to={to} title={title ?? label} className={className}>
          {content}
        </LocalizedLink>
      ) : (
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          title={title ?? label}
          aria-expanded={expanded}
          className={className}
        >
          {content}
        </button>
      )}
    </div>
  );
}

/**
 * The one destructive action, pinned to the inspector's foot — a student, a
 * table, a plan alike. Where it cannot be taken, it stays in its place and
 * says why on hover and focus.
 */
export function InspectorDeleteFooter({
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

/** One row of an {@link InspectorMenuButton}'s menu. */
export type InspectorMenuRow = {
  key: string;
  label: string;
  /** A line under the label: what a recipe is for. */
  description?: string;
  /** A shape or an icon before the label. */
  icon?: React.ReactNode;
  /** A number at the row's end: how many tables a kind of table takes. */
  meta?: string;
  /**
   * The row is what is chosen now — the open room, the recipe the weights
   * match — and wears a check. Leave it out on a menu of actions, whose rows
   * then announce no pressed state at all.
   */
  checked?: boolean;
  onSelect: () => void;
  /**
   * Renaming the entry, as a pencil beside it — as the header's class menu
   * offers it. Choosing it closes the menu; the name is typed in the panel.
   */
  rename?: { label: string; onSelect: () => void };
  /**
   * Removing the entry, as a bin beside it. `blockedHint` keeps the bin in
   * its place but says why it cannot be used — the open room.
   */
  remove?: { label: string; onSelect: () => void; blockedHint?: string };
};

/**
 * A choice among several that would take a column of rows if they stood in
 * the panel — the recipe, the open room, a kind of table, a template — as one
 * button the inspector's width that opens them as a menu over the panel. The
 * button names what is chosen, or what the menu is for; choosing a row closes
 * the menu with the focus back on the button. Shaped as the header's class
 * menu: `action` — "Neuer Raum" — leads above a hairline, and a row may carry
 * a pencil and a bin beside it (`rename`, `remove`).
 */
export function InspectorMenuButton({
  label,
  ariaLabel,
  menuLabel,
  rows,
  action,
  focusRequest = 0,
  describedBy,
}: {
  /** The word on the button. */
  label: string;
  /** The button's accessible name, where the word alone does not say enough. */
  ariaLabel?: string;
  /** Names the menu for a screen reader. */
  menuLabel: string;
  rows: readonly InspectorMenuRow[];
  action?: { label: string; icon: Icon; onSelect: () => void };
  /** Counts up whenever the focus is asked onto the button (Ctrl/⌘+E). */
  focusRequest?: number;
  /** The id of a hint under the button that says what choosing does. */
  describedBy?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef<HTMLDivElement | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const outsideRefs = React.useMemo(() => [anchorRef, contentRef], []);
  const close = React.useCallback(() => setOpen(false), []);
  useClickOutside(outsideRefs, close, open);
  // Portalled to the end of the page: the focus moves in onto the row that
  // is chosen, the arrow keys step through the rows, Escape closes the menu
  // with the focus back on the button.
  usePopoverFocus({
    open,
    contentRef,
    anchorRef: triggerRef,
    onClose: close,
    initialFocusSelector: '[aria-pressed="true"]',
  });

  React.useEffect(() => {
    if (focusRequest === 0) return undefined;
    // A frame later, so a drawer that opened for it has taken the focus for
    // itself first and this lands inside it.
    const frame = requestAnimationFrame(() => triggerRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [focusRequest]);

  const choose = (onSelect: () => void) => {
    setOpen(false);
    triggerRef.current?.focus();
    onSelect();
  };

  return (
    <div className="relative" ref={anchorRef}>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setOpen((previous) => !previous)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        className="flex min-h-7 w-full cursor-pointer items-center gap-2 rounded-md border border-(--border-card) bg-(--surface-card) px-2 py-1 text-left text-control text-(--text-page) transition hover:border-(--border-option-hover) pointer-coarse:min-h-11 pointer-coarse:px-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary)"
      >
        <span className="min-w-0 flex-1 truncate">{label}</span>
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
          <div
            role="dialog"
            aria-label={menuLabel}
            className={menuSurfaceClass}
          >
            {action && (
              <>
                <button
                  type="button"
                  className={menuItemClass}
                  onClick={() => {
                    setOpen(false);
                    action.onSelect();
                  }}
                >
                  <action.icon
                    size={16}
                    aria-hidden="true"
                    className="shrink-0 text-(--text-muted)"
                  />
                  <span className="min-w-0 flex-1">{action.label}</span>
                </button>
                <div
                  aria-hidden="true"
                  className="my-1 h-px bg-(--border-card)"
                />
              </>
            )}
            {rows.map((row) => {
              const main = (
                <button
                  type="button"
                  className={
                    row.rename || row.remove
                      ? `${menuItemClass} min-w-0 flex-1`
                      : menuItemClass
                  }
                  onClick={() => choose(row.onSelect)}
                  aria-pressed={row.checked}
                >
                  {row.icon && (
                    <span aria-hidden="true" className="flex shrink-0">
                      {row.icon}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{row.label}</span>
                    {row.description && (
                      <span className="block text-xs text-(--text-muted)">
                        {row.description}
                      </span>
                    )}
                  </span>
                  {row.meta && (
                    <span className="shrink-0 text-xs tabular-nums text-(--text-muted)">
                      {row.meta}
                    </span>
                  )}
                  {row.checked !== undefined && (
                    // Kept invisible on the other rows, so the names and the
                    // icons beside them line up.
                    <CheckIcon
                      size={14}
                      weight="bold"
                      aria-hidden="true"
                      className={`shrink-0 text-(--button-primary-bg) ${
                        row.checked ? '' : 'invisible'
                      }`}
                    />
                  )}
                </button>
              );
              if (!row.rename && !row.remove) {
                return <React.Fragment key={row.key}>{main}</React.Fragment>;
              }
              const { rename, remove } = row;
              return (
                <div key={row.key} className="flex items-center gap-1">
                  {main}
                  {rename && (
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        rename.onSelect();
                      }}
                      title={rename.label}
                      aria-label={rename.label}
                      className={`${quietIconButtonClass} h-9 w-9 shrink-0`}
                    >
                      <PencilLineIcon className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                  {remove && (
                    <button
                      type="button"
                      onClick={() => {
                        if (remove.blockedHint) return;
                        setOpen(false);
                        remove.onSelect();
                      }}
                      aria-disabled={remove.blockedHint ? true : undefined}
                      title={remove.blockedHint ?? remove.label}
                      aria-label={remove.label}
                      className={`${quietDangerIconButtonClass} h-9 w-9 shrink-0 ${
                        remove.blockedHint
                          ? 'cursor-not-allowed opacity-40'
                          : ''
                      }`}
                    >
                      <TrashIcon className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </FloatingDropdown>
      )}
    </div>
  );
}

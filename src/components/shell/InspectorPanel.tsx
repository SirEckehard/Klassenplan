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
import InlineQuestion from '@/components/ui/modals/InlineQuestion';
import type { DeleteQuestion } from '@/components/ui/modals/InlineQuestion';
import { useRefusalHint } from '@/hooks/ui/useRefusalHint';
import { LocalizedLink } from '@/components/LocalizedLink';
import FloatingDropdown from '@/components/students/FloatingDropdown';
import { useClickOutside } from '@/hooks/ui/useClickOutside';
import { usePopoverFocus } from '@/hooks/ui/usePopoverFocus';
import {
  dangerButtonClass,
  dataFamilyClass,
  dataHeadingClass,
  inspectorTitleTextClass,
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

/**
 * One fact in the line under an inspector's title: a small icon and its
 * words, as the plan's heading says "✓ Heute gespeichert · ⌂ Raum".
 */
export interface InspectorMetaItem {
  /** An icon, or a mark of its own — the plan's check, dot or ring. */
  icon: Icon | React.ReactElement;
  label: React.ReactNode;
  /**
   * What the icon says that the words do not, for a screen reader alone —
   * "Raum:" before a room's bare name.
   */
  srLabel?: string;
}

/**
 * At most two facts: the line stays one line in the column and says what the
 * selection is, where it stands or how it stands — the rest is the body's.
 */
export type InspectorMeta = readonly [
  InspectorMetaItem,
  (InspectorMetaItem | false | null | undefined)?,
];

/**
 * A title that cannot be renamed — a table's kind, a mix's date — in the box
 * a renamable one is pressed in, without its frame, so every title starts at
 * one place and stands at one height.
 */
const staticTitleClass = 'block border border-transparent px-3 py-1';

/**
 * What is selected, in one shape for every inspector: a 44px tile or a face,
 * the name, and a line of at most two facts with an icon each, whose words
 * line up with the title's.
 */
export function InspectorHeader({
  media,
  title,
  meta,
  actions,
}: {
  /** The thing's tile (`InspectorMediaTile`) or a student's photo. */
  media: React.ReactNode;
  /** A name as text, or the field it is renamed in. */
  title: React.ReactNode;
  meta: InspectorMeta;
  /**
   * At the far end of the strip, within its height: closing the panel, the
   * student's arrows through the class.
   */
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
        <h2
          className={`min-w-0 wrap-break-word text-(--text-page) ${inspectorTitleTextClass}`}
        >
          {typeof title === 'string' ? (
            <span className={staticTitleClass}>{title}</span>
          ) : (
            title
          )}
        </h2>
        {/* Inset by the title box's padding and border, so its words start
            where the title's do. Two facts side by side, each kept whole
            where they wrap. */}
        <div className="flex min-h-5 flex-wrap items-center gap-x-3 gap-y-0.5 pl-3.25 text-xs tabular-nums text-(--text-muted)">
          {meta.map(
            (item, index) =>
              item && <InspectorMetaFact key={index} item={item} />,
          )}
        </div>
      </div>
      {actions && (
        <div className="ml-auto flex shrink-0 items-center gap-1">
          {actions}
        </div>
      )}
    </div>
  );
}

function InspectorMetaFact({ item }: { item: InspectorMetaItem }) {
  const { icon: ItemIcon, label, srLabel } = item;
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      {React.isValidElement(ItemIcon) ? (
        ItemIcon
      ) : (
        <ItemIcon size={12} aria-hidden="true" className="shrink-0" />
      )}
      {srLabel && <span className="sr-only">{srLabel}</span>}
      <span className="truncate">{label}</span>
    </span>
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
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 py-3">
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
 * A row states what an attribute is and what it is set to without reading a
 * colour, and eleven of them read as one list.
 */
export function InspectorRow({
  label,
  hint,
  icon,
  description,
  labelsControl = false,
  stacked = false,
  disabled = false,
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
  /**
   * The setting has nothing to act on for now: its name reads muted, and
   * `hint` says why over the whole row rather than over the name alone.
   */
  disabled?: boolean;
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
        className={`flex min-w-0 items-center gap-2 text-control ${
          disabled ? 'text-(--text-muted)' : 'text-(--text-page)'
        }`}
        title={disabled ? undefined : hint}
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
  const rowTitle = disabled ? hint : undefined;
  const row = labelsControl ? (
    <label
      className={`${rowClass} ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      title={rowTitle}
    >
      {content}
    </label>
  ) : (
    <div className={rowClass} title={rowTitle}>
      {content}
    </div>
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
              className={`flex w-full cursor-pointer items-center gap-2 px-2.5 py-1.5 text-left text-control transition pointer-coarse:min-h-11 focus-visible:relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-(--focus-ring) ${
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
            className={`inline-flex min-h-7 cursor-pointer items-center gap-1 rounded-md border px-2 py-1 text-xs transition pointer-coarse:min-h-11 pointer-coarse:px-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring) ${
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
  state,
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
  /** The link's history state — the way back into the app. */
  state?: unknown;
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
        <LocalizedLink
          to={to}
          state={state}
          title={title ?? label}
          className={className}
        >
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
 * says why on hover and focus, and for a few seconds when it is pressed.
 */
export function InspectorDeleteFooter({
  label,
  onDelete,
  blockedHint,
  question,
  askRequest = 0,
}: {
  label: string;
  onDelete: () => void;
  blockedHint?: string | null;
  /**
   * What the foot asks in place before `onDelete`, for a deletion that loses
   * only itself. Without one, `onDelete` is called at once: a deletion that
   * takes more with it asks in a dialog of its own (decision 0041).
   */
  question?: DeleteQuestion;
  /** Counts up whenever the question is asked for from elsewhere (Entf). */
  askRequest?: number;
}) {
  const hintId = React.useId();
  const refusal = useRefusalHint(blockedHint);
  const [asking, setAsking] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement | null>(null);

  // Where the focus was when the question came: the row Entf was pressed on.
  // A press on the button itself leaves nothing here, the button is gone.
  const returnFocusRef = React.useRef<HTMLElement | null>(null);

  // During the render, so the first drawing is already the question, and from
  // nought, so a panel that opened for the request answers it.
  const [seenRequest, setSeenRequest] = React.useState(0);
  if (askRequest !== seenRequest) {
    setSeenRequest(askRequest);
    if (askRequest > 0 && question && !blockedHint) setAsking(true);
  }

  const answered = React.useRef(false);
  React.useEffect(() => {
    if (asking || !answered.current) return;
    answered.current = false;
    const back = returnFocusRef.current;
    (back?.isConnected ? back : buttonRef.current)?.focus();
  }, [asking]);

  if (asking && question) {
    return (
      <InlineQuestion
        question={question}
        className="shrink-0 border-t border-(--border-card) px-4 py-3"
        returnFocusRef={returnFocusRef}
        onConfirm={() => {
          answered.current = true;
          setAsking(false);
          onDelete();
        }}
        onCancel={(end) => {
          answered.current = end === 'answered';
          setAsking(false);
        }}
      />
    );
  }

  return (
    <InspectorFooter>
      <div className="group relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => {
            if (blockedHint) {
              refusal.show();
            } else if (question) {
              setAsking(true);
            } else {
              onDelete();
            }
          }}
          aria-disabled={blockedHint ? true : undefined}
          aria-describedby={blockedHint ? hintId : undefined}
          className={`${dangerButtonClass} h-8 gap-2 px-3 text-xs ${
            blockedHint ? 'cursor-not-allowed opacity-60' : ''
          }`}
        >
          <TrashIcon size={14} aria-hidden="true" />
          {label}
        </button>
        {blockedHint && (
          <HintTooltip id={hintId} hint={blockedHint} open={refusal.open} />
        )}
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
   * its place but says why it cannot be used — the open room. With a `question`
   * the row itself asks first and the menu stays open meanwhile; without one
   * the menu closes and `onSelect` runs, which asks in a dialog of its own.
   */
  remove?: {
    label: string;
    onSelect: () => void;
    blockedHint?: string;
    question?: DeleteQuestion;
  };
  /** A rule above the row: where the teacher's own presets begin. */
  separatorBefore?: boolean;
};

/**
 * A choice among several that would take a column of rows if they stood in
 * the panel — the recipe, the open room, a kind of table, a template — as one
 * button the inspector's width that opens them as a menu over the panel. The
 * button names what is chosen, or what the menu is for; choosing a row closes
 * the menu with the focus back on the button. Shaped as the header's class
 * menu: a row may carry a pencil and a bin beside it (`rename`, `remove`).
 */
export function InspectorMenuButton({
  label,
  ariaLabel,
  menuLabel,
  rows,
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
  // The row that asks whether to delete it, and the one its question has just
  // given the focus back to.
  const [askingKey, setAskingKey] = React.useState<string | null>(null);
  const returnToKeyRef = React.useRef<string | null>(null);
  const close = React.useCallback(() => {
    setOpen(false);
    setAskingKey(null);
  }, []);
  useClickOutside(outsideRefs, close, open);
  React.useEffect(() => {
    const key = returnToKeyRef.current;
    if (askingKey !== null || key === null) return;
    returnToKeyRef.current = null;
    contentRef.current
      ?.querySelector<HTMLElement>(`[data-menu-remove="${CSS.escape(key)}"]`)
      ?.focus();
  }, [askingKey]);
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
    close();
    triggerRef.current?.focus();
    onSelect();
  };

  return (
    <div className="relative" ref={anchorRef}>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => {
          setAskingKey(null);
          setOpen((previous) => !previous);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel}
        aria-describedby={describedBy}
        className="flex min-h-7 w-full cursor-pointer items-center gap-2 rounded-md border border-(--border-card) bg-(--surface-card) px-2 py-1 text-left text-control text-(--text-page) transition hover:border-(--border-option-hover) pointer-coarse:min-h-11 pointer-coarse:px-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring)"
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
              const separator = row.separatorBefore && (
                <div
                  className="my-1 h-px bg-(--border-card)"
                  role="separator"
                />
              );
              if (!row.rename && !row.remove) {
                return (
                  <React.Fragment key={row.key}>
                    {separator}
                    {main}
                  </React.Fragment>
                );
              }
              const { rename, remove } = row;
              if (remove?.question && askingKey === row.key) {
                return (
                  <React.Fragment key={row.key}>
                    {separator}
                    <InlineQuestion
                      question={remove.question}
                      className="my-0.5 rounded-md p-2"
                      onConfirm={() => choose(remove.onSelect)}
                      onCancel={(end) => {
                        if (end === 'answered')
                          returnToKeyRef.current = row.key;
                        setAskingKey(null);
                      }}
                    />
                  </React.Fragment>
                );
              }
              return (
                <React.Fragment key={row.key}>
                  {separator}
                  <div className="flex items-center gap-1">
                    {main}
                    {rename && (
                      <button
                        type="button"
                        onClick={() => {
                          close();
                          rename.onSelect();
                        }}
                        title={rename.label}
                        aria-label={rename.label}
                        className={`${quietIconButtonClass} h-9 w-9 shrink-0`}
                      >
                        <PencilLineIcon
                          className="h-4 w-4"
                          aria-hidden="true"
                        />
                      </button>
                    )}
                    {remove && (
                      <button
                        type="button"
                        data-menu-remove={row.key}
                        onClick={() => {
                          if (remove.blockedHint) return;
                          if (remove.question) {
                            setAskingKey(row.key);
                            return;
                          }
                          close();
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
                </React.Fragment>
              );
            })}
          </div>
        </FloatingDropdown>
      )}
    </div>
  );
}

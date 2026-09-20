// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
export type SidebarTone = 'blue' | 'green' | 'amber';

interface SidebarToneStyles {
  activeBg: string;
  activeBorder: string;
  accentBorder: string;
  activeText: string;
  accentText: string;
  hoverBorder: string;
  hoverBg: string;
  hoverText: string;
  indicator: string;
}

type SidebarButtonEmphasis = 'default' | 'accent';

interface SidebarButtonOptions {
  tone?: SidebarTone;
  isActive?: boolean;
  disabled?: boolean;
  interactive?: boolean;
  emphasis?: SidebarButtonEmphasis;
}

interface SidebarSurfaceOptions extends SidebarButtonOptions {
  variant: 'collapsed' | 'expanded';
  /** Pressed to start a drag: a grab cursor instead of the pointer. */
  draggable?: boolean;
}

/**
 * The shape of a round button in the collapsed sidebar, the same in every step;
 * `getSidebarSurfaceClasses({ variant: 'collapsed' })` adds its colours. A long
 * press opens no system callout, so it stays free for the button's own use.
 */
export const sidebarRailButtonClass =
  'group relative inline-flex h-12 w-12 shrink-0 select-none items-center justify-center rounded-full p-0 [-webkit-touch-callout:none]';

/*
 * Every colour here is a token, so a rail button has one look in both modes and
 * cannot drift from the buttons around it (docs/DESIGNSYSTEM.md § 4).
 *
 * `blue` is the accent that means "you can act here" — the tone of every
 * ordinary rail button. `green` and `amber` are the two states the rail has to
 * be able to show: an action that completes something (printing), and a
 * warning that what is set is not what the teacher probably wants (mixing
 * with no criterion left on).
 */
const toneStyles: Record<SidebarTone, SidebarToneStyles> = {
  blue: {
    activeBg: 'bg-(--surface-option-selected)',
    activeBorder: 'border-(--border-option-selected)',
    accentBorder: 'border-(--border-option-selected)',
    activeText: 'text-(--text-badge)',
    accentText: 'text-(--text-badge)',
    hoverBorder: 'hover:border-(--border-option-hover)',
    hoverBg: 'hover:bg-(--surface-option-selected)',
    hoverText: 'group-hover:text-(--text-badge)',
    indicator: 'bg-(--button-primary-bg)',
  },
  green: {
    activeBg: 'bg-(--status-ok-surface)',
    activeBorder: 'border-(--status-ok)',
    accentBorder: 'border-(--status-ok)',
    activeText: 'text-(--status-ok-text)',
    accentText: 'text-(--status-ok-text)',
    hoverBorder: 'hover:border-(--status-ok)',
    hoverBg: 'hover:bg-(--status-ok-surface)',
    hoverText: 'group-hover:text-(--status-ok-text)',
    indicator: 'bg-(--status-ok)',
  },
  amber: {
    activeBg: 'bg-(--status-warn-surface)',
    activeBorder: 'border-(--status-warn)',
    accentBorder: 'border-(--status-warn)',
    activeText: 'text-(--status-warn-text)',
    accentText: 'text-(--status-warn-text)',
    hoverBorder: 'hover:border-(--status-warn)',
    hoverBg: 'hover:bg-(--status-warn-surface)',
    hoverText: 'group-hover:text-(--status-warn-text)',
    indicator: 'bg-(--status-warn)',
  },
};

export function getSidebarSurfaceClasses({
  variant,
  tone = 'blue',
  isActive = false,
  disabled = false,
  interactive = true,
  emphasis = 'default',
  draggable = false,
}: SidebarSurfaceOptions): string {
  const styles = toneStyles[tone];
  // The round button of the rail lifts off the sunken column with the card
  // shadow; a wide entry sits on the card already and takes none.
  const base = `border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary)${
    variant === 'collapsed' ? ' shadow-(--shadow-card)' : ''
  }`;

  const inactiveSurface = 'bg-(--surface-card) border-(--border-card)';

  const hoverClasses =
    disabled || !interactive ? '' : `${styles.hoverBorder} ${styles.hoverBg}`;

  let surfaceState = inactiveSurface;
  if (isActive) {
    surfaceState = `${styles.activeBg} ${styles.activeBorder}`;
  } else if (emphasis === 'accent') {
    surfaceState = `${styles.activeBg} ${styles.accentBorder}`;
  }

  const cursorClass = disabled
    ? 'cursor-not-allowed opacity-50'
    : !interactive
      ? ''
      : draggable
        ? 'cursor-grab active:cursor-grabbing'
        : 'cursor-pointer';

  return [base, surfaceState, hoverClasses, cursorClass]
    .filter(Boolean)
    .join(' ');
}

export function getSidebarIconClasses({
  tone = 'blue',
  isActive = false,
  disabled = false,
  emphasis = 'default',
}: SidebarButtonOptions): string {
  const styles = toneStyles[tone];
  const activeText = styles.activeText;
  const inactiveText =
    emphasis === 'accent' ? styles.accentText : 'text-(--text-muted)';
  const hoverText = disabled ? '' : styles.hoverText;

  return [
    'shrink-0 transition-colors',
    isActive ? activeText : inactiveText,
    hoverText,
  ]
    .filter(Boolean)
    .join(' ');
}

export function getSidebarIndicatorClasses(tone: SidebarTone = 'blue'): string {
  const styles = toneStyles[tone];
  return [
    'absolute -top-1.5 -right-1.5 h-3 w-3 rounded-full border-2 border-(--surface-card)',
    styles.indicator,
  ].join(' ');
}

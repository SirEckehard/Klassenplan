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
  ring: string;
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
}

const toneStyles: Record<SidebarTone, SidebarToneStyles> = {
  blue: {
    activeBg: 'bg-blue-50 dark:bg-blue-900/20',
    activeBorder: 'border-blue-200 dark:border-blue-700',
    accentBorder: 'border-blue-200 dark:border-blue-700',
    activeText: 'text-blue-600 dark:text-blue-400',
    accentText: 'text-blue-600 dark:text-blue-400',
    hoverBorder: 'hover:border-blue-400 dark:hover:border-blue-500',
    hoverBg: 'hover:bg-blue-50 dark:hover:bg-blue-900/20',
    hoverText: 'group-hover:text-blue-600 dark:group-hover:text-blue-400',
    indicator: 'bg-blue-500',
    ring: 'ring-blue-200 dark:ring-blue-900/40',
  },
  green: {
    activeBg: 'bg-green-50 dark:bg-green-900/20',
    activeBorder: 'border-green-200 dark:border-green-700/60',
    accentBorder: 'border-green-200 dark:border-green-700/60',
    activeText: 'text-green-600 dark:text-green-300',
    accentText: 'text-green-600 dark:text-green-300',
    hoverBorder: 'hover:border-green-400 dark:hover:border-green-500',
    hoverBg: 'hover:bg-green-50 dark:hover:bg-green-900/20',
    hoverText: 'group-hover:text-green-600 dark:group-hover:text-green-300',
    indicator: 'bg-green-500',
    ring: 'ring-green-200 dark:ring-green-900/30',
  },
  amber: {
    activeBg: 'bg-amber-50 dark:bg-amber-900/20',
    activeBorder: 'border-amber-200 dark:border-amber-600/60',
    accentBorder: 'border-amber-200 dark:border-amber-600/60',
    activeText: 'text-amber-600 dark:text-amber-300',
    accentText: 'text-amber-600 dark:text-amber-300',
    hoverBorder: 'hover:border-amber-400 dark:hover:border-amber-500',
    hoverBg: 'hover:bg-amber-50 dark:hover:bg-amber-900/20',
    hoverText: 'group-hover:text-amber-600 dark:group-hover:text-amber-300',
    indicator: 'bg-amber-500',
    ring: 'ring-amber-200 dark:ring-amber-900/30',
  },
};

export function getSidebarSurfaceClasses({
  variant,
  tone = 'blue',
  isActive = false,
  disabled = false,
  interactive = true,
  emphasis = 'default',
}: SidebarSurfaceOptions): string {
  const styles = toneStyles[tone];
  const base =
    variant === 'collapsed'
      ? 'border-2 transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500'
      : 'border-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400';

  const inactiveSurface =
    'bg-white/85 border-gray-200 dark:bg-gray-800 dark:border-gray-600';

  const hoverClasses =
    disabled || !interactive ? '' : `${styles.hoverBorder} ${styles.hoverBg}`;

  let surfaceState = inactiveSurface;
  if (isActive) {
    surfaceState = `${styles.activeBg} ${styles.activeBorder}`;
  } else if (emphasis === 'accent') {
    surfaceState = `${styles.activeBg} ${styles.accentBorder}`;
  }

  const ringClass = isActive ? styles.ring : '';
  const cursorClass = disabled
    ? 'cursor-not-allowed opacity-50'
    : interactive
      ? 'cursor-pointer'
      : '';

  return [base, surfaceState, ringClass, hoverClasses, cursorClass]
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
    emphasis === 'accent'
      ? styles.accentText
      : 'text-gray-600 dark:text-gray-300';
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
    'absolute -top-1.5 -right-1.5 h-3 w-3 rounded-full border-2 border-white dark:border-gray-800',
    styles.indicator,
  ].join(' ');
}

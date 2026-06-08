// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
interface KpLockupProps {
  size?: 'sm' | 'md';
  /** Hide the "Klassenplan" wordmark on small screens, keeping only the mark. */
  hideWordmarkOnMobile?: boolean;
}

export function KpLockup({ size = 'md', hideWordmarkOnMobile = false }: KpLockupProps) {
  const markClass = size === 'sm' ? 'kp-mark w-9 h-9' : 'kp-mark w-14 h-14';
  const sizeTextClass = size === 'sm' ? 'text-[1.45rem]' : 'text-[2.25rem]';
  const textClass = `kp-wordmark-text ${sizeTextClass}${hideWordmarkOnMobile ? ' hidden sm:inline' : ''}`;

  return (
    <>
      <svg viewBox="0 0 240 240" className={markClass} aria-hidden="true">
        <g className="kp-ghost">
          <rect x="8"   y="8"   width="40" height="40" rx="8"/>
          <rect x="54"  y="8"   width="40" height="40" rx="8"/>
          <rect x="100" y="8"   width="40" height="40" rx="8"/>
          <rect x="146" y="8"   width="40" height="40" rx="8"/>
          <rect x="192" y="8"   width="40" height="40" rx="8"/>
          <rect x="8"   y="54"  width="40" height="40" rx="8"/>
          <rect x="54"  y="54"  width="40" height="40" rx="8"/>
          <rect x="100" y="54"  width="40" height="40" rx="8"/>
          <rect x="146" y="54"  width="40" height="40" rx="8"/>
          <rect x="192" y="54"  width="40" height="40" rx="8"/>
          <rect x="8"   y="100" width="40" height="40" rx="8"/>
          <rect x="54"  y="100" width="40" height="40" rx="8"/>
          <rect x="100" y="100" width="40" height="40" rx="8"/>
          <rect x="146" y="100" width="40" height="40" rx="8"/>
          <rect x="192" y="100" width="40" height="40" rx="8"/>
          <rect x="8"   y="146" width="40" height="40" rx="8"/>
          <rect x="54"  y="146" width="40" height="40" rx="8"/>
          <rect x="100" y="146" width="40" height="40" rx="8"/>
          <rect x="146" y="146" width="40" height="40" rx="8"/>
          <rect x="192" y="146" width="40" height="40" rx="8"/>
          <rect x="8"   y="192" width="40" height="40" rx="8"/>
          <rect x="54"  y="192" width="40" height="40" rx="8"/>
          <rect x="100" y="192" width="40" height="40" rx="8"/>
          <rect x="146" y="192" width="40" height="40" rx="8"/>
          <rect x="192" y="192" width="40" height="40" rx="8"/>
        </g>
        <g className="kp-k">
          <rect data-i="0" x="8"   y="100" width="40" height="40" rx="8"/>
          <rect data-i="1" x="8"   y="54"  width="40" height="40" rx="8"/>
          <rect data-i="1" x="8"   y="146" width="40" height="40" rx="8"/>
          <rect data-i="2" x="8"   y="8"   width="40" height="40" rx="8"/>
          <rect data-i="2" x="8"   y="192" width="40" height="40" rx="8"/>
          <rect data-i="3" x="54"  y="100" width="40" height="40" rx="8"/>
          <rect data-i="4" x="100" y="54"  width="40" height="40" rx="8"/>
          <rect data-i="4" x="100" y="146" width="40" height="40" rx="8"/>
          <rect data-i="5" x="146" y="8"   width="40" height="40" rx="8"/>
          <rect data-i="5" x="146" y="192" width="40" height="40" rx="8"/>
        </g>
        <rect className="kp-accent" x="192" y="100" width="40" height="40" rx="8"/>
      </svg>
      <span className={textClass} aria-hidden="true">Klassenplan</span>
    </>
  );
}

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import {
  WORDMARK_GLYPHS,
  WORDMARK_GLYPH_PATHS,
  WORDMARK_TOP,
  WORDMARK_UNITS_PER_EM,
  WORDMARK_WIDTH,
} from './kpWordmarkPaths';

const MARK_CLASS: Record<'xs' | 'sm' | 'md', string> = {
  xs: 'kp-mark w-6 h-6',
  sm: 'kp-mark w-9 h-9',
  md: 'kp-mark w-14 h-14',
};
const TEXT_SIZE_CLASS: Record<'xs' | 'sm' | 'md', string> = {
  xs: 'text-[0.6rem]',
  sm: 'text-[1.45rem]',
  md: 'text-[2.25rem]',
};

interface KpLockupProps {
  size?: 'xs' | 'sm' | 'md';
  /** Hide the "Klassenplan" wordmark on small screens, keeping only the mark. */
  hideWordmarkOnMobile?: boolean;
  /**
   * Drop the wordmark at every width. The workspace says which class is open
   * right beside the brand; the product's own name next to it is the one thing
   * on that row a teacher never needs to read.
   */
  markOnly?: boolean;
}

export function KpLockup({
  size = 'md',
  hideWordmarkOnMobile = false,
  markOnly = false,
}: KpLockupProps) {
  const markClass = MARK_CLASS[size];
  const sizeTextClass = TEXT_SIZE_CLASS[size];
  const textClass = `kp-wordmark-text ${sizeTextClass}${hideWordmarkOnMobile ? ' hidden sm:inline' : ''}`;

  return (
    <>
      <svg viewBox="0 0 240 240" className={markClass} aria-hidden="true">
        <g className="kp-ghost">
          <rect x="8" y="8" width="40" height="40" rx="8" />
          <rect x="54" y="8" width="40" height="40" rx="8" />
          <rect x="100" y="8" width="40" height="40" rx="8" />
          <rect x="146" y="8" width="40" height="40" rx="8" />
          <rect x="192" y="8" width="40" height="40" rx="8" />
          <rect x="8" y="54" width="40" height="40" rx="8" />
          <rect x="54" y="54" width="40" height="40" rx="8" />
          <rect x="100" y="54" width="40" height="40" rx="8" />
          <rect x="146" y="54" width="40" height="40" rx="8" />
          <rect x="192" y="54" width="40" height="40" rx="8" />
          <rect x="8" y="100" width="40" height="40" rx="8" />
          <rect x="54" y="100" width="40" height="40" rx="8" />
          <rect x="100" y="100" width="40" height="40" rx="8" />
          <rect x="146" y="100" width="40" height="40" rx="8" />
          <rect x="192" y="100" width="40" height="40" rx="8" />
          <rect x="8" y="146" width="40" height="40" rx="8" />
          <rect x="54" y="146" width="40" height="40" rx="8" />
          <rect x="100" y="146" width="40" height="40" rx="8" />
          <rect x="146" y="146" width="40" height="40" rx="8" />
          <rect x="192" y="146" width="40" height="40" rx="8" />
          <rect x="8" y="192" width="40" height="40" rx="8" />
          <rect x="54" y="192" width="40" height="40" rx="8" />
          <rect x="100" y="192" width="40" height="40" rx="8" />
          <rect x="146" y="192" width="40" height="40" rx="8" />
          <rect x="192" y="192" width="40" height="40" rx="8" />
        </g>
        <g className="kp-k">
          <rect data-i="0" x="8" y="100" width="40" height="40" rx="8" />
          <rect data-i="1" x="8" y="54" width="40" height="40" rx="8" />
          <rect data-i="1" x="8" y="146" width="40" height="40" rx="8" />
          <rect data-i="2" x="8" y="8" width="40" height="40" rx="8" />
          <rect data-i="2" x="8" y="192" width="40" height="40" rx="8" />
          <rect data-i="3" x="54" y="100" width="40" height="40" rx="8" />
          <rect data-i="4" x="100" y="54" width="40" height="40" rx="8" />
          <rect data-i="4" x="100" y="146" width="40" height="40" rx="8" />
          <rect data-i="5" x="146" y="8" width="40" height="40" rx="8" />
          <rect data-i="5" x="146" y="192" width="40" height="40" rx="8" />
        </g>
        <rect
          className="kp-accent"
          x="192"
          y="100"
          width="40"
          height="40"
          rx="8"
        />
      </svg>
      {!markOnly && (
        <span className={textClass} aria-hidden="true">
          {/* Drawn from outlines, not set in the interface font: the brand
              name keeps its own letterforms. The box is the cap height, so
              the letters centre against the mark and the "p" hangs below. */}
          <svg
            viewBox={`0 ${-WORDMARK_TOP} ${WORDMARK_WIDTH} ${WORDMARK_TOP}`}
            className="kp-wordmark-svg"
            style={{
              width: `${WORDMARK_WIDTH / WORDMARK_UNITS_PER_EM}em`,
              height: `${WORDMARK_TOP / WORDMARK_UNITS_PER_EM}em`,
            }}
            fill="currentColor"
          >
            {WORDMARK_GLYPHS.map(({ char, x }, index) => (
              <path
                key={index}
                d={WORDMARK_GLYPH_PATHS[char]}
                transform={`translate(${x} 0) scale(1 -1)`}
              />
            ))}
          </svg>
        </span>
      )}
    </>
  );
}

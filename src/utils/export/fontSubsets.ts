// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import latinFontUrl from '@fontsource-variable/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-wght-normal.woff2?url';
import latinExtFontUrl from '@fontsource-variable/atkinson-hyperlegible-next/files/atkinson-hyperlegible-next-latin-ext-wght-normal.woff2?url';

/**
 * The subsets of the UI font a sheet carries, with the ranges fontsource
 * declares for them (`wght.css`): Latin, and Latin Extended for names such as
 * Gülşen, Łukasz or Ödön, whose letters fell back to a system font without it.
 * The files embed them and the export page's preview links them, so the
 * preview shows the names as the printout does.
 */
export const FONT_SUBSETS = [
  {
    url: latinExtFontUrl,
    unicodeRange:
      'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF',
  },
  {
    url: latinFontUrl,
    unicodeRange:
      'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
  },
] as const;

/** One subset's `@font-face` rule, its file at `src` (a URL or a data URL). */
export const fontFaceRule = (src: string, unicodeRange: string): string =>
  `@font-face{font-family:'Atkinson Hyperlegible Next Variable';src:url('${src}') format('woff2');font-weight:400 700;font-style:normal;unicode-range:${unicodeRange};}`;

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The browser's bar takes the paper of the theme the page wears.
 *
 * `index.html` picks the bar's colour by `prefers-color-scheme`, but the theme
 * is the teacher's choice (`html.dark`): a page set to dark on a phone set to
 * light put a white strip above the dark paper. The two `theme-color` metas
 * keep their media queries for the moment before the bundle runs; from then on
 * both carry the colour of the theme in use.
 */
import { readThemePreference, resolvesDark } from './themePreference';

/** `--surface-page` in both themes, as in `index.html`. */
const THEME_COLORS = { light: '#fcfbf8', dark: '#101113' } as const;

/**
 * Puts the stored theme — or, with none stored, the system's — on the page
 * before the first render.
 */
export function applyInitialTheme(root: HTMLElement): void {
  root.classList.toggle('dark', resolvesDark(readThemePreference()));
}

/**
 * Keeps every `theme-color` meta on the colour of the theme `root` wears, now
 * and whenever its class changes. Returns the way to stop.
 */
export function syncThemeColor(root: HTMLElement): () => void {
  const apply = () => {
    const color = root.classList.contains('dark')
      ? THEME_COLORS.dark
      : THEME_COLORS.light;
    document
      .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
      .forEach((meta) => {
        if (meta.content !== color) meta.content = color;
      });
  };
  apply();
  const observer = new MutationObserver(apply);
  observer.observe(root, { attributes: true, attributeFilter: ['class'] });
  return () => observer.disconnect();
}

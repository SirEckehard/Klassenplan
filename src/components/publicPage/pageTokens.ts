// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * The type of the pages outside the workspace — start page, FAQ, support,
 * contact, changelog and the two legal pages.
 *
 * The serif is display type only: a page's title and each section's claim.
 * Small caps above a title name what the section is about. Everything else is
 * the interface's sans, so a page reads like the app it describes.
 */
/**
 * The `<main>` of such a page, under the head that stands above it. What keeps
 * in view while it is read (a section's name, the FAQ's contents) sticks below
 * that head, at `lg:top-22`, and an anchor stops under it (`scroll-mt-20`).
 */
export const pageMainClass = 'bg-(--surface-page) px-4 pt-8 sm:px-6';

export const pageEyebrowClass =
  'text-xs font-semibold uppercase tracking-wider text-(--text-muted)';

// "Datenschutzerklärung" alone is wider than a phone at this size.
export const pageTitleClass =
  'mt-3 font-serif text-5xl leading-tight text-balance wrap-break-word text-(--text-page) max-sm:hyphens-auto sm:text-6xl';

export const pageSectionTitleClass =
  'font-serif text-3xl leading-tight text-balance text-(--text-page) sm:text-4xl';

/**
 * A link inside running text. Links in a page's chrome — FAQ, contact — are
 * `quietLinkClass` instead.
 */
export const pageInlineLinkClass =
  'font-medium text-(--text-badge) underline underline-offset-2';

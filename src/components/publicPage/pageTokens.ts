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
export const pageEyebrowClass =
  'text-xs font-semibold uppercase tracking-wider text-(--text-muted)';

export const pageTitleClass =
  'mt-3 font-serif text-5xl tracking-tight text-balance text-(--text-page) sm:text-6xl';

export const pageSectionTitleClass =
  'font-serif text-3xl leading-tight text-balance text-(--text-page) sm:text-4xl';

/**
 * A link inside running text. Links in a page's chrome — FAQ, contact, the way
 * back — are `quietLinkClass` instead.
 */
export const pageInlineLinkClass =
  'font-medium text-(--text-badge) underline underline-offset-2';

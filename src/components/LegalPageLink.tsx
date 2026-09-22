// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type React from 'react';
import type { LinkProps } from 'react-router-dom';
import { LocalizedLink } from '@/components/LocalizedLink';
import {
  getExternalLegalPageUrl,
  type LegalPageRoute,
} from '@/config/legalPages';

interface LegalPageLinkProps {
  to: LegalPageRoute;
  className?: string;
  title?: string;
  /** Set when the link is a row of a menu rather than body text. */
  role?: string;
  /**
   * Router state for the bundled page, e.g. `APP_RETURN_STATE` so it offers
   * the way back into the app. An external page opens in a tab of its own and
   * needs none.
   */
  state?: LinkProps['state'];
  onClick?: () => void;
  children: React.ReactNode;
}

/**
 * Link to the Impressum or the Datenschutzerklärung: the bundled page, or the
 * operator's own page when the build sets `IMPRINT_URL` / `PRIVACY_URL`.
 * External pages open in a new tab, so a teacher in the middle of a plan does
 * not leave the app.
 */
export function LegalPageLink({
  to,
  state,
  children,
  ...linkProps
}: LegalPageLinkProps) {
  const externalUrl = getExternalLegalPageUrl(to);

  if (externalUrl) {
    return (
      <a
        href={externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        {...linkProps}
      >
        {children}
      </a>
    );
  }

  return (
    <LocalizedLink to={to} state={state} {...linkProps}>
      {children}
    </LocalizedLink>
  );
}

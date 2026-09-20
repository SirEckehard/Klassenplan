// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import type React from 'react';
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
    <LocalizedLink to={to} {...linkProps}>
      {children}
    </LocalizedLink>
  );
}

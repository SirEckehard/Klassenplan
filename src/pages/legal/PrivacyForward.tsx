// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import LegalPageForward from './LegalPageForward';

/** Takes the place of `@/pages/Datenschutz` in a build with `PRIVACY_URL`. */
export default function PrivacyForward() {
  return <LegalPageForward route="/datenschutz" />;
}

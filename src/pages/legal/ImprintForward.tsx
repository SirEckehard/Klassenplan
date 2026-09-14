// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import LegalPageForward from './LegalPageForward';

/** Takes the place of `@/pages/Impressum` in a build with `IMPRINT_URL`. */
export default function ImprintForward() {
  return <LegalPageForward route="/impressum" />;
}

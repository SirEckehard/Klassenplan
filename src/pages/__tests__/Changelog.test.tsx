// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import '@/i18n';
import Changelog from '../Changelog';
import { changelogVersions } from '@/data/changelogEntries';
import { APP_RETURN_STATE } from '@/hooks/useReturnToApp';

const renderChangelog = (state?: unknown) =>
  render(
    <MemoryRouter initialEntries={[{ pathname: '/changelog', state }]}>
      <Changelog />
    </MemoryRouter>,
  );

/** The kinds of change in the order the page promises for every version. */
const TYPE_ORDER = [
  /Neue Features|New Features/,
  /Verbesserungen|Improvements/,
  /Fehlerbehebungen|Bug Fixes/,
  /Bekannte Fehler|Known Issues/,
];

describe('Changelog', () => {
  it('gives every version a section with all of its changes', () => {
    renderChangelog();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Changelog' }),
    ).toBeInTheDocument();
    for (const version of changelogVersions) {
      const section = screen.getByRole('region', {
        name: `Version ${version.version}`,
      });
      expect(within(section).getAllByRole('listitem')).toHaveLength(
        version.changes.length,
      );
    }
  });

  it('lists the kinds of change in the same order in every version', () => {
    renderChangelog();

    // The data does not keep that order everywhere — 2.0.4 names its bug
    // fixes before its improvements — so the page has to.
    for (const version of changelogVersions) {
      const section = screen.getByRole('region', {
        name: `Version ${version.version}`,
      });
      const positions = within(section)
        .getAllByRole('heading', { level: 3 })
        .map((heading) =>
          TYPE_ORDER.findIndex((pattern) =>
            pattern.test(heading.textContent ?? ''),
          ),
        );
      expect(positions).not.toContain(-1);
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
    }
  });

  it('shows no raw translation key anywhere', () => {
    renderChangelog();

    expect(document.body.textContent).not.toMatch(
      /\bv\d+_\d+_\d+\.\d+|\b(types|header|footer)\.[a-z]/,
    );
  });

  it('leads back to the app when the update notice opened it', () => {
    renderChangelog(APP_RETURN_STATE);

    expect(
      screen.getByRole('button', { name: /^(Zurück|Back)$/ }),
    ).toBeInTheDocument();
  });
});

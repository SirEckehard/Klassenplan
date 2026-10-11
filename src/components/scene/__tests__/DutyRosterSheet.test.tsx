// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '@/i18n';
import DutyRosterSheet from '../DutyRosterSheet';

const renderSheet = () =>
  render(
    <DutyRosterSheet
      title="Dienste"
      classMetadata={{ name: '7b' }}
      at="2026-10-11T08:00:00.000Z"
      rows={[
        { name: 'Tafeldienst', holders: ['Ada Lovelace', 'Ben Berg'], open: 0 },
        { name: 'Mülldienst', holders: ['Cem Cakir'], open: 1 },
      ]}
    />,
  );

const texts = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('text')).map(
    (node) => node.textContent,
  );

describe('DutyRosterSheet', () => {
  it('wears the header every export shares', () => {
    const { container } = renderSheet();

    expect(
      container.querySelector('[aria-label="Klassenplan.de"]'),
    ).toBeInTheDocument();
    expect(texts(container)).toEqual(
      expect.arrayContaining([
        'Dienste',
        '7b',
        expect.stringMatching(/(Datum|Date): .*2026/),
      ]),
    );
  });

  it('lists every duty with who holds it', () => {
    const { container } = renderSheet();

    expect(texts(container)).toEqual(
      expect.arrayContaining([
        'Tafeldienst',
        'Ada Lovelace',
        'Ben Berg',
        'Mülldienst',
        'Cem Cakir',
      ]),
    );
  });

  it('leaves an open place as a line to write a name on', () => {
    const { container } = renderSheet();
    // The head's rule, one rule under each duty and the open place's line.
    expect(container.querySelectorAll('line')).toHaveLength(4);
  });
});

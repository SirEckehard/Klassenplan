// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import i18n, { ensureEnglishLoaded } from '@/i18n/i18n';
import CompactMixHistory from '../CompactMixHistory';
import type { MixResult } from '@/types';
import { neutralSettings } from '@/utils';

const result: MixResult = {
  id: 1,
  timestamp: '2026-09-17T08:15:00.000Z',
  seating: [],
  mixSettings: {
    ...neutralSettings,
    avoidRestlessTogether: 5,
    // Only "away from restless neighbours" carried a weight in this mix.
    avoidConcentrationNearRestless: 6,
  },
};

const renderHistory = () =>
  render(
    <CompactMixHistory
      mixHistory={[result]}
      onLoad={vi.fn()}
      onDelete={vi.fn()}
    />,
  );

afterEach(async () => {
  await i18n.changeLanguage('de');
});

describe('CompactMixHistory', () => {
  // Pinned rather than matched bilingually: the language is the subject here.
  it('names the criteria in the language of the UI, as the sidebar does', async () => {
    await ensureEnglishLoaded();
    await i18n.changeLanguage('en');
    renderHistory();

    expect(screen.getByLabelText('Restlessness: 5/10')).toBeInTheDocument();
    expect(screen.getByLabelText('Distractibility: 6/10')).toBeInTheDocument();
  });

  it('shows German names on the German UI', async () => {
    await i18n.changeLanguage('de');
    renderHistory();

    expect(screen.getByLabelText('Unruhe: 5/10')).toBeInTheDocument();
    expect(screen.getByLabelText('Ablenkbarkeit: 6/10')).toBeInTheDocument();
  });
});

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { ensureChangelogLoaded } from '@/i18n/i18n';
import RedesignWelcome from '../RedesignWelcome';
import {
  resetOnboardingTourForTests,
  useOnboardingTour,
} from '@/hooks/onboarding/onboardingTourStore';
import { getButton, getDialog } from '@/__tests__/utils';

const renderWelcome = (onDone = vi.fn()) => {
  render(
    <MemoryRouter>
      <RedesignWelcome version="3.0.0" onDone={onDone} />
    </MemoryRouter>,
  );
  return onDone;
};

describe('RedesignWelcome', () => {
  beforeAll(async () => {
    await ensureChangelogLoaded('de');
  });

  beforeEach(() => {
    localStorage.clear();
    // A teacher from before the redesign: tours skipped, as the store does
    // for an installation that predates them.
    localStorage.setItem(
      'spg.onboardingTour',
      JSON.stringify({ version: 1, seen: ['students'], skipped: true }),
    );
    resetOnboardingTourForTests();
  });

  it('names the layout, the rooms and the library', () => {
    renderWelcome();

    const dialog = getDialog(/neuen Klassenplan|new Klassenplan/i);
    expect(dialog).toHaveTextContent(/Ein Aufbau für alles|One layout/);
    expect(dialog).toHaveTextContent(/Raum|room/);
    expect(dialog).toHaveTextContent(/Bibliothek|Library/);
  });

  it('makes every tour due again when the tour is chosen', () => {
    const onDone = renderWelcome();
    const { result } = renderHook(() => useOnboardingTour());
    expect(result.current.isTourDue('students')).toBe(false);

    act(() => {
      fireEvent.click(getButton(/Tour starten|Start tour/i));
    });

    expect(onDone).toHaveBeenCalledTimes(1);
    expect(result.current.isTourDue('students')).toBe(true);
    expect(result.current.isTourDue('library')).toBe(true);
  });

  it('leaves the tours as they were when the teacher explores alone', () => {
    const onDone = renderWelcome();
    const { result } = renderHook(() => useOnboardingTour());

    fireEvent.click(getButton(/Selbst entdecken|Explore on my own/i));

    expect(onDone).toHaveBeenCalledTimes(1);
    expect(result.current.isTourDue('students')).toBe(false);
  });
});

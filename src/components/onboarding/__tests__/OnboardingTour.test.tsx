// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import '@/i18n';
import OnboardingTour from '../OnboardingTour';
import { TOUR_ANCHORS } from '../tours';
import {
  resetOnboardingTourForTests,
  type TourId,
} from '@/hooks/onboarding/onboardingTourStore';
import {
  resetDialogLayersForTests,
  useDialogLayer,
} from '@/hooks/ui/useDialogLayer';
import { LOCAL_STORAGE_KEYS } from '@/utils';

// jsdom lays nothing out: every element measures 0 × 0, which the tour reads as
// "not on screen". Tagged elements get a size here; untagged ones keep theirs.
const originalGetBoundingClientRect =
  HTMLElement.prototype.getBoundingClientRect;

/** Longer than the tour takes to decide whether to start. */
const TOUR_START_WINDOW_MS = 800;
const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const readRecord = () =>
  JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEYS.onboardingTour) ?? 'null');

function ClassListStep({ tourId = 'students' }: { tourId?: TourId | null }) {
  return (
    <>
      <button type="button" data-tour={TOUR_ANCHORS.classSwitcher}>
        7b
      </button>
      <button type="button" data-tour={TOUR_ANCHORS.addStudents}>
        +
      </button>
      <OnboardingTour tourId={tourId} />
    </>
  );
}

const findMark = (name: RegExp) =>
  screen.findByRole('dialog', { name }, { timeout: 2000 });
const classSwitcherMark = /Deine Klassen|Your classes/i;
const addStudentsMark = /Schüler hinzufügen|Add students/i;

beforeEach(() => {
  localStorage.clear();
  resetOnboardingTourForTests();
  resetDialogLayersForTests();
  HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
    if (this.hasAttribute('data-tour')) {
      return new DOMRect(100, 100, 120, 40);
    }
    return originalGetBoundingClientRect.call(this);
  };
});

afterEach(() => {
  HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
});

describe('OnboardingTour', () => {
  it('walks through the marks whose elements are on screen', async () => {
    render(<ClassListStep />);

    // Two of the five class-list marks have an element here.
    const first = await findMark(classSwitcherMark);
    expect(first).toHaveTextContent(/1 von 2|1 of 2/);
    await waitFor(() => expect(first).toHaveFocus());

    await userEvent.click(
      screen.getByRole('button', { name: /^(Weiter|Next)$/ }),
    );
    expect(await findMark(addStudentsMark)).toHaveTextContent(/2 von 2|2 of 2/);

    await userEvent.click(
      screen.getByRole('button', { name: /^(Zurück|Back)$/ }),
    );
    expect(await findMark(classSwitcherMark)).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: /^(Weiter|Next)$/ }),
    );
    await findMark(addStudentsMark);
    await userEvent.click(
      screen.getByRole('button', { name: /^(Fertig|Done)$/ }),
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(readRecord().seen).toEqual(['students']);
  });

  it('closes on Escape and does not return on the next visit', async () => {
    const { unmount } = render(<ClassListStep />);
    await findMark(classSwitcherMark);

    await userEvent.keyboard('{Escape}');
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );

    unmount();
    resetOnboardingTourForTests();
    render(<ClassListStep />);
    await sleep(TOUR_START_WINDOW_MS);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('switches every tour off with "Nicht mehr zeigen"', async () => {
    const { rerender } = render(<ClassListStep />);
    await findMark(classSwitcherMark);

    await userEvent.click(
      screen.getByRole('button', {
        name: /Nicht mehr zeigen|Don't show again/i,
      }),
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(readRecord().skipped).toBe(true);

    // The next step's tour stays away as well.
    rerender(<ClassListStep tourId="layout" />);
    await sleep(TOUR_START_WINDOW_MS);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('steps aside while another overlay is open', async () => {
    render(<ClassListStep />);
    await findMark(classSwitcherMark);

    const modal = renderHook(() => useDialogLayer(true));
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );

    modal.unmount();
    expect(await findMark(classSwitcherMark)).toBeInTheDocument();
  });

  it('waits for an open overlay before it starts', async () => {
    const quickSetup = renderHook(() => useDialogLayer(true));
    render(<ClassListStep />);

    await sleep(TOUR_START_WINDOW_MS);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    quickSetup.unmount();
    expect(await findMark(classSwitcherMark)).toBeInTheDocument();
  });

  it('ends when the wizard moves on', async () => {
    const { rerender } = render(<ClassListStep />);
    await findMark(classSwitcherMark);

    rerender(<ClassListStep tourId={null} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not greet a teacher who used the app before the tours existed', async () => {
    localStorage.setItem(LOCAL_STORAGE_KEYS.hasVisitedApp, 'true');

    render(<ClassListStep />);

    await sleep(TOUR_START_WINDOW_MS);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not start a tour none of whose elements are on screen', async () => {
    render(<OnboardingTour tourId="plan" />);

    await sleep(TOUR_START_WINDOW_MS);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // Not shown means not seen: it may still come when its step appears.
    expect(readRecord().seen).toEqual([]);
  });
});

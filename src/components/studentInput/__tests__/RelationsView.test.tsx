// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import RelationsView from '@/components/studentInput/RelationsView';
import { InspectorProvider } from '@/contexts/InspectorContext';
import { createMockStudent } from '@/__tests__/utils';
import { PROFILE_HOVER_MS } from '@/hooks/student/useStudentCard';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const students = [
  createMockStudent({ id: 'a', name: 'Ada', wishPartnerIds: ['b', 'c'] }),
  createMockStudent({ id: 'b', name: 'Ben', wishPartnerIds: ['a'] }),
  createMockStudent({
    id: 'c',
    name: 'Cem',
    wishPartnerIds: ['a'],
    avoidPartnerIds: ['d'],
  }),
  createMockStudent({ id: 'd', name: 'Dua', wishPartnerIds: ['c'] }),
  createMockStudent({ id: 'e', name: 'Eli' }),
];

const renderView = () =>
  render(
    <InspectorProvider>
      <RelationsView students={students} />
    </InspectorProvider>,
  );

const finding = (name: RegExp) =>
  within(
    screen.getByRole('region', { name: /Auffälligkeiten|Worth a look/i }),
  ).getByRole('button', { name });
const rows = () =>
  within(
    screen.getByRole('region', { name: /^(Beziehungen|Relationships)$/i }),
  ).getAllByRole('button', { name: /im Inspektor öffnen|in the inspector/i });

describe('RelationsView', () => {
  it('counts what deserves a look before mixing', () => {
    renderView();
    expect(finding(/Widerspruch|contradiction/i)).toHaveTextContent('1');
    expect(finding(/niemandem genannt|not named/i)).toHaveTextContent('2');
    expect(finding(/ohne eigenen Wunsch|without a wish/i)).toHaveTextContent(
      '1',
    );
    expect(finding(/gegenseitig|mutual/i)).toHaveTextContent('2');
  });

  it('opens a finding on who it is about', () => {
    renderView();
    const button = finding(/niemandem genannt|not named/i);
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');

    const details = document.getElementById(
      button.getAttribute('aria-controls') ?? '',
    ) as HTMLElement;
    expect(
      within(details)
        .getAllByRole('button')
        .map((person) => person.textContent),
    ).toEqual(['DDua', 'EEli']);
  });

  it('shows the contradiction with both sides', () => {
    renderView();
    const button = finding(/Widerspruch|contradiction/i);
    fireEvent.click(button);
    const details = document.getElementById(
      button.getAttribute('aria-controls') ?? '',
    ) as HTMLElement;
    expect(details).toHaveTextContent(
      /Cem wünscht aber Distanz|but Cem wants distance/,
    );
  });

  it('gives every student a line with the wishes in order and how often named', () => {
    renderView();
    const ada = rows()[0];
    const summary = document.getElementById(
      ada.getAttribute('aria-describedby') ?? '',
    );
    expect(summary).toHaveTextContent(
      /Möchte neben: Ben \(gegenseitig\), Cem \(gegenseitig\)\. Wunsch von Ben, Cem\.|Wants to sit next to: Ben \(mutual\), Cem \(mutual\)\. Wished for by Ben, Cem\./,
    );
    expect(
      within(
        screen.getByRole('region', { name: /^(Beziehungen|Relationships)$/i }),
      ).getAllByText(/^(Widerspruch|Contradiction)$/),
    ).toHaveLength(2);
  });

  it('sorts by how often a student was named, the class order breaking ties', () => {
    renderView();
    const names = () =>
      rows().map(
        (row) =>
          row.getAttribute('aria-label')?.match(/Ada|Ben|Cem|Dua|Eli/)?.[0],
      );
    expect(names()).toEqual(['Ada', 'Ben', 'Cem', 'Dua', 'Eli']);

    fireEvent.click(
      screen.getByRole('button', { name: /Selten genannt|Rarely named/ }),
    );
    expect(names()).toEqual(['Dua', 'Eli', 'Ben', 'Ada', 'Cem']);

    fireEvent.click(
      screen.getByRole('button', { name: /Oft genannt|Often named/ }),
    );
    expect(names()).toEqual(['Ada', 'Cem', 'Ben', 'Dua', 'Eli']);
  });

  it('opens a student and marks their line', () => {
    renderView();
    fireEvent.click(rows()[2]);
    expect(rows()[2]).toHaveAttribute('aria-current', 'true');
    expect(rows()[0]).not.toHaveAttribute('aria-current');
  });

  // The view is drawn only once the class has a wish; its faces explain
  // themselves from then on, not only after a reload (M16 of the review of
  // 22 November 2026).
  it('opens the card of a face once the first wish brings the view', () => {
    vi.useFakeTimers();
    const withoutWishes = students.map((student) => ({
      ...student,
      wishPartnerIds: [],
      avoidPartnerIds: [],
    }));
    const view = render(
      <InspectorProvider>
        <RelationsView students={withoutWishes} />
      </InspectorProvider>,
    );
    view.rerender(
      <InspectorProvider>
        <RelationsView students={students} />
      </InspectorProvider>,
    );

    const face = document.querySelector('[data-card-profile="b"]');
    if (!face) throw new Error('No face of Ben');
    fireEvent.pointerOver(face, { pointerType: 'mouse' });
    act(() => vi.advanceTimersByTime(PROFILE_HOVER_MS));
    expect(screen.getByRole('tooltip')).toHaveTextContent(/Ben/);
  });

  // A partner who has left the class leaves the id behind in the record.
  it('ignores a partner who is no longer in the class', () => {
    render(
      <RelationsView
        students={[
          createMockStudent({ id: 'a', name: 'Ada', wishPartnerIds: ['gone'] }),
        ]}
      />,
    );
    expect(
      screen.getByText(
        /kein Wunsch und kein Distanzpartner|no preferred and no keep-apart/i,
      ),
    ).toBeInTheDocument();
  });
});

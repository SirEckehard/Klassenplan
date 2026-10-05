// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import {
  render,
  screen,
  within,
  cleanup,
  fireEvent,
} from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import '@/i18n';
import RelationsView from '@/components/studentInput/RelationsView';
import { InspectorProvider } from '@/contexts/InspectorContext';
import { createMockStudent } from '@/__tests__/utils';

afterEach(cleanup);

const group = (name: RegExp) =>
  screen.getByRole('heading', { name }).closest('section') as HTMLElement;
const wishGroup = () => group(/Wunschpartner|Preferred partners/i);
const avoidGroup = () => group(/Distanzpartner|Keep apart/i);

describe('RelationsView', () => {
  it('shows a pair both students named once, and marks it mutual', () => {
    const students = [
      createMockStudent({ id: 'a', name: 'Ada', wishPartnerIds: ['b'] }),
      createMockStudent({ id: 'b', name: 'Ben', wishPartnerIds: ['a'] }),
    ];

    render(<RelationsView students={students} />);

    const rows = within(wishGroup()).getAllByRole('listitem');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent(/gegenseitig|mutual/i);
  });

  it('keeps a one-sided wish as its own row', () => {
    const students = [
      createMockStudent({ id: 'a', name: 'Ada', wishPartnerIds: ['b'] }),
      createMockStudent({ id: 'b', name: 'Ben' }),
    ];

    render(<RelationsView students={students} />);

    const rows = within(wishGroup()).getAllByRole('listitem');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent(/einseitig|one-sided/i);
  });

  it('separates keep-apart wishes from the preferred ones', () => {
    const students = [
      createMockStudent({ id: 'a', name: 'Ada', avoidPartnerIds: ['b'] }),
      createMockStudent({ id: 'b', name: 'Ben' }),
    ];

    render(<RelationsView students={students} />);

    expect(within(avoidGroup()).getAllByRole('listitem')).toHaveLength(1);
    expect(within(wishGroup()).queryAllByRole('listitem')).toHaveLength(0);
  });

  it('puts mutual pairs before one-sided ones', () => {
    const students = [
      createMockStudent({ id: 'a', name: 'Ada', wishPartnerIds: ['b'] }),
      createMockStudent({ id: 'b', name: 'Ben' }),
      createMockStudent({ id: 'c', name: 'Cem', wishPartnerIds: ['d'] }),
      createMockStudent({ id: 'd', name: 'Dua', wishPartnerIds: ['c'] }),
    ];

    render(<RelationsView students={students} />);

    const rows = within(wishGroup()).getAllByRole('listitem');
    expect(rows[0]).toHaveTextContent(/Cem.*Dua.*/);
    expect(rows[0]).toHaveTextContent(/gegenseitig|mutual/i);
    expect(rows[1]).toHaveTextContent(/einseitig|one-sided/i);
  });

  it('lists who has not named a preferred partner yet', () => {
    const students = [
      createMockStudent({ id: 'a', name: 'Ada', wishPartnerIds: ['b'] }),
      createMockStudent({ id: 'b', name: 'Ben' }),
    ];

    render(<RelationsView students={students} />);

    const without = group(/Noch ohne Wunsch|No wish yet/i);
    expect(within(without).getAllByRole('listitem')).toHaveLength(1);
    expect(
      within(without).getByRole('button', { name: /Ben/ }),
    ).toBeInTheDocument();
  });

  it('marks the student opened by a click wherever they appear', async () => {
    const students = [
      createMockStudent({ id: 'a', name: 'Ada', wishPartnerIds: ['b'] }),
      createMockStudent({ id: 'b', name: 'Ben', avoidPartnerIds: ['c'] }),
      createMockStudent({ id: 'c', name: 'Cem' }),
    ];

    render(
      <InspectorProvider>
        <RelationsView students={students} />
      </InspectorProvider>,
    );

    const [first] = within(wishGroup()).getAllByRole('button', {
      name: /Ben/,
    });
    fireEvent.click(first);

    const current = screen
      .getAllByRole('button', { name: /Ben/ })
      .filter((button) => button.getAttribute('aria-current') === 'true');
    // His wish pair, his keep-apart pair and his place under "no wish yet".
    expect(current).toHaveLength(3);
    expect(
      within(wishGroup()).getByRole('button', { name: /Ada/ }),
    ).not.toHaveAttribute('aria-current');
  });

  // A partner who has left the class leaves the id behind in the record.
  it('ignores a partner who is no longer in the class', () => {
    const students = [
      createMockStudent({ id: 'a', name: 'Ada', wishPartnerIds: ['gone'] }),
    ];

    render(<RelationsView students={students} />);

    expect(
      screen.getByText(
        /kein Wunsch und kein Distanzpartner|no preferred and no keep-apart/i,
      ),
    ).toBeInTheDocument();
  });
});

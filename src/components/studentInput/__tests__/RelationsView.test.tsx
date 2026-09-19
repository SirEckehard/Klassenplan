// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import '@/i18n';
import RelationsView from '@/components/studentInput/RelationsView';
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

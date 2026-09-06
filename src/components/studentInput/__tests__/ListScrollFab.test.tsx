// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@/i18n'; // Initialize i18n for tests
import ListScrollFab from '@/components/studentInput/ListScrollFab';
import { getButton } from '@/__tests__/utils';

describe('ListScrollFab', () => {
  it('renders nothing while both ends of the list are within reach', () => {
    const { container } = render(
      <ListScrollFab hint={null} onScroll={vi.fn()} offsets={{}} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('offers the way down to the action row', () => {
    render(<ListScrollFab hint="down" onScroll={vi.fn()} offsets={{}} />);

    expect(getButton(/Zum Ende der Liste|Jump to end of list/i)).toBeVisible();
  });

  it('offers the way back to the top of the list', () => {
    render(<ListScrollFab hint="up" onScroll={vi.fn()} offsets={{}} />);

    expect(getButton(/Zum Listenanfang|Jump to top of list/i)).toBeVisible();
    expect(
      screen.queryByRole('button', {
        name: /Zum Ende der Liste|Jump to end of list/i,
      }),
    ).not.toBeInTheDocument();
  });

  it('scrolls on click', () => {
    const onScroll = vi.fn();
    render(<ListScrollFab hint="down" onScroll={onScroll} offsets={{}} />);

    fireEvent.click(getButton(/Zum Ende der Liste|Jump to end of list/i));

    expect(onScroll).toHaveBeenCalledTimes(1);
  });
});

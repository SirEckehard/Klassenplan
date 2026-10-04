// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ColumnBrowser, { type BrowserColumn } from '../ColumnBrowser';

/** Classes → rooms → plans, with the path held as the test's own state. */
function Harness({
  onOpen = vi.fn(),
  onRename = vi.fn(),
  onDelete = vi.fn(),
  single = false,
}: {
  onOpen?: (column: number, key: string) => void;
  onRename?: (column: number, key: string) => void;
  onDelete?: (column: number, key: string) => void;
  single?: boolean;
}) {
  const [path, setPath] = React.useState<string[]>(['7a']);
  const columns: BrowserColumn[] = [
    {
      key: 'classes',
      label: 'Klassen',
      selectedKey: path[0] ?? null,
      groups: [
        {
          key: 'classes',
          items: [
            { key: '7a', label: '7a', isFolder: true },
            { key: '7b', label: '7b', isFolder: true },
          ],
        },
      ],
    },
  ];
  if (path[0]) {
    columns.push({
      key: `rooms-${path[0]}`,
      label: path[0],
      selectedKey: path[1] ?? null,
      groups: [
        {
          key: 'rooms',
          label: 'Räume',
          items: [
            {
              key: `${path[0]}-classroom`,
              label: 'Klassenraum',
              isFolder: true,
            },
            { key: `${path[0]}-lab`, label: 'Labor', isFolder: true },
          ],
        },
        {
          key: 'more',
          items: [{ key: `${path[0]}-neighbours`, label: 'Nachbarschaften' }],
        },
      ],
    });
  }
  if (path[1] && path[1].endsWith('classroom')) {
    columns.push({
      key: `plans-${path[1]}`,
      label: 'Klassenraum',
      selectedKey: path[2] ?? null,
      groups: [
        {
          key: 'plans',
          items: [
            { key: 'sept', label: 'September', meta: '2.9.2026' },
            { key: 'oct', label: 'Oktober' },
          ],
        },
      ],
    });
  } else if (path[1]) {
    columns.push({
      key: `plans-${path[1]}`,
      label: 'Labor',
      selectedKey: null,
      groups: [{ key: 'plans', items: [] }],
      emptyText: 'Noch kein Plan in diesem Raum',
    });
  }
  return (
    <ColumnBrowser
      columns={columns}
      onSelect={(column, key) => setPath([...path.slice(0, column), key])}
      onOpen={onOpen}
      onRename={onRename}
      onDelete={onDelete}
      single={single}
    />
  );
}

const option = (name: string) => screen.getByRole('option', { name });

describe('ColumnBrowser', () => {
  it('shows each column as a labelled list, the path selected', () => {
    render(<Harness />);

    expect(
      screen.getByRole('listbox', { name: 'Klassen' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('listbox', { name: '7a' })).toBeInTheDocument();
    expect(option('7a')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('group', { name: 'Räume' })).toBeInTheDocument();
  });

  it('chooses with the arrows and opens the folder in the next column', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    option('7a').focus();
    await user.keyboard('{ArrowDown}');
    expect(option('7b')).toHaveAttribute('aria-selected', 'true');
    expect(option('7b')).toHaveFocus();
    expect(screen.getByRole('listbox', { name: '7b' })).toBeInTheDocument();

    await user.keyboard('{ArrowRight}');
    expect(option('Klassenraum')).toHaveFocus();
    expect(
      screen.getByRole('listbox', { name: 'Klassenraum' }),
    ).toBeInTheDocument();

    await user.keyboard('{ArrowRight}{ArrowDown}');
    expect(option('Oktober')).toHaveFocus();
    expect(option('Oktober')).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{ArrowLeft}');
    expect(option('Klassenraum')).toHaveFocus();
    // The column of plans stays: its folder is still chosen.
    expect(option('Oktober')).toBeInTheDocument();
  });

  it('jumps to the ends of a column', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(option('7a'));
    await user.keyboard('{ArrowRight}{End}');

    expect(option('Nachbarschaften')).toHaveFocus();
    await user.keyboard('{Home}');
    expect(option('Klassenraum')).toHaveFocus();
  });

  it('opens, renames and removes from the keyboard and by a double click', async () => {
    const onOpen = vi.fn();
    const onRename = vi.fn();
    const onDelete = vi.fn();
    const user = userEvent.setup();
    render(<Harness onOpen={onOpen} onRename={onRename} onDelete={onDelete} />);

    await user.click(option('7a'));
    await user.keyboard('{Enter}');
    expect(onOpen).toHaveBeenCalledWith(0, '7a');
    await user.keyboard('{F2}');
    expect(onRename).toHaveBeenCalledWith(0, '7a');
    await user.keyboard('{Delete}');
    expect(onDelete).toHaveBeenCalledWith(0, '7a');

    await user.dblClick(option('Labor'));
    expect(onOpen).toHaveBeenCalledWith(1, '7a-lab');
  });

  it('gives each column one stop for the Tab key', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.tab();
    expect(option('7a')).toHaveFocus();
    await user.tab();
    expect(option('Klassenraum')).toHaveFocus();
  });

  it('says so when a column lists nothing', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(option('Labor'));

    expect(
      screen.getByText('Noch kein Plan in diesem Raum'),
    ).toBeInTheDocument();
  });

  it('shows only the last column on a phone', () => {
    render(<Harness single />);

    expect(screen.queryByRole('listbox', { name: 'Klassen' })).toBeNull();
    expect(screen.getByRole('listbox', { name: '7a' })).toBeInTheDocument();
  });
});

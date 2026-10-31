// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CopyIcon, PencilSimpleIcon, TrashIcon } from '@phosphor-icons/react';
import ContextMenu, { type ContextMenuItem } from '../ContextMenu';

const renderMenu = (items: ContextMenuItem[], onClose = vi.fn()) => {
  render(
    <>
      <button type="button">Elsewhere</button>
      <ContextMenu
        request={{ x: 20, y: 30, pointer: 'mouse' }}
        items={items}
        label="Aktionen für „Deutsch“"
        onClose={onClose}
      />
    </>,
  );
  return onClose;
};

describe('ContextMenu', () => {
  it('names each row by its action alone, the key beside it and the removal behind a hairline', () => {
    renderMenu([
      {
        label: 'Umbenennen',
        icon: PencilSimpleIcon,
        shortcut: 'F2',
        onSelect: vi.fn(),
      },
      { label: 'Duplizieren', icon: CopyIcon, onSelect: vi.fn() },
      {
        label: 'Löschen',
        icon: TrashIcon,
        shortcut: 'Entf',
        danger: true,
        onSelect: vi.fn(),
      },
    ]);

    const menu = screen.getByRole('menu', { name: 'Aktionen für „Deutsch“' });
    expect(menu).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'Umbenennen' }),
    ).toBeInTheDocument();
    expect(screen.getByText('F2')).toHaveAttribute('aria-hidden', 'true');
    const separators = screen.getAllByRole('separator', { hidden: true });
    expect(separators).toHaveLength(1);
    expect(separators[0].nextElementSibling).toBe(
      screen.getByRole('menuitem', { name: 'Löschen' }),
    );
  });

  it('closes and acts on a chosen row', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    const onClose = renderMenu([
      { label: 'Duplizieren', icon: CopyIcon, onSelect },
    ]);

    await user.click(screen.getByRole('menuitem', { name: 'Duplizieren' }));
    expect(onClose).toHaveBeenCalled();
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it('keeps a greyed-out row reachable, says why and acts on nothing', async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    const onClose = renderMenu([
      {
        label: 'Löschen',
        icon: TrashIcon,
        danger: true,
        disabled: true,
        hint: 'Den offenen Raum kannst du nicht löschen.',
        onSelect,
      },
    ]);

    const row = screen.getByRole('menuitem', { name: 'Löschen' });
    expect(row).toHaveAttribute('aria-disabled', 'true');
    expect(row).toHaveAccessibleDescription(
      'Den offenen Raum kannst du nicht löschen.',
    );
    await user.click(row);
    expect(onSelect).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on Escape and on a press outside it', () => {
    const onClose = renderMenu([
      { label: 'Duplizieren', icon: CopyIcon, onSelect: vi.fn() },
    ]);

    fireEvent.keyDown(document.activeElement ?? document.body, {
      key: 'Escape',
    });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Elsewhere' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

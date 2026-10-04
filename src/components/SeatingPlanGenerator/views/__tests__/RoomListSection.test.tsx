// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import type { RoomRecord } from '@/types';
import { RoomListSection } from '../RoomSetupSections';

const mocks = vi.hoisted(() => ({
  rooms: [] as RoomRecord[],
  activeRoomId: null as string | null,
  openRoom: vi.fn(),
  createRoom: vi.fn(),
  renameRoom: vi.fn(),
}));

vi.mock('@/contexts/seatingPlan/seatingPlanSelectors', () => ({
  useOptionalSeatingPlanState: () => ({
    rooms: mocks.rooms,
    activeRoomId: mocks.activeRoomId,
  }),
  useOptionalSeatingPlanActions: () => ({
    openRoom: mocks.openRoom,
    createRoom: mocks.createRoom,
    renameRoom: mocks.renameRoom,
  }),
}));

const room = (id: string, name: string): RoomRecord => ({
  id,
  name,
  createdAt: '2026-10-04T08:00:00.000Z',
});

beforeEach(() => {
  mocks.rooms = [room('a', 'Klassenraum'), room('b', 'Labor')];
  mocks.activeRoomId = 'a';
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('RoomListSection', () => {
  it('lists the rooms of the class and marks the open one', () => {
    render(<RoomListSection />);

    expect(
      screen.getByRole('button', { name: /^Klassenraum$/ }),
    ).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('button', { name: /^Labor$/ })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('opens another room in a click and leaves the open one alone', async () => {
    const user = userEvent.setup();
    render(<RoomListSection />);

    await user.click(screen.getByRole('button', { name: /^Klassenraum$/ }));
    expect(mocks.openRoom).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /^Labor$/ }));
    expect(mocks.openRoom).toHaveBeenCalledWith('b');
  });

  it('names a new room before making it, with a free name ready', async () => {
    const user = userEvent.setup();
    render(<RoomListSection />);

    await user.click(
      screen.getByRole('button', { name: /Neuer Raum|New room/ }),
    );
    const field = screen.getByRole('textbox', {
      name: /Name des Raums|Name of the room/,
    });
    expect(field).toHaveValue('Neuer Raum');
    expect(mocks.createRoom).not.toHaveBeenCalled();

    await user.clear(field);
    await user.type(field, 'Turnhalle{Enter}');

    expect(mocks.createRoom).toHaveBeenCalledWith({ name: 'Turnhalle' });
  });

  it('makes no room when the name is left or dropped', async () => {
    const user = userEvent.setup();
    render(<RoomListSection />);

    await user.click(
      screen.getByRole('button', { name: /Neuer Raum|New room/ }),
    );
    await user.keyboard('{Escape}');

    expect(mocks.createRoom).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: /Neuer Raum|New room/ }),
    ).toBeInTheDocument();
  });

  it('refuses a name another room carries', async () => {
    const user = userEvent.setup();
    render(<RoomListSection />);

    await user.click(
      screen.getByRole('button', { name: /„Labor“ umbenennen|Rename “Labor”/ }),
    );
    const field = screen.getByRole('textbox', {
      name: /Name des Raums|Name of the room/,
    });
    await user.clear(field);
    await user.type(field, 'klassenraum{Enter}');

    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(mocks.renameRoom).not.toHaveBeenCalled();

    await user.clear(field);
    await user.type(field, 'Chemie{Enter}');
    expect(mocks.renameRoom).toHaveBeenCalledWith('b', 'Chemie');
  });

  it('suggests rooms of their own for specialist rooms while the class has one', () => {
    mocks.rooms = [room('a', 'Klassenraum')];
    render(<RoomListSection />);

    expect(screen.getByText(/Fachräume|the lab/)).toBeInTheDocument();
  });
});

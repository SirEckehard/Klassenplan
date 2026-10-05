// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import type { RoomRecord, SavedPlan } from '@/types';
import { createMockSavedPlan } from '@/__tests__/utils';
import { RoomListSection } from '../RoomSetupSections';

const mocks = vi.hoisted(() => ({
  rooms: [] as RoomRecord[],
  activeRoomId: null as string | null,
  openRoom: vi.fn(),
  createRoom: vi.fn(),
  renameRoom: vi.fn(),
  deleteRoom: vi.fn(),
  seatingHistory: [] as SavedPlan[],
  confirmDialog: vi.fn(),
  showToast: vi.fn(),
}));

vi.mock('@/contexts/seatingPlan/seatingPlanSelectors', () => ({
  useOptionalSeatingPlanState: () => ({
    rooms: mocks.rooms,
    activeRoomId: mocks.activeRoomId,
    seatingHistory: mocks.seatingHistory,
  }),
  useOptionalSeatingPlanActions: () => ({
    openRoom: mocks.openRoom,
    createRoom: mocks.createRoom,
    renameRoom: mocks.renameRoom,
    deleteRoom: mocks.deleteRoom,
  }),
}));
vi.mock('@/services/ui/dialogs', () => ({
  confirmDialog: mocks.confirmDialog,
}));
vi.mock('@/utils/ui/toast', () => ({ showToast: mocks.showToast }));

const room = (id: string, name: string): RoomRecord => ({
  id,
  name,
  createdAt: '2026-10-04T08:00:00.000Z',
});

beforeEach(() => {
  mocks.rooms = [room('a', 'Klassenraum'), room('b', 'Labor')];
  mocks.activeRoomId = 'a';
  mocks.seatingHistory = [];
  mocks.deleteRoom.mockReturnValue(null);
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

  it('deletes a room with its plans after asking', async () => {
    const user = userEvent.setup();
    mocks.seatingHistory = [
      createMockSavedPlan({ id: 'p1', roomId: 'b' }),
      createMockSavedPlan({ id: 'p2', roomId: 'b' }),
      createMockSavedPlan({ id: 'p3', roomId: 'a' }),
    ];
    mocks.confirmDialog.mockResolvedValue(true);
    render(<RoomListSection />);

    await user.click(
      screen.getByRole('button', { name: /„Labor“ löschen|Delete “Labor”/ }),
    );

    expect(mocks.confirmDialog).toHaveBeenCalledWith(
      expect.stringMatching(/2/),
      expect.anything(),
    );
    expect(mocks.deleteRoom).toHaveBeenCalledWith('b');
    expect(mocks.showToast).toHaveBeenCalledWith(
      'success',
      expect.stringMatching(/Labor/),
    );
  });

  it('keeps a room when the question is declined', async () => {
    const user = userEvent.setup();
    mocks.confirmDialog.mockResolvedValue(false);
    render(<RoomListSection />);

    await user.click(
      screen.getByRole('button', { name: /„Labor“ löschen|Delete “Labor”/ }),
    );

    expect(mocks.deleteRoom).not.toHaveBeenCalled();
  });

  it('says why the open room cannot be deleted', async () => {
    const user = userEvent.setup();
    render(<RoomListSection />);

    const bin = screen.getByRole('button', {
      name: /„Klassenraum“ löschen|Delete “Klassenraum”/,
    });
    expect(bin).toHaveAttribute('aria-disabled', 'true');
    await user.click(bin);

    expect(mocks.confirmDialog).not.toHaveBeenCalled();
    expect(mocks.deleteRoom).not.toHaveBeenCalled();
    expect(mocks.showToast).toHaveBeenCalledWith(
      'info',
      expect.stringMatching(/offenen Raum|open room/),
    );
  });

  it('offers no bin while the class has one room', () => {
    mocks.rooms = [room('a', 'Klassenraum')];
    render(<RoomListSection />);

    expect(
      screen.queryByRole('button', { name: /löschen|Delete/ }),
    ).not.toBeInTheDocument();
  });

  it('suggests rooms of their own for specialist rooms while the class has one', () => {
    mocks.rooms = [room('a', 'Klassenraum')];
    render(<RoomListSection />);

    expect(screen.getByText(/Fachräume|the lab/)).toBeInTheDocument();
  });
});

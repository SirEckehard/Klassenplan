// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * A room in "Bibliothek": kept as a template the way the room's own
 * inspector keeps it — named in a row, a taken name replaced only from a
 * step of its own.
 */
import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import RoomPanel from '../RoomPanel';
import type { ClassroomTemplate } from '@/types';

const scene = { tables: [], features: [], totalStudents: 0 };

const renderPanel = (templates: ClassroomTemplate[] = []) => {
  const onSaveAsTemplate = vi.fn((..._args: unknown[]) =>
    Promise.resolve(true),
  );
  render(
    <RoomPanel
      room={{ id: 'lab', name: 'Chemie', scene, isOpen: false }}
      otherRoomNames={['Klassenraum']}
      planCount={2}
      templates={templates}
      onRename={vi.fn(() => null)}
      onSaveAsTemplate={onSaveAsTemplate}
      onDelete={vi.fn()}
      deleteBlockedHint={null}
      renameRequest={0}
    />,
  );
  return { onSaveAsTemplate };
};

const saveRow = () =>
  screen.getByRole('button', {
    name: /Als Vorlage für andere Klassen speichern|Save as a template/i,
  });
const nameField = () =>
  screen.getByRole('textbox', { name: /Name der Vorlage|Template name/i });

afterEach(cleanup);

describe('RoomPanel', () => {
  it('asks for the template’s name, starting from the room’s', async () => {
    const { onSaveAsTemplate } = renderPanel();

    fireEvent.click(saveRow());
    expect(saveRow()).toHaveAttribute('aria-expanded', 'true');
    expect(nameField()).toHaveValue('Chemie');

    fireEvent.change(nameField(), { target: { value: 'Chemie-Fachraum' } });
    fireEvent.keyDown(nameField(), { key: 'Enter' });

    expect(onSaveAsTemplate).toHaveBeenCalledWith('Chemie-Fachraum', undefined);
    await waitFor(() =>
      expect(
        screen.queryByRole('textbox', { name: /Vorlage|Template/ }),
      ).toBeNull(),
    );
  });

  it('replaces a template of the same name only from its own step', () => {
    const { onSaveAsTemplate } = renderPanel([
      { id: 7, name: 'Chemie', scene },
    ]);

    fireEvent.click(saveRow());
    fireEvent.keyDown(nameField(), { key: 'Enter' });
    expect(onSaveAsTemplate).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole('button', {
        name: /Vorlage „Chemie“ ersetzen|Replace template “Chemie”/,
      }),
    );
    expect(onSaveAsTemplate).toHaveBeenCalledWith('Chemie', 7);
  });
});

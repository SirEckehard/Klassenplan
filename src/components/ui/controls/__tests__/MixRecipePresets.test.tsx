// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { memory, confirm } = vi.hoisted(() => ({
  memory: new Map<string, unknown>(),
  confirm: vi.fn(),
}));
vi.mock('idb-keyval', async () =>
  (await import('@/__tests__/utils/memoryIdbKeyval')).createMemoryIdbKeyval(
    memory,
  ),
);
vi.mock('@/services/ui/dialogs', () => ({
  confirmDialog: (...args: unknown[]) => confirm(...args),
}));

import '@/i18n/i18n';
import SmartMixControls, { MixRecipeSection } from '../SmartMixControls';
import { createSuspendedWeights } from '@/hooks/ui/useMixCriteria';
import { createMockStudent } from '@/__tests__/utils';
import type { MixSettings, Student } from '@/types';
import { neutralSettings, normalizeMixSettings } from '@/utils';
import { loadMixPresets } from '@/repositories/mixPresetStore';

// Every criterion but language levels and social roles has data.
const students: Student[] = [
  createMockStudent({
    id: '1',
    gender: 'boy',
    height: 'small',
    restless: true,
    shy: true,
    concentrationIssues: true,
    needsFrontSeat: true,
    performanceStrong: true,
    wishPartnerId: '2',
    avoidPartnerId: '3',
    prefersWindow: true,
  }),
  createMockStudent({
    id: '2',
    gender: 'girl',
    height: 'tall',
    restless: true,
    concentrationIssues: true,
    performanceWeak: true,
    prefersDoor: true,
  }),
  createMockStudent({ id: '3', gender: 'diverse' }),
];

function Harness() {
  const [settings, setSettings] = React.useState<MixSettings>(() =>
    normalizeMixSettings({}, neutralSettings),
  );
  const [suspendedWeights] = React.useState(createSuspendedWeights);
  const controls = {
    settings,
    setMixSettings: setSettings,
    students,
    suspendedWeights,
  };
  return (
    <>
      <MixRecipeSection {...controls} />
      <SmartMixControls {...controls} />
      <span hidden data-testid="restless">
        {settings.avoidRestlessTogether}
      </span>
    </>
  );
}

const recipeButton = () =>
  screen.getByRole('button', { name: /^(Voreinstellung|Preset):/ });

const openMenu = () => {
  fireEvent.click(recipeButton());
  return within(screen.getByRole('dialog'));
};

const chooseRecipe = (name: RegExp) => {
  fireEvent.click(openMenu().getByRole('button', { name }));
};

/** Sets restlessness to "Aus" by its scale. */
const restlessOff = () =>
  fireEvent.click(
    screen.getByRole('button', {
      name: /^(Unruhe|Restlessness): (Aus|Off)$/,
    }),
  );

const restless = () => Number(screen.getByTestId('restless').textContent);

beforeEach(() => {
  memory.clear();
  confirm.mockReset();
  vi.stubGlobal('indexedDB', {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('MixRecipeSection — presets (decision 0038)', () => {
  it('keeps a change in a shipped preset and gives it back its own', async () => {
    render(<Harness />);
    chooseRecipe(/^(Klassenarbeit|Written test)/);
    expect(restless()).toBe(9);

    restlessOff();
    expect(recipeButton()).toHaveTextContent(
      /Klassenarbeit · geändert|Written test · changed/,
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: /Änderungen in „Klassenarbeit“ übernehmen|Save changes to “Written test”/,
      }),
    );

    await waitFor(() =>
      expect(recipeButton()).toHaveTextContent(
        /^(Klassenarbeit|Written test)$/,
      ),
    );
    expect((await loadMixPresets()).overrides.exam?.weights).toMatchObject({
      avoidRestlessTogether: 0,
    });
    expect(
      openMenu().getByRole('button', { name: /Klassenarbeit|Written test/ }),
    ).toHaveTextContent(/angepasst|adjusted/);
    fireEvent.click(recipeButton());

    fireEvent.click(
      screen.getByRole('button', {
        name: /Original wiederherstellen|Restore original/,
      }),
    );

    await waitFor(() => expect(restless()).toBe(9));
    await waitFor(() =>
      expect(
        screen.queryByRole('button', {
          name: /Original wiederherstellen|Restore original/,
        }),
      ).not.toBeInTheDocument(),
    );
    expect((await loadMixPresets()).overrides).toEqual({});
  });

  it('offers no change to "Standard", only a new preset', () => {
    render(<Harness />);
    chooseRecipe(/^(Standard|Default)/);

    restlessOff();

    expect(recipeButton()).toHaveTextContent(
      /Standard · geändert|Default · changed/,
    );
    expect(
      screen.queryByRole('button', { name: /übernehmen|Save changes/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /Als Voreinstellung speichern|Save as preset/,
      }),
    ).toBeInTheDocument();
  });

  it('saves a mix of its own, renames it and deletes it', async () => {
    render(<Harness />);
    chooseRecipe(/^(Klassenarbeit|Written test)/);
    restlessOff();

    fireEvent.click(
      screen.getByRole('button', {
        name: /Als neue Voreinstellung speichern|Save as new preset/,
      }),
    );
    const field = screen.getByRole('textbox', {
      name: /Name der Voreinstellung|Preset name/,
    });
    // Named after the preset it came from, made unique.
    expect((field as HTMLInputElement).value).toMatch(
      /^(Klassenarbeit|Written test) \(2\)$/,
    );
    fireEvent.change(field, { target: { value: 'Stillarbeit' } });
    fireEvent.keyDown(field, { key: 'Enter' });

    await waitFor(() =>
      expect(recipeButton()).toHaveTextContent(/^Stillarbeit$/),
    );
    const menu = openMenu();
    expect(menu.getByRole('separator')).toBeInTheDocument();
    expect(
      menu.getByRole('button', { name: /^Stillarbeit/ }),
    ).toHaveTextContent(/Sehr wichtig|Very important/);

    fireEvent.click(
      menu.getByRole('button', {
        name: /„Stillarbeit“ umbenennen|Rename “Stillarbeit”/,
      }),
    );
    const rename = screen.getByRole('textbox', {
      name: /Name der Voreinstellung|Preset name/,
    });
    // A shipped preset's name is taken.
    fireEvent.change(rename, { target: { value: 'Gruppenarbeit' } });
    expect(
      screen.getByText(
        /Eine andere Voreinstellung heißt schon so|Another preset already has this name/,
      ),
    ).toBeInTheDocument();
    fireEvent.change(rename, { target: { value: 'Lesezeit' } });
    fireEvent.keyDown(rename, { key: 'Enter' });

    await waitFor(() => expect(recipeButton()).toHaveTextContent(/^Lesezeit$/));

    confirm.mockResolvedValue(true);
    // Opened outside `act`, which would hold the menu back until it ends.
    const bin = openMenu().getByRole('button', {
      name: /„Lesezeit“ löschen|Delete “Lesezeit”/,
    });
    await act(async () => {
      fireEvent.click(bin);
    });

    await waitFor(async () =>
      expect((await loadMixPresets()).presets).toEqual([]),
    );
    expect(confirm).toHaveBeenCalledOnce();
  });
});

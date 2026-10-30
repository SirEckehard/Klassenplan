// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import React from 'react';
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
import ExportSheetInspector from '../ExportSheetInspector';
import {
  DEFAULT_NOTE_LIST_SETTINGS,
  type NoteListOrder,
  type NoteListSettings,
} from '@/utils/ui/noteList';

afterEach(() => {
  cleanup();
});

const off = { checked: false, onChange: () => {} };

const renderInspector = (
  overrides: Partial<React.ComponentProps<typeof ExportSheetInspector>> = {},
) =>
  render(
    <ExportSheetInspector
      mode="table"
      title=""
      onTitleChange={() => {}}
      orientation="portrait"
      onOrientationChange={() => {}}
      flipView={off}
      frameOnTables={{ checked: true, onChange: () => {} }}
      needs={{ checked: true, onChange: () => {} }}
      badgeFamilies={{
        present: ['behavior', 'space'],
        hidden: ['space'],
        onToggle: () => {},
      }}
      genderColors={{ checked: true, onChange: () => {} }}
      photos={off}
      legend={off}
      classInfo={off}
      connections={off}
      nameDisplay="full"
      onNameDisplayChange={() => {}}
      names={[]}
      featureAvailability={{}}
      featureVisibility={{}}
      onFeatureToggle={() => {}}
      {...overrides}
    />,
  );

describe('ExportSheetInspector badge families', () => {
  it('offers a switch for each family the class carries', () => {
    const onToggle = vi.fn();
    renderInspector({
      badgeFamilies: {
        present: ['behavior', 'space'],
        hidden: ['space'],
        onToggle,
      },
    });

    const group = screen.getByRole('group', {
      name: /Merkmale auf dem Blatt|Markers on the sheet/,
    });
    expect(group).toBeInTheDocument();
    expect(
      screen.getByRole('switch', { name: /^(Verhalten|Behaviour|Behavior)$/ }),
    ).toBeChecked();
    const space = screen.getByRole('switch', {
      name: /^(Platz & Raum|Space & room|Seating & room)$/i,
    });
    expect(space).not.toBeChecked();
    expect(
      screen.queryByRole('switch', { name: /^(Sprache|Language)$/ }),
    ).not.toBeInTheDocument();

    fireEvent.click(space);
    expect(onToggle).toHaveBeenCalledWith('space', true);
  });

  it('hides the families while the badges are off altogether', () => {
    renderInspector({ needs: off });
    expect(
      screen.queryByRole('group', {
        name: /Merkmale auf dem Blatt|Markers on the sheet/,
      }),
    ).not.toBeInTheDocument();
  });
});

describe('ExportSheetInspector room elements', () => {
  const allRoom =
    /^(Alle Raumelemente ein- oder ausblenden|Show or hide all room elements)/;

  // A plan for the class often wants the tables alone: one switch takes
  // every room element off the sheet, and back.
  it('switches every room element the room has at once', () => {
    const onFeatureToggle = vi.fn();
    renderInspector({
      featureAvailability: { window: true, door: true, board: true },
      featureVisibility: { window: true, door: true, board: true },
      onFeatureToggle,
    });

    const all = screen.getByRole('switch', { name: allRoom });
    expect(all).toBeChecked();

    fireEvent.click(all);
    expect(onFeatureToggle).toHaveBeenCalledTimes(3);
    expect(onFeatureToggle.mock.calls.map(([, next]) => next)).toEqual([
      false,
      false,
      false,
    ]);
    // Only what the room has: no cabinet that is not there.
    expect(onFeatureToggle).not.toHaveBeenCalledWith('cabinet', false);
  });

  it('turns them all on while only some are shown', () => {
    const onFeatureToggle = vi.fn();
    renderInspector({
      featureAvailability: { window: true, door: true },
      featureVisibility: { window: true, door: false },
      onFeatureToggle,
    });

    const all = screen.getByRole('switch', { name: allRoom });
    fireEvent.click(all);
    expect(onFeatureToggle).toHaveBeenCalledWith('window', true);
    expect(onFeatureToggle).toHaveBeenCalledWith('door', true);
  });
});

describe('ExportSheetInspector framing', () => {
  const frameSwitch = () =>
    screen.queryByRole('switch', {
      name: /^(Anzeige vergrößern|Enlarge the plan)$/,
    });

  it('frames the seating plan on the tables until it is switched off', () => {
    const onChange = vi.fn();
    renderInspector({ frameOnTables: { checked: true, onChange } });

    expect(frameSwitch()).toBeChecked();

    fireEvent.click(frameSwitch()!);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('shows the whole room once switched off', () => {
    renderInspector({ frameOnTables: off });
    expect(frameSwitch()).not.toBeChecked();
  });

  it('leaves the switch out for the circle, whose sheet shows no room', () => {
    renderInspector({ mode: 'circle' });
    expect(frameSwitch()).not.toBeInTheDocument();
  });
});

describe('ExportSheetInspector gender colours', () => {
  const genderSwitch = () =>
    screen.getByRole('switch', {
      name: /^(Geschlechterfarben|Gender colors)$/,
    });

  it('switches the tint off for both arrangements', () => {
    for (const mode of ['table', 'circle'] as const) {
      const onChange = vi.fn();
      renderInspector({ mode, genderColors: { checked: true, onChange } });

      expect(genderSwitch()).toBeChecked();
      fireEvent.click(genderSwitch());
      expect(onChange).toHaveBeenCalledWith(false);
      cleanup();
    }
  });
});

describe('ExportSheetInspector note list', () => {
  const noteList = (
    patch: Partial<NoteListSettings> = {},
    orders: NoteListOrder[] = ['tables', 'alphabetical', 'lastName'],
  ) => ({
    settings: { ...DEFAULT_NOTE_LIST_SETTINGS, ...patch },
    onChange: vi.fn(),
    orders,
  });

  it('sets the form, the lines and the order of the list', () => {
    const list = noteList();
    renderInspector({ mode: 'list', noteList: list });

    fireEvent.click(screen.getByRole('button', { name: /^(Raster|Grid)$/ }));
    expect(list.onChange).toHaveBeenCalledWith({ form: 'grid' });

    fireEvent.click(screen.getByRole('button', { name: '3' }));
    expect(list.onChange).toHaveBeenCalledWith({ lines: 3 });

    fireEvent.click(
      screen.getByRole('button', { name: /^(Nach Vorname|By first name)$/ }),
    );
    expect(list.onChange).toHaveBeenCalledWith({ order: 'alphabetical' });

    fireEvent.click(
      screen.getByRole('button', { name: /^(Nach Nachname|By last name)$/ }),
    );
    expect(list.onChange).toHaveBeenCalledWith({ order: 'lastName' });
  });

  it('asks for columns instead of lines on a grid', () => {
    const list = noteList({ form: 'grid' });
    renderInspector({ mode: 'list', noteList: list });

    fireEvent.click(screen.getByRole('button', { name: '12' }));
    expect(list.onChange).toHaveBeenCalledWith({ columns: 12 });
  });

  it('offers the orders there is something to follow for', () => {
    renderInspector({ mode: 'list', noteList: noteList() });
    expect(
      screen.queryByRole('button', { name: /Im Sitzkreis|Round the circle/ }),
    ).not.toBeInTheDocument();

    cleanup();
    renderInspector({
      mode: 'list',
      noteList: noteList({}, ['tables', 'circle', 'alphabetical', 'lastName']),
    });
    expect(
      screen.getByRole('button', { name: /Im Sitzkreis|Round the circle/ }),
    ).toBeInTheDocument();
  });

  it('offers first and last name where there is no plan to follow', () => {
    renderInspector({
      mode: 'list',
      noteList: noteList({}, ['alphabetical', 'lastName']),
    });

    expect(
      screen.getByRole('button', { name: /^(Nach Vorname|By first name)$/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^(Nach Nachname|By last name)$/ }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^(Nach Tischen|By table)$/ }),
    ).not.toBeInTheDocument();
  });

  it('leaves out what a list of names has no use for', () => {
    renderInspector({ mode: 'list', noteList: noteList() });

    for (const name of [
      /^(Geschlechterfarben|Gender colours|Gender colors)$/,
      /^(Legende|Legend)$/,
      /^(Verbindungen|Connections)$/,
      /^(Anzeige vergrößern|Enlarge view|Zoom in)$/i,
    ]) {
      expect(screen.queryByRole('switch', { name })).not.toBeInTheDocument();
    }
  });

  it('counts the pages in its heading', () => {
    renderInspector({ mode: 'list', noteList: noteList(), pageCount: 3 });

    expect(screen.getByText(/3 (Seiten|pages)/)).toBeInTheDocument();
  });
});

describe('ExportSheetInspector order', () => {
  const headings = () =>
    screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);

  // From the sheet as a whole to its details.
  it('runs from the page to the room elements', () => {
    renderInspector({
      featureAvailability: { board: true },
      featureVisibility: { board: true },
    });

    expect(headings()).toEqual([
      expect.stringMatching(/^(Seitenformat|Page Format)$/),
      expect.stringMatching(/^(Kopfzeile|Header)$/),
      expect.stringMatching(/^(Namen|Names)$/),
      expect.stringMatching(/^(Auf dem Blatt|On the sheet)$/),
      expect.stringMatching(/^(Raumelemente|Room Elements)$/),
    ]);
  });

  it('names the sheet by its title in the header, renamed there', async () => {
    const onTitleChange = vi.fn();
    renderInspector({ title: '7b im September', onTitleChange });

    const heading = screen.getByRole('heading', {
      level: 2,
      name: '7b im September',
    });
    fireEvent.click(within(heading).getByRole('button'));
    const field = screen.getByRole('textbox', { name: /^(Titel|Title)$/ });
    fireEvent.change(field, { target: { value: '7b ab Oktober' } });
    fireEvent.keyDown(field, { key: 'Enter' });

    expect(onTitleChange).toHaveBeenCalledWith('7b ab Oktober');
    // What the commit sets once it resolved settles inside act.
    await act(async () => {});
  });

  it('keeps an emptied title empty', async () => {
    const onTitleChange = vi.fn();
    renderInspector({ title: '7b im September', onTitleChange });

    fireEvent.click(
      within(screen.getByRole('heading', { level: 2 })).getByRole('button'),
    );
    const field = screen.getByRole('textbox', { name: /^(Titel|Title)$/ });
    fireEvent.change(field, { target: { value: '' } });
    fireEvent.blur(field);

    expect(onTitleChange).toHaveBeenCalledWith('');
    // What the commit sets once it resolved settles inside act.
    await act(async () => {});
  });

  it('puts the class info in the header section', () => {
    renderInspector();

    const section = screen
      .getByRole('heading', { name: /^(Kopfzeile|Header)$/ })
      .closest('section') as HTMLElement;
    expect(within(section).queryByRole('textbox')).toBeNull();
    expect(
      within(section).getByRole('switch', {
        name: /^(Klasseninfos|Class info)$/,
      }),
    ).toBeInTheDocument();
  });

  // The colours follow the photos they frame on the list, and the legend
  // follows what it explains.
  it('lists photos, colours, markers and the legend in that order', () => {
    renderInspector();

    const names = screen
      .getAllByRole('switch')
      .map((element) => element.getAttribute('aria-label') ?? '');
    const position = (pattern: RegExp) =>
      names.findIndex((name) => pattern.test(name));
    const photos = position(/^(Fotos|Photos)$/);
    const colours = position(/^(Geschlechterfarben|Gender colors)$/);
    const markers = position(/^(Merkmale|Markers)$/);
    const legend = position(/^(Legende|Legend)$/);
    expect(photos).toBeGreaterThanOrEqual(0);
    expect(photos).toBeLessThan(colours);
    expect(colours).toBeLessThan(markers);
    expect(markers).toBeLessThan(legend);
  });
});

describe('ExportSheetInspector legend', () => {
  it('greys the legend out, off, with the reason as its tooltip', () => {
    const onChange = vi.fn();
    renderInspector({
      legend: { checked: true, onChange, unavailable: 'Nothing to explain' },
    });

    const legend = screen.getByRole('switch', { name: /^(Legende|Legend)$/ });
    expect(legend).toBeDisabled();
    expect(legend).toHaveAttribute('aria-checked', 'false');
    expect(legend).toHaveAttribute('title', 'Nothing to explain');

    fireEvent.click(screen.getByText(/^(Legende|Legend)$/));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('keeps the legend switch as it is while there is something to explain', () => {
    renderInspector({ legend: { checked: true, onChange: () => {} } });

    const legend = screen.getByRole('switch', { name: /^(Legende|Legend)$/ });
    expect(legend).toBeEnabled();
    expect(legend).toHaveAttribute('aria-checked', 'true');
  });
});

// Decision 0034: the substitute's sheet has rows of its own and none for
// what it never carries.
describe('ExportSheetInspector substitute sheet', () => {
  const substitute = (
    overrides: Partial<
      NonNullable<
        React.ComponentProps<typeof ExportSheetInspector>['substitute']
      >
    > = {},
  ) => ({
    arrangement: 'table' as const,
    onArrangementChange: vi.fn(),
    date: '2026-11-03',
    onDateChange: vi.fn(),
    room: { checked: true, onChange: vi.fn() },
    note: '',
    onNoteChange: vi.fn(),
    lines: 3 as const,
    onLinesChange: vi.fn(),
    ...overrides,
  });
  const headings = () =>
    screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);

  it('runs from the page through the header and the notes to the room elements', () => {
    renderInspector({
      mode: 'substitute',
      substitute: substitute(),
      featureAvailability: { board: true },
      featureVisibility: { board: true },
    });

    expect(headings()).toEqual([
      expect.stringMatching(/^(Seitenformat|Page Format)$/),
      expect.stringMatching(/^(Kopfzeile|Header)$/),
      expect.stringMatching(/^(Anmerkungen|Notes)$/),
      expect.stringMatching(/^(Namen|Names)$/),
      expect.stringMatching(/^(Auf dem Blatt|On the sheet)$/),
      expect.stringMatching(/^(Raumelemente|Room Elements)$/),
    ]);
  });

  it('offers photos alone of what a seat may carry', () => {
    renderInspector({ mode: 'substitute', substitute: substitute() });

    expect(
      screen.getByRole('switch', { name: /^(Fotos|Photos)$/ }),
    ).toBeInTheDocument();
    for (const name of [
      /^(Merkmale|Markers)$/,
      /^(Geschlechterfarben|Gender colors)$/,
      /^(Legende|Legend)$/,
      /^(Verbindungen|Connections)$/,
    ]) {
      expect(screen.queryByRole('switch', { name })).toBeNull();
    }
    expect(
      screen.queryByRole('group', {
        name: /Merkmale auf dem Blatt|Markers on the sheet/,
      }),
    ).toBeNull();
  });

  it('switches between the plan and the circle', () => {
    const onArrangementChange = vi.fn();
    renderInspector({
      mode: 'substitute',
      substitute: substitute({ onArrangementChange }),
    });

    fireEvent.click(
      screen.getByRole('button', { name: /^(Sitzkreis|Circle)$/ }),
    );
    expect(onArrangementChange).toHaveBeenCalledWith('circle');
  });

  it('leaves the view direction and the room elements out for the circle', () => {
    renderInspector({
      mode: 'substitute',
      substitute: substitute({ arrangement: 'circle' }),
      featureAvailability: { board: true },
      featureVisibility: { board: true },
    });

    expect(
      screen.queryByRole('switch', { name: /^(Anzeige vergrößern|Enlarge)/ }),
    ).toBeNull();
    expect(headings()).not.toContainEqual(
      expect.stringMatching(/^(Raumelemente|Room Elements)$/),
    );
  });

  it('sets the day of the cover and the room in the header', () => {
    const onDateChange = vi.fn();
    const onRoom = vi.fn();
    renderInspector({
      mode: 'substitute',
      substitute: substitute({
        onDateChange,
        room: { checked: true, onChange: onRoom },
      }),
    });

    const date = screen.getByLabelText(/^(Datum|Date)$/);
    expect(date).toHaveValue('2026-11-03');
    fireEvent.change(date, { target: { value: '2026-11-04' } });
    expect(onDateChange).toHaveBeenCalledWith('2026-11-04');

    fireEvent.click(screen.getByRole('switch', { name: /^(Raum|Room)$/ }));
    expect(onRoom).toHaveBeenCalledWith(false);
  });

  it('takes the note when the field is left and says it is not stored', async () => {
    const onNoteChange = vi.fn();
    renderInspector({
      mode: 'substitute',
      substitute: substitute({ onNoteChange }),
    });

    const field = screen.getByRole('textbox', {
      name: /Hinweis für die Vertretung|Note for the substitute/,
    });
    fireEvent.change(field, { target: { value: 'Arbeitsblatt Seite 12' } });
    fireEvent.blur(field);

    expect(onNoteChange).toHaveBeenCalledWith('Arbeitsblatt Seite 12');
    expect(
      screen.getByText(/nicht gespeichert|never stored/),
    ).toBeInTheDocument();
    await act(async () => {});
  });

  it('chooses how many lines to write on', () => {
    const onLinesChange = vi.fn();
    renderInspector({
      mode: 'substitute',
      substitute: substitute({ onLinesChange }),
    });

    fireEvent.click(screen.getByRole('button', { name: '6' }));
    fireEvent.click(screen.getByRole('button', { name: /^(Keine|None)$/ }));
    expect(onLinesChange.mock.calls).toEqual([[6], [0]]);
  });
});

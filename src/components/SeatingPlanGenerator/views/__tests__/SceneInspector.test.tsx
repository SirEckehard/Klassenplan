// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
  within,
} from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@/i18n';
import SceneInspector from '../SceneInspector';
import type {
  ClassroomFeature,
  ClassroomTable,
  ClassroomTemplate,
} from '@/types';
import { confirmDialog } from '@/services/ui/dialogs';
import type {
  SceneTransactionRunner,
  SceneTransactionState,
} from '@/hooks/scene/useSceneManager';

const table = (overrides: Partial<ClassroomTable> = {}): ClassroomTable => ({
  x: 100,
  y: 200,
  width: 180,
  height: 106,
  rotation: 0,
  seatCount: 4,
  locked: false,
  zIndex: 1,
  templateType: 'group4',
  ...overrides,
});

const window_: ClassroomFeature = {
  id: 'f1',
  type: 'window',
  x: 10,
  y: 140,
  width: 12,
  height: 90,
  anchor: 'right',
  movable: false,
  rotation: 0,
};

const lectern = (
  overrides: Partial<ClassroomFeature> = {},
): ClassroomFeature => ({
  id: 'p1',
  type: 'podium',
  x: 300,
  y: 300,
  width: 90,
  height: 60,
  anchor: 'free',
  movable: true,
  rotation: 0,
  ...overrides,
});

const board: ClassroomFeature = {
  ...window_,
  id: 'f2',
  type: 'board',
  anchor: 'top',
};

// Deleting a template asks first; the dialog itself is not this panel's.
vi.mock('@/services/ui/dialogs', () => ({
  confirmDialog: vi.fn(() => Promise.resolve(true)),
}));

const template = (
  id: number,
  name: string,
  tables: ClassroomTable[],
): ClassroomTemplate => ({
  id,
  name,
  scene: { tables, features: [], totalStudents: 0 },
});

const renderInspector = (
  props: Partial<React.ComponentProps<typeof SceneInspector>> = {},
) => {
  const snapshot = vi.fn();
  const onRotateSelection = vi.fn();
  const runSceneTransaction = vi.fn<SceneTransactionRunner>(() => ({}));
  const onDeleteSelection = vi.fn();
  const onDuplicateSelection = vi.fn();
  const onCopySelection = vi.fn();
  const onCutSelection = vi.fn();
  const onPasteSelection = vi.fn();
  const onSetUpRoom = vi.fn();
  const onLoadTemplate = vi.fn();
  const onRenameTemplate = vi.fn(() => Promise.resolve({ success: true }));
  const onDeleteTemplate = vi.fn();
  const onSaveTemplate = vi.fn();
  const element = (
    overrides: Partial<React.ComponentProps<typeof SceneInspector>>,
  ) => (
    <SceneInspector
      tables={[table(), table({ x: 400, seatCount: 2 })]}
      features={[window_, board]}
      selectedTableIds={[]}
      selectedFeatureIds={[]}
      featurePalette={[
        { type: 'window', label: 'Fenster', allowMultiple: true },
        { type: 'board', label: 'Tafel', allowMultiple: false },
      ]}
      studentsCount={5}
      onSetUpRoom={onSetUpRoom}
      templates={[]}
      onLoadTemplate={onLoadTemplate}
      onRenameTemplate={onRenameTemplate}
      onDeleteTemplate={onDeleteTemplate}
      onSaveTemplate={onSaveTemplate}
      snapshot={snapshot}
      onRotateSelection={onRotateSelection}
      runSceneTransaction={runSceneTransaction}
      onDeleteSelection={onDeleteSelection}
      onDuplicateSelection={onDuplicateSelection}
      onCopySelection={onCopySelection}
      onCutSelection={onCutSelection}
      onPasteSelection={onPasteSelection}
      canPaste={false}
      {...overrides}
    />
  );
  const { rerender } = render(element(props));
  return {
    /** Renders the same panel again with changed props, keeping its state. */
    rerender: (next: Partial<React.ComponentProps<typeof SceneInspector>>) =>
      rerender(element({ ...props, ...next })),
    snapshot,
    onRotateSelection,
    runSceneTransaction,
    onDeleteSelection,
    onDuplicateSelection,
    onCopySelection,
    onCutSelection,
    onPasteSelection,
    onSetUpRoom,
    onLoadTemplate,
    onRenameTemplate,
    onDeleteTemplate,
    onSaveTemplate,
  };
};

/** What the panel hands on: angles for tables by index, elements by id. */
const turned = (
  tables: Array<[number, number]>,
  features: Array<[string, number]> = [],
) => ({ tables: new Map(tables), features: new Map(features) });

const angleField = () =>
  screen.getByRole('textbox', { name: /Drehung in Grad|Rotation in/i });

/** Runs the change the component handed to `runSceneTransaction`. */
const applyTransaction = (
  runSceneTransaction: ReturnType<typeof vi.fn<SceneTransactionRunner>>,
  state: Partial<SceneTransactionState>,
) => {
  const [mutator, options] = runSceneTransaction.mock.calls[0];
  const base: SceneTransactionState = {
    scene: { tables: [], features: [], totalStudents: 0 },
    tables: [],
    features: [],
    seating: [],
    ...state,
  };
  return { result: mutator(base) ?? {}, options };
};

afterEach(cleanup);

describe('SceneInspector', () => {
  // Seats and students are the status bar's to state; the room panel only
  // names how many tables stand there.
  it('names the room and its tables while nothing is selected', () => {
    renderInspector();

    const heading = screen.getByRole('heading', { name: /^(Raum|Room)$/ });
    expect(heading).toBeVisible();
    expect(
      within(heading.parentElement as HTMLElement).getByText(
        /^(2 Tische|2 tables)$/,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/^(Schüler|Students)$/)).not.toBeInTheDocument();
  });

  it('says so when the room has no tables yet', () => {
    renderInspector({ tables: [] });

    expect(
      screen.getByText(/Noch keine Tische|No tables yet/),
    ).toBeInTheDocument();
  });

  it('sets the room up with as many tables as the class needs', () => {
    const { onSetUpRoom } = renderInspector({ studentsCount: 25 });

    // 25 students: 25 single seats, 13 doubles, 7 groups of 4, 5 of 6.
    const setup = screen.getByRole('heading', { name: /^(Einrichten|Set up)$/ })
      .parentElement as HTMLElement;
    const rows = within(setup).getAllByRole('button');
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringMatching(/^(Einzelplätze|Single seats)25 (Tische|tables)$/),
      expect.stringMatching(/^(Doppelplätze|Double seats)13 (Tische|tables)$/),
      expect.stringMatching(/^(4er-Gruppen|Groups of 4)7 (Tische|tables)$/),
      expect.stringMatching(/^(6er-Gruppen|Groups of 6)5 (Tische|tables)$/),
    ]);

    fireEvent.click(rows[1]);
    expect(onSetUpRoom).toHaveBeenCalledWith('double');
  });

  // The setup replaces what stands there; the hint says so, and how to get
  // it back.
  it('warns that setting up replaces the tables, but not in an empty room', () => {
    const { rerender } = renderInspector();
    const row = () =>
      screen.getByRole('button', { name: /^(Doppelplätze|Double seats)/ });
    expect(row()).toHaveAccessibleDescription(/Strg\/⌘\+Z|Ctrl\/⌘\+Z/);

    rerender({ tables: [] });
    expect(row()).not.toHaveAccessibleDescription(/Strg\/⌘\+Z|Ctrl\/⌘\+Z/);
  });

  it('offers no setup to a class without students', () => {
    renderInspector({ studentsCount: 0 });

    expect(
      screen.getByRole('button', { name: /^(Doppelplätze|Double seats)/ }),
    ).toBeDisabled();
    expect(screen.getByText(/zuerst Schüler|Add students/)).toBeInTheDocument();
  });

  it('moves the focus to the setup when it is asked for', async () => {
    const { rerender } = renderInspector();

    rerender({ setupFocusRequest: 1 });

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /^(Einzelplätze|Single seats)/ }),
      ).toHaveFocus(),
    );
  });

  it('keeps this room as a template and loads a saved one', () => {
    const { onSaveTemplate, onLoadTemplate } = renderInspector({
      templates: [template(7, 'Raum 104', [table(), table({ seatCount: 2 })])],
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: /Diesen Raum als Vorlage speichern|Save this room as a template/,
      }),
    );
    expect(onSaveTemplate).toHaveBeenCalledTimes(1);

    const saved = screen.getByRole('button', { name: /^Raum 104/ });
    expect(saved).toHaveTextContent(/2 (Tische|tables) · 6 (Plätze|seats)/);
    fireEvent.click(saved);
    expect(onLoadTemplate).toHaveBeenCalledWith(7);
  });

  it('explains templates before there is one', () => {
    renderInspector();

    expect(
      screen.getByText(/in anderen Klassen zu laden|load it in other classes/),
    ).toBeInTheDocument();
  });

  it('renames a template in its row, refusing a name another one carries', async () => {
    const { onRenameTemplate } = renderInspector({
      templates: [template(1, 'Raum 104', []), template(2, 'Raum 105', [])],
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: /„Raum 104“ umbenennen|Rename “Raum 104”/,
      }),
    );
    const field = screen.getByRole('textbox', {
      name: /Name der Vorlage|Template name/,
    });
    expect(field).toHaveValue('Raum 104');

    fireEvent.change(field, { target: { value: 'Raum 105' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(field).toHaveAttribute('aria-invalid', 'true');
    expect(onRenameTemplate).not.toHaveBeenCalled();

    fireEvent.change(field, { target: { value: 'Physikraum' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(onRenameTemplate).toHaveBeenCalledWith(1, 'Physikraum');
    await waitFor(() =>
      expect(
        screen.queryByRole('textbox', {
          name: /Name der Vorlage|Template name/,
        }),
      ).not.toBeInTheDocument(),
    );
  });

  it('drops a rename on Escape', () => {
    const { onRenameTemplate } = renderInspector({
      templates: [template(1, 'Raum 104', [])],
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: /„Raum 104“ umbenennen|Rename “Raum 104”/,
      }),
    );
    const field = screen.getByRole('textbox', {
      name: /Name der Vorlage|Template name/,
    });
    fireEvent.change(field, { target: { value: 'Anders' } });
    fireEvent.keyDown(field, { key: 'Escape' });

    expect(field).not.toBeInTheDocument();
    expect(onRenameTemplate).not.toHaveBeenCalled();
  });

  // A template is not part of the room's undo history, so removing one asks.
  it('deletes a template only once that is confirmed', async () => {
    const { onDeleteTemplate } = renderInspector({
      templates: [template(3, 'Raum 104', [])],
    });
    const deleteButton = screen.getByRole('button', {
      name: /„Raum 104“ löschen|Delete “Raum 104”/,
    });

    vi.mocked(confirmDialog).mockResolvedValueOnce(false);
    fireEvent.click(deleteButton);
    await waitFor(() => expect(confirmDialog).toHaveBeenCalledTimes(1));
    expect(onDeleteTemplate).not.toHaveBeenCalled();

    fireEvent.click(deleteButton);
    await waitFor(() => expect(onDeleteTemplate).toHaveBeenCalledWith(3));
  });

  it('names the selected table and states its seats', () => {
    renderInspector({ selectedTableIds: [0] });

    expect(
      screen.getByRole('heading', { name: /4er-Gruppe|Group of 4/i }),
    ).toBeVisible();
    expect(screen.getByText(/Tisch 1 von 2|Table 1 of 2/i)).toBeInTheDocument();
  });

  it('rotates in the 45° steps of Q/E, through undo history', () => {
    const { snapshot, onRotateSelection } = renderInspector({
      selectedTableIds: [0],
    });

    fireEvent.click(
      screen.getByRole('button', { name: /Im Uhrzeigersinn|clockwise/i }),
    );

    expect(snapshot).toHaveBeenCalledTimes(1);
    expect(onRotateSelection).toHaveBeenCalledWith(turned([[0, 45]]));
  });

  it('wraps a rotation below zero round to 315°', () => {
    const { onRotateSelection } = renderInspector({ selectedTableIds: [0] });

    fireEvent.click(
      screen.getByRole('button', {
        name: /Gegen den Uhrzeigersinn|counter-clockwise/i,
      }),
    );

    expect(onRotateSelection).toHaveBeenCalledWith(turned([[0, 315]]));
  });

  it('shows the angle the table has, rounded to whole degrees', () => {
    renderInspector({
      tables: [table({ rotation: 37.4 })],
      selectedTableIds: [0],
    });

    expect(
      screen.getByRole('textbox', { name: /Drehung in Grad|Rotation in/i }),
    ).toHaveValue('37');
  });

  it('follows the angle while the handle turns the table', () => {
    const { rerender } = renderInspector({
      tables: [table({ rotation: 0 })],
      selectedTableIds: [0],
    });
    const field = screen.getByRole('textbox', {
      name: /Drehung in Grad|Rotation in/i,
    });
    expect(field).toHaveValue('0');

    rerender({ tables: [table({ rotation: 52 })] });
    expect(field).toHaveValue('52');

    // What is being typed stays put until it is taken or dropped.
    fireEvent.change(field, { target: { value: '9' } });
    rerender({ tables: [table({ rotation: 60 })] });
    expect(field).toHaveValue('9');
  });

  it('takes a typed angle on Enter, through undo history', () => {
    const { snapshot, onRotateSelection } = renderInspector({
      selectedTableIds: [0],
    });
    const field = screen.getByRole('textbox', {
      name: /Drehung in Grad|Rotation in/i,
    });

    fireEvent.change(field, { target: { value: '120' } });
    fireEvent.keyDown(field, { key: 'Enter' });

    expect(snapshot).toHaveBeenCalledTimes(1);
    expect(onRotateSelection).toHaveBeenCalledWith(turned([[0, 120]]));
  });

  it('wraps a typed angle round as a turn does', () => {
    const { onRotateSelection } = renderInspector({
      tables: [table({ rotation: 10 })],
      selectedTableIds: [0],
    });
    const field = screen.getByRole('textbox', {
      name: /Drehung in Grad|Rotation in/i,
    });

    fireEvent.change(field, { target: { value: '400' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(onRotateSelection).toHaveBeenLastCalledWith(turned([[0, 40]]));

    fireEvent.change(field, { target: { value: '-90' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(onRotateSelection).toHaveBeenLastCalledWith(turned([[0, 270]]));

    fireEvent.change(field, { target: { value: '360' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(onRotateSelection).toHaveBeenLastCalledWith(turned([[0, 0]]));
  });

  it('takes a typed angle when the field is left, decimal comma included', () => {
    const { onRotateSelection } = renderInspector({ selectedTableIds: [0] });
    const field = screen.getByRole('textbox', {
      name: /Drehung in Grad|Rotation in/i,
    });

    fireEvent.change(field, { target: { value: '22,6' } });
    fireEvent.blur(field);

    expect(onRotateSelection).toHaveBeenCalledWith(turned([[0, 23]]));
  });

  it('drops the draft on Escape and ignores what is not a number', () => {
    const { snapshot, onRotateSelection } = renderInspector({
      selectedTableIds: [0],
    });
    const field = screen.getByRole('textbox', {
      name: /Drehung in Grad|Rotation in/i,
    });

    fireEvent.change(field, { target: { value: '90' } });
    fireEvent.keyDown(field, { key: 'Escape' });
    expect(field).toHaveValue('0');
    fireEvent.blur(field);

    fireEvent.change(field, { target: { value: 'quer' } });
    fireEvent.blur(field);
    expect(field).toHaveValue('0');

    expect(snapshot).not.toHaveBeenCalled();
    expect(onRotateSelection).not.toHaveBeenCalled();
  });

  // Dragging places and sizes a table; the panel no longer asks for pixels.
  // The angle is the one number it takes.
  it('asks for no coordinates or sizes', () => {
    renderInspector({ selectedTableIds: [0] });

    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    expect(screen.queryByLabelText(/^(X|Y)$/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Breite|Width/i)).not.toBeInTheDocument();
  });

  it('copies and cuts a table with the canvas clipboard', () => {
    const { onCopySelection, onCutSelection } = renderInspector({
      selectedTableIds: [0],
    });

    fireEvent.click(screen.getByRole('button', { name: /Kopieren|Copy/i }));
    fireEvent.click(screen.getByRole('button', { name: /Ausschneiden|Cut/i }));

    expect(onCopySelection).toHaveBeenCalledTimes(1);
    expect(onCutSelection).toHaveBeenCalledTimes(1);
    // Nothing to paste until something is copied.
    expect(
      screen.queryByRole('button', { name: /Einfügen|Paste/i }),
    ).not.toBeInTheDocument();
  });

  it('pastes once the clipboard holds something, even without a selection', () => {
    const { onPasteSelection } = renderInspector({ canPaste: true });

    fireEvent.click(screen.getByRole('button', { name: /Einfügen|Paste/i }));

    expect(onPasteSelection).toHaveBeenCalledTimes(1);
  });

  it('removes the selected table from the pinned footer', () => {
    const { onDeleteSelection } = renderInspector({ selectedTableIds: [0] });

    fireEvent.click(
      screen.getByRole('button', { name: /Tisch löschen|Delete table/i }),
    );

    expect(onDeleteSelection).toHaveBeenCalledTimes(1);
  });

  // Placing the copy is the canvas's paste; the panel only asks for it.
  it('duplicates the selection the way the canvas pastes it', () => {
    const { snapshot, onDuplicateSelection, runSceneTransaction } =
      renderInspector({ selectedTableIds: [0] });

    fireEvent.click(
      screen.getByRole('button', { name: /^(Duplizieren|Duplicate)$/i }),
    );

    expect(onDuplicateSelection).toHaveBeenCalledTimes(1);
    expect(snapshot).not.toHaveBeenCalled();
    expect(runSceneTransaction).not.toHaveBeenCalled();
  });

  it('offers to duplicate a whole selection and a single window', () => {
    renderInspector({ selectedTableIds: [0, 1], selectedFeatureIds: ['f1'] });
    expect(
      screen.getByRole('button', { name: /^(Duplizieren|Duplicate)$/i }),
    ).toBeInTheDocument();

    cleanup();
    renderInspector({ selectedFeatureIds: ['f1'] });
    expect(
      screen.getByRole('button', { name: /^(Duplizieren|Duplicate)$/i }),
    ).toBeInTheDocument();
  });

  it('turns every table of a selection by the steps of Q/E', () => {
    const { snapshot, onRotateSelection } = renderInspector({
      tables: [table(), table({ rotation: 90 })],
      selectedTableIds: [0, 1],
      selectedFeatureIds: ['f1'],
    });

    fireEvent.click(
      screen.getByRole('button', { name: /Im Uhrzeigersinn|clockwise/i }),
    );

    expect(snapshot).toHaveBeenCalledTimes(1);
    expect(onRotateSelection).toHaveBeenCalledWith(
      turned([
        [0, 45],
        [1, 135],
      ]),
    );
  });

  it('shows the angle a selection shares, and none when it differs', () => {
    const { rerender } = renderInspector({
      tables: [table({ rotation: 90 }), table({ rotation: 90 })],
      selectedTableIds: [0, 1],
    });
    expect(angleField()).toHaveValue('90');

    rerender({ tables: [table(), table({ rotation: 90 })] });
    expect(angleField()).toHaveValue('');
    expect(angleField()).toHaveAttribute('placeholder', '–');
  });

  it('sets every table of a selection to a typed angle', () => {
    const { onRotateSelection } = renderInspector({
      tables: [table(), table({ rotation: 90 }), table({ rotation: 30 })],
      selectedTableIds: [0, 1, 2],
    });

    fireEvent.change(angleField(), { target: { value: '30' } });
    fireEvent.keyDown(angleField(), { key: 'Enter' });

    // The third already stands there; setting it again changes nothing.
    expect(onRotateSelection).toHaveBeenCalledWith(
      turned([
        [0, 30],
        [1, 30],
        [2, 30],
      ]),
    );
  });

  it('leaves locked tables where they are, as the canvas does', () => {
    const { onRotateSelection } = renderInspector({
      tables: [table(), table({ locked: true })],
      selectedTableIds: [0, 1],
    });

    fireEvent.click(
      screen.getByRole('button', { name: /Im Uhrzeigersinn|clockwise/i }),
    );

    expect(onRotateSelection).toHaveBeenCalledWith(turned([[0, 45]]));
  });

  it('shows and sets the angle of a single lectern, as for a table', () => {
    const { snapshot, onRotateSelection } = renderInspector({
      features: [lectern({ rotation: 30 }), window_],
      featurePalette: [{ type: 'podium', label: 'Pult' }],
      selectedFeatureIds: ['p1'],
    });

    expect(angleField()).toHaveValue('30');
    fireEvent.click(
      screen.getByRole('button', { name: /Im Uhrzeigersinn|clockwise/i }),
    );

    expect(snapshot).toHaveBeenCalledTimes(1);
    expect(onRotateSelection).toHaveBeenCalledWith(turned([], [['p1', 75]]));
  });

  it('turns room elements of a selection along with its tables', () => {
    const { onRotateSelection } = renderInspector({
      features: [lectern(), window_],
      selectedTableIds: [0],
      selectedFeatureIds: ['p1', 'f1'],
    });

    fireEvent.change(angleField(), { target: { value: '90' } });
    fireEvent.keyDown(angleField(), { key: 'Enter' });

    // The window takes its angle from the wall and stays out of it.
    expect(onRotateSelection).toHaveBeenCalledWith(
      turned([[0, 90]], [['p1', 90]]),
    );
  });

  it('offers no turning for elements that sit on a wall', () => {
    renderInspector({ selectedFeatureIds: ['f1', 'f2'] });

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('offers no way to change a seat count under a finished plan', () => {
    renderInspector({ selectedTableIds: [0] });

    expect(
      screen.queryByRole('button', { name: /Doppelplatz|Double/i }),
    ).not.toBeInTheDocument();
  });

  it('summarises a multi-selection instead of editing one of them', () => {
    renderInspector({ selectedTableIds: [0, 1], selectedFeatureIds: ['f1'] });

    expect(
      screen.getByText(/2 Tische und 1 Raummerkmale|2 tables and 1 room/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/6 Plätze ausgewählt|6 seats selected/i),
    ).toBeInTheDocument();
    // What acts on the whole selection: the clipboard and removing it.
    expect(
      screen.getByRole('button', { name: /Kopieren|Copy/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: /Auswahl löschen|Delete selection/i,
      }),
    ).toBeInTheDocument();
  });

  it('offers no copy of the one-of-a-kind board', () => {
    renderInspector({ selectedFeatureIds: ['f2'] });

    expect(screen.getByRole('heading', { name: /Tafel|Board/i })).toBeVisible();
    expect(
      screen.queryByRole('button', { name: /Kopieren|Copy/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^(Duplizieren|Duplicate)$/i }),
    ).not.toBeInTheDocument();
  });

  it('toggles a room feature between shown and hidden', () => {
    const { runSceneTransaction, snapshot } = renderInspector({
      selectedFeatureIds: ['f1'],
    });

    const visible = screen.getByRole('switch', { name: /Sichtbar|Visible/i });
    expect(visible).toBeChecked();
    fireEvent.click(visible);

    expect(snapshot).toHaveBeenCalledTimes(1);
    const { result, options } = applyTransaction(runSceneTransaction, {
      features: [window_, board],
    });
    expect(result.features?.map((feature) => feature.visible)).toEqual([
      false,
      undefined,
    ]);
    // Showing a window moves nobody.
    expect(options).toEqual({ skipSeatingUpdate: true });
  });
});

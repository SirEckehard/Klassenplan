// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import {
  act,
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

// Without the seating plan's state the panel names no room and lists none —
// as the tests below mostly want; a test sets `seatingPlan` to have one.
const seatingPlan = vi.hoisted(() => ({
  state: null as null | {
    rooms: Array<{ id: string; name: string; createdAt: string }>;
    activeRoomId: string;
    seatingHistory: [];
    classroomScene: { tables: []; features: [] };
  },
  renameRoom: vi.fn((..._args: unknown[]) => null),
}));

vi.mock('@/contexts/seatingPlan/seatingPlanSelectors', () => ({
  useOptionalSeatingPlanState: () => seatingPlan.state,
  useOptionalSeatingPlanActions: () =>
    seatingPlan.state ? { renameRoom: seatingPlan.renameRoom } : null,
}));

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
  const onSaveTemplate = vi.fn(() => Promise.resolve(true));
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

/** The button that opens the kept templates. */
const templateMenu = () =>
  screen.getByRole('button', { name: /Vorlage öffnen|Open a template/ });

/** The button that opens the four kinds of table, once tables stand. */
const setupButton = () =>
  screen.getByRole('button', { name: /Tischart wählen|Choose a table type/ });

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

afterEach(() => {
  cleanup();
  seatingPlan.state = null;
  seatingPlan.renameRoom.mockClear();
});

describe('SceneInspector', () => {
  // The room is renamed where it is read, as the class is in the class
  // layer's inspector; a name another room of the class carries is refused.
  it('renames the open room in its header', async () => {
    seatingPlan.state = {
      rooms: [
        { id: 'classroom', name: 'Klassenraum', createdAt: '' },
        { id: 'lab', name: 'Chemie', createdAt: '' },
      ],
      activeRoomId: 'classroom',
      seatingHistory: [],
      classroomScene: { tables: [], features: [] },
    };
    renderInspector();

    const heading = screen.getByRole('heading', {
      level: 2,
      name: 'Klassenraum',
    });
    // Pressed, the name opens as a field.
    fireEvent.click(within(heading).getByRole('button'));
    const field = screen.getByRole('textbox', {
      name: /Name des Raums|Room name/i,
    });
    expect(field).toHaveValue('Klassenraum');

    fireEvent.change(field, { target: { value: 'Chemie' } });
    expect(field).toHaveAttribute('aria-invalid', 'true');
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(seatingPlan.renameRoom).not.toHaveBeenCalled();

    fireEvent.change(field, { target: { value: 'Raum 104' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(seatingPlan.renameRoom).toHaveBeenCalledWith(
      'classroom',
      'Raum 104',
    );
    // What the commit sets once it resolved settles inside act.
    await act(async () => {});
  });

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

  // A room that has its tables keeps the four kinds in a menu.
  it('sets the room up with as many tables as the class needs', () => {
    const { onSetUpRoom } = renderInspector({ studentsCount: 25 });

    fireEvent.click(setupButton());
    // 25 students: 25 single seats, 13 doubles, 7 groups of 4, 5 of 6.
    const menu = screen.getByRole('dialog', {
      name: /^(Neu einrichten|Set up from scratch)$/,
    });
    const rows = within(menu).getAllByRole('button');
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringMatching(/^(Einzelplätze|Single seats)25 (Tische|tables)$/),
      expect.stringMatching(/^(Doppelplätze|Double seats)13 (Tische|tables)$/),
      expect.stringMatching(/^(4er-Gruppen|Groups of 4)7 (Tische|tables)$/),
      expect.stringMatching(/^(6er-Gruppen|Groups of 6)5 (Tische|tables)$/),
    ]);

    fireEvent.click(rows[1]);
    expect(onSetUpRoom).toHaveBeenCalledWith('double');
  });

  // In an empty room the kinds are the first step and stand as rows.
  it('offers the four kinds as rows in an empty room', () => {
    const { onSetUpRoom } = renderInspector({ tables: [] });

    fireEvent.click(
      screen.getByRole('button', { name: /^(Doppelplätze|Double seats)/ }),
    );
    expect(onSetUpRoom).toHaveBeenCalledWith('double');
    expect(
      screen.queryByRole('button', {
        name: /Tischart wählen|Choose a table type/,
      }),
    ).not.toBeInTheDocument();
  });

  // The setup replaces what stands there, and the hint says so.
  it('warns that setting up replaces the tables, but not in an empty room', () => {
    const { rerender } = renderInspector();
    expect(setupButton()).toHaveAccessibleDescription(
      /komplett neu|from scratch/,
    );

    rerender({ tables: [] });
    expect(
      screen.getByRole('button', { name: /^(Doppelplätze|Double seats)/ }),
    ).not.toHaveAccessibleDescription(/komplett neu|from scratch/);
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

    await waitFor(() => expect(setupButton()).toHaveFocus());
  });

  it('moves the focus to the first kind in an empty room', async () => {
    const { rerender } = renderInspector({ tables: [] });

    rerender({ setupFocusRequest: 1 });

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /^(Einzelplätze|Single seats)/ }),
      ).toHaveFocus(),
    );
  });

  it('loads a saved template from the menu', () => {
    const { onLoadTemplate } = renderInspector({
      templates: [template(7, 'Raum 104', [table(), table({ seatCount: 2 })])],
    });

    fireEvent.click(templateMenu());
    const saved = screen.getByRole('button', { name: /^Raum 104/ });
    expect(saved).toHaveTextContent(/2 (Tische|tables) · 6 (Plätze|seats)/);
    fireEvent.click(saved);
    expect(onLoadTemplate).toHaveBeenCalledWith(7);
  });

  // Named in the panel, not in a dialog over the canvas.
  it('keeps this room as a new template under the name typed', async () => {
    const { onSaveTemplate } = renderInspector({});
    const saveRow = screen.getByRole('button', {
      name: /^(Raum als Vorlage speichern|Save room as a template)$/,
    });

    fireEvent.click(saveRow);
    expect(saveRow).toHaveAttribute('aria-expanded', 'true');
    const field = screen.getByRole('textbox', {
      name: /Name der Vorlage|Template name/,
    });
    fireEvent.change(field, { target: { value: 'Physikraum' } });
    fireEvent.keyDown(field, { key: 'Enter' });

    expect(onSaveTemplate).toHaveBeenCalledWith('Physikraum', undefined);
    await waitFor(() => expect(field).not.toBeInTheDocument());
  });

  // A taken name is not saved over by Enter: replacing is a step of its own.
  it('replaces a template only from its own row', async () => {
    const { onSaveTemplate } = renderInspector({
      templates: [template(7, 'Raum 104', [])],
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: /^(Raum als Vorlage speichern|Save room as a template)$/,
      }),
    );
    const field = screen.getByRole('textbox', {
      name: /Name der Vorlage|Template name/,
    });
    fireEvent.change(field, { target: { value: 'Raum 104' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(onSaveTemplate).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole('button', {
        name: /Vorlage „Raum 104“ ersetzen|Replace template “Raum 104”/,
      }),
    );
    expect(onSaveTemplate).toHaveBeenCalledWith('Raum 104', 7);
    await waitFor(() => expect(field).not.toBeInTheDocument());
  });

  it('drops the name on Escape without saving', () => {
    const { onSaveTemplate } = renderInspector({});
    fireEvent.click(
      screen.getByRole('button', {
        name: /^(Raum als Vorlage speichern|Save room as a template)$/,
      }),
    );
    const field = screen.getByRole('textbox', {
      name: /Name der Vorlage|Template name/,
    });
    fireEvent.keyDown(field, { key: 'Escape' });

    expect(field).not.toBeInTheDocument();
    expect(onSaveTemplate).not.toHaveBeenCalled();
  });

  // As the header's class menu: a pencil and a bin beside every template.
  it('renames a template from the menu, refusing a name another one carries', async () => {
    const { onRenameTemplate } = renderInspector({
      templates: [template(1, 'Raum 104', []), template(2, 'Raum 105', [])],
    });

    fireEvent.click(templateMenu());
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

  // A template is not part of the room's undo history, so removing one asks.
  it('deletes a template from the menu only once that is confirmed', async () => {
    const { onDeleteTemplate } = renderInspector({
      templates: [template(3, 'Raum 104', [])],
    });
    const binOf = () =>
      screen.getByRole('button', {
        name: /„Raum 104“ löschen|Delete “Raum 104”/,
      });

    vi.mocked(confirmDialog).mockResolvedValueOnce(false);
    fireEvent.click(templateMenu());
    fireEvent.click(binOf());
    await waitFor(() => expect(confirmDialog).toHaveBeenCalledTimes(1));
    expect(onDeleteTemplate).not.toHaveBeenCalled();

    fireEvent.click(templateMenu());
    fireEvent.click(binOf());
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

    // One line under the heading, each count in its own plural.
    expect(
      screen.getByText(
        /^(2 Tische · 1 Raumelement · 6 Plätze|2 tables · 1 room element · 6 seats)$/,
      ),
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

  it('leaves out of the summary what the selection does not hold', () => {
    renderInspector({
      features: [window_, lectern()],
      selectedFeatureIds: ['f1', 'p1'],
    });

    expect(
      screen.getByText(/^(2 Raumelemente|2 room elements)$/),
    ).toBeInTheDocument();
  });

  // A heading over a single row only repeated it: the angle and the mix
  // share one section, the angle first.
  it('reads the angle and the mix of a table in one section', () => {
    renderInspector({ selectedTableIds: [0] });

    const section = screen
      .getByRole('heading', { name: /^(Eigenschaften|Properties)$/ })
      .closest('section') as HTMLElement;
    const angle = within(section).getByRole('textbox', {
      name: /Drehung|Rotation/i,
    });
    const mix = within(section).getByRole('switch', {
      name: /In der Mischung|In the mix/i,
    });
    expect(
      angle.compareDocumentPosition(mix) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      screen.queryByRole('heading', { name: /^(Ausrichtung|Orientation)$/ }),
    ).not.toBeInTheDocument();
  });

  // What concerns this room comes before what leads to another one.
  it('offers the paste before the templates', () => {
    renderInspector({ canPaste: true });

    const paste = screen.getByRole('button', { name: /Einfügen|Paste/i });
    const templates = screen.getByRole('heading', {
      name: /^(Vorlagen|Templates)$/,
    });
    expect(
      paste.compareDocumentPosition(templates) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
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

  it('takes a table out of the mix and back in', () => {
    const tables = [table(), table({ x: 400, seatCount: 2 })];
    const { runSceneTransaction, snapshot } = renderInspector({
      tables,
      selectedTableIds: [1],
    });

    const inMix = screen.getByRole('switch', {
      name: /In der Mischung|In the mix/i,
    });
    expect(inMix).toBeChecked();
    fireEvent.click(inMix);

    expect(snapshot).toHaveBeenCalledTimes(1);
    const { result, options } = applyTransaction(runSceneTransaction, {
      tables,
    });
    expect(result.tables?.map((entry) => entry.inactive)).toEqual([
      undefined,
      true,
    ]);
    expect(options).toEqual({ skipSeatingUpdate: true });
  });

  it('says that a table out of the mix stays empty, and takes it back in', () => {
    const tables = [table({ inactive: true })];
    const { runSceneTransaction } = renderInspector({
      tables,
      selectedTableIds: [0],
    });

    expect(
      screen.getByText(/beim Mischen leer|empty when mixing/i),
    ).toBeVisible();
    const inMix = screen.getByRole('switch', {
      name: /In der Mischung|In the mix/i,
    });
    expect(inMix).not.toBeChecked();
    fireEvent.click(inMix);

    const { result } = applyTransaction(runSceneTransaction, { tables });
    // In the mix is the absent flag, not `inactive: false`.
    expect(result.tables?.[0]).not.toHaveProperty('inactive');
  });

  it('takes a selection of both kinds into the mix at one press', () => {
    const tables = [table({ inactive: true }), table({ x: 400 })];
    const { runSceneTransaction } = renderInspector({
      tables,
      selectedTableIds: [0, 1],
    });

    const inMix = screen.getByRole('switch', {
      name: /nur ein Teil|only part/i,
    });
    fireEvent.click(inMix);

    const { result } = applyTransaction(runSceneTransaction, { tables });
    expect(result.tables?.map((entry) => entry.inactive)).toEqual([
      undefined,
      undefined,
    ]);
  });

  it('switches the room to filling from the front', () => {
    const { runSceneTransaction, snapshot } = renderInspector();

    const fill = screen.getByRole('switch', {
      name: /Von vorne besetzen|Fill from the front/i,
    });
    expect(fill).not.toBeChecked();
    fireEvent.click(fill);

    expect(snapshot).toHaveBeenCalledTimes(1);
    const tables = [table()];
    const { result, options } = applyTransaction(runSceneTransaction, {
      scene: { tables, features: [], totalStudents: 4 },
      tables,
    });
    expect(result.scene).toEqual({
      tables,
      features: [],
      totalStudents: 4,
      fillFromFront: true,
    });
    expect(options).toEqual({ skipSeatingUpdate: true });
  });
});

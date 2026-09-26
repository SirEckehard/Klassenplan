// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@/i18n';
import SceneInspector from '../SceneInspector';
import type { ClassroomFeature, ClassroomTable } from '@/types';
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
  it('sums up the room while nothing is selected', () => {
    renderInspector();

    expect(screen.getByRole('heading', { name: /Raum|Room/i })).toBeVisible();
    // Two tables, six seats between them, five students.
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
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

  it('keeps a typed angle within 0–359° instead of wrapping it round', () => {
    const { onRotateSelection } = renderInspector({ selectedTableIds: [0] });
    const field = screen.getByRole('textbox', {
      name: /Drehung in Grad|Rotation in/i,
    });

    fireEvent.change(field, { target: { value: '400' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(onRotateSelection).toHaveBeenLastCalledWith(turned([[0, 359]]));

    fireEvent.change(field, { target: { value: '360' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(onRotateSelection).toHaveBeenLastCalledWith(turned([[0, 359]]));

    fireEvent.change(field, { target: { value: '-30' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    // The table still stands at 0° in this render, so 0° changes nothing.
    expect(onRotateSelection).toHaveBeenCalledTimes(2);
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

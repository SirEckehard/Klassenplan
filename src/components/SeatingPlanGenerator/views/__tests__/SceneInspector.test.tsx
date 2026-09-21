// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import '@/i18n';
import SceneInspector from '../SceneInspector';
import type { ClassroomFeature, ClassroomTable } from '@/types';

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
  const updateSceneTables = vi.fn();
  const setSceneFeatures = vi.fn();
  const onDeleteSelection = vi.fn();
  const onCopySelection = vi.fn();
  const onCutSelection = vi.fn();
  const onPasteSelection = vi.fn();
  render(
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
      updateSceneTables={updateSceneTables}
      setSceneFeatures={setSceneFeatures}
      onDeleteSelection={onDeleteSelection}
      onCopySelection={onCopySelection}
      onCutSelection={onCutSelection}
      onPasteSelection={onPasteSelection}
      canPaste={false}
      {...props}
    />,
  );
  return {
    snapshot,
    updateSceneTables,
    setSceneFeatures,
    onDeleteSelection,
    onCopySelection,
    onCutSelection,
    onPasteSelection,
  };
};

/** Applies the updater the component handed to `updateSceneTables`. */
const applyTableUpdate = (
  updateSceneTables: ReturnType<typeof vi.fn>,
  tables: ClassroomTable[],
): ClassroomTable[] => {
  const updater = updateSceneTables.mock.calls[0][0] as (
    current: ClassroomTable[],
  ) => ClassroomTable[];
  return updater(tables);
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

  it('rotates in the same 15° steps as the canvas, through undo history', () => {
    const tables = [table(), table({ x: 400, seatCount: 2 })];
    const { snapshot, updateSceneTables } = renderInspector({
      tables,
      selectedTableIds: [0],
    });

    fireEvent.click(
      screen.getByRole('button', { name: /Im Uhrzeigersinn|clockwise/i }),
    );

    expect(snapshot).toHaveBeenCalledTimes(1);
    expect(applyTableUpdate(updateSceneTables, tables)[0].rotation).toBe(15);
  });

  it('wraps a rotation below zero round to 345°', () => {
    const tables = [table()];
    const { updateSceneTables } = renderInspector({
      tables,
      selectedTableIds: [0],
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: /Gegen den Uhrzeigersinn|counter-clockwise/i,
      }),
    );

    expect(applyTableUpdate(updateSceneTables, tables)[0].rotation).toBe(345);
  });

  // Dragging places and sizes a table; the panel no longer asks for pixels.
  it('asks for no coordinates or sizes', () => {
    renderInspector({ selectedTableIds: [0] });

    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
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
      screen.getByRole('button', { name: /Tisch entfernen|Remove table/i }),
    );

    expect(onDeleteSelection).toHaveBeenCalledTimes(1);
  });

  it('duplicates a table one grid step away from the original', () => {
    const tables = [table()];
    const { snapshot, updateSceneTables } = renderInspector({
      tables,
      selectedTableIds: [0],
    });

    fireEvent.click(
      screen.getByRole('button', { name: /^(Duplizieren|Duplicate)$/i }),
    );

    expect(snapshot).toHaveBeenCalledTimes(1);
    const next = applyTableUpdate(updateSceneTables, tables);
    expect(next).toHaveLength(2);
    expect(next[1]).toMatchObject({ x: 110, y: 210, seatCount: 4 });
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
        name: /Auswahl entfernen|Remove selection/i,
      }),
    ).toBeInTheDocument();
  });

  it('offers no copy of the one-of-a-kind board', () => {
    renderInspector({ selectedFeatureIds: ['f2'] });

    expect(screen.getByRole('heading', { name: /Tafel|Board/i })).toBeVisible();
    expect(
      screen.queryByRole('button', { name: /Kopieren|Copy/i }),
    ).not.toBeInTheDocument();
  });

  it('toggles a room feature between shown and hidden', () => {
    const { setSceneFeatures, snapshot } = renderInspector({
      selectedFeatureIds: ['f1'],
    });

    const visible = screen.getByRole('switch', { name: /Sichtbar|Visible/i });
    expect(visible).toBeChecked();
    fireEvent.click(visible);

    expect(snapshot).toHaveBeenCalledTimes(1);
    const updater = setSceneFeatures.mock.calls[0][0] as (
      current: ClassroomFeature[],
    ) => ClassroomFeature[];
    expect(updater([window_])[0].visible).toBe(false);
  });
});

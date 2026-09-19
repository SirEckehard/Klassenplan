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

const renderInspector = (
  props: Partial<React.ComponentProps<typeof SceneInspector>> = {},
) => {
  const snapshot = vi.fn();
  const updateSceneTables = vi.fn();
  const setSceneFeatures = vi.fn();
  const onDeleteSelection = vi.fn();
  render(
    <SceneInspector
      tables={[table(), table({ x: 400, seatCount: 2 })]}
      features={[window_]}
      selectedTableIds={[]}
      selectedFeatureIds={[]}
      featurePalette={[{ type: 'window', label: 'Fenster' }]}
      studentsCount={5}
      snapshot={snapshot}
      updateSceneTables={updateSceneTables}
      setSceneFeatures={setSceneFeatures}
      onDeleteSelection={onDeleteSelection}
      {...props}
    />,
  );
  return { snapshot, updateSceneTables, setSceneFeatures, onDeleteSelection };
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

  it('commits a typed position and clamps it to the room', () => {
    const tables = [table()];
    const { updateSceneTables } = renderInspector({
      tables,
      selectedTableIds: [0],
    });

    const x = screen.getByLabelText('X');
    fireEvent.change(x, { target: { value: '99999' } });
    fireEvent.blur(x);

    // The classroom is 900 wide, so the value lands on the edge, not beyond it.
    expect(applyTableUpdate(updateSceneTables, tables)[0].x).toBe(900);
  });

  it('takes a typed size and keeps the table wide enough for a seat', () => {
    const tables = [table()];
    const { updateSceneTables } = renderInspector({
      tables,
      selectedTableIds: [0],
    });

    const width = screen.getByLabelText(/Breite|Width/i);
    fireEvent.change(width, { target: { value: '0' } });
    fireEvent.blur(width);

    expect(applyTableUpdate(updateSceneTables, tables)[0].width).toBe(20);
  });

  it('duplicates a table one grid step away from the original', () => {
    const tables = [table()];
    const { snapshot, updateSceneTables } = renderInspector({
      tables,
      selectedTableIds: [0],
    });

    fireEvent.click(
      screen.getByRole('button', {
        name: /Tisch duplizieren|Duplicate table/i,
      }),
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
    expect(screen.queryByLabelText('X')).not.toBeInTheDocument();
  });

  it('toggles a room feature between shown and hidden', () => {
    const { setSceneFeatures, snapshot } = renderInspector({
      selectedFeatureIds: ['f1'],
    });

    const visible = screen.getByLabelText(/Sichtbar|Visible/i);
    expect(visible).toBeChecked();
    fireEvent.click(visible);

    expect(snapshot).toHaveBeenCalledTimes(1);
    const updater = setSceneFeatures.mock.calls[0][0] as (
      current: ClassroomFeature[],
    ) => ClassroomFeature[];
    expect(updater([window_])[0].visible).toBe(false);
  });
});

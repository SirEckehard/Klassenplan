// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import ExportSheetInspector from '../ExportSheetInspector';

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

  it('rests in the middle while only some are shown and turns them all on', () => {
    const onFeatureToggle = vi.fn();
    renderInspector({
      featureAvailability: { window: true, door: true },
      featureVisibility: { window: true, door: false },
      onFeatureToggle,
    });

    const all = screen.getByRole('switch', { name: allRoom });
    expect(all).toHaveAccessibleName(/einige sichtbar|some shown/);

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
    expect(
      screen.getByText(/Tafel, Fenster und Tür|The board, windows and door/),
    ).toBeInTheDocument();

    fireEvent.click(frameSwitch()!);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('drops the hint while the whole room is shown', () => {
    renderInspector({ frameOnTables: off });
    expect(frameSwitch()).not.toBeChecked();
    expect(
      screen.queryByText(/Tafel, Fenster und Tür|The board, windows and door/),
    ).not.toBeInTheDocument();
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

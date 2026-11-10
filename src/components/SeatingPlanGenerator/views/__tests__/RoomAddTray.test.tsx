// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import '@/i18n';
import RoomAddTray from '@/components/SeatingPlanGenerator/views/RoomAddTray';
import {
  StatusBarSlotProvider,
  useStatusBarSlot,
} from '@/contexts/StatusBarSlotContext';
import { getButton } from '@/__tests__/utils';

/** The bar's middle, where a layer's action is portalled in. */
function ActionSlot() {
  const { setActionNode } = useStatusBarSlot();
  return (
    <div role="region" aria-label="Statusleiste">
      <span ref={setActionNode} />
    </div>
  );
}

const renderTray = () => {
  const handlers = {
    onTemplatePointerDown: vi.fn(),
    onTemplateAdd: vi.fn(),
    onFeaturePointerDown: vi.fn(),
    onFeatureAdd: vi.fn(),
  };
  render(
    <StatusBarSlotProvider>
      <ActionSlot />
      <RoomAddTray
        featurePalette={[
          { type: 'window', label: 'Fenster', icon: <span /> },
          { type: 'door', label: 'Tür', icon: <span /> },
        ]}
        {...handlers}
      />
    </StatusBarSlotProvider>,
  );
  return handlers;
};

const toggle = () => getButton(/^(Hinzufügen|Add)$/i);
const tray = () =>
  screen.queryByRole('group', {
    name: /Tische und Raumelemente hinzufügen|Add tables and room elements/i,
  });

describe('RoomAddTray', () => {
  // The room layer's action, where the plan layer has "Mischen".
  it('puts "Hinzufügen" into the status bar, closed', () => {
    renderTray();

    expect(
      screen.getByRole('region', { name: 'Statusleiste' }),
    ).toContainElement(toggle());
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    expect(tray()).not.toBeInTheDocument();
  });

  // Each piece says what it is in words: the old palette's "2 Pl." left the
  // kind of table to the drawing.
  it('opens a tray of every table and room element by name', async () => {
    const user = userEvent.setup();
    renderTray();

    await user.click(toggle());

    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
    const group = tray();
    expect(group).toBeInTheDocument();
    for (const name of [
      /^(Einzelplatz|Single seat)$/i,
      /^(Doppelplatz|Double seat)$/i,
      /^(4er-Gruppe|Group of 4)$/i,
      /^(6er-Gruppe|Group of 6)$/i,
      /^Fenster$/,
      /^Tür$/,
    ]) {
      expect(getButton(name)).toBeInTheDocument();
    }
  });

  // Several tables follow one another without reopening it.
  it('adds a piece on a tap and stays open', async () => {
    const user = userEvent.setup();
    const handlers = renderTray();

    await user.click(toggle());
    await user.click(getButton(/^(Doppelplatz|Double seat)$/i));
    await user.click(getButton(/^Fenster$/));

    expect(handlers.onTemplateAdd).toHaveBeenCalledWith('double');
    expect(handlers.onFeatureAdd).toHaveBeenCalledWith('window');
    expect(tray()).toBeInTheDocument();
  });

  it('closes on its switch and on Escape, which hands the focus back', async () => {
    const user = userEvent.setup();
    renderTray();

    await user.click(toggle());
    await user.click(toggle());
    expect(tray()).not.toBeInTheDocument();

    // From the keyboard the focus goes into the tray, and Escape brings it
    // back to the switch.
    toggle().focus();
    await user.keyboard('{Enter}');
    expect(getButton(/^(Einzelplatz|Single seat)$/i)).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(tray()).not.toBeInTheDocument();
    expect(toggle()).toHaveFocus();
  });

  // The room under the tray takes the drop: once the finger has left the
  // tray it sinks, and when the finger lifts it is back.
  it('steps aside while a piece is dragged out of it', async () => {
    const user = userEvent.setup();
    const handlers = renderTray();
    await user.click(toggle());

    const piece = getButton(/^(4er-Gruppe|Group of 4)$/i);
    fireEvent.pointerDown(piece, { pointerId: 7, clientX: 0, clientY: 0 });
    expect(handlers.onTemplatePointerDown).toHaveBeenCalledWith(
      'group4',
      expect.anything(),
    );
    expect(tray()).not.toHaveClass('invisible');

    act(() => {
      window.dispatchEvent(
        new PointerEvent('pointermove', {
          pointerId: 7,
          clientX: 400,
          clientY: -300,
        }),
      );
    });
    expect(
      screen.getByRole('group', { hidden: true, name: /hinzufügen|add/i }),
    ).toHaveClass('invisible');

    act(() => {
      window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7 }));
    });
    expect(tray()).not.toHaveClass('invisible');
  });
});

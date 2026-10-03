// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useRoomSetup } from '../useRoomSetup';

const setup = ({
  isRoomEmpty = false,
  isDesktop = true,
}: { isRoomEmpty?: boolean; isDesktop?: boolean } = {}) => {
  const handlers = {
    snapshot: vi.fn(),
    onTemplateChange: vi.fn(),
    onTableTypeChange: vi.fn(),
    clearSelection: vi.fn(),
    setDrawerOpen: vi.fn(),
    unfoldInspector: vi.fn(),
    onRoomReplaced: vi.fn(),
  };
  const hook = renderHook(
    (props: { isRoomEmpty: boolean; isDesktop: boolean }) =>
      useRoomSetup({ ...props, ...handlers }),
    { initialProps: { isRoomEmpty, isDesktop } },
  );
  return { ...hook, ...handlers };
};

describe('useRoomSetup', () => {
  // The undo history has to hold the room before it is replaced, or Ctrl+Z
  // after a stray click would bring back nothing.
  it('keeps the room in the undo history before setting it up anew', () => {
    const { result, snapshot, onTemplateChange, onTableTypeChange } = setup();

    act(() => result.current.setUpRoom('double'));

    expect(snapshot).toHaveBeenCalledTimes(1);
    expect(onTemplateChange).toHaveBeenCalledWith(null);
    expect(onTableTypeChange).toHaveBeenCalledWith('double', true);
    expect(snapshot.mock.invocationCallOrder[0]).toBeLessThan(
      onTemplateChange.mock.invocationCallOrder[0],
    );
    expect(snapshot.mock.invocationCallOrder[0]).toBeLessThan(
      onTableTypeChange.mock.invocationCallOrder[0],
    );
  });

  it('keeps the room in the undo history before loading a template', () => {
    const { result, snapshot, onTemplateChange } = setup();

    act(() => result.current.loadTemplate(4));

    expect(onTemplateChange).toHaveBeenCalledWith(4);
    expect(snapshot.mock.invocationCallOrder[0]).toBeLessThan(
      onTemplateChange.mock.invocationCallOrder[0],
    );
  });

  // The same class in a lab is another plan: a save after the room was
  // replaced must not write the lab over the plan that was open.
  it('lets go of the open plan when the room is set up anew or loaded', () => {
    const { result, snapshot, onRoomReplaced, onTemplateChange } = setup();

    act(() => result.current.setUpRoom('double'));
    expect(onRoomReplaced).toHaveBeenCalledTimes(1);
    expect(snapshot.mock.invocationCallOrder[0]).toBeLessThan(
      onRoomReplaced.mock.invocationCallOrder[0],
    );

    act(() => result.current.loadTemplate(4));
    expect(onRoomReplaced).toHaveBeenCalledTimes(2);
    expect(onRoomReplaced.mock.invocationCallOrder[1]).toBeLessThan(
      onTemplateChange.mock.invocationCallOrder[1],
    );
  });

  it('keeps the open plan while the setup is only shown', () => {
    const { result, onRoomReplaced } = setup();

    act(() => result.current.revealSetup());

    expect(onRoomReplaced).not.toHaveBeenCalled();
  });

  it('leaves the drawer alone from lg up, where the inspector is a column', () => {
    const { result, setDrawerOpen } = setup({ isDesktop: true });

    act(() => result.current.setUpRoom('group4'));
    act(() => result.current.loadTemplate(1));
    act(() => result.current.revealSetup());

    expect(setDrawerOpen).not.toHaveBeenCalled();
  });

  // A column folded away to give the room the width still has to show the
  // setup when it is asked for.
  it('unfolds the column from lg up when the setup is asked for', () => {
    const { result, unfoldInspector } = setup({ isDesktop: true });

    act(() => result.current.revealSetup());

    expect(unfoldInspector).toHaveBeenCalledTimes(1);
  });

  // Below lg the drawer covers much of the stage; the result is what the
  // teacher wants to see next.
  it('closes the drawer below lg once the room is set up or loaded', () => {
    const { result, setDrawerOpen } = setup({ isDesktop: false });

    act(() => result.current.setUpRoom('single'));
    expect(setDrawerOpen).toHaveBeenLastCalledWith(false);

    setDrawerOpen.mockClear();
    act(() => result.current.loadTemplate(2));
    expect(setDrawerOpen).toHaveBeenLastCalledWith(false);
  });

  it('shows the setup when asked: selection let go, drawer open, focus asked for', () => {
    const { result, clearSelection, setDrawerOpen } = setup({
      isDesktop: false,
    });
    expect(result.current.setupFocusRequest).toBe(0);

    act(() => result.current.revealSetup());

    expect(clearSelection).toHaveBeenCalledTimes(1);
    expect(setDrawerOpen).toHaveBeenCalledWith(true);
    expect(result.current.setupFocusRequest).toBe(1);

    act(() => result.current.revealSetup());
    expect(result.current.setupFocusRequest).toBe(2);
  });

  it('opens the drawer by itself below lg while the room is empty', async () => {
    const { setDrawerOpen, rerender } = setup({
      isRoomEmpty: true,
      isDesktop: false,
    });
    await waitFor(() => expect(setDrawerOpen).toHaveBeenCalledWith(true));

    setDrawerOpen.mockClear();
    rerender({ isRoomEmpty: false, isDesktop: false });
    expect(setDrawerOpen).not.toHaveBeenCalled();
  });

  it('unfolds the column by itself from lg up while the room is empty', async () => {
    const desktop = setup({ isRoomEmpty: true, isDesktop: true });
    await waitFor(() =>
      expect(desktop.unfoldInspector).toHaveBeenCalledTimes(1),
    );
    expect(desktop.setDrawerOpen).not.toHaveBeenCalled();
  });

  it('shows nothing by itself in a furnished room', () => {
    const furnished = setup({ isRoomEmpty: false, isDesktop: false });
    expect(furnished.setDrawerOpen).not.toHaveBeenCalled();
    expect(furnished.unfoldInspector).not.toHaveBeenCalled();

    const desktop = setup({ isRoomEmpty: false, isDesktop: true });
    expect(desktop.unfoldInspector).not.toHaveBeenCalled();
  });
});

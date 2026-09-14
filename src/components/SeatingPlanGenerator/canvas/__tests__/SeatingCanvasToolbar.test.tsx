// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import type React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import '@/i18n';
import SeatingCanvasToolbar from '../SeatingCanvasToolbar';

const contextValue = vi.hoisted(() => ({
  undoSeating: vi.fn(),
  redoSeating: vi.fn(),
  canUndoSeating: false,
  canRedoSeating: false,
}));

vi.mock('@/contexts/SeatingPlanContext', () => ({
  useSeatingAlgorithmContext: () => contextValue,
}));

beforeEach(() => {
  contextValue.canUndoSeating = false;
  contextValue.canRedoSeating = false;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const getUndo = () =>
  screen.getByRole('button', {
    name: /rückgängig|undo/i,
  });

/** Renders with idle-mix defaults; each case overrides only what it asserts on. */
const renderToolbar = (
  props: Partial<React.ComponentProps<typeof SeatingCanvasToolbar>> = {},
) =>
  render(<SeatingCanvasToolbar onMix={vi.fn()} isMixing={false} {...props} />);

describe('SeatingCanvasToolbar', () => {
  it('disables undo and redo while the history is empty', () => {
    renderToolbar();

    expect(getUndo()).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /wiederherstellen|redo/i }),
    ).toBeDisabled();
  });

  it('undoes through the context when history is available', async () => {
    contextValue.canUndoSeating = true;
    renderToolbar();

    await userEvent.click(getUndo());

    expect(contextValue.undoSeating).toHaveBeenCalledTimes(1);
  });

  // "Verfeinern" was removed on 2026-09-14: a second refinement gained nothing
  // measurable (docs/PERFORMANCE.md#does-a-longer-refinement-help).
  it('offers no separate refine action', () => {
    renderToolbar();

    expect(
      screen.queryByRole('button', { name: /verfeiner|refine/i }),
    ).not.toBeInTheDocument();
  });
});

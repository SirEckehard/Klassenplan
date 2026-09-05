// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import type React from 'react';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import '@/i18n';
import SeatingCanvasToolbar from '../SeatingCanvasToolbar';
import {
  MANUAL_REFINE_PASSES,
  MANUAL_REFINE_TRIES_PER_PASS,
  neutralSettings,
} from '@/utils';
import { createMockStudent } from '@/__tests__/utils';

const contextValue = vi.hoisted(() => ({
  undoSeating: vi.fn(),
  redoSeating: vi.fn(),
  canUndoSeating: false,
  canRedoSeating: false,
  refineCurrentSeating: vi.fn(async () => []),
  currentSeating: [] as unknown[],
  mixSettings: {} as Record<string, number>,
}));

vi.mock('@/contexts/SeatingPlanContext', () => ({
  useSeatingAlgorithmContext: () => contextValue,
}));

const withCriteria = { ...neutralSettings, avoidRestlessTogether: 5 };

beforeEach(() => {
  contextValue.canUndoSeating = false;
  contextValue.canRedoSeating = false;
  contextValue.currentSeating = [[createMockStudent({ id: 'a' })]];
  contextValue.mixSettings = withCriteria as unknown as Record<string, number>;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const getUndo = () =>
  screen.getByRole('button', {
    name: /rückgängig|undo/i,
  });
const getRefine = () =>
  screen.getByRole('button', { name: /verfeiner|refine/i });

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

  it('refines the plan on screen with the manual settings', async () => {
    renderToolbar();

    await userEvent.click(getRefine());

    await waitFor(() =>
      expect(contextValue.refineCurrentSeating).toHaveBeenCalledWith({
        triesPerPass: MANUAL_REFINE_TRIES_PER_PASS,
        passes: MANUAL_REFINE_PASSES,
      }),
    );
  });

  it('blocks refining while no criterion is active', () => {
    contextValue.mixSettings = neutralSettings as unknown as Record<
      string,
      number
    >;
    renderToolbar();

    expect(getRefine()).toBeDisabled();
  });

  it('blocks refining without a seating plan', () => {
    contextValue.currentSeating = [];
    renderToolbar();

    expect(getRefine()).toBeDisabled();
  });

  it('blocks refining while a mix is running', () => {
    renderToolbar({ isMixing: true });

    expect(getRefine()).toBeDisabled();
  });
});

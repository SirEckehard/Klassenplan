// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import '@testing-library/jest-dom/vitest';
import '@/i18n/i18n';
import type { ComponentProps } from 'react';
import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PlanCard from '../../components/PlanCard';
import { ToastProvider } from '../../components/ui/feedback/ToastProvider';
import {
  createMockSavedPlan,
  createMockStudent,
  createMockClassroomScene,
  expectErrorToast,
  getButton,
  getDialog,
  getHeading,
} from '../../__tests__/utils';
import { dismissAllToasts } from '../../utils/ui/toast';

const basePlan = createMockSavedPlan({
  name: 'Plan A',
  date: '2024-01-01',
  seating: [
    [createMockStudent(), null],
    [createMockStudent(), createMockStudent()],
  ],
  scene: createMockClassroomScene(2),
});

const renderPlanCard = (
  overrides: Partial<ComponentProps<typeof PlanCard>> = {},
) => {
  const props: ComponentProps<typeof PlanCard> = {
    plan: basePlan,
    onLoad: vi.fn(),
    onDelete: vi.fn(),
    onRename: vi.fn().mockReturnValue(true),
    ...overrides,
  };

  const utils = render(
    <ToastProvider>
      <PlanCard {...props} />
    </ToastProvider>,
  );

  return {
    ...utils,
    props,
  };
};

afterEach(() => {
  act(() => {
    dismissAllToasts();
  });
  cleanup();
});

describe('PlanCard', () => {
  it('zeigt Plan-Metadaten an', () => {
    renderPlanCard();

    expect(getHeading('Plan A', 3)).toBeInTheDocument();
    const article = screen.getByRole('article', {
      name: /Sitzplan Plan A|Seating plan Plan A/i,
    });
    expect(article).toHaveTextContent(/3 Schüler|3 students/i);
    expect(article).toHaveTextContent(/2 Tische|2 tables/i);
  });

  it('handhabt Laden, Umbenennen und Löschen', async () => {
    const user = userEvent.setup();
    const onLoad = vi.fn();
    const onDelete = vi.fn();
    const onRename = vi.fn().mockReturnValue(true);
    renderPlanCard({ onLoad, onDelete, onRename });

    const loadButton = getButton(
      /Sitzplan Plan A laden|Load seating plan Plan A/i,
    );
    await user.click(loadButton);
    expect(onLoad).toHaveBeenCalledWith(basePlan);

    const renameButton = getButton(
      /Namen von Plan A bearbeiten|Rename Plan A/i,
    );
    await user.click(renameButton);

    const nameInput = screen.getByDisplayValue('Plan A');
    await user.clear(nameInput);
    await user.type(nameInput, 'Plan B{enter}');
    expect(onRename).toHaveBeenCalledWith(basePlan.id, 'Plan B');

    const deleteButton = getButton(
      /Sitzplan Plan A löschen|Delete seating plan Plan A/i,
    );
    await user.click(deleteButton);

    const dialog = getDialog(/Sitzplan löschen|Delete Seating Plan/i);
    const confirmButton = within(dialog).getByRole('button', {
      name: /Löschen|Delete/i,
    });
    await user.click(confirmButton);
    expect(onDelete).toHaveBeenCalledWith(basePlan);
  });

  it('zeigt Fehlertoast, wenn Umbenennen fehlschlägt', async () => {
    const user = userEvent.setup();
    const onRename = vi.fn().mockReturnValue(false);
    renderPlanCard({ onRename });

    const renameButton = getButton(
      /Namen von Plan A bearbeiten|Rename Plan A/i,
    );
    await user.click(renameButton);

    const nameInput = screen.getByDisplayValue('Plan A');
    await user.clear(nameInput);
    await user.type(nameInput, 'Plan B');

    const saveButton = screen.getByTitle(/Speichern|Save/i);
    await user.click(saveButton);

    expect(onRename).toHaveBeenCalledWith(basePlan.id, 'Plan B');
    expectErrorToast();
  });
});

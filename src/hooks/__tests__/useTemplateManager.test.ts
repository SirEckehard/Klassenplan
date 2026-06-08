// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { SetStateAction } from 'react';
import type { ClassroomScene, ClassroomTemplate } from '@/types';
import useTemplateManager from '@/hooks/template/useTemplateManager';
import type { TemplateServiceResult } from '@/hooks/template/useTemplateService';

const {
  confirmDialogMock,
  showToastMock,
  mockLoadTemplates,
  mockSaveTemplate,
  mockUpdateTemplate,
  mockDeleteTemplate,
  mockRenameTemplate,
  logErrorMock,
} = vi.hoisted(() => ({
  confirmDialogMock: vi.fn(),
  showToastMock: vi.fn(),
  mockLoadTemplates:
    vi.fn<() => Promise<TemplateServiceResult<ClassroomTemplate[]>>>(),
  mockSaveTemplate:
    vi.fn<
      (
        name: string,
        scene: ClassroomScene,
      ) => Promise<TemplateServiceResult<ClassroomTemplate>>
    >(),
  mockUpdateTemplate:
    vi.fn<
      (
        id: number,
        scene: ClassroomScene,
      ) => Promise<TemplateServiceResult<void>>
    >(),
  mockDeleteTemplate:
    vi.fn<(id: number) => Promise<TemplateServiceResult<void>>>(),
  mockRenameTemplate:
    vi.fn<
      (id: number, newName: string) => Promise<TemplateServiceResult<void>>
    >(),
  logErrorMock: vi.fn(),
}));

vi.mock('@/services/ui/dialogs', () => ({
  confirmDialog: confirmDialogMock,
}));

vi.mock('@/utils/ui/toast', () => ({
  showToast: showToastMock,
  TOAST_MESSAGES: {
    SAVE_TEMPLATE_SUCCESS: 'SAVE_TEMPLATE_SUCCESS',
    SAVE_TEMPLATE_ERROR: 'SAVE_TEMPLATE_ERROR',
    TEMPLATE_UPDATE_SUCCESS: 'TEMPLATE_UPDATE_SUCCESS',
    TEMPLATE_UPDATE_ERROR: 'TEMPLATE_UPDATE_ERROR',
    LOAD_TEMPLATE_SUCCESS: 'LOAD_TEMPLATE_SUCCESS',
    DELETE_TEMPLATE_SUCCESS: 'DELETE_TEMPLATE_SUCCESS',
    TEMPLATE_RENAME_SUCCESS: 'TEMPLATE_RENAME_SUCCESS',
    TEMPLATE_NAME_EMPTY: 'TEMPLATE_NAME_EMPTY',
    TEMPLATE_NAME_EXISTS: 'TEMPLATE_NAME_EXISTS',
  },
}));

vi.mock('@/utils', () => ({
  logError: logErrorMock,
}));

vi.mock('@/hooks/template/useTemplateService', () => ({
  useTemplateService: () => ({
    loadTemplates: mockLoadTemplates,
    saveTemplate: mockSaveTemplate,
    updateTemplate: mockUpdateTemplate,
    deleteTemplate: mockDeleteTemplate,
    renameTemplate: mockRenameTemplate,
  }),
}));

const successResult = <T>(data: T): TemplateServiceResult<T> => ({
  success: true,
  data,
});

function createScene(offset = 0): ClassroomScene {
  return {
    totalStudents: 2,
    tables: [
      {
        x: offset,
        y: offset,
        width: 100,
        height: 50,
        rotation: 0,
        seatCount: 2,
        locked: false,
        zIndex: 0,
      },
    ],
  };
}

describe('useTemplateManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    confirmDialogMock.mockReset();
    showToastMock.mockReset();
    mockLoadTemplates.mockReset();
    mockSaveTemplate.mockReset();
    mockUpdateTemplate.mockReset();
    mockDeleteTemplate.mockReset();
    mockRenameTemplate.mockReset();
  });

  test('overwrites existing template when confirmed', async () => {
    const templateScene = createScene(10);
    const templates: ClassroomTemplate[] = [
      { id: 1, name: 'Beste Vorlage', scene: templateScene },
    ];
    mockLoadTemplates.mockResolvedValue(successResult(templates));
    mockUpdateTemplate.mockResolvedValue(successResult(undefined));

    const initialScene = createScene(0);
    let currentScene: ClassroomScene = initialScene;
    let rerenderHook: ((props: { scene: ClassroomScene }) => void) | null =
      null;

    const updateClassroomScene = (next: SetStateAction<ClassroomScene>) => {
      const nextScene =
        typeof next === 'function'
          ? (next as (prev: ClassroomScene) => ClassroomScene)(currentScene)
          : next;
      currentScene = nextScene;
      rerenderHook?.({ scene: currentScene });
    };

    const { result, rerender } = renderHook(
      ({ scene }: { scene: ClassroomScene }) =>
        useTemplateManager(scene, updateClassroomScene),
      { initialProps: { scene: currentScene } },
    );
    rerenderHook = rerender;

    await waitFor(() => expect(result.current.templates).toHaveLength(1));
    // Default: No template selected (Standard-Layout)
    expect(result.current.selectedTemplateId).toBe(null);

    // Select template first (since default is null)
    act(() => {
      result.current.setSelectedTemplateId(1);
    });

    act(() => {
      result.current.handleLoadTemplate();
    });

    act(() => {
      updateClassroomScene((prev) => ({
        ...prev,
        tables: prev.tables.map((table, index) =>
          index === 0 ? { ...table, x: table.x + 20 } : table,
        ),
      }));
    });

    confirmDialogMock.mockResolvedValueOnce(true);

    await act(async () => {
      await result.current.handleQuickSave();
    });

    expect(confirmDialogMock).toHaveBeenCalledWith(
      'Die aktuelle Vorlage wurde verändert. Soll die vorhandene Vorlage überschrieben werden?',
      {
        confirmLabel: 'Überschreiben',
        cancelLabel: 'Abbrechen',
      },
    );
    expect(mockUpdateTemplate).toHaveBeenCalledWith(1, currentScene);
    expect(mockSaveTemplate).not.toHaveBeenCalled();
  });

  test('skips overwrite when confirmation is declined', async () => {
    const templateScene = createScene(5);
    const templates: ClassroomTemplate[] = [
      { id: 2, name: 'Erste Vorlage', scene: templateScene },
    ];
    mockLoadTemplates.mockResolvedValue(successResult(templates));
    mockSaveTemplate.mockResolvedValue(
      successResult({ id: 3, name: 'Neue Vorlage', scene: createScene(2) }),
    );

    const initialScene = createScene(0);
    let currentScene: ClassroomScene = initialScene;
    let rerenderHook: ((props: { scene: ClassroomScene }) => void) | null =
      null;

    const updateClassroomScene = (next: SetStateAction<ClassroomScene>) => {
      const nextScene =
        typeof next === 'function'
          ? (next as (prev: ClassroomScene) => ClassroomScene)(currentScene)
          : next;
      currentScene = nextScene;
      rerenderHook?.({ scene: currentScene });
    };

    const { result, rerender } = renderHook(
      ({ scene }: { scene: ClassroomScene }) =>
        useTemplateManager(scene, updateClassroomScene),
      { initialProps: { scene: currentScene } },
    );
    rerenderHook = rerender;

    await waitFor(() => expect(result.current.templates).toHaveLength(1));
    // Default: No template selected (Standard-Layout)
    expect(result.current.selectedTemplateId).toBe(null);

    // Select template first
    act(() => {
      result.current.setSelectedTemplateId(2);
    });

    act(() => {
      result.current.handleLoadTemplate();
    });

    act(() => {
      updateClassroomScene((prev) => ({
        ...prev,
        totalStudents: prev.totalStudents + 2,
      }));
    });

    confirmDialogMock.mockResolvedValueOnce(false);

    await act(async () => {
      await result.current.handleQuickSave();
    });

    expect(confirmDialogMock).toHaveBeenCalledWith(
      'Die aktuelle Vorlage wurde verändert. Soll die vorhandene Vorlage überschrieben werden?',
      {
        confirmLabel: 'Überschreiben',
        cancelLabel: 'Abbrechen',
      },
    );
    expect(mockUpdateTemplate).not.toHaveBeenCalled();
    // No modal open because we keep legacy behavior (openSaveModal is only triggered when no overwrite is possible)
    expect(result.current.isSaveModalOpen).toBe(false);
  });
});

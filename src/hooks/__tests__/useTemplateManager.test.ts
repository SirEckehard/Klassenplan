// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { ClassroomScene, ClassroomTemplate } from '@/types';
import useTemplateManager from '@/hooks/template/useTemplateManager';
import type { TemplateServiceResult } from '@/hooks/template/useTemplateService';

const {
  showToastMock,
  mockLoadTemplates,
  mockSaveTemplate,
  mockUpdateTemplate,
  mockDeleteTemplate,
  mockRenameTemplate,
  logErrorMock,
} = vi.hoisted(() => ({
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

vi.mock('@/utils/ui/toast', () => ({
  showToast: showToastMock,
  TOAST_MESSAGES: {
    SAVE_TEMPLATE_SUCCESS: 'SAVE_TEMPLATE_SUCCESS',
    SAVE_TEMPLATE_ERROR: 'SAVE_TEMPLATE_ERROR',
    TEMPLATE_UPDATE_SUCCESS: 'TEMPLATE_UPDATE_SUCCESS',
    TEMPLATE_UPDATE_ERROR: 'TEMPLATE_UPDATE_ERROR',
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
    showToastMock.mockReset();
    mockLoadTemplates.mockReset();
    mockSaveTemplate.mockReset();
    mockUpdateTemplate.mockReset();
    mockDeleteTemplate.mockReset();
    mockRenameTemplate.mockReset();
  });

  test('keeps the room as a new template and reports it kept', async () => {
    const scene = createScene(4);
    mockLoadTemplates.mockResolvedValue(successResult([]));
    mockSaveTemplate.mockResolvedValue(
      successResult({ id: 7, name: 'Raum 104', scene }),
    );

    const { result } = renderHook(() => useTemplateManager(scene));
    await waitFor(() => expect(mockLoadTemplates).toHaveBeenCalled());

    let kept = false;
    await act(async () => {
      kept = await result.current.handleSaveTemplate('Raum 104');
    });

    expect(kept).toBe(true);
    expect(mockSaveTemplate).toHaveBeenCalledWith('Raum 104', scene);
    expect(mockUpdateTemplate).not.toHaveBeenCalled();
    expect(showToastMock).toHaveBeenCalledWith(
      'success',
      'SAVE_TEMPLATE_SUCCESS',
    );
    expect(result.current.selectedTemplateId).toBe(7);
  });

  test('replaces the template it is told to with the room', async () => {
    const scene = createScene(10);
    const templates: ClassroomTemplate[] = [
      { id: 1, name: 'Rochen', scene: createScene(0) },
    ];
    mockLoadTemplates.mockResolvedValue(successResult(templates));
    mockUpdateTemplate.mockResolvedValue(successResult(undefined));

    const { result } = renderHook(() => useTemplateManager(scene));
    await waitFor(() => expect(result.current.templates).toHaveLength(1));

    let kept = false;
    await act(async () => {
      kept = await result.current.handleSaveTemplate('Rochen', 1);
    });

    expect(kept).toBe(true);
    expect(mockUpdateTemplate).toHaveBeenCalledWith(1, scene);
    expect(mockSaveTemplate).not.toHaveBeenCalled();
    expect(showToastMock).toHaveBeenCalledWith(
      'success',
      'TEMPLATE_UPDATE_SUCCESS',
    );
  });

  test('reports a refused name as not kept', async () => {
    mockLoadTemplates.mockResolvedValue(successResult([]));
    mockSaveTemplate.mockResolvedValue({
      success: false,
      error: 'duplicate-name',
    });

    const { result } = renderHook(() => useTemplateManager(createScene()));
    await waitFor(() => expect(mockLoadTemplates).toHaveBeenCalled());

    let kept = true;
    await act(async () => {
      kept = await result.current.handleSaveTemplate('Rochen');
    });

    expect(kept).toBe(false);
    expect(showToastMock).toHaveBeenCalledWith('error', 'TEMPLATE_NAME_EXISTS');
  });
});

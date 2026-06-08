// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useCallback } from 'react';
import type { ClassroomTemplate, ClassroomScene } from '@/types';
import type { ISeatingPlanRepository } from '@/repositories';
import { RepositoryErrorType } from '@/repositories';
import { useSeatingRepository } from '@/hooks/useSeatingRepository';

/**
 * Error types for template operations
 */
export type TemplateServiceError =
  | 'empty-name'
  | 'duplicate-name'
  | 'template-not-found'
  | 'storage-error';

/**
 * Result type for template operations
 */
export type TemplateServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: TemplateServiceError; message?: string };

/**
 * Helper to create success results
 */
function success<T>(data: T): TemplateServiceResult<T> {
  return { success: true, data };
}

/**
 * Helper to create error results
 */
function failure<T>(
  error: TemplateServiceError,
  message?: string,
): TemplateServiceResult<T> {
  return { success: false, error, message };
}

/**
 * Generate the first available template name suggestion.
 */
export function getTemplateNameSuggestion(
  existingTemplates: ClassroomTemplate[],
): string {
  const baseNames = ['Klassenraum', 'Layout', 'Vorlage'];
  for (const base of baseNames) {
    let num = 1;
    while (existingTemplates.some((t) => t.name === `${base} ${num}`)) {
      num++;
    }
    return `${base} ${num}`;
  }
  return `Vorlage ${Date.now()}`;
}

/**
 * Service layer for classroom template management
 * Pure business logic without UI dependencies (no toast, no dialogs)
 *
 * This hook provides:
 * - Template CRUD operations
 * - Validation (name, duplicates)
 * - Name suggestion generation
 * - Type-safe error handling with Result pattern
 */
export function useTemplateService() {
  const repository: ISeatingPlanRepository = useSeatingRepository();

  /**
   * Load all templates from storage
   */
  const loadTemplates = useCallback(async (): Promise<
    TemplateServiceResult<ClassroomTemplate[]>
  > => {
    const result = await repository.loadTemplates();
    if (!result.success) {
      return failure('storage-error', result.error.message);
    }
    return success(result.data);
  }, [repository]);

  /**
   * Validate template name
   */
  const validateName = useCallback(
    async (
      name: string,
      existingTemplates: ClassroomTemplate[],
      excludeId?: number,
    ): Promise<TemplateServiceResult<void>> => {
      const trimmed = name.trim();

      if (!trimmed) {
        return failure('empty-name', 'Template name cannot be empty');
      }

      const duplicate = existingTemplates.some(
        (t) => t.name === trimmed && t.id !== excludeId,
      );

      if (duplicate) {
        return failure(
          'duplicate-name',
          `Template with name "${trimmed}" already exists`,
        );
      }

      return success(undefined);
    },
    [],
  );

  /**
   * Generate smart name suggestions
   * Returns first available name like "Klassenraum 1", "Layout 1", etc.
   */
  const generateNameSuggestion = useCallback(
    (existingTemplates: ClassroomTemplate[]): string =>
      getTemplateNameSuggestion(existingTemplates),
    [],
  );

  /**
   * Save a new template
   */
  const saveTemplate = useCallback(
    async (
      name: string,
      scene: ClassroomScene,
    ): Promise<TemplateServiceResult<ClassroomTemplate>> => {
      const trimmed = name.trim();

      // Load existing templates for validation
      const loadResult = await loadTemplates();
      if (!loadResult.success) {
        return failure('storage-error', loadResult.message);
      }

      // Validate name
      const validation = await validateName(trimmed, loadResult.data);
      if (!validation.success) {
        return failure(validation.error, validation.message);
      }

      // Create new template
      const template: ClassroomTemplate = {
        id: Date.now(),
        name: trimmed,
        scene,
      };

      // Save to repository
      const saveResult = await repository.saveTemplate(template);
      if (!saveResult.success) {
        if (saveResult.error.type === RepositoryErrorType.DUPLICATE_KEY) {
          return failure(
            'duplicate-name',
            saveResult.error.message || 'Template name already exists',
          );
        }
        return failure('storage-error', saveResult.error.message);
      }

      return success(saveResult.data);
    },
    [repository, loadTemplates, validateName],
  );

  /**
   * Update an existing template's scene
   */
  const updateTemplate = useCallback(
    async (
      id: number,
      scene: ClassroomScene,
    ): Promise<TemplateServiceResult<void>> => {
      const result = await repository.updateTemplate(id, scene);
      if (!result.success) {
        if (result.error.type === RepositoryErrorType.NOT_FOUND) {
          return failure('template-not-found', result.error.message);
        }
        return failure('storage-error', result.error.message);
      }
      return success(undefined);
    },
    [repository],
  );

  /**
   * Delete a template
   */
  const deleteTemplate = useCallback(
    async (id: number): Promise<TemplateServiceResult<void>> => {
      const result = await repository.deleteTemplate(id);
      if (!result.success) {
        return failure('storage-error', result.error.message);
      }
      return success(undefined);
    },
    [repository],
  );

  /**
   * Rename a template
   */
  const renameTemplate = useCallback(
    async (
      id: number,
      newName: string,
    ): Promise<TemplateServiceResult<void>> => {
      const trimmed = newName.trim();

      // Load existing templates for validation
      const loadResult = await loadTemplates();
      if (!loadResult.success) {
        return failure('storage-error', loadResult.message);
      }

      // Validate new name (excluding current template)
      const validation = await validateName(trimmed, loadResult.data, id);
      if (!validation.success) {
        return failure(validation.error, validation.message);
      }

      // Rename in repository
      const result = await repository.renameTemplate(id, trimmed);
      if (!result.success) {
        if (result.error.type === RepositoryErrorType.NOT_FOUND) {
          return failure('template-not-found', result.error.message);
        }
        if (result.error.type === RepositoryErrorType.DUPLICATE_KEY) {
          return failure(
            'duplicate-name',
            result.error.message || 'Template name already exists',
          );
        }
        return failure('storage-error', result.error.message);
      }

      return success(undefined);
    },
    [repository, loadTemplates, validateName],
  );

  /**
   * Check if a template name exists (excluding specific template)
   */
  const checkNameExists = useCallback(
    (
      name: string,
      templates: ClassroomTemplate[],
      excludeId?: number,
    ): boolean => {
      const trimmed = name.trim();
      return templates.some((t) => t.name === trimmed && t.id !== excludeId);
    },
    [],
  );

  return {
    loadTemplates,
    saveTemplate,
    updateTemplate,
    deleteTemplate,
    renameTemplate,
    validateName,
    generateNameSuggestion,
    checkNameExists,
  };
}

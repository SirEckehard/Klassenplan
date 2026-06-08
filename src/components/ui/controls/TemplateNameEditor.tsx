// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckIcon, XIcon } from '@phosphor-icons/react';
import type { ClassroomTemplate } from '@/types';
import {
  dangerIconButtonClass,
  successIconButtonClass,
  inputFieldClass,
} from '@/utils';

type Props = {
  /**
   * Template to edit
   */
  template: ClassroomTemplate;
  /**
   * All templates for duplicate check
   */
  allTemplates: ClassroomTemplate[];
  /**
   * Callback when rename is confirmed
   * Should return a result indicating success or error type
   */
  onRename: (
    id: number,
    newName: string,
  ) => Promise<{ success: boolean; error?: string }>;
  /**
   * Optional CSS width class (default: 'w-full')
   */
  widthClass?: string;
};

/**
 * TemplateNameEditor Component
 *
 * Handles inline template name editing with validation and duplicate checking.
 * Similar to StudentNameEditor but specifically for classroom templates.
 *
 * @param template - Current template object
 * @param allTemplates - All templates for duplicate check
 * @param onRename - Callback to rename template
 * @param widthClass - Optional CSS width class (default: 'w-full')
 */
export default function TemplateNameEditor({
  template,
  allTemplates,
  onRename,
  widthClass = 'w-full',
}: Props) {
  const { t } = useTranslation('generator');
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState('');

  const saveName = async () => {
    const trimmedName = draftName.trim();

    // Validate locally
    if (!trimmedName) {
      // Could show inline error, but for now just return
      return;
    }

    // CheckIcon if name already exists (excluding current template)
    const nameExists = allTemplates.some(
      (t) => t.id !== template.id && t.name === trimmedName,
    );

    if (nameExists) {
      // Could show inline error, but for now just return
      return;
    }

    // Only rename if name actually changed
    if (trimmedName === template.name) {
      setIsEditing(false);
      setDraftName('');
      return;
    }

    // Call parent handler - it will show toast based on result
    const result = await onRename(template.id, trimmedName);

    // Only exit edit mode if successful
    if (result.success) {
      setIsEditing(false);
      setDraftName('');
    }
    // If failed, stay in edit mode so user can correct
  };

  const startEditing = () => {
    setIsEditing(true);
    setDraftName(template.name);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setDraftName('');
  };

  return (
    <div className="flex w-full items-center">
      {/* Name Field or Input */}
      {isEditing ? (
        <div className={`relative ${widthClass} min-w-0`}>
          <input
            type="text"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                saveName();
              } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEditing();
              }
            }}
            onBlur={saveName}
            className={`${inputFieldClass} w-full pr-16`}
            autoFocus
          />
          <div className="absolute inset-y-0 right-2 flex items-center gap-1">
            <button
              type="button"
              className={`${successIconButtonClass} h-6 w-6 p-1.5!`}
              title={t('common.save', 'Speichern')}
              onPointerDown={(e) => e.preventDefault()}
              onClick={saveName}
              aria-label={t('template.saveName', 'Namen speichern')}
            >
              <CheckIcon size={12} />
            </button>
            <button
              type="button"
              className={`${dangerIconButtonClass} h-6 w-6 p-1.5!`}
              title={t('common.cancel', 'Abbrechen')}
              onPointerDown={(e) => e.preventDefault()}
              onClick={cancelEditing}
              aria-label={t('template.cancelEdit', 'Bearbeitung abbrechen')}
            >
              <XIcon size={12} />
            </button>
          </div>
        </div>
      ) : (
        <h4
          onClick={startEditing}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              startEditing();
            }
          }}
          className={`${widthClass} min-w-0 text-sm font-medium truncate border border-blue-100 bg-white/80 rounded-xl px-3 py-1.5 cursor-text select-text shadow-sm transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-300 dark:border-blue-900/40 dark:bg-gray-950/70 dark:text-gray-100 dark:hover:bg-gray-800/70`}
          tabIndex={0}
          role="button"
          aria-label={t(
            'template.editName',
            'Vorlagennamen bearbeiten: {{name}}',
            { name: template.name },
          )}
          title={t(
            'template.clickToEdit',
            'Klick oder Eingabetaste zum Bearbeiten',
          )}
        >
          {template.name}
        </h4>
      )}
    </div>
  );
}

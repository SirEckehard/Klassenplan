// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/components/ui/modals/Modal';
import type { ClassroomTemplate } from '@/types';
import { WarningCircleIcon, LayoutIcon } from '@phosphor-icons/react';
import {
  primaryButtonClass,
  secondaryButtonClass,
  successButtonClass,
} from '@/utils/ui/designTokens';
import { getTemplateNameSuggestion } from '@/hooks/template/useTemplateService';

type Props = {
  /**
   * Whether the modal is open
   */
  open: boolean;
  /**
   * Callback when modal is closed
   */
  onClose: () => void;
  /**
   * Callback when user confirms save
   */
  onSave: (name: string, overwriteId?: number) => void;
  /**
   * Existing templates for duplicate check and overwrite option
   */
  existingTemplates: ClassroomTemplate[];
  /**
   * Number of tables in current layout (for preview)
   */
  tableCount: number;
  /**
   * Number of seats in current layout (for preview)
   */
  seatCount: number;
  /**
   * Default name for the template
   */
  defaultName?: string;
};

/**
 * SaveTemplateModal Component
 *
 * Modal for saving classroom templates with:
 * - Smart name suggestions
 * - Inline duplicate detection
 * - Option to overwrite existing templates
 * - Layout preview (table/seat count)
 */
export default function SaveTemplateModal({
  open,
  onClose,
  onSave,
  existingTemplates,
  tableCount,
  seatCount,
  defaultName = '',
}: Props) {
  const { t } = useTranslation('generator');
  const [name, setName] = useState(defaultName);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
    null,
  );
  const inputRef = useRef<HTMLInputElement | null>(null);

  const suggestedName = useMemo(
    () => getTemplateNameSuggestion(existingTemplates),
    [existingTemplates],
  );

  // CheckIcon if we're in overwrite mode (template selected from dropdown)
  const overwriteMode = selectedTemplateId !== null;
  const confirmButtonClass = overwriteMode
    ? primaryButtonClass
    : successButtonClass;

  // CheckIcon if name already exists (only relevant when NOT in overwrite mode)
  const existingTemplate = existingTemplates.find(
    (t) => t.name.trim() === name.trim(),
  );
  const isDuplicate = !!existingTemplate && !overwriteMode;

  useEffect(() => {
    if (open) {
      // Set default name or generate suggestion
      const initialName = defaultName || suggestedName;
      queueMicrotask(() => {
        setName(initialName);
        setSelectedTemplateId(null);
      });
      // Focus input after modal opens
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, defaultName, suggestedName]);

  const handleSave = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    if (overwriteMode && selectedTemplateId !== null) {
      onSave(trimmedName, selectedTemplateId);
    } else if (!isDuplicate) {
      onSave(trimmedName);
    }
  };

  // Update name when a template is selected for overwriting
  useEffect(() => {
    if (selectedTemplateId !== null) {
      const template = existingTemplates.find(
        (t) => t.id === selectedTemplateId,
      );
      if (template) {
        queueMicrotask(() => {
          setName(template.name);
        });
      }
    }
  }, [selectedTemplateId, existingTemplates]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('template.saveTitle', 'Klassenraum-Vorlage speichern')}
      icon={<LayoutIcon size={24} aria-hidden="true" />}
      size="lg"
    >
      <div className="space-y-6">
        {/* Layout Preview */}
        <div className="flex items-center gap-4 rounded-2xl border border-(--border-card) bg-(--surface-card) p-4 text-sm text-(--text-muted) shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-(--button-primary-bg)/90 text-white shadow-sm dark:bg-(--button-primary-bg)/80">
            <LayoutIcon size={20} aria-hidden="true" />
          </div>
          <div>
            <span className="font-semibold">{tableCount}</span>{' '}
            {t('template.tables', 'Tische')} •{' '}
            <span className="font-semibold">{seatCount}</span>{' '}
            {t('template.seats', 'Plätze')}
          </div>
        </div>

        {/* Name Input */}
        <div>
          <label
            htmlFor="template-name"
            className="mb-1.5 block text-sm font-semibold text-(--text-page)"
          >
            {t('template.nameLabel', 'Vorlagenname')}
          </label>
          <input
            ref={inputRef}
            id="template-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isDuplicate) {
                handleSave();
              } else if (e.key === 'Escape') {
                onClose();
              }
            }}
            className="w-full rounded-xl border border-(--border-option-selected) bg-(--surface-card) px-3 py-2 text-sm text-(--text-page) shadow-inner transition focus:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary)"
            placeholder={t('template.namePlaceholder', 'z.B. Klassenraum 1a')}
            aria-label={t('template.nameAriaLabel', 'Vorlagenname eingeben')}
          />

          {/* Duplicate Warning */}
          {isDuplicate && (
            <div className="mt-2 flex items-start gap-3 rounded-lg border border-(--border-card) bg-(--surface-sunken) p-3 text-sm text-(--text-page)">
              <WarningCircleIcon className="mt-0.5 h-5 w-5 shrink-0 text-(--text-muted)" />
              <div className="flex-1">
                {t(
                  'template.duplicateWarning',
                  'Eine Vorlage mit diesem Namen existiert bereits.',
                )}
              </div>
            </div>
          )}
        </div>

        {/* Overwrite Option - Optional Dropdown */}
        {existingTemplates.length > 0 && (
          <div>
            <label
              htmlFor="template-overwrite"
              className="mb-1.5 block text-sm font-semibold text-(--text-page)"
            >
              {t(
                'template.overwriteLabel',
                'Oder bestehende Vorlage überschreiben',
              )}
            </label>
            <select
              id="template-overwrite"
              value={selectedTemplateId ?? ''}
              onChange={(e) =>
                setSelectedTemplateId(
                  e.target.value ? Number(e.target.value) : null,
                )
              }
              className="w-full rounded-xl border border-(--border-option-selected) bg-(--surface-card) px-3 py-2 text-sm text-(--text-page) shadow-inner transition focus:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary)"
              aria-label={t('template.overwriteSelect')}
            >
              <option value="">
                {t(
                  'template.noSelection',
                  '-- Keine Auswahl (neue Vorlage) --',
                )}
              </option>
              {existingTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} ({template.scene.tables.length}{' '}
                  {t('template.tables', 'Tische')})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className={secondaryButtonClass}
          >
            {t('common.cancel', 'Abbrechen')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim() || isDuplicate}
            className={confirmButtonClass}
          >
            {overwriteMode
              ? t('template.overwrite', 'Überschreiben')
              : t('common.save', 'Speichern')}
          </button>
        </div>
      </div>
    </Modal>
  );
}

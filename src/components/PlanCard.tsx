// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useState, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { EyeIcon, TrashIcon, PencilIcon, CheckIcon, XIcon } from '@phosphor-icons/react';
import { showToast, TOAST_MESSAGES } from '@/utils/ui/toast';
import ConfirmDialog from '@/components/ui/modals/ConfirmDialog';
import type { SavedPlan } from '@/types';
import { countStudents, tableCount, seatsPerTable } from '../utils/plan';

type Props = {
  plan: SavedPlan;
  onLoad: (plan: SavedPlan) => void;
  onDelete: (plan: SavedPlan) => void;
  onRename?: (id: string, name: string) => boolean;
};

import {
  cardSurfaceClass,
  primaryButtonClass,
  dangerButtonClass,
  inputFieldClass,
  successIconButtonClass,
  secondaryButtonClass,
} from '@/utils/ui/designTokens';

/**
 * Card displaying a single saved plan with actions.
 */
function PlanCard({ plan, onLoad, onDelete, onRename }: Props) {
  const { t } = useTranslation('generator');
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const saveName = () => {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== plan.name) {
      const ok = onRename?.(plan.id, trimmed);
      if (!ok) {
        // Notify user when renaming is not possible
        showToast('error', TOAST_MESSAGES.PLAN_NAME_CHANGE_ERROR);
      }
      setIsEditing(false);
    } else {
      setIsEditing(false);
    }
  };

  return (
    <>
      <div
        role="article"
        aria-label={t('planCard.planAriaLabel', {
          name: plan.name,
          defaultValue: `Sitzplan ${plan.name}`,
        })}
        className={`${cardSurfaceClass} transition-shadow hover:shadow-md focus-within:shadow-md`}
      >
        {/* Card Header */}
        <div className="p-4 pb-2">
          <div className="flex items-start justify-between gap-3">
            {isEditing ? (
              <div className="flex items-center gap-2 w-full">
                <input
                  autoFocus
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      saveName();
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      setIsEditing(false);
                      setDraftName('');
                    }
                  }}
                  onBlur={saveName}
                  className={`${inputFieldClass} flex-1 py-1`}
                />
                <button
                  type="button"
                  className={`${successIconButtonClass} min-w-11 h-11`}
                  title={t('common.save', 'Speichern')}
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={saveName}
                >
                  <CheckIcon size={16} />
                </button>
                <button
                  type="button"
                  className={`${secondaryButtonClass} min-w-11 h-11 px-0`}
                  title={t('common.cancel', 'Abbrechen')}
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setIsEditing(false);
                    setDraftName('');
                  }}
                >
                  <XIcon size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h3
                  role="heading"
                  aria-level={3}
                  className="font-semibold text-gray-800 dark:text-gray-100 text-base leading-6 wrap-break-word"
                >
                  {plan.name}
                </h3>
                {onRename && (
                  <button
                    type="button"
                    className={`${secondaryButtonClass} min-w-11 h-11 px-0`}
                    title={t('planCard.editName', 'Namen bearbeiten')}
                    onClick={() => {
                      setIsEditing(true);
                      setDraftName(plan.name);
                    }}
                  >
                    <PencilIcon size={16} />
                  </button>
                )}
              </div>
            )}
            {plan.date && (
              <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs border dark:bg-gray-700 dark:text-gray-200">
                {plan.date}
              </span>
            )}
          </div>

          {/* Meta badges */}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs min-h-7">
            {typeof countStudents(plan) === 'number' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                {t('planCard.studentsBadge', {
                  count: countStudents(plan),
                  defaultValue: `${countStudents(plan)} Schüler`,
                })}
              </span>
            )}
            {typeof tableCount(plan) === 'number' &&
              typeof seatsPerTable(plan) === 'number' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                  {t('planCard.tablesBadge', {
                    count: tableCount(plan),
                    defaultValue: `${tableCount(plan)} Tische`,
                  })}{' '}
                  ·{' '}
                  {t('planCard.seatsPerTableBadge', {
                    count: seatsPerTable(plan),
                    defaultValue: `${seatsPerTable(plan)} / Tisch`,
                  })}
                </span>
              )}
          </div>
        </div>

        {/* Card Footer */}
        <div className="px-4 pb-4 pt-2 flex flex-col items-end gap-0">
          <div className="flex gap-2">
            <button
              onClick={() => onLoad(plan)}
              className={`${primaryButtonClass} gap-2`}
              title={t('planCard.loadPlan', 'Sitzplan laden')}
              aria-label={t('planCard.loadPlanAriaLabel', {
                name: plan.name,
                defaultValue: `Sitzplan ${plan.name} laden`,
              })}
            >
              <EyeIcon size={16} />
              {t('planCard.load', 'Laden')}
            </button>
            <button
              onClick={() => setConfirmOpen(true)}
              className={`${dangerButtonClass} gap-2`}
              title={t('planCard.deletePlan', 'Sitzplan löschen')}
              aria-label={t('planCard.deletePlanAriaLabel', {
                name: plan.name,
                defaultValue: `Sitzplan ${plan.name} löschen`,
              })}
            >
              <TrashIcon size={16} />
              {t('common.delete', 'Löschen')}
            </button>
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title={t('planCard.deleteDialogTitle', 'Sitzplan löschen')}
        message={t('planCard.deleteDialogMessage', {
          name: plan.name,
          defaultValue: `Möchtest du den Sitzplan "${plan.name}" wirklich löschen?`,
        })}
        confirmLabel={t('common.delete', 'Löschen')}
        cancelLabel={t('common.cancel', 'Abbrechen')}
        onConfirm={() => {
          onDelete(plan);
          setConfirmOpen(false);
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}

export default memo(PlanCard);

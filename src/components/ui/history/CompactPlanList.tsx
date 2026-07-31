// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  EyeIcon,
  TrashIcon,
  CheckIcon,
  XIcon,
  CalendarBlankIcon,
  UsersIcon,
  TableIcon,
} from '@phosphor-icons/react';
import { showToast, TOAST_MESSAGES } from '@/utils/ui/toast';
import ConfirmDialog from '@/components/ui/modals/ConfirmDialog';
import type { SavedPlan } from '@/types';
import {
  cardSurfaceClass,
  countStudents,
  successIconButtonClass,
  loadingIconButtonClass,
  dangerIconButtonClass,
  inputFieldClass,
  seatsPerTable,
  tableCount,
} from '@/utils';

interface CompactPlanListProps {
  plans: SavedPlan[];
  onLoad: (plan: SavedPlan) => void;
  onDelete: (plan: SavedPlan) => void;
  onRename?: (id: string, name: string) => boolean;
  expandedPlanId?: string | null;
  onRequestExpand?: (planId: string) => void;
}

interface PlanItemProps {
  plan: SavedPlan;
  onLoad: (plan: SavedPlan) => void;
  onDelete: (plan: SavedPlan) => void;
  onRename?: (id: string, name: string) => boolean;
  isExpanded?: boolean;
  onRequestExpand?: (planId: string) => void;
}

function CompactPlanItem({
  plan,
  onLoad,
  onDelete,
  onRename,
  isExpanded = false,
  onRequestExpand,
}: PlanItemProps) {
  const { t } = useTranslation('generator');
  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Auto-activate edit mode when isExpanded becomes true and this plan is selected
  useEffect(() => {
    if (isExpanded && onRequestExpand && !isEditing) {
      queueMicrotask(() => {
        setIsEditing(true);
        setDraftName(plan.name);
      });
    }
  }, [isExpanded, onRequestExpand, plan.name, isEditing]);

  const startEditing = () => {
    setIsEditing(true);
    setDraftName(plan.name);
  };

  const saveName = () => {
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== plan.name) {
      const ok = onRename?.(plan.id, trimmed);
      if (!ok) {
        showToast('error', TOAST_MESSAGES.PLAN_NAME_CHANGE_ERROR);
      }
      setIsEditing(false);
    } else {
      setIsEditing(false);
    }
  };

  const studentCount = countStudents(plan);
  const tables = tableCount(plan);
  const seatsPerTableCount = seatsPerTable(plan);

  return (
    <>
      <div
        className={`${cardSurfaceClass} group flex h-full items-center gap-3 border border-blue-100/60 px-3 py-3 transition hover:border-blue-200 hover:bg-blue-50/70 dark:border-blue-900/40 dark:hover:border-blue-700 dark:hover:bg-blue-950/40`}
      >
        {/* Plan InfoIcon */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-2">
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
                className={`${inputFieldClass} flex-1 px-3! py-1.5! text-sm`}
              />
              <button
                type="button"
                className={`${successIconButtonClass} h-8 w-8`}
                title={t('common.save', 'Speichern')}
                aria-label={t('common.save', 'Speichern')}
                onPointerDown={(e) => e.preventDefault()}
                onClick={saveName}
              >
                <CheckIcon size={14} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={`${dangerIconButtonClass} h-8 w-8`}
                title={t('common.cancel', 'Abbrechen')}
                aria-label={t('common.cancel', 'Abbrechen')}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => {
                  setIsEditing(false);
                  setDraftName('');
                }}
              >
                <XIcon size={14} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span
                  className="student-plan-name cursor-text select-text rounded-xl border border-blue-100 px-3 py-1 text-sm font-medium text-gray-900 transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:border-blue-900/40 dark:text-gray-100 dark:hover:bg-gray-800/70"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (!isExpanded && onRequestExpand) {
                      onRequestExpand(plan.id);
                    } else if (onRename) {
                      startEditing();
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      event.stopPropagation();
                      if (!isExpanded && onRequestExpand) {
                        onRequestExpand(plan.id);
                      } else if (onRename) {
                        startEditing();
                      }
                    }
                  }}
                  tabIndex={onRename ? 0 : -1}
                  role={onRename ? 'button' : undefined}
                  aria-label={
                    onRename
                      ? t('planList.editNameAriaLabel', {
                          name: plan.name,
                          defaultValue: `Sitzplan-Namen bearbeiten: ${plan.name}`,
                        })
                      : undefined
                  }
                  title={
                    onRename
                      ? t(
                          'planList.editNameTitle',
                          'Klick oder Eingabetaste zum Bearbeiten',
                        )
                      : undefined
                  }
                >
                  {plan.name}
                </span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                {plan.date && (
                  <span className="flex items-center gap-1">
                    <CalendarBlankIcon size={12} />
                    {plan.date}
                  </span>
                )}
                {typeof studentCount === 'number' && (
                  <span className="flex items-center gap-1">
                    <UsersIcon size={12} />
                    {studentCount}
                  </span>
                )}
                {typeof tables === 'number' &&
                  typeof seatsPerTableCount === 'number' && (
                    <span className="flex items-center gap-1">
                      <TableIcon size={12} />
                      {tables}×{seatsPerTableCount}
                    </span>
                  )}
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        {!isEditing && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onLoad(plan)}
              className={`${loadingIconButtonClass} h-9 w-9 `}
              title={t('planList.loadTitle', 'Sitzplan laden')}
              aria-label={t('planList.loadAriaLabel', {
                name: plan.name,
                defaultValue: `Sitzplan ${plan.name} laden`,
              })}
            >
              <EyeIcon size={14} aria-hidden="true" />
            </button>
            <button
              onClick={() => setConfirmOpen(true)}
              className={`${dangerIconButtonClass} h-9 w-9`}
              title={t('planList.deleteTitle', 'Sitzplan löschen')}
              aria-label={t('planList.deleteAriaLabel', {
                name: plan.name,
                defaultValue: `Sitzplan ${plan.name} löschen`,
              })}
            >
              <TrashIcon size={14} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={t('planList.deleteDialogTitle', 'Sitzplan löschen')}
        message={t('planList.deleteDialogMessage', {
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

/**
 * Compact list view for saved seating plans in navigation menu
 */
export default function CompactPlanList({
  plans,
  onLoad,
  onDelete,
  onRename,
  expandedPlanId,
  onRequestExpand,
}: CompactPlanListProps) {
  const { t } = useTranslation('generator');

  if (plans.length === 0) {
    return (
      <div
        className={`${cardSurfaceClass} border border-blue-100/60 p-4 text-center text-gray-500 dark:border-blue-900/40 dark:text-gray-400`}
      >
        <div className="text-sm">
          {t('planList.emptyTitle', 'Noch keine Pläne gespeichert')}
        </div>
        <div className="text-xs mt-1">
          {t('planList.emptyHint', 'Speichere deinen ersten Plan im Schritt 3')}
        </div>
      </div>
    );
  }

  // Show newest plans first by reversing insertion order
  const sortedPlans = [...plans].reverse();

  return (
    <div className="max-h-64 overflow-y-auto">
      <div className="grid grid-cols-1 gap-3 p-2 md:grid-cols-2">
        {sortedPlans.map((plan) => (
          <CompactPlanItem
            key={plan.id}
            plan={plan}
            onLoad={onLoad}
            onDelete={onDelete}
            onRename={onRename}
            isExpanded={expandedPlanId === plan.id}
            onRequestExpand={onRequestExpand}
          />
        ))}
      </div>
    </div>
  );
}

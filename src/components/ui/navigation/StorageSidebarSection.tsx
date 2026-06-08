// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { HardDrivesIcon, CaretDownIcon, CaretUpIcon } from '@phosphor-icons/react';
import StorageQuickActions from './StorageQuickActions';
import StoragePopover from './StoragePopover';
import StorageHistoryModal from './StorageHistoryModal';
import { cardSurfaceClass } from '@/utils';

interface StorageSidebarSectionProps {
  /** Whether the sidebar is expanded */
  isExpanded: boolean;
  /** Initial collapsed state of this section */
  defaultCollapsed?: boolean;
}

/**
 * Collapsible storage section for the SmartSidebar (Steps 2-3).
 * Shows storage quick actions in both expanded and collapsed sidebar modes.
 */
export default function StorageSidebarSection({
  isExpanded,
  defaultCollapsed = true,
}: StorageSidebarSectionProps) {
  const { t } = useTranslation('generator');
  const [isSectionCollapsed, setIsSectionCollapsed] =
    useState(defaultCollapsed);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  const toggleSection = useCallback(() => {
    setIsSectionCollapsed((prev) => {
      const next = !prev;
      // When expanding, scroll the section into view so the menu is
      // immediately visible without manual scrolling.
      if (!next) {
        requestAnimationFrame(() => {
          sectionRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
          });
        });
      }
      return next;
    });
  }, []);

  const openHistoryModal = useCallback(() => {
    setIsHistoryModalOpen(true);
  }, []);

  const closeHistoryModal = useCallback(() => {
    setIsHistoryModalOpen(false);
  }, []);

  // Collapsed sidebar mode: show single popover button (like in ClassSelectionBar)
  if (!isExpanded) {
    return (
      <>
        <div className="flex flex-col items-center gap-2 py-2">
          <div className="h-px w-8 bg-blue-100 dark:bg-blue-900/40" />
          <StoragePopover
            viewMode="compact"
            onOpenHistoryModal={openHistoryModal}
          />
        </div>
        <StorageHistoryModal
          open={isHistoryModalOpen}
          onClose={closeHistoryModal}
        />
      </>
    );
  }

  // Expanded sidebar with collapsible section
  return (
    <>
      <div ref={sectionRef} className={`${cardSurfaceClass} mt-4 border px-3 py-3`}>
        <button
          type="button"
          onClick={toggleSection}
          className="flex w-full items-center justify-between gap-2 text-left"
          aria-expanded={!isSectionCollapsed}
        >
          <div className="flex items-center gap-2">
            <HardDrivesIcon
              size={16}
              className="text-blue-600 dark:text-blue-300"
              aria-hidden="true"
            />
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {t('storage.sectionTitle', 'Speicher & Backup')}
            </span>
          </div>
          {isSectionCollapsed ? (
            <CaretDownIcon size={16} className="text-gray-500" />
          ) : (
            <CaretUpIcon size={16} className="text-gray-500" />
          )}
        </button>

        {!isSectionCollapsed && (
          <div className="mt-3">
            <StorageQuickActions
              isExpanded
              onOpenHistoryModal={openHistoryModal}
            />
          </div>
        )}
      </div>
      <StorageHistoryModal
        open={isHistoryModalOpen}
        onClose={closeHistoryModal}
      />
    </>
  );
}

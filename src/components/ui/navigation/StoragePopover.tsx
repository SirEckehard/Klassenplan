// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { HardDrivesIcon } from '@phosphor-icons/react';
import StorageQuickActions from './StorageQuickActions';
import StorageHistoryModal from './StorageHistoryModal';
import FloatingDropdown from '@/components/students/FloatingDropdown';
import { useClickOutside } from '@/hooks/ui/useClickOutside';
import { menuSurfaceClass } from '@/utils';

interface StoragePopoverProps {
  /** View mode for optional labels */
  viewMode?: 'compact' | 'detail';
  /** External callback to open history modal */
  onOpenHistoryModal?: () => void;
}

/**
 * Storage popover button for ClassSelectionBar (Step 1) and collapsed sidebars.
 * Opens a floating dropdown with storage quick actions.
 */
export default function StoragePopover({
  viewMode = 'compact',
  onOpenHistoryModal,
}: StoragePopoverProps) {
  const { t } = useTranslation('generator');
  const [isOpen, setIsOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dropdownContainerRef = useRef<HTMLDivElement | null>(null);
  const dropdownContentRef = useRef<HTMLDivElement | null>(null);

  useClickOutside(
    [dropdownContainerRef, dropdownContentRef],
    () => setIsOpen(false),
    isOpen,
  );

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleActionComplete = useCallback(() => {
    setIsOpen(false);
  }, []);

  const openHistoryModal = useCallback(() => {
    setIsOpen(false);
    if (onOpenHistoryModal) {
      onOpenHistoryModal();
    } else {
      setIsHistoryModalOpen(true);
    }
  }, [onOpenHistoryModal]);

  const closeHistoryModal = useCallback(() => {
    setIsHistoryModalOpen(false);
  }, []);

  return (
    <>
      <div
        className={`flex flex-col items-center gap-1 ${viewMode === 'detail' ? 'w-18' : ''}`}
      >
        <div className="relative" ref={dropdownContainerRef}>
          <button
            ref={triggerRef}
            type="button"
            onClick={handleToggle}
            className={pillButtonClass}
            aria-haspopup="true"
            aria-expanded={isOpen}
            title={t('storage.sectionTitle', 'Speicher & Backup')}
            aria-label={t('storage.sectionTitle', 'Speicher & Backup')}
          >
            <HardDrivesIcon className="h-4 w-4" aria-hidden="true" />
          </button>

          {isOpen && (
            <FloatingDropdown
              anchorRef={triggerRef}
              align="left"
              portalRef={dropdownContentRef}
              onClose={handleActionComplete}
            >
              <div className={`${menuSurfaceClass} min-w-60 p-3`}>
                <div className="mb-2 flex items-center gap-2 border-b border-gray-200 pb-2 dark:border-gray-700">
                  <HardDrivesIcon
                    size={16}
                    className="text-blue-600 dark:text-blue-300"
                  />
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {t('storage.sectionTitle', 'Speicher & Backup')}
                  </span>
                </div>
                <StorageQuickActions
                  isExpanded
                  onActionComplete={handleActionComplete}
                  onOpenHistoryModal={openHistoryModal}
                />
              </div>
            </FloatingDropdown>
          )}
        </div>

        {viewMode === 'detail' && (
          <span className="whitespace-nowrap text-xs font-medium text-gray-600 dark:text-gray-400">
            Backup
          </span>
        )}
      </div>

      {/* If no external modal handler, use internal modal */}
      {!onOpenHistoryModal && (
        <StorageHistoryModal
          open={isHistoryModalOpen}
          onClose={closeHistoryModal}
        />
      )}
    </>
  );
}

// Pill button style matching ClassSelectionBar buttons
const pillButtonClass =
  'inline-flex h-11 w-11 items-center justify-center rounded-full border border-blue-200/70 bg-white text-blue-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-blue-900/40 dark:bg-gray-900 dark:text-blue-200 dark:hover:border-blue-700 dark:hover:bg-gray-800 cursor-pointer';

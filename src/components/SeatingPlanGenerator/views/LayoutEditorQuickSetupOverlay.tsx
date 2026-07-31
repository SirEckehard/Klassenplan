// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import ReactDOM from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useDialogA11y } from '@/hooks/ui/useDialogA11y';

type LayoutEditorQuickSetupOverlayProps = {
  isOpen: boolean;
  isMobile: boolean;
  panel: React.ReactNode;
  canDismiss: boolean;
  onClose: () => void;
};

const LayoutEditorQuickSetupOverlay = React.memo(
  function LayoutEditorQuickSetupOverlay({
    isOpen,
    isMobile,
    panel,
    canDismiss,
    onClose,
  }: LayoutEditorQuickSetupOverlayProps) {
    const { t } = useTranslation('generator');
    const dialogRef = useDialogA11y<HTMLDivElement>({
      open: isOpen,
      // The mobile variant is a portalled full-screen sheet; the desktop
      // variant only covers the canvas, so the page must stay scrollable.
      lockScroll: isMobile,
    });

    if (!isOpen) {
      return null;
    }

    // Escape is owned by LayoutEditorView, which skips foreign dialogs. The
    // marker lets it recognise this overlay as its own.
    const dialogProps = {
      role: 'dialog',
      'aria-modal': true,
      'aria-label': t('quickSetup.title', 'Klassenraum einrichten'),
      'data-quick-setup': 'true',
      tabIndex: -1,
    } as const;

    if (isMobile) {
      // Use Portal to render outside the canvas container for reliable touch interactions
      return ReactDOM.createPortal(
        <div
          ref={dialogRef}
          {...dialogProps}
          className="fixed inset-0 z-50 flex flex-col bg-white focus:outline-none dark:bg-gray-950"
        >
          <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-4">
            {panel}
          </div>
        </div>,
        document.body,
      );
    }

    return (
      <div
        ref={dialogRef}
        {...dialogProps}
        className="absolute inset-0 z-10 flex items-center justify-center bg-white p-2 backdrop-blur-sm focus:outline-none sm:p-4 dark:bg-gray-950"
        style={{ borderRadius: 'inherit', overflow: 'hidden' }}
        onPointerDown={() => {
          if (canDismiss) {
            onClose();
          }
        }}
      >
        <div
          className="max-h-full w-full max-w-full overflow-y-auto sm:max-w-2xl"
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
        >
          {panel}
        </div>
      </div>
    );
  },
);

export default LayoutEditorQuickSetupOverlay;

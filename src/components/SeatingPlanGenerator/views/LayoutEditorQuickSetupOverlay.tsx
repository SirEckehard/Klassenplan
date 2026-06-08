// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import ReactDOM from 'react-dom';

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
    if (!isOpen) {
      return null;
    }

    if (isMobile) {
      // Use Portal to render outside the canvas container for reliable touch interactions
      return ReactDOM.createPortal(
        <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-gray-950">
          <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-4">
            {panel}
          </div>
        </div>,
        document.body,
      );
    }

    return (
      <div
        className="absolute inset-0 bg-white dark:bg-gray-950 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-10"
        style={{ borderRadius: 'inherit', overflow: 'hidden' }}
        onPointerDown={() => {
          if (canDismiss) {
            onClose();
          }
        }}
      >
        <div
          className="w-full max-w-full sm:max-w-2xl overflow-y-auto max-h-full"
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

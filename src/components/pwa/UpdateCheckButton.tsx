// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowsClockwiseIcon } from '@phosphor-icons/react';
import { useUpdateCheck } from '@/hooks/pwa/useUpdateCheck';

/**
 * Footer icon button that forces a service worker update check.
 *
 * The app runs in prompt mode, so a normal reload keeps serving the precached
 * shell. This is the explicit way to pull a new deployment without a hard
 * reload.
 */
const UpdateCheckButton: React.FC = () => {
  const { t } = useTranslation('common');
  const { checking, checkNow } = useUpdateCheck();
  const label = checking ? t('pwa.checking') : t('pwa.checkForUpdates');

  return (
    <button
      type="button"
      onClick={checkNow}
      disabled={checking}
      className="group p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer disabled:cursor-default"
      aria-label={label}
      title={label}
    >
      <ArrowsClockwiseIcon
        className={`h-4 w-4 text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors ${checking ? 'animate-spin' : ''}`}
      />
    </button>
  );
};

export default UpdateCheckButton;

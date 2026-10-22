// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowsClockwiseIcon, CheckIcon } from '@phosphor-icons/react';
import { useUpdateCheck } from '@/hooks/pwa/useUpdateCheck';
import { getAppVersion } from '@/utils';

/**
 * Icon button in the settings gear's first row that forces a service worker
 * update check.
 *
 * The app runs in prompt mode, so a normal reload keeps serving the precached
 * shell. This is the explicit way to pull a new deployment without a hard
 * reload. When nothing new is deployed, the button itself says so for a few
 * seconds ("Aktuell · v3.2.0") — a toast would lie over the open menu. It
 * stays the same button, so the keyboard focus stays on it and a press checks
 * again.
 */
const UpdateCheckButton: React.FC = () => {
  const { t } = useTranslation('common');
  const { checking, upToDate, checkNow } = useUpdateCheck();
  const label = checking ? t('pwa.checking') : t('pwa.checkForUpdates');
  const confirmation = t('pwa.upToDateShort', { version: getAppVersion() });

  return (
    <>
      <button
        type="button"
        onClick={checkNow}
        disabled={checking}
        className={`group rounded ${upToDate ? 'px-1 py-1.5' : 'p-1.5'} hover:bg-(--surface-option-selected) transition-colors cursor-pointer disabled:cursor-default`}
        aria-label={upToDate ? undefined : label}
        title={upToDate ? undefined : label}
      >
        {upToDate ? (
          <span className="flex h-4 items-center gap-1 whitespace-nowrap text-xs leading-none font-medium text-(--text-page)">
            <CheckIcon
              aria-hidden="true"
              weight="bold"
              className="h-3.5 w-3.5 shrink-0 text-(--status-ok)"
            />
            {confirmation}
          </span>
        ) : (
          <ArrowsClockwiseIcon
            className={`h-4 w-4 text-(--text-badge) group-hover:text-(--text-badge) transition-colors ${checking ? 'animate-spin' : ''}`}
          />
        )}
      </button>
      <span role="status" className="sr-only">
        {upToDate ? confirmation : ''}
      </span>
    </>
  );
};

export default UpdateCheckButton;

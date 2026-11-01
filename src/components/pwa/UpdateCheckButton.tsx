// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowClockwiseIcon,
  ArrowsClockwiseIcon,
  CheckIcon,
  CloudSlashIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react';
import { useUpdateCheck } from '@/hooks/pwa/useUpdateCheck';
import {
  applyPendingUpdate,
  useUpdateReady,
} from '@/hooks/pwa/swUpdateController';
import { getAppVersion } from '@/utils';

/**
 * Icon button in the settings gear's first row that forces a service worker
 * update check.
 *
 * The app runs in prompt mode, so a normal reload keeps serving the precached
 * shell. This is the explicit way to pull a new deployment without a hard
 * reload. What a check finds the button itself says for a few seconds —
 * "Aktuell · v3.2.0", offline, failed — since a toast would lie over the open
 * menu. It stays the same button, so the keyboard focus stays on it and a
 * press checks again. While a new version waits, the button takes it on
 * ("Aktualisieren"), as the status bar's button does (decision 0037).
 */
const UpdateCheckButton: React.FC = () => {
  const { t } = useTranslation('common');
  const { checking, answer, checkNow } = useUpdateCheck();
  const updateReady = useUpdateReady();
  const label = checking ? t('pwa.checking') : t('pwa.checkForUpdates');

  const said = updateReady
    ? {
        text: t('pwa.reload'),
        icon: (
          <ArrowClockwiseIcon
            aria-hidden="true"
            weight="bold"
            className="h-3.5 w-3.5 shrink-0 text-(--text-badge)"
          />
        ),
      }
    : answer === 'upToDate'
      ? {
          text: t('pwa.upToDateShort', { version: getAppVersion() }),
          icon: (
            <CheckIcon
              aria-hidden="true"
              weight="bold"
              className="h-3.5 w-3.5 shrink-0 text-(--status-ok)"
            />
          ),
        }
      : answer === 'offline'
        ? {
            text: t('pwa.offlineShort'),
            icon: (
              <CloudSlashIcon
                aria-hidden="true"
                className="h-3.5 w-3.5 shrink-0 text-(--text-muted)"
              />
            ),
          }
        : answer === 'failed'
          ? {
              text: t('pwa.checkFailedShort'),
              icon: (
                <WarningCircleIcon
                  aria-hidden="true"
                  className="h-3.5 w-3.5 shrink-0 text-(--status-alert-text)"
                />
              ),
            }
          : null;

  return (
    <>
      <button
        type="button"
        onClick={updateReady ? applyPendingUpdate : checkNow}
        disabled={checking}
        className={`group rounded ${said ? 'px-1 py-1.5' : 'p-1.5'} hover:bg-(--surface-option-selected) transition-colors cursor-pointer disabled:cursor-default`}
        aria-label={said ? undefined : label}
        title={
          updateReady ? t('pwa.updateReadyTitle') : said ? undefined : label
        }
      >
        {said ? (
          <span className="flex h-4 items-center gap-1 whitespace-nowrap text-xs leading-none font-medium text-(--text-page)">
            {said.icon}
            {said.text}
          </span>
        ) : (
          <ArrowsClockwiseIcon
            className={`h-4 w-4 text-(--text-badge) group-hover:text-(--text-badge) transition-colors ${checking ? 'animate-spin' : ''}`}
          />
        )}
      </button>
      <span role="status" className="sr-only">
        {said && !updateReady ? said.text : ''}
      </span>
    </>
  );
};

export default UpdateCheckButton;

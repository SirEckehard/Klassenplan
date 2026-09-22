// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { ArrowLeftIcon } from '@phosphor-icons/react';
import { quietLinkClass } from '@/utils';
import { useReturnToApp } from '@/hooks/useReturnToApp';

/**
 * "Zurück" on a page the app opened — the FAQ from the help dialog, the
 * support page from the toolbar. Renders nothing for anyone who came from
 * elsewhere.
 */
export default function ReturnToAppLink() {
  const { t } = useTranslation('common');
  const goBack = useReturnToApp();
  if (!goBack) return null;

  return (
    <button
      type="button"
      onClick={goBack}
      className={`${quietLinkClass} text-sm`}
    >
      <ArrowLeftIcon size={16} aria-hidden="true" />
      {t('nav.back')}
    </button>
  );
}

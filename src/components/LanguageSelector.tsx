// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { GlobeIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { ensureEnglishLoaded } from '../i18n/i18n';

const LanguageSelector: React.FC = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const toggleLanguage = () => {
    const newLanguage = i18n.language === 'de' ? 'en' : 'de';
    if (newLanguage === 'en') {
      void ensureEnglishLoaded().then(() => i18n.changeLanguage('en'));
    } else {
      void i18n.changeLanguage('de');
    }

    const pathWithoutLang = location.pathname.replace(/^\/(en|de)/, '') || '/';
    const searchAndHash = location.search + location.hash;

    if (newLanguage === 'en') {
      const newPath = pathWithoutLang === '/' ? '/en' : `/en${pathWithoutLang}`;
      navigate(newPath + searchAndHash, { replace: true });
    } else {
      navigate(pathWithoutLang + searchAndHash, { replace: true });
    }
  };

  const targetLang = i18n.language === 'en' ? 'DE' : 'EN';
  const label = i18n.language === 'en' ? 'Switch to German' : 'Zu Englisch wechseln';

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className="group flex items-center gap-1 p-1.5 rounded hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer"
      aria-label={label}
      title={label}
    >
      <GlobeIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors" />
      <span className="text-xs font-medium text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors leading-none">
        {targetLang}
      </span>
    </button>
  );
};

export default LanguageSelector;

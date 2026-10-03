// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  GearIcon,
  GitDiffIcon,
  GithubLogoIcon,
  IdentificationCardIcon,
  KeyboardIcon,
  MailboxIcon,
  ShieldCheckIcon,
} from '@phosphor-icons/react';
import FloatingDropdown from '@/components/students/FloatingDropdown';
import AppearanceControls from '@/components/ui/navigation/AppearanceControls';
import UpdateCheckButton from '@/components/pwa/UpdateCheckButton';
import MenuCheckRow from '@/components/ui/controls/MenuCheckRow';
import { LegalPageLink } from '@/components/LegalPageLink';
import { LocalizedLink } from '@/components/LocalizedLink';
import { GITHUB_REPO_URL } from '@/config/links';
import { APP_RETURN_STATE } from '@/hooks/useReturnToApp';
import { useClickOutside } from '@/hooks/ui/useClickOutside';
import { usePopoverFocus } from '@/hooks/ui/usePopoverFocus';
import {
  characterKeyShortcutsEnabled,
  getAppVersion,
  logWarn,
  menuItemClass,
  menuSurfaceClass,
  secondaryButtonClass,
  setCharacterKeyShortcutsEnabled,
} from '@/utils';
import { scheduleIdleTask } from '@/utils/performance/idleTasks';
import { appSettingsItems } from '@/components/ui/navigation/appSettingsItemsModule';

// Shared with the footer's gear and kept out of the cold-start payload with
// the dialog it brings. Here it is fetched while the workspace is idle rather
// than on the first open: arriving after the menu, it made the menu grow past
// a place that had been worked out for the smaller one. Fetched early, it is
// there offline as well, where no service worker has cached it.
const preloadSettingsItems = appSettingsItems.preload;

/**
 * What a workspace without a footer still has to offer.
 *
 * From `lg` up the shell is the window, so the page footer is gone on this
 * route. What a teacher reaches for from inside a plan and no layer owns comes
 * back here: theme and language, the update check, wiping the data, the way
 * to send feedback, what changed in which version, the source code, and the
 * two legal pages. The pages of the app offer the way back here. The backup,
 * the saved plans and the support page are not repeated — the foot of every
 * toolbar carries them — and the FAQ is reached from Help.
 *
 * It sits in the header beside Help, the same place on every layer, on the
 * export page and on the first screen, which has no toolbar yet.
 */
export default function AppSettingsMenu() {
  const { t } = useTranslation('common');
  const anchorRef = React.useRef<HTMLButtonElement | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = React.useState(false);
  const [settingsItems, setSettingsItems] = React.useState(
    appSettingsItems.get,
  );
  // Beside the menu, not in it: choosing the entry closes the menu.
  const [clearAllOpen, setClearAllOpen] = React.useState(false);
  const [characterKeys, setCharacterKeys] = React.useState(
    characterKeyShortcutsEnabled,
  );
  const toggleCharacterKeys = (enabled: boolean) => {
    setCharacterKeyShortcutsEnabled(enabled);
    setCharacterKeys(enabled);
  };

  const close = React.useCallback(() => setOpen(false), []);

  // The whole menu waits for its lazy part, should it still be on its way: it
  // appears complete, never growing under the pointer. Should that part not
  // load at all — offline, where no service worker serves the page — the
  // menu opens without it; the theme, the language and the links still work.
  const openMenu = () => {
    if (settingsItems) {
      setOpen(true);
      return;
    }
    appSettingsItems.load().then(
      (module) => {
        setSettingsItems(module);
        setOpen(true);
      },
      (error: unknown) => {
        logWarn(
          'Settings menu entries could not be loaded',
          { error },
          'AppSettingsMenu',
        );
        setOpen(true);
      },
    );
  };
  useClickOutside([containerRef, contentRef], close, open);
  // Focus moves in when it opens and stays inside; Escape closes it with the
  // focus back on the gear, and the layer underneath leaves Escape alone
  // meanwhile (the class list would drop its selection).
  usePopoverFocus({ open, contentRef, anchorRef, onClose: close });

  React.useEffect(() => {
    scheduleIdleTask(preloadSettingsItems);
  }, []);

  const iconClass = 'h-4 w-4 shrink-0 text-(--text-muted)';
  const SettingsItems = settingsItems?.default;
  const ClearAllDataDialog = settingsItems?.ClearAllDataDialog;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        ref={anchorRef}
        onClick={open ? close : openMenu}
        // Should the idle moment not have come yet, the way to the button is
        // early enough.
        onPointerEnter={preloadSettingsItems}
        onFocus={preloadSettingsItems}
        className={`${secondaryButtonClass} h-9 w-9 justify-center p-0`}
        title={t('footer.settings')}
        aria-label={t('footer.settings')}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <GearIcon className="h-5 w-5" aria-hidden="true" />
      </button>

      {open && (
        <FloatingDropdown
          anchorRef={anchorRef}
          align="right"
          portalRef={contentRef}
        >
          {/* A dialog rather than a menu: it holds the theme and language
              switches beside its rows, which a menu may not contain. */}
          <div
            role="dialog"
            aria-label={t('footer.settings')}
            className={`${menuSurfaceClass} max-h-96 w-64 overflow-y-auto p-1`}
          >
            <div className="flex items-center justify-between gap-2 px-3 py-2">
              <AppearanceControls />
              <UpdateCheckButton />
            </div>
            {/* Speech input types words as keystrokes, so a shortcut on a
                  single key can fire by mistake (WCAG 2.1.4). */}
            <MenuCheckRow
              icon={<KeyboardIcon size={16} />}
              label={t('settings.characterKeys')}
              description={t('settings.characterKeysHint')}
              checked={characterKeys}
              onChange={toggleCharacterKeys}
            />
            {SettingsItems && (
              <>
                <div
                  className="my-1 h-px bg-(--border-card)"
                  aria-hidden="true"
                />
                <SettingsItems
                  onDone={close}
                  onClearAllData={() => setClearAllOpen(true)}
                  storage={false}
                  menuItems={false}
                />
              </>
            )}

            <div className="my-1 h-px bg-(--border-card)" aria-hidden="true" />
            {/* About the app rather than about this class: whom to tell,
                  what changed, where the code lives. */}
            <LocalizedLink
              to="/feedback"
              state={APP_RETURN_STATE}
              title={t('nav.titles.feedback')}
              className={menuItemClass}
              onClick={close}
            >
              <MailboxIcon className={iconClass} aria-hidden="true" />
              {t('nav.feedback')}
            </LocalizedLink>
            <LocalizedLink
              to="/changelog"
              state={APP_RETURN_STATE}
              title={t('nav.titles.changelog')}
              className={menuItemClass}
              onClick={close}
            >
              <GitDiffIcon className={iconClass} aria-hidden="true" />
              {t('nav.changelog')}{' '}
              {/* The one place in the workspace that says which version
                    is running. The space keeps the two words apart for a
                    screen reader; on screen the row's gap does. */}
              <span className="ml-auto text-xs tabular-nums text-(--text-muted)">
                v{getAppVersion()}
              </span>
            </LocalizedLink>
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              title={t('nav.titles.github')}
              className={menuItemClass}
              onClick={close}
            >
              <GithubLogoIcon className={iconClass} aria-hidden="true" />
              {t('nav.github')}
            </a>

            <div className="my-1 h-px bg-(--border-card)" aria-hidden="true" />
            <LegalPageLink
              to="/datenschutz"
              state={APP_RETURN_STATE}
              className={menuItemClass}
              onClick={close}
            >
              <ShieldCheckIcon className={iconClass} aria-hidden="true" />
              {t('nav.datenschutz')}
            </LegalPageLink>
            <LegalPageLink
              to="/impressum"
              state={APP_RETURN_STATE}
              className={menuItemClass}
              onClick={close}
            >
              <IdentificationCardIcon
                className={iconClass}
                aria-hidden="true"
              />
              {t('nav.impressum')}
            </LegalPageLink>
          </div>
        </FloatingDropdown>
      )}
      {ClearAllDataDialog && (
        <ClearAllDataDialog
          open={clearAllOpen}
          onClose={() => setClearAllOpen(false)}
        />
      )}
    </div>
  );
}

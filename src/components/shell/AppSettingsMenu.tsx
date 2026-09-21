// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React, { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import {
  GearIcon,
  IdentificationCardIcon,
  ShieldCheckIcon,
} from '@phosphor-icons/react';
import FloatingDropdown from '@/components/students/FloatingDropdown';
import AppearanceControls from '@/components/ui/navigation/AppearanceControls';
import UpdateCheckButton from '@/components/pwa/UpdateCheckButton';
import { LegalPageLink } from '@/components/LegalPageLink';
import { useClickOutside } from '@/hooks/ui/useClickOutside';
import { useDialogLayer } from '@/hooks/ui/useDialogLayer';
import {
  logWarn,
  menuItemClass,
  menuSurfaceClass,
  quietIconButtonClass,
} from '@/utils';
import { lazyWithRetry } from '@/utils/performance/lazyWithRetry';
import { scheduleIdleTask } from '@/utils/performance/idleTasks';

// Shared with the footer's gear and kept out of the cold-start payload with
// the storage dialogs it brings. Here it is fetched while the workspace is
// idle rather than on the first open: arriving after the menu, it made the
// menu grow past a place that had been worked out for the smaller one.
const AppSettingsItems = lazyWithRetry(
  () => import('@/components/ui/navigation/AppSettingsItems'),
);

const preloadSettingsItems = () => {
  // `preload` resolves even when the import fails and logs that itself; the
  // catch only keeps the fire-and-forget promise from going unhandled.
  AppSettingsItems.preload().catch((error: unknown) => {
    logWarn('Settings menu preload failed', { error }, 'AppSettingsMenu');
  });
};

/**
 * What a workspace without a footer still has to offer.
 *
 * From `lg` up the shell is the window, so the page footer is gone on this
 * route. What a teacher reaches for from inside a plan and no layer owns comes
 * back here: theme and language, the update check, wiping the data, and the
 * two legal pages. The backup and the saved plans are not repeated — the
 * toolbar of the class and the plan layer carries them. The remaining footer
 * links — FAQ, feedback, support, the changelog — stay on the pages they
 * belong to rather than following the workspace around.
 *
 * It sits at the left end of the status bar, under the toolbar and beside the
 * toolbar's own switch: a fixed place on every layer. The toolbar itself could
 * not be that place — the first screen, before there is a class, has none, and
 * on a phone it hides behind a button of its own. The menu opens upwards; the
 * dropdown turns over by itself where there is no room below.
 */
export default function AppSettingsMenu() {
  const { t } = useTranslation('common');
  const anchorRef = React.useRef<HTMLButtonElement | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = React.useState(false);

  useDialogLayer(open);
  useClickOutside([containerRef, contentRef], () => setOpen(false), open);

  const close = React.useCallback(() => setOpen(false), []);

  // The menu owns Escape while it is up, so the layer underneath does not also
  // act on it (the class list would drop its selection).
  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      setOpen(false);
      anchorRef.current?.focus();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  React.useEffect(() => {
    scheduleIdleTask(preloadSettingsItems);
  }, []);

  const iconClass = 'h-4 w-4 shrink-0 text-(--text-muted)';

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        ref={anchorRef}
        onClick={() => setOpen((previous) => !previous)}
        // Should the idle moment not have come yet, the way to the button is
        // early enough.
        onPointerEnter={preloadSettingsItems}
        onFocus={preloadSettingsItems}
        className={`${quietIconButtonClass} h-9 w-9`}
        title={t('footer.settings')}
        aria-label={t('footer.settings')}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <GearIcon size={18} aria-hidden="true" />
      </button>

      {open && (
        <FloatingDropdown
          anchorRef={anchorRef}
          align="left"
          portalRef={contentRef}
        >
          {/* The whole menu waits for its lazy part, should it still be on
              its way: it appears complete, never growing under the pointer. */}
          <Suspense fallback={null}>
            <div
              role="menu"
              aria-label={t('footer.settings')}
              className={`${menuSurfaceClass} max-h-96 w-64 overflow-y-auto p-1`}
            >
              <div className="flex items-center justify-between gap-2 px-3 py-2">
                <AppearanceControls />
                <UpdateCheckButton />
              </div>
              <div
                className="my-1 h-px bg-(--border-card)"
                aria-hidden="true"
              />

              <AppSettingsItems onDone={close} storage={false} />

              <div
                className="my-1 h-px bg-(--border-card)"
                aria-hidden="true"
              />
              <LegalPageLink
                to="/datenschutz"
                role="menuitem"
                className={menuItemClass}
                onClick={close}
              >
                <ShieldCheckIcon className={iconClass} aria-hidden="true" />
                {t('nav.datenschutz')}
              </LegalPageLink>
              <LegalPageLink
                to="/impressum"
                role="menuitem"
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
          </Suspense>
        </FloatingDropdown>
      )}
    </div>
  );
}

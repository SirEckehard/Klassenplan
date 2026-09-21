// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import React, { lazy, Suspense } from 'react';
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
import { menuItemClass, menuSurfaceClass, secondaryButtonClass } from '@/utils';

// Shared with the footer's gear and loaded on first open in both, so the
// storage dialogs stay out of the cold-start payload.
const AppSettingsItems = lazy(
  () => import('@/components/ui/navigation/AppSettingsItems'),
);

/**
 * What a workspace without a footer still has to offer.
 *
 * From `lg` up the shell is the window, so the page footer is gone on this
 * route. What a teacher reaches for from inside a plan and no layer owns comes
 * back here: theme and language, the update check, wiping the data, and the
 * two legal pages. The backup and the saved plans are not repeated — the
 * toolbar of the class and the plan layer carries them. Help has its own
 * button beside this one, and the remaining footer links — FAQ, feedback,
 * support, the changelog — stay on the pages they belong to rather than
 * following the workspace around.
 */
export default function HeaderAppMenu() {
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

  const iconClass = 'h-4 w-4 shrink-0 text-(--text-muted)';

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        ref={anchorRef}
        onClick={() => setOpen((previous) => !previous)}
        className={`${secondaryButtonClass} h-9 w-9 justify-center p-0`}
        title={t('footer.settings')}
        aria-label={t('footer.settings')}
        aria-haspopup="menu"
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
          <div
            role="menu"
            aria-label={t('footer.settings')}
            className={`${menuSurfaceClass} max-h-96 w-64 overflow-y-auto p-1`}
          >
            <div className="flex items-center justify-between gap-2 px-3 py-2">
              <AppearanceControls />
              <UpdateCheckButton />
            </div>
            <div className="my-1 h-px bg-(--border-card)" aria-hidden="true" />

            <Suspense fallback={null}>
              <AppSettingsItems onDone={close} storage={false} />
            </Suspense>

            <div className="my-1 h-px bg-(--border-card)" aria-hidden="true" />
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
        </FloatingDropdown>
      )}
    </div>
  );
}

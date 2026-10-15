// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DeviceMobileIcon } from '@phosphor-icons/react';
import Modal from '@/components/ui/modals/Modal';
import {
  detectInstallBrowser,
  INSTALL_BROWSERS,
  INSTALL_STEP_COUNT,
  type InstallBrowser,
} from '@/utils/ui/installGuide';

type GuideBrowser = Exclude<InstallBrowser, 'other'>;

/** Edge and Chrome on the desktop open a backup with the installed app. */
const OPENS_BACKUPS: readonly GuideBrowser[] = ['edge', 'chrome'];

function BrowserSteps({ browser }: { browser: GuideBrowser }) {
  const { t } = useTranslation('common');
  const count = INSTALL_STEP_COUNT[browser];
  if (count === 0) {
    return (
      <p className="text-sm text-(--text-muted)">
        {t(`pwa.guide.browsers.${browser}.note`)}
      </p>
    );
  }
  return (
    <ol className="list-decimal space-y-1 pl-5 text-sm">
      {Array.from({ length: count }, (_, index) => (
        <li key={index}>
          {t(`pwa.guide.browsers.${browser}.step${index + 1}`)}
        </li>
      ))}
    </ol>
  );
}

/**
 * How to install Klassenplan as an app, for the browser it is open in and,
 * folded away, for the others — a teacher may be setting up the classroom
 * computer from their own. Opened from the settings menu wherever the browser
 * offers no install prompt of its own (Safari, Firefox, a Chrome that has
 * not offered it yet).
 */
export default function InstallGuideDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation('common');
  const detected = useMemo<InstallBrowser>(
    () =>
      typeof navigator === 'undefined'
        ? 'other'
        : detectInstallBrowser({
            userAgent: navigator.userAgent,
            maxTouchPoints: navigator.maxTouchPoints ?? 0,
          }),
    [],
  );
  // Installing needs a secure origin: a school's instance on plain HTTP
  // cannot be installed in any browser.
  const secure =
    typeof window === 'undefined' || window.isSecureContext !== false;
  const others = INSTALL_BROWSERS.filter((browser) => browser !== detected);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('pwa.guide.title')}
      subtitle={t('pwa.guide.intro')}
      icon={<DeviceMobileIcon size={24} aria-hidden="true" />}
      size="md"
    >
      {!secure ? (
        <p className="text-sm">{t('pwa.guide.insecure')}</p>
      ) : detected !== 'other' ? (
        <section className="space-y-2">
          <h3 className="text-base font-semibold">
            {t('pwa.guide.here', {
              browser: t(`pwa.guide.browsers.${detected}.name`),
            })}
          </h3>
          <BrowserSteps browser={detected} />
          {OPENS_BACKUPS.includes(detected) && (
            <p className="text-sm text-(--text-muted)">
              {t('pwa.guide.opensBackups')}
            </p>
          )}
        </section>
      ) : null}
      <details open={detected === 'other' || !secure} className="space-y-3">
        <summary className="cursor-pointer text-sm font-semibold">
          {t('pwa.guide.others')}
        </summary>
        <div className="mt-3 space-y-4">
          {others.map((browser) => (
            <section key={browser} className="space-y-1">
              <h4 className="text-sm font-semibold">
                {t(`pwa.guide.browsers.${browser}.name`)}
              </h4>
              <BrowserSteps browser={browser} />
            </section>
          ))}
        </div>
      </details>
    </Modal>
  );
}

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LocalizedLink } from '@/components/LocalizedLink';
import { LOCAL_STORAGE_KEYS } from '@/utils/data/storageKeys';
import { COOKIE_BANNER_OFFSET_EVENT } from '@/hooks/ui/useCookieBannerOffset';
import { logDebug } from '@/utils';

/**
 * Detect the Global Privacy Control signal. The app is local-first and never
 * sells or shares personal data, so we honour GPC by suppressing the (purely
 * informational) local-storage notice instead of nagging privacy-minded users.
 */
function hasGlobalPrivacyControl(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    (navigator as Navigator & { globalPrivacyControl?: boolean })
      .globalPrivacyControl === true
  );
}

// Display information banner about local storage usage
const CookieConsent: React.FC = () => {
  const { t } = useTranslation('generator');
  const [isVisible, setIsVisible] = useState(() => {
    try {
      const consent = localStorage.getItem(LOCAL_STORAGE_KEYS.cookieConsent);
      if (consent) {
        return false;
      }
      if (hasGlobalPrivacyControl()) {
        // Respect the user's GPC opt-out: persist acknowledgment silently.
        localStorage.setItem(LOCAL_STORAGE_KEYS.cookieConsent, 'true');
        logDebug('GPC signal detected; suppressing local-storage notice');
        return false;
      }
      return true;
    } catch (error) {
      logDebug('Failed to read cookie consent from localStorage', { error });
      return false;
    }
  });
  const bannerRef = useRef<HTMLDivElement | null>(null);
  const previousBodyPaddingRef = useRef<{
    value: string;
    hadInline: boolean;
  } | null>(null);

  function handleAccept() {
    // Store acknowledgment and hide the banner
    localStorage.setItem(LOCAL_STORAGE_KEYS.cookieConsent, 'true');
    setIsVisible(false);
  }

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!isVisible) {
      document.body.classList.remove('cookie-banner-visible');
      document.body.style.removeProperty('--cookie-banner-offset');

      if (previousBodyPaddingRef.current) {
        if (previousBodyPaddingRef.current.hadInline) {
          document.body.style.paddingBottom =
            previousBodyPaddingRef.current.value;
        } else {
          document.body.style.removeProperty('padding-bottom');
        }
      }

      previousBodyPaddingRef.current = null;

      window.dispatchEvent(
        new CustomEvent(COOKIE_BANNER_OFFSET_EVENT, {
          detail: { offset: 0, visible: false },
        }),
      );

      return undefined;
    }

    if (!previousBodyPaddingRef.current) {
      previousBodyPaddingRef.current = {
        value: document.body.style.paddingBottom,
        hadInline: document.body.style.paddingBottom.length > 0,
      };
    }

    document.body.classList.add('cookie-banner-visible');

    const updateOffsets = () => {
      const bannerHeight = bannerRef.current?.offsetHeight ?? 0;
      const offsetValue = Math.max(bannerHeight, 0);
      document.body.style.setProperty(
        '--cookie-banner-offset',
        `${offsetValue}px`,
      );
      document.body.style.paddingBottom = `calc(${offsetValue}px + env(safe-area-inset-bottom))`;

      window.dispatchEvent(
        new CustomEvent(COOKIE_BANNER_OFFSET_EVENT, {
          detail: { offset: offsetValue, visible: true },
        }),
      );
    };

    updateOffsets();

    const handleResize = () => {
      updateOffsets();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    let resizeObserver: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined' && bannerRef.current) {
      resizeObserver = new ResizeObserver(updateOffsets);
      resizeObserver.observe(bannerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      resizeObserver?.disconnect();
      document.body.classList.remove('cookie-banner-visible');
      document.body.style.removeProperty('--cookie-banner-offset');

      if (previousBodyPaddingRef.current) {
        if (previousBodyPaddingRef.current.hadInline) {
          document.body.style.paddingBottom =
            previousBodyPaddingRef.current.value;
        } else {
          document.body.style.removeProperty('padding-bottom');
        }
      }

      previousBodyPaddingRef.current = null;

      window.dispatchEvent(
        new CustomEvent(COOKIE_BANNER_OFFSET_EVENT, {
          detail: { offset: 0, visible: false },
        }),
      );
    };
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      ref={bannerRef}
      className="fixed bottom-0 inset-x-0 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-4 shadow-lg z-50"
      style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
    >
      <div className="max-w-6xl mx-auto flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm">
          {t('cookieConsent.message')}{' '}
          <LocalizedLink
            to="/datenschutz"
            className="underline hover:text-blue-600"
          >
            {t('cookieConsent.privacyLink')}
          </LocalizedLink>
          .
        </p>
        <div className="flex shrink-0">
          <button
            type="button"
            onClick={handleAccept}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            {t('cookieConsent.accept')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;

// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import { IdentificationCardIcon } from '@phosphor-icons/react';
import Seo from '@/components/Seo';
import { LocalizedLink } from '@/components/LocalizedLink';
import { cardSurfaceClass } from '@/utils';
import { KpLockup } from '@/components/KpLockup';
import { usePageSeo } from '@/hooks/usePageSeo';
import { GITHUB_REPO_URL } from '@/config/links';

export default function Impressum() {
  const { t, i18n } = useTranslation('pages');
  const isEnglish = i18n.language === 'en';
  const metadata = usePageSeo('/impressum');
  return (
    <main
      id="main"
      tabIndex={-1}
      className="min-h-[80vh] bg-(--surface-page) px-4 py-12"
    >
      <Seo
        {...metadata}
        structuredData={{
          '@type': 'Organization',
          name: 'Klassenplan',
          address: {
            '@type': 'PostalAddress',
            addressLocality: 'Köln',
            postalCode: '50679',
            addressCountry: 'DE',
          },
          contactPoint: {
            '@type': 'ContactPoint',
            email: 'webmaster@klassenplan.de',
            contactType: 'customer support',
            availableLanguage: ['de'],
          },
        }}
      />
      <div className="mx-auto flex max-w-4xl flex-col gap-10">
        <header
          className="text-center"
          role="banner"
          aria-label={t('header.banner.impressum')}
        >
          <LocalizedLink
            to="/"
            className="kp-lockup focus-visible:ring-2 focus-visible:ring-(--focus-ring-primary) focus-visible:ring-offset-2"
            aria-label={t('header.homeLink')}
          >
            <KpLockup size="md" />
          </LocalizedLink>
        </header>

        <section
          className={`${cardSurfaceClass} border border-(--border-card) p-5 sm:p-8`}
          aria-labelledby="impressum-title"
        >
          <div className="mb-8">
            {isEnglish && (
              <div className="mb-4 p-3 bg-(--surface-option-selected) border border-(--border-option-selected) rounded-lg text-sm text-(--text-badge)">
                This Legal Notice (Impressum) is provided in German only, as
                required by German law.
              </div>
            )}
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-(--border-card) bg-(--surface-option-selected) text-(--text-badge) shadow-sm/20">
                <IdentificationCardIcon
                  aria-hidden="true"
                  className="h-6 w-6"
                />
              </span>
              <div>
                <h2
                  id="impressum-title"
                  className="text-xl font-bold tracking-tight text-(--text-page) sm:text-3xl"
                >
                  Impressum
                </h2>
                <p className="mt-1 text-sm text-(--text-muted) sm:text-base">
                  Rechtliche Angaben gemäß § 5 TMG
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            {/* Anbieterkennzeichnung */}
            <div>
              <h3 className="text-xl font-semibold text-(--text-page)">
                Anbieterkennzeichnung
              </h3>
              <address className="mt-3 not-italic text-(--text-page) leading-relaxed">
                Eike Christian Schäfer
                <br />
                50679 Köln
                <br />
                Deutschland
              </address>
            </div>

            {/* Kontakt */}
            <div>
              <h3 className="text-xl font-semibold text-(--text-page)">
                Kontakt
              </h3>
              <ul className="mt-3 grid gap-2 text-(--text-page)">
                <li>
                  <span className="font-medium">E-Mail:</span>{' '}
                  <a
                    className="font-semibold text-(--text-badge) hover:underline"
                    href="mailto:webmaster@klassenplan.de"
                  >
                    webmaster@klassenplan.de
                  </a>
                </li>
                <li>
                  <span className="font-medium">Website:</span>{' '}
                  <a
                    className="font-semibold text-(--text-badge) hover:underline"
                    href="https://www.klassenplan.de"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    www.klassenplan.de
                  </a>
                </li>
              </ul>
            </div>

            {/* Liability disclaimer */}
            <div>
              <h3 className="text-xl font-semibold text-(--text-page)">
                Haftungsausschluss
              </h3>
              <p className="mt-3 text-(--text-page) leading-relaxed">
                Die Inhalte dieser Website wurden mit größtmöglicher Sorgfalt
                erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität
                der Inhalte übernehme ich jedoch keine Gewähr. Als
                Diensteanbieter bin ich gemäß § 7 Abs. 1 TMG für eigene Inhalte
                auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich.
                Nach §§ 8 bis 10 TMG bin ich als Diensteanbieter jedoch nicht
                verpflichtet, übermittelte oder gespeicherte fremde
                Informationen zu überwachen oder nach Umständen zu forschen, die
                auf eine rechtswidrige Tätigkeit hinweisen.
              </p>
            </div>

            {/* Urheberrecht */}
            <div>
              <h3 className="text-xl font-semibold text-(--text-page)">
                Urheberrecht
              </h3>
              <p className="mt-3 text-(--text-page) leading-relaxed">
                Die redaktionellen Inhalte dieser Website (Texte, Bilder,
                Grafiken) sowie die Marke „Klassenplan“ (Wort- und Bildmarke)
                unterliegen dem deutschen Urheberrecht. Ihre Vervielfältigung,
                Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb
                der Grenzen des Urheberrechts bedürfen der schriftlichen
                Zustimmung des jeweiligen Autors bzw. Erstellers.
              </p>
              <p className="mt-3 text-(--text-page) leading-relaxed">
                Der <strong>Quellcode</strong> von Klassenplan ist hingegen
                freie Software und steht unter der GNU Affero General Public
                License v3.0 (AGPL-3.0-or-later). Er darf gemäß den Bedingungen
                dieser Lizenz frei genutzt, verändert und weiterverbreitet
                werden. Der vollständige Quelltext ist auf{' '}
                <a
                  className="font-semibold text-(--text-badge) hover:underline"
                  href={GITHUB_REPO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                </a>{' '}
                verfügbar.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

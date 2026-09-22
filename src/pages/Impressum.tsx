// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
import { useTranslation } from 'react-i18next';
import Seo from '@/components/Seo';
import { LegalPage, LegalSection } from '@/components/publicPage/LegalPage';
import { pageInlineLinkClass } from '@/components/publicPage/pageTokens';
import { usePageSeo } from '@/hooks/usePageSeo';
import { GITHUB_REPO_URL } from '@/config/links';

export default function Impressum() {
  const { t } = useTranslation('pages');
  const metadata = usePageSeo('/impressum');
  return (
    <>
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
      <LegalPage
        bannerLabel={t('header.banner.impressum')}
        title="Impressum"
        lead="Rechtliche Angaben gemäß § 5 DDG"
        germanOnly
      >
        <LegalSection id="impressum-anbieter" title="Anbieterkennzeichnung">
          <address className="not-italic">
            Eike Christian Schäfer
            <br />
            50679 Köln
            <br />
            Deutschland
          </address>
        </LegalSection>

        <LegalSection id="impressum-kontakt" title="Kontakt">
          <ul className="space-y-1">
            <li>
              <span className="font-medium">E-Mail:</span>{' '}
              <a
                className={pageInlineLinkClass}
                href="mailto:webmaster@klassenplan.de"
              >
                webmaster@klassenplan.de
              </a>
            </li>
            <li>
              <span className="font-medium">Website:</span>{' '}
              <a
                className={pageInlineLinkClass}
                href="https://www.klassenplan.de"
                target="_blank"
                rel="noopener noreferrer"
              >
                www.klassenplan.de
              </a>
            </li>
          </ul>
        </LegalSection>

        <LegalSection id="impressum-haftung" title="Haftungsausschluss">
          <p>
            Die Inhalte dieser Website wurden mit größtmöglicher Sorgfalt
            erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der
            Inhalte übernehme ich jedoch keine Gewähr. Als Diensteanbieter bin
            ich für eigene Inhalte auf diesen Seiten nach den allgemeinen
            Gesetzen verantwortlich. Nach § 7 Abs. 1 DDG in Verbindung mit
            Art.&nbsp;8 der Verordnung (EU) 2022/2065 (Gesetz über digitale
            Dienste) bin ich jedoch nicht verpflichtet, übermittelte oder
            gespeicherte fremde Informationen zu überwachen oder aktiv nach
            Umständen zu forschen, die auf eine rechtswidrige Tätigkeit
            hindeuten.
          </p>
        </LegalSection>

        <LegalSection id="impressum-urheberrecht" title="Urheberrecht">
          <p>
            Die redaktionellen Inhalte dieser Website (Texte, Bilder, Grafiken)
            sowie die Marke „Klassenplan“ (Wort- und Bildmarke) unterliegen dem
            deutschen Urheberrecht. Ihre Vervielfältigung, Bearbeitung,
            Verbreitung und jede Art der Verwertung außerhalb der Grenzen des
            Urheberrechts bedürfen der schriftlichen Zustimmung des jeweiligen
            Autors bzw. Erstellers.
          </p>
          <p>
            Der <strong>Quellcode</strong> von Klassenplan ist hingegen freie
            Software und steht unter der GNU Affero General Public License v3.0
            (AGPL-3.0-or-later). Er darf gemäß den Bedingungen dieser Lizenz
            frei genutzt, verändert und weiterverbreitet werden. Der
            vollständige Quelltext ist auf{' '}
            <a
              className={pageInlineLinkClass}
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>{' '}
            verfügbar.
          </p>
        </LegalSection>
      </LegalPage>
    </>
  );
}

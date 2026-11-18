// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
/**
 * `scripts/configure-instance.sh` gives the published image its operator when
 * it starts (decision 0048). It runs on a small build of its own here — what
 * the prerender leaves in `dist/` and `.instance/` — through the system's `sh`,
 * `sed` and `awk`: GNU's on CI, BSD's on a Mac.
 */
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LEGAL_PAGE_URL_TOKENS } from '@/config/legalPageUrls';

const SCRIPT = path.resolve(
  import.meta.dirname,
  '../../scripts/configure-instance.sh',
);
const SITE = 'https://klassenplan.de';
const MAIL = 'webmaster@klassenplan.de';
const IMPRINT_TOKEN = LEGAL_PAGE_URL_TOKENS['/impressum'];
const PRIVACY_TOKEN = LEGAL_PAGE_URL_TOKENS['/datenschutz'];

let dir: string;

const write = (file: string, text: string) => {
  const absolute = path.join(dir, file);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, text);
};
const read = (file: string) => readFileSync(path.join(dir, file), 'utf-8');

const sitemapEntry = (route: string) =>
  `    <url>\n      <loc>${SITE}${route}</loc>\n      <xhtml:link rel="alternate" hreflang="de" href="${SITE}${route}"/>\n    </url>\n`;

/** What the prerender leaves for the script, in miniature. */
function writeBuild(built: { imprint?: string } = {}) {
  write(
    '.instance/build.env',
    `BUILD_SITE_URL=${SITE}\nBUILD_CONTACT_EMAIL=${MAIL}\nBUILD_IMPRINT_URL=${built.imprint ?? ''}\nBUILD_PRIVACY_URL=\n`,
  );
  write(
    'faq/index.html',
    `<link rel="canonical" href="${SITE}/faq"><a href="mailto:${MAIL}">`,
  );
  write('faq/index.html.br', 'stale');
  write(
    'entry/index-abc.js',
    `const e={"/impressum":R(\`${IMPRINT_TOKEN}\`),"/datenschutz":R(\`${PRIVACY_TOKEN}\`)},m="${MAIL}";`,
  );
  write('entry/index-abc.js.br', 'stale');
  write('chunks/Impressum-abc.js', `"${MAIL}"`);
  for (const page of ['impressum', 'en/impressum', 'datenschutz']) {
    write(`${page}/index.html`, `<p>Impressum von klassenplan.de, ${MAIL}</p>`);
  }
  for (const page of ['impressum', 'en/impressum']) {
    write(
      `.instance/forward/${page}/index.html`,
      `<meta name="robots" content="noindex,follow"><a href="${IMPRINT_TOKEN}">`,
    );
  }
  write(
    'sitemap.xml',
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset>\n${sitemapEntry('/faq')}${sitemapEntry('/impressum')}${sitemapEntry('/en/impressum')}</urlset>\n`,
  );
  write('robots.txt', `Sitemap: ${SITE}/sitemap.xml\n`);
}

function configure(env: Record<string, string>) {
  return execFileSync('sh', [SCRIPT, dir], {
    env: { PATH: process.env.PATH, ...env },
    encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function configureFails(env: Record<string, string>): string {
  try {
    configure(env);
  } catch (error) {
    return String((error as { stderr?: string }).stderr);
  }
  throw new Error('configure-instance.sh accepted what it should refuse');
}

beforeEach(() => {
  dir = mkdtempSync(path.join(tmpdir(), 'kp-instance-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('configure-instance.sh', () => {
  it('leaves a build without variables as it was', () => {
    writeBuild();
    const before = read('entry/index-abc.js');

    configure({});

    expect(read('entry/index-abc.js')).toBe(before);
    expect(read('impressum/index.html')).toContain('klassenplan.de');
    expect(existsSync(path.join(dir, 'faq/index.html.br'))).toBe(true);
  });

  it("puts the operator's address everywhere the site names itself", () => {
    writeBuild();

    configure({ SITE_URL: 'https://plan.schule.example/' });

    expect(read('faq/index.html')).toContain(
      '<link rel="canonical" href="https://plan.schule.example/faq">',
    );
    expect(read('robots.txt')).toBe(
      'Sitemap: https://plan.schule.example/sitemap.xml\n',
    );
    expect(read('sitemap.xml')).not.toContain(SITE);
    // A changed file loses its precompressed copy, which held the old text.
    expect(existsSync(path.join(dir, 'faq/index.html.br'))).toBe(false);
  });

  it("forwards the Impressum to the operator's own", () => {
    writeBuild();
    const url = 'https://schule.example/impressum?a=1&b=2';

    configure({ IMPRINT_URL: url });

    for (const page of ['impressum', 'en/impressum']) {
      const html = read(`${page}/index.html`);
      expect(html).toContain(`<a href="${url}">`);
      expect(html).not.toContain('klassenplan.de');
    }
    const bundle = read('entry/index-abc.js');
    expect(bundle).toContain(`"/impressum":R(\`${url}\`)`);
    // The Datenschutzerklärung was not set: it stays the bundled one.
    expect(bundle).toContain(PRIVACY_TOKEN);
    expect(read('datenschutz/index.html')).toContain('klassenplan.de');
    expect(read('sitemap.xml')).not.toContain('impressum');
    expect(read('sitemap.xml')).toContain(`${SITE}/faq`);
    expect(existsSync(path.join(dir, 'entry/index-abc.js.br'))).toBe(false);
  });

  it("writes the operator's contact everywhere but the maintainer's own pages", () => {
    writeBuild();

    configure({ CONTACT_EMAIL: 'it@schule.example' });

    expect(read('faq/index.html')).toContain('mailto:it@schule.example');
    expect(read('entry/index-abc.js')).toContain('m="it@schule.example"');
    expect(read('chunks/Impressum-abc.js')).toBe(`"${MAIL}"`);
    expect(read('impressum/index.html')).toContain(MAIL);
  });

  it('refuses what would leave an attribute or a script', () => {
    writeBuild();

    expect(
      configureFails({ SITE_URL: 'https://x.example/"><script>' }),
    ).toMatch(/SITE_URL must be an absolute http\(s\) URL/);
    expect(configureFails({ IMPRINT_URL: 'javascript:alert(1)' })).toMatch(
      /IMPRINT_URL/,
    );
    expect(configureFails({ PRIVACY_URL: 'https://x.example/${x}' })).toMatch(
      /PRIVACY_URL/,
    );
    expect(configureFails({ CONTACT_EMAIL: 'a b@c.example' })).toMatch(
      /CONTACT_EMAIL/,
    );
    expect(read('faq/index.html')).toContain(SITE);
  });

  it('says so when the build already forwards elsewhere', () => {
    writeBuild({ imprint: 'https://built.example/impressum' });

    expect(
      configureFails({ IMPRINT_URL: 'https://other.example/impressum' }),
    ).toMatch(/forwards \/impressum to https:\/\/built\.example\/impressum/);
    configure({ IMPRINT_URL: 'https://built.example/impressum' });
  });

  it('refuses a directory that is no Klassenplan build', () => {
    expect(configureFails({})).toMatch(/no Klassenplan build/);
  });
});

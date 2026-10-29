// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
//
// The licences of the third-party code Klassenplan ships.
//
// The minifier drops every licence comment, yet the MIT, Apache and OFL
// licences of the bundled packages ask that their notices travel with every
// copy — the site and the Docker image alike. `thirdPartyLicenses()` collects
// the packages that really end up in `dist/` (the chunks, the workers, the
// fonts and the service worker's Workbox runtime) and writes their licence
// texts to `dist/third-party-licenses.txt`. A package under a licence outside
// ALLOWED_LICENSES fails the build; `npm run check:licenses` asks the same of
// the lockfile without building.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

/**
 * Licences compatible with the AGPL-3.0-or-later the app is published under.
 * A new one belongs here only after checking that compatibility.
 */
export const ALLOWED_LICENSES = new Set([
  '0BSD',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  'MIT',
  'MPL-2.0',
  'OFL-1.1',
  'Zlib',
]);

export const LICENSE_FILE_NAME = 'third-party-licenses.txt';

/**
 * Whether an SPDX expression ("MIT", "(MIT AND Zlib)", "(MPL-2.0 OR
 * Apache-2.0)") can be met with the allowed licences alone: every part of an
 * AND, at least one side of an OR. npm's "SEE LICENSE IN <file>" is one term,
 * and never an allowed one.
 */
export const isLicenseAllowed = (expression: string): boolean => {
  const tokens =
    expression.match(/\(|\)|SEE LICENSE IN [^\s()]+|[^\s()]+/g) ?? [];
  let position = 0;

  const parseTerm = (): boolean => {
    const token = tokens[position++];
    if (token === '(') {
      const allowed = parseOr();
      position++; // the closing parenthesis
      return allowed;
    }
    return token !== undefined && ALLOWED_LICENSES.has(token);
  };
  const parseAnd = (): boolean => {
    let allowed = parseTerm();
    while (tokens[position] === 'AND') {
      position++;
      allowed = parseTerm() && allowed;
    }
    return allowed;
  };
  const parseOr = (): boolean => {
    let allowed = parseAnd();
    while (tokens[position] === 'OR') {
      position++;
      allowed = parseAnd() || allowed;
    }
    return allowed;
  };

  return tokens.length > 0 && parseOr() && position === tokens.length;
};

/**
 * Modules that live in no package directory of their own but are still code a
 * package wrote: the bundler's runtime, Vite's preload helper, the PWA plugin's
 * registration.
 */
const VIRTUAL_MODULE_PACKAGES: ReadonlyArray<[RegExp, string]> = [
  [/^\0?rolldown[:/]/, 'rolldown'],
  [/^\0?vite[:/]/, 'vite'],
  [/^\/@vite-plugin-pwa\/virtual:pwa-/, 'vite-plugin-pwa'],
];

const NODE_MODULES = `${path.sep}node_modules${path.sep}`;

/** The package directory a bundled module comes from, if a package's at all. */
const packageDirOf = (moduleId: string, rootDir: string): string | null => {
  const file = moduleId.replace(/[?#].*$/, '');
  const index = file.lastIndexOf(NODE_MODULES);
  if (index !== -1) {
    const segments = file.slice(index + NODE_MODULES.length).split(path.sep);
    const nameLength = segments[0]?.startsWith('@') ? 2 : 1;
    return path.join(
      file.slice(0, index + NODE_MODULES.length),
      ...segments.slice(0, nameLength),
    );
  }
  const virtual = VIRTUAL_MODULE_PACKAGES.find(([pattern]) =>
    pattern.test(moduleId),
  );
  return virtual ? path.join(rootDir, 'node_modules', virtual[1]) : null;
};

interface PackageManifest {
  name: string;
  version: string;
  license?: string;
  homepage?: string;
  repository?: string | { url?: string };
}

const sourceOf = (manifest: PackageManifest): string | undefined => {
  const repository =
    typeof manifest.repository === 'string'
      ? manifest.repository
      : manifest.repository?.url;
  if (!repository) return manifest.homepage;
  if (/^github:|^[\w-]+\/[\w.-]+$/.test(repository)) {
    return `https://github.com/${repository.replace(/^github:/, '')}`;
  }
  return repository
    .replace(/^git\+/, '')
    .replace(/^git:\/\//, 'https://')
    .replace(/^ssh:\/\/git@/, 'https://')
    .replace(/\.git$/, '');
};

/** LICENSE, LICENCE.md, COPYING, NOTICE … — Apache-2.0 asks for the NOTICE too. */
const LICENSE_TEXT_FILE = /^(licen[cs]e|copying|notice)([.-].*)?$/i;

/**
 * Vite's and Rolldown's licence files go on with the licences of what they
 * bundle into their own Node code (98 KB for Vite), none of which reaches the
 * app: only their runtime helpers do.
 */
const ownLicenseText = (text: string): string =>
  text.split(/^#+ Licenses of bundled dependencies/m)[0].trim();

const renderPackage = (packageDir: string): string => {
  const manifest = JSON.parse(
    readFileSync(path.join(packageDir, 'package.json'), 'utf8'),
  ) as PackageManifest;
  const license = manifest.license ?? 'UNKNOWN';
  if (!isLicenseAllowed(license)) {
    throw new Error(
      `${manifest.name} ${manifest.version} is bundled under "${license}", ` +
        'which is not in ALLOWED_LICENSES (scripts/utils/thirdPartyLicenses.ts).',
    );
  }
  const texts = readdirSync(packageDir)
    .filter((file) => LICENSE_TEXT_FILE.test(file))
    .sort()
    .map((file) =>
      ownLicenseText(readFileSync(path.join(packageDir, file), 'utf8')),
    );
  if (texts.length === 0) {
    throw new Error(
      `${manifest.name} ${manifest.version} ships no licence file, so its ` +
        'notice cannot be passed on. Add its text by hand or replace it.',
    );
  }
  const source = sourceOf(manifest);
  return [
    `${manifest.name} ${manifest.version}`,
    `License: ${license}`,
    ...(source ? [`Source: ${source}`] : []),
    '',
    ...texts.flatMap((text, index) => (index === 0 ? [text] : ['', text])),
  ].join('\n');
};

const RULE = '-'.repeat(72);

const renderLicenseFile = (packageDirs: Iterable<string>): string => {
  const sections = [...packageDirs]
    .sort(
      (a, b) =>
        packageNameOf(a).localeCompare(packageNameOf(b)) || a.localeCompare(b),
    )
    .map(renderPackage);
  return [
    'Klassenplan — third-party software',
    '',
    'Klassenplan is free software under the GNU Affero General Public License,',
    'version 3 or later. It contains the following packages by other authors,',
    'each under the licence stated with it.',
    '',
    ...sections.flatMap((section) => [RULE, '', section, '']),
  ].join('\n');
};

const packageNameOf = (packageDir: string): string => {
  const segments = packageDir.split(path.sep);
  const name = segments.at(-1) ?? '';
  const scope = segments.at(-2) ?? '';
  return scope.startsWith('@') ? `${scope}/${name}` : name;
};

interface BundleItem {
  type: 'chunk' | 'asset';
  moduleIds?: readonly string[];
  originalFileNames?: readonly string[];
}

/**
 * Collects in `generateBundle` — from the app's build and from every worker
 * build, which finishes before it — and writes once the service worker is
 * generated (vite-plugin-pwa's `closeBundle`), since its Workbox runtime is
 * bundled there, outside Vite's module graph.
 */
export const thirdPartyLicenses = (
  rootDir: string,
): { plugin: Plugin; workerPlugin: () => Plugin } => {
  const packageDirs = new Set<string>();
  let outDir = path.join(rootDir, 'dist');

  const collect = (bundle: Record<string, BundleItem>) => {
    for (const item of Object.values(bundle)) {
      const ids =
        item.type === 'chunk'
          ? (item.moduleIds ?? [])
          : (item.originalFileNames ?? []).map((file) =>
              path.resolve(rootDir, file),
            );
      for (const id of ids) {
        const dir = packageDirOf(id, rootDir);
        if (dir) packageDirs.add(dir);
      }
    }
  };

  /** Workbox marks each of its modules in the code (`workbox:core:7.4.0`). */
  const collectWorkbox = () => {
    for (const file of readdirSync(outDir)) {
      if (!/^(sw|workbox-[\w-]+)\.js$/.test(file)) continue;
      const code = readFileSync(path.join(outDir, file), 'utf8');
      for (const [, name] of code.matchAll(/workbox:([a-z-]+):/g)) {
        const dir = path.join(rootDir, 'node_modules', `workbox-${name}`);
        if (!existsSync(dir)) {
          throw new Error(`workbox-${name} is in ${file} but not installed.`);
        }
        packageDirs.add(dir);
      }
    }
  };

  return {
    plugin: {
      name: 'klassenplan:third-party-licenses',
      apply: 'build',
      configResolved(config) {
        outDir = path.resolve(config.root, config.build.outDir);
      },
      generateBundle(_options, bundle) {
        collect(bundle as Record<string, BundleItem>);
      },
      closeBundle: {
        order: 'post',
        sequential: true,
        handler(error) {
          if (error) return;
          collectWorkbox();
          writeFileSync(
            path.join(outDir, LICENSE_FILE_NAME),
            renderLicenseFile(packageDirs),
          );
        },
      },
    },
    workerPlugin: () => ({
      name: 'klassenplan:third-party-licenses:worker',
      generateBundle(_options, bundle) {
        collect(bundle as Record<string, BundleItem>);
      },
    }),
  };
};

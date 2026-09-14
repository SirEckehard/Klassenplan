// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
//
// Keeps the documentation honest about the repository it describes.
//
// Docs point at files, headings and code paths, and those references rot
// silently: a renamed module or heading leaves a link that still renders, it
// just leads nowhere. This check fails when a Markdown file
//
//   - links to a relative file that does not exist,
//   - links to a heading anchor that the target file does not have, or
//   - names a repository path in inline code (`src/…`, `scripts/…`, …) that
//     does not exist.
//
// docs/CHANGELOG.md is skipped on purpose: it records files as they were at
// each release, and renaming them later must not rewrite history.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logError, logInfo } from './utils/logger.mjs';

const SOURCE = 'check-docs';
const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

/** Directories whose Markdown files are checked, plus the repository root. */
const DOC_DIRECTORIES = ['docs', '.github', 'public', 'src', 'scripts', 'e2e'];
const SKIPPED_FILES = new Set(['docs/CHANGELOG.md']);

/** Inline code starting with one of these is treated as a repository path. */
const PATH_PREFIXES = [
  'src/',
  'scripts/',
  'public/',
  'e2e/',
  'docs/',
  '.github/',
];

const FENCE_PATTERN = /^\s*(```|~~~)/;
const HEADING_PATTERN = /^#{1,6}\s+(.*?)\s*#*\s*$/;
const LINK_PATTERN = /\]\(([^)\s]+)\)/g;
const INLINE_CODE_PATTERN = /`([^`]+)`/g;
const EXTERNAL_TARGET_PATTERN = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

const toPosix = (value) => value.split(path.sep).join('/');

const collectMarkdownFiles = (directory, found) => {
  if (!existsSync(directory)) return found;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') collectMarkdownFiles(absolute, found);
    } else if (entry.name.endsWith('.md')) {
      found.push(toPosix(path.relative(rootDir, absolute)));
    }
  }
  return found;
};

const listDocs = () => {
  const rootFiles = readdirSync(rootDir).filter(
    (name) =>
      name.endsWith('.md') && statSync(path.join(rootDir, name)).isFile(),
  );
  const nested = DOC_DIRECTORIES.flatMap((directory) =>
    collectMarkdownFiles(path.join(rootDir, directory), []),
  );
  return [...rootFiles, ...nested]
    .filter((file) => !SKIPPED_FILES.has(file))
    .sort();
};

/** Heading → anchor, the way GitHub renders it. */
const slugify = (heading) =>
  heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}_\- ]/gu, '')
    .replace(/ /g, '-');

/** Lines outside fenced code blocks, with their 1-based line numbers. */
const proseLines = (content) => {
  const lines = [];
  let inFence = false;
  content.split('\n').forEach((text, index) => {
    if (FENCE_PATTERN.test(text)) {
      inFence = !inFence;
      return;
    }
    if (!inFence) lines.push({ text, number: index + 1 });
  });
  return lines;
};

const anchorCache = new Map();

const anchorsOf = (absoluteFile) => {
  if (!anchorCache.has(absoluteFile)) {
    const anchors = new Set();
    const occurrences = new Map();
    for (const { text } of proseLines(readFileSync(absoluteFile, 'utf8'))) {
      const heading = HEADING_PATTERN.exec(text);
      if (!heading) continue;
      const base = slugify(heading[1]);
      const seen = occurrences.get(base) ?? 0;
      // GitHub numbers repeated headings: `setup`, `setup-1`, `setup-2`, …
      anchors.add(seen === 0 ? base : `${base}-${seen}`);
      occurrences.set(base, seen + 1);
    }
    anchorCache.set(absoluteFile, anchors);
  }
  return anchorCache.get(absoluteFile);
};

const checkLink = (file, target) => {
  if (EXTERNAL_TARGET_PATTERN.test(target)) return null;

  const [rawPath, anchor] = target.split('#');
  const absoluteTarget = rawPath
    ? path.resolve(rootDir, path.dirname(file), decodeURIComponent(rawPath))
    : path.join(rootDir, file);

  if (!existsSync(absoluteTarget)) {
    return `link to a missing file: ${target}`;
  }
  if (
    anchor &&
    absoluteTarget.endsWith('.md') &&
    !anchorsOf(absoluteTarget).has(anchor)
  ) {
    return `link to a missing heading: ${target}`;
  }
  return null;
};

const checkCodePath = (value) => {
  if (!PATH_PREFIXES.some((prefix) => value.startsWith(prefix))) return null;
  // Globs, placeholders (`src/…`) and alternatives are patterns, not paths.
  if (/[\s*{}<>[\]|…]/.test(value)) return null;

  const cleaned = value.replace(/[#:].*$/, '').replace(/\/$/, '');
  return existsSync(path.join(rootDir, cleaned))
    ? null
    : `path in inline code does not exist: ${value}`;
};

const checkFile = (file) => {
  const problems = [];
  const content = readFileSync(path.join(rootDir, file), 'utf8');

  for (const { text, number } of proseLines(content)) {
    const where = `${file}:${number}`;
    // Inline code can contain link syntax that is not a link.
    const withoutCode = text.replace(INLINE_CODE_PATTERN, '');
    for (const [, target] of withoutCode.matchAll(LINK_PATTERN)) {
      const problem = checkLink(file, target);
      if (problem) problems.push({ where, problem });
    }
    for (const [, code] of text.matchAll(INLINE_CODE_PATTERN)) {
      const problem = checkCodePath(code);
      if (problem) problems.push({ where, problem });
    }
  }

  return problems;
};

const run = () => {
  const files = listDocs();
  const problems = files.flatMap(checkFile);

  if (problems.length > 0) {
    for (const { where, problem } of problems) {
      logError(problem, { where }, SOURCE);
    }
    logError(
      'Documentation references are broken',
      { problems: problems.length, files: files.length },
      SOURCE,
    );
    process.exitCode = 1;
    return;
  }

  logInfo('Documentation references resolve', { files: files.length }, SOURCE);
};

run();

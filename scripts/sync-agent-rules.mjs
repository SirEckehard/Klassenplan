// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
//
// Keeps the agent instruction files in sync with CLAUDE.md.
//
// Several coding agents read the same project rules from different places:
// Claude Code reads CLAUDE.md, Codex and friends read AGENTS.md, Antigravity
// reads .agent/rules/. The copies used to be maintained by hand and drifted
// apart release by release. CLAUDE.md is now the only file to edit; this script
// writes the others from it.
//
//   node scripts/sync-agent-rules.mjs          rewrite the copies
//   node scripts/sync-agent-rules.mjs --check  fail if a copy differs (CI)
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logError, logInfo } from './utils/logger.mjs';

const SOURCE = 'sync-agent-rules';
const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

const SOURCE_FILE = 'CLAUDE.md';

// Antigravity only applies a rule file on every request with this frontmatter.
const ANTIGRAVITY_FRONTMATTER = '---\ntrigger: always_on\n---\n\n';

/**
 * The rules without CLAUDE.md's own title and Claude Code intro, which would
 * be misleading in a file another agent reads.
 */
const stripClaudeHeader = (content) => {
  const firstSection = content.search(/^## /m);
  return firstSection === -1 ? content : content.slice(firstSection);
};

const buildTargets = (claudeMd) => {
  const rules = stripClaudeHeader(claudeMd);
  return {
    'AGENTS.md': rules,
    '.agent/rules/AGENTS.md': rules,
    '.agent/rules/ANTIGRAVITY.md': `${ANTIGRAVITY_FRONTMATTER}${rules}`,
    '.agent/rules/CLAUDE.md': claudeMd,
  };
};

const readIfPresent = async (filePath) => {
  try {
    return await readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
};

const run = async () => {
  const checkOnly = process.argv.includes('--check');
  const claudeMd = await readFile(path.join(rootDir, SOURCE_FILE), 'utf8');
  const targets = buildTargets(claudeMd);

  const stale = [];
  for (const [relativePath, expected] of Object.entries(targets)) {
    const absolutePath = path.join(rootDir, relativePath);
    const current = await readIfPresent(absolutePath);
    if (current === expected) {
      continue;
    }
    stale.push(relativePath);
    if (!checkOnly) {
      await writeFile(absolutePath, expected);
    }
  }

  if (stale.length === 0) {
    logInfo('Agent rules match CLAUDE.md', undefined, SOURCE);
    return;
  }

  if (checkOnly) {
    logError(
      'Agent rule files differ from CLAUDE.md',
      {
        stale,
        hint: 'Edit CLAUDE.md only, then run `npm run sync:agent-rules`',
      },
      SOURCE,
    );
    process.exitCode = 1;
    return;
  }

  logInfo('Agent rules rewritten from CLAUDE.md', { updated: stale }, SOURCE);
};

run().catch((error) => {
  logError('Could not sync agent rules', { message: error.message }, SOURCE);
  process.exitCode = 1;
});

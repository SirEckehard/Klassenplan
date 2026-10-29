// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
// eslint.config.js (ESM, Flat Config)

import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import { fixupConfigRules } from '@eslint/compat';
import tsParser from '@typescript-eslint/parser';
import importX from 'eslint-plugin-import-x';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

// Deep paths into modules the central utils API already exposes.
const utilsBarrelPaths = [
  '@/utils/constants',
  '@/utils/nameFormatting',
  '@/utils/logger',
  '@/utils/mixSettings',
  '@/utils/plan',
  '@/utils/errorHandling',
  '@/utils/deepClone',
  '@/utils/id',
  '@/utils/math/tablePositioning',
  '@/utils/shortcuts',
  '@/utils/dateTimeFormat',
].map((name) => ({
  name,
  message: 'Bitte importiere stattdessen aus "@/utils".',
}));

const testFiles = [
  'src/**/__tests__/**',
  'src/**/*.test.ts',
  'src/**/*.test.tsx',
];

const UI_ALGORITHM_MESSAGE =
  'UI code reaches "@/utils/algorithm" through hooks and contexts. Allowed are type imports and seatingStatistics, criterionHighlights and circleSummary (see docs/MODULE_BOUNDARIES.md).';
const UI_DATA_MESSAGE =
  'UI code reaches "@/utils/data" through hooks and repositories. Allowed are type imports and planUsage; storage keys come from "@/utils" (see docs/MODULE_BOUNDARIES.md).';

export default defineConfig([
  // TypeScript, React and React Hooks through FlatCompat (no native flat config)
  ...fixupConfigRules(
    compat.extends(
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended',
      'plugin:react/recommended',
      'plugin:react-hooks/recommended',
    ),
  ),

  // eslint-plugin-import-x: native flat config, works with ESLint 10
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,

  // Base settings (no parser here)
  {
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    settings: {
      // Detect the React version instead of warning about it
      react: { version: 'detect' },

      // Resolver for import-x
      'import-x/resolver': {
        typescript: {
          project: ['./tsconfig.json'],
          alwaysTryTypes: true,
        },
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
      },
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'import-x/no-unresolved': 'off',
      'import-x/no-named-as-default-member': 'off',
      quotes: ['error', 'single', { avoidEscape: true }],
      // react-hooks v7 introduced stricter rules that flag established React patterns
      // as errors. These patterns are widely used and documented in the React ecosystem:
      // - Sync-ref pattern: ref.current = value in hook body for stable callbacks
      // - setState in initialization effects: setting state from localStorage on mount
      // - useSyncExternalStore patterns that read refs during render
      // - Callback ordering in useCallback dependencies (immutability rule)
      // We disable them as errors but keep them as warnings to track for future fixes
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/unsupported-syntax': 'warn',
      'react-hooks/immutability': 'warn',
      'no-restricted-imports': ['error', { paths: utilsBarrelPaths }],
    },
  },

  // Only TS/TSX files get the TypeScript parser and the project
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: __dirname,
      },
    },
  },

  // UI layer: the algorithm and data namespaces are reached through hooks and
  // contexts (docs/MODULE_BOUNDARIES.md). The typescript-eslint variant is
  // needed for allowTypeImports; it replaces the core rule for these files, so
  // the barrel paths are repeated here.
  {
    files: ['src/components/**/*.{ts,tsx}', 'src/pages/**/*.{ts,tsx}'],
    ignores: testFiles,
    rules: {
      'no-restricted-imports': 'off',
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            ...utilsBarrelPaths,
            {
              name: '@/utils/algorithm',
              allowTypeImports: true,
              message: UI_ALGORITHM_MESSAGE,
            },
            {
              name: '@/utils/data',
              allowTypeImports: true,
              message: UI_DATA_MESSAGE,
            },
          ],
          patterns: [
            {
              // Pure derivations that have to show exactly what the
              // algorithm scores stay importable.
              group: [
                '@/utils/algorithm/*',
                '!@/utils/algorithm/seatingStatistics',
                '!@/utils/algorithm/criterionHighlights',
                '!@/utils/algorithm/circleSummary',
              ],
              allowTypeImports: true,
              message: UI_ALGORITHM_MESSAGE,
            },
            {
              group: ['@/utils/data/*', '!@/utils/data/planUsage'],
              allowTypeImports: true,
              message: UI_DATA_MESSAGE,
            },
          ],
        },
      ],
    },
  },

  // Utils are the bottom layer: no UI, hooks, state, services, repositories or
  // workers. Code that needs them belongs in one of those layers instead.
  {
    files: ['src/utils/**/*.{ts,tsx}'],
    ignores: testFiles,
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: utilsBarrelPaths,
          patterns: [
            {
              group: [
                'components',
                'pages',
                'hooks',
                'contexts',
                'stores',
                'stateMachines',
                'services',
                'repositories',
                'workers',
              ].flatMap((layer) => [`@/${layer}`, `@/${layer}/*`]),
              message:
                'Utils are the bottom layer and import no UI, hooks, contexts, stores, state machines, services, repositories or workers (see docs/MODULE_BOUNDARIES.md).',
            },
          ],
        },
      ],
    },
  },

  // Tooling and config files: no import rules
  {
    files: ['vite.config.ts', 'playwright.config.ts', 'eslint.config.js'],
    languageOptions: {
      parserOptions: {
        project: null,
      },
    },
    rules: {
      'import-x/namespace': 'off',
      'import-x/default': 'off',
      'import-x/no-named-as-default': 'off',
      'import-x/no-named-as-default-member': 'off',
    },
  },

  // Global ignores
  globalIgnores([
    'node_modules/**',
    'dist/**',
    'build/**',
    '.next/**',
    '.vite/**',
    'coverage/**',
  ]),

  // Test files: relaxed rules
  {
    files: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'src/**/__tests__/**/*',
      'src/setupTests.ts',
      'e2e/**/*.spec.ts',
    ],
    languageOptions: {
      parserOptions: {
        project: null,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
      'no-console': 'off',
      'import-x/no-extraneous-dependencies': 'off',
    },
  },
]);

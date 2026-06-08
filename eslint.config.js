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

export default defineConfig([
  // TypeScript, React, React-Hooks via FlatCompat (kein natives Flat Config)
  ...fixupConfigRules(
    compat.extends(
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended',
      'plugin:react/recommended',
      'plugin:react-hooks/recommended',
    ),
  ),

  // eslint-plugin-import-x: natives Flat Config, ESLint 10 kompatibel
  importX.flatConfigs.recommended,
  importX.flatConfigs.typescript,

  // Basiseinstellungen (ohne Parser!):
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
      // React-Warnung beheben:
      react: { version: 'detect' },

      // Resolver für import-x:
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
      quotes: ['error', 'single'],
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
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/utils/constants',
              message: 'Bitte importiere stattdessen aus "@/utils".',
            },
            {
              name: '@/utils/nameFormatting',
              message: 'Bitte importiere stattdessen aus "@/utils".',
            },
            {
              name: '@/utils/logger',
              message: 'Bitte importiere stattdessen aus "@/utils".',
            },
            {
              name: '@/utils/mixSettings',
              message: 'Bitte importiere stattdessen aus "@/utils".',
            },
            {
              name: '@/utils/plan',
              message: 'Bitte importiere stattdessen aus "@/utils".',
            },
            {
              name: '@/utils/errorHandling',
              message: 'Bitte importiere stattdessen aus "@/utils".',
            },
            {
              name: '@/utils/deepClone',
              message: 'Bitte importiere stattdessen aus "@/utils".',
            },
            {
              name: '@/utils/id',
              message: 'Bitte importiere stattdessen aus "@/utils".',
            },
            {
              name: '@/utils/positioning',
              message: 'Bitte importiere stattdessen aus "@/utils".',
            },
            {
              name: '@/utils/shortcuts',
              message: 'Bitte importiere stattdessen aus "@/utils".',
            },
          ],
        },
      ],
    },
  },

  // Nur TS/TSX-Dateien bekommen den TS-Parser + project:
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

  // Tooling-/Config-Dateien: Import-Regeln deaktivieren
  {
    files: [
      'vite.config.ts',
      'tailwind.config.ts',
      'tailwind.config.js',
      'postcss.config.js',
      'eslint.config.js',
    ],
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

  // Globale Ignores
  globalIgnores([
    'node_modules/**',
    'dist/**',
    'build/**',
    '.next/**',
    '.vite/**',
    'coverage/**',
  ]),

  // Test-Dateien: Relaxed Rules
  {
    files: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'src/**/__tests__/**/*',
      'src/setupTests.ts',
    ],
    languageOptions: {
      parserOptions: {
        project: null,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'import-x/no-extraneous-dependencies': 'off',
    },
  },
]);

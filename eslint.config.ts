import type { FixupConfigArray } from '@eslint/compat'
import { fixupConfigRules } from '@eslint/compat'
import { FlatCompat } from '@eslint/eslintrc'
import js from '@eslint/js'
import { flatConfigs as importXFlatConfig } from 'eslint-plugin-import-x'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended'
import reactPlugin from 'eslint-plugin-react'
import { browser, es2020, node } from 'globals'
// eslint-disable-next-line import-x/no-deprecated
import { config, configs as tsConfigs, parser as tsParser } from 'typescript-eslint'

// eslint-disable-next-line import-x/no-deprecated
export default config(
  // Shared configs
  js.configs.recommended,
  ...tsConfigs.recommended,
  jsxA11y.flatConfigs.recommended,
  importXFlatConfig.recommended,
  importXFlatConfig.typescript,
  eslintPluginPrettierRecommended,
  ...fixupConfigRules(
    new FlatCompat().extends('plugin:react-hooks/recommended') as FixupConfigArray
  ),
  {
    files: ['**/*.{ts,tsx}'],
    ...reactPlugin.configs.flat.recommended,
    ...reactPlugin.configs.flat['jsx-runtime'],
  },
  // Custom config
  {
    ignores: [
      '**/build/**',
      '**/dist/**',
      '**/node_modules/**',
      'chrome-extension/manifest.js',
      // A real logged-in Chrome profile, gitignored but not eslint-ignored —
      // which had eslint walking tens of thousands of browser-internal files
      // and reporting ~12k errors that were never ours.
      '**/.chrome-profile/**',
      '**/test-results/**',
      '**/playwright-report/**',
      // Ajv standalone output: ~400KB of machine-written validators, with
      // one expression per line and no line breaks. Linting it found
      // nothing a human could act on and took longer than every other
      // package in the workspace combined.
      '**/lib/agent/generated/**',
    ],
  },
  {
    // Build scripts, not browser code. These run under Node to generate the
    // validators the extension ships, so `process` and `console` are the API
    // rather than a mistake — the browser globals the shared package is linted
    // against do not include them.
    files: ['packages/*/scripts/**/*.mjs', 'packages/*/scripts/**/*.js'],
    languageOptions: { globals: { process: 'readonly', console: 'readonly' } },
    rules: { 'no-undef': 'off', 'import-x/no-named-as-default': 'off' },
  },
  {
    // Playwright, not React. A fixture is declared `async ({}, use) => {}`, so
    // the empty destructure is the API and `use` is Playwright's own callback —
    // which react-hooks reads as React 19's `use` hook being called outside a
    // component. There is no React in this package.
    files: ['tests/e2e/**/*.ts'],
    rules: {
      'no-empty-pattern': 'off',
      'react-hooks/rules-of-hooks': 'off',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
        projectService: true,
      },
      globals: {
        ...browser,
        ...es2020,
        ...node,
        chrome: 'readonly',
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      'no-restricted-imports': [
        'error',
        {
          name: 'type-fest',
          message: 'Please import from `@extension/shared` instead of `type-fest`.',
        },
      ],
      'arrow-body-style': 'off',
      '@typescript-eslint/consistent-type-exports': 'error',
      'import-x/no-unresolved': 'off',
      'import-x/newline-after-import': 'error',
      'import-x/no-deprecated': 'error',
      'import-x/no-duplicates': ['error', { considerQueryString: true, 'prefer-inline': false }],
      'import-x/consistent-type-specifier-style': 'off',
      'import-x/exports-last': 'off',
      'import-x/first': 'error',
      'import-x/no-named-as-default-member': 'off',
      '@typescript-eslint/consistent-type-imports': 'off',
      'react/prop-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      'import/no-unresolved': 'off',
      'no-empty': 'off',
      'react/display-name': 'off',
      'import/named': 'off',
      'jsx-a11y/heading-has-content': 'off',
      'import/namespace': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'import-x/no-named-as-default': 'off',
      'jsx-a11y/no-static-element-interactions': 'off',
      'jsx-a11y/media-has-caption': 'off',
      'jsx-a11y/click-events-have-key-events': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'jsx-a11y/label-has-associated-control': 'off',
    },
    linterOptions: {
      reportUnusedDisableDirectives: 'error',
    },
  },
  // Overrides Rules
  {
    files: ['**/packages/shared/**/*.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  }
)

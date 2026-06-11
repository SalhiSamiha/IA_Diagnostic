import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    files: ['api/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        fetch:    'readonly',
        FormData: 'readonly',
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      // Désactivé : le regex de sanitize contient intentionnellement des ctrl chars
      'no-control-regex':      'off',
      'no-irregular-whitespace':'off',
      // Bugs réels — bloquants
      'no-eval':               'error',
      'no-new-func':           'error',
      'no-prototype-builtins': 'error',
      'use-isnan':             'error',
      'no-unreachable':        'error',
      // Qualité — avertissements non bloquants
      'no-console':    ['warn', { allow: ['error', 'warn'] }],
      'no-unused-vars':['warn', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_?' }],
      'eqeqeq':        ['warn', 'smart'],
    },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        // Globals browser utilisés dans page.evaluate() des tests Playwright
        window:    'readonly',
        document:  'readonly',
        navigator: 'readonly',
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_?' }],
      'no-eval':        'error',
    },
  },
];

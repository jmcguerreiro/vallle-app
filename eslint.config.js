import js from '@eslint/js'
import prettierConfig from 'eslint-config-prettier'
import importPlugin from 'eslint-plugin-import'
import reactPlugin from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import eslintPluginUnicorn from 'eslint-plugin-unicorn'
import globals from 'globals'

export default [
  // Base configurations
  importPlugin.flatConfigs.recommended,
  eslintPluginUnicorn.configs.recommended,

  // Ignore build output
  {
    ignores: ['dist'],
  },

  // Main configuration
  {
    files: ['**/*.{js,jsx}'],

    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },

    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },

    settings: {
      // Auto-detect React version
      react: {
        version: 'detect',
      },

      // Configure path resolution for imports
      'import/resolver': {
        node: {
          extensions: ['.js', '.jsx', '.json'],
        },
        alias: {
          map: [['@', './src']],
          extensions: ['.js', '.jsx', '.json'],
        },
      },
    },

    rules: {
      // Extend recommended rule sets
      ...js.configs.recommended.rules,
      ...reactPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      // Unicorn: Allow any filename case
      'unicorn/filename-case': 'off',
      // Unicorn: Allow common abbreviations (props, ref, etc.)
      'unicorn/prevent-abbreviations': 'off',
      // Unicorn: Allow null values (useful for intentional emptiness vs undefined)
      'unicorn/no-null': 'off',

      // Imports: Ensure all imports can be resolved
      'import/no-unresolved': 'error',
      // Imports: Enforce consistent import order with React first
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
          pathGroups: [
            {
              pattern: 'react*',
              group: 'external',
              position: 'before',
            },
            {
              pattern: '@/**',
              group: 'internal',
            },
          ],
          pathGroupsExcludedImportTypes: ['react'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],

      // React: Not needed in modern React (17+)
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',
      // React: Warn if non-component exports might break Fast Refresh
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // React: Enforce consistent prop ordering (ref and key first)
      'react/jsx-sort-props': [
        'warn',
        {
          callbacksLast: false,
          shorthandFirst: false,
          ignoreCase: true,
          reservedFirst: ['ref', 'key'],
        },
      ],
      // React: Disable prop-types as we use JSDoc for internal documentation and type hinting
      'react/prop-types': 'off',
    },
  },

  // Must be last: disable formatting rules that conflict with Prettier
  prettierConfig,
]

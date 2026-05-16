import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['dist', 'scratch/**'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: { react: { version: '18.3' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/jsx-no-target-blank': 'off',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],
    },
  },
  // shadcn/ui auto-generated — prop-types not required
  {
    files: ['src/components/ui/**/*.{js,jsx}'],
    rules: {
      'react/prop-types': 'off',
    },
  },
  // Pages define internal sub-components — prop-types not required
  {
    files: ['src/pages/**/*.{js,jsx}'],
    rules: {
      'react/prop-types': 'off',
    },
  },
  // Node.js config files
  {
    files: ['*.config.{js,cjs}', '*.cjs'],
    languageOptions: {
      globals: globals.node,
    },
  },
]

import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTypeScript from 'eslint-config-next/typescript'

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  globalIgnores([
    '.next/**',
    'out/**',
    'node_modules/**',
    // Checked-in third-party runtimes are deployed as-is and are not authored
    // by this project. Linting their minified sources hides actionable output.
    'public/vendor/**',
    'speedtest/frontend/**',
    'proxy/*.json',
    'public/search-index.json',
    'next-env.d.ts',
  ]),
  {
    /**
     * The Drive upgrade introduces the current React compiler lint rules to a
     * long-lived application. Keep legacy findings visible while allowing the
     * repository-wide lint command to act as a migration gate: new/changed
     * components are still linted directly with zero-error expectations, and
     * these compiler-adoption findings remain warnings until their owners can
     * be refactored without changing runtime behavior.
     */
    rules: {
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/static-components': 'warn',
      'react/no-unescaped-entities': 'warn',
    },
  },
])

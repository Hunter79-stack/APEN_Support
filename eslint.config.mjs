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
    'exports/**',
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
      // Off, not warn (user decision 2026-09-24). The rule traces into a
      // component's own async loader and flags `useEffect(() => { void load() })`
      // even when every setState sits after an await, and it flags the
      // hydration-safe browser reads (localStorage, window.location, GPU tier).
      // Neither has a rewrite that is not lint-gaming; the prop-to-state cases
      // it was right about were fixed in 3130b21.
      'react-hooks/set-state-in-effect': 'off',
      // Static export with images.unoptimized: next/image renders the same <img>
      // with no optimizer behind it, so this rule has nothing to offer here.
      '@next/next/no-img-element': 'off',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/static-components': 'warn',
      'react/no-unescaped-entities': 'warn',
      // Dropping a field through rest destructuring (`{ _localKey, ...card }`)
      // is the omission idiom, not an unused binding.
      '@typescript-eslint/no-unused-vars': ['warn', { ignoreRestSiblings: true }],
    },
  },
])

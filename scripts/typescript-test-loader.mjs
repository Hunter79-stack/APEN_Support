import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { transformSync } from '@babel/core'

const ROOT = process.cwd()
const TS_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts']
const CODE_EXTENSIONS = new Set([...TS_EXTENSIONS, '.js', '.mjs', '.cjs', '.json'])
const ASSET_EXTENSIONS = new Set(['.css', '.scss', '.sass', '.less', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico'])

async function existingFile(candidate) {
  const checks = [candidate]
  if (!CODE_EXTENSIONS.has(path.extname(candidate).toLowerCase()) && !ASSET_EXTENSIONS.has(path.extname(candidate).toLowerCase())) {
    checks.push(...TS_EXTENSIONS.map((extension) => `${candidate}${extension}`))
    checks.push(`${candidate}.js`, `${candidate}.mjs`, `${candidate}.cjs`)
    checks.push(...TS_EXTENSIONS.map((extension) => path.join(candidate, `index${extension}`)))
    checks.push(path.join(candidate, 'index.js'), path.join(candidate, 'index.mjs'))
  }
  for (const value of checks) {
    try {
      const stat = await fs.stat(value)
      if (stat.isFile()) return value
    } catch { /* try next candidate */ }
  }
  return null
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const resolved = await existingFile(path.join(ROOT, specifier.slice(2)))
    if (resolved) return { url: pathToFileURL(resolved).href, shortCircuit: true }
  }

  if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.startsWith('file:')) {
    const parentDirectory = path.dirname(fileURLToPath(context.parentURL))
    const resolved = await existingFile(path.resolve(parentDirectory, specifier))
    if (resolved) return { url: pathToFileURL(resolved).href, shortCircuit: true }
  }

  try {
    return await nextResolve(specifier, context)
  } catch (error) {
    // Next.js exposes extensionless imports in application code (for example,
    // `next/navigation`), while Node's ESM resolver requires the concrete .js
    // package subpath when tests load those components directly.
    if (specifier.startsWith('next/') && !path.extname(specifier)) {
      return nextResolve(`${specifier}.js`, context)
    }
    throw error
  }
}

export async function load(url, context, nextLoad) {
  const pathname = url.startsWith('file:') ? fileURLToPath(url) : ''
  const extension = path.extname(pathname).toLowerCase()

  if (ASSET_EXTENSIONS.has(extension)) {
    return {
      format: 'module',
      shortCircuit: true,
      source: extension === '.css' || extension === '.scss' || extension === '.sass' || extension === '.less'
        ? 'export default {}'
        : `export default ${JSON.stringify(pathname)}`,
    }
  }

  // JSON modules: tsc compiles `import data from './x.json'` (resolveJsonModule)
  // but Node's runtime then demands `with { type: 'json' }` on the emitted
  // import. Serve the parsed value as a plain module instead — matching what
  // the Next.js bundler does — so modules that import JSON stay testable.
  if (extension === '.json') {
    const source = await fs.readFile(pathname, 'utf8')
    return { format: 'module', shortCircuit: true, source: `export default ${source}` }
  }

  if (TS_EXTENSIONS.includes(extension)) {
    const source = await fs.readFile(pathname, 'utf8')
    // Babel, not the TypeScript compiler API: typescript@7 is the native (Go)
    // port and its npm package no longer exports transpileModule/ScriptTarget —
    // it ships `version` and nothing else. Node 24 can strip types on its own
    // but cannot do JSX, and the tests import .tsx components, so a real
    // transform is still required.
    //
    // Output stays ESM on purpose (no module transform): Node runs the modern
    // syntax natively, which is what target:ES2022 + module:ESNext meant before.
    const output = transformSync(source, {
      filename: pathname,
      sourceType: 'module',
      babelrc: false,
      configFile: false,
      // Type-only constructs are erased per-file, matching isolatedModules.
      plugins: [
        ['@babel/plugin-transform-typescript', {
          isTSX: extension === '.tsx',
          allowDeclareFields: true,
          // Keep `import type` erasure faithful without a type checker.
          onlyRemoveTypeImports: false,
        }],
        ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }],
      ],
    })
    return { format: 'module', shortCircuit: true, source: output.code }
  }

  return nextLoad(url, context)
}

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from '@babel/parser'
import _traverse from '@babel/traverse'

// @babel/traverse ships a CJS default export; unwrap it for ESM.
const traverse = _traverse.default ?? _traverse

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const registryPath = join(projectRoot, 'lib', 'data', 'logos.ts')
const publicRoot = join(projectRoot, 'public')
const source = readFileSync(registryPath, 'utf8')

const logoCatalogMatch = source.match(
  /export const LOGOS = \{([\s\S]*?)\n\} as const satisfies Record<string, LocalImagePath>/,
)

if (!logoCatalogMatch || logoCatalogMatch.index === undefined) {
  console.error(`Image registry validation failed: canonical LOGOS catalog was not found in ${registryPath}.`)
  process.exit(1)
}

const logoCatalogBody = logoCatalogMatch[1]
const logoCatalogStart = logoCatalogMatch.index
const logoCatalogEnd = logoCatalogStart + logoCatalogMatch[0].length
const sourceOutsideCatalog = `${source.slice(0, logoCatalogStart)}${source.slice(logoCatalogEnd)}`

const roots = new Map(
  [...source.matchAll(/^const\s+([A-Z]+)\s*=\s*['"](\/logos\/[^'"]+)['"]/gm)]
    .map((match) => [match[1], match[2]]),
)

const templateUrls = [...logoCatalogBody.matchAll(/`\$\{([A-Z]+)\}(\/[^`]+)`/g)]
  .map((match) => {
    const root = roots.get(match[1])
    return root ? `${root}${match[2]}` : undefined
  })
  .filter(Boolean)

// Also support direct root-relative values if a future image does not use one
// of the directory constants above. Requiring a file extension avoids treating
// the root constants themselves as assets.
const directUrls = [...logoCatalogBody.matchAll(/['"`]((?:\/logos\/)[^'"`\s]+\.[a-z0-9]+)['"`]/gi)]
  .map((match) => match[1])

const declaredUrls = [...templateUrls, ...directUrls]
const urls = [...new Set(declaredUrls)].sort()

// Keep page sections structurally safe too. A duplicated route would be
// silently overwritten when the sections are spread into PAGE_LOGOS, so fail
// validation instead. Every named section must also be present in the flat
// compatibility map consumed by older callers.
const pageSections = [...source.matchAll(
  /export const ([A-Z][A-Z0-9_]*_PAGE_LOGOS) = \{([\s\S]*?)\n\} as const satisfies PageLogoMap/g,
)]
const flatPageLogosBody = source.match(
  /export const PAGE_LOGOS = \{([\s\S]*?)\n\} as const/,
)?.[1] ?? ''
const pageRoutes = new Map()

function inspectExactPath(url) {
  const segments = url.replace(/^\//, '').split('/')
  let current = publicRoot

  for (const segment of segments) {
    if (!existsSync(current) || !statSync(current).isDirectory()) {
      return { status: 'missing' }
    }

    const entries = readdirSync(current)
    if (!entries.includes(segment)) {
      const caseMatch = entries.find((entry) => entry.toLowerCase() === segment.toLowerCase())
      return caseMatch
        ? { status: 'case', expected: segment, actual: caseMatch }
        : { status: 'missing' }
    }

    current = join(current, segment)
  }

  return existsSync(current) && statSync(current).isFile()
    ? { status: 'ok' }
    : { status: 'missing' }
}

function sourceFilesUnder(directory) {
  if (!existsSync(directory)) return []

  const files = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...sourceFilesUnder(entryPath))
    } else if (['.js', '.jsx', '.ts', '.tsx'].includes(extname(entry.name))) {
      files.push(entryPath)
    }
  }
  return files
}

const failures = []

// Physical image strings belong only in LOGOS. Route maps, backgrounds, and
// every consumer must reference a semantic LOGOS key instead of declaring a
// second location.
for (const match of sourceOutsideCatalog.matchAll(/`\$\{([A-Z]+)\}(\/[^`]+)`/g)) {
  failures.push(`CATALOG  ${match[0]} is declared outside the canonical LOGOS object`)
}
for (const match of sourceOutsideCatalog.matchAll(/['"`]((?:\/logos\/)[^'"`\s]+\.[a-z0-9]+)['"`]/gi)) {
  failures.push(`CATALOG  ${match[1]} is declared outside the canonical LOGOS object`)
}

// Format- or folder-specific keys become misleading when assets are converted
// or moved. Semantic names keep consumers stable through those migrations.
for (const match of logoCatalogBody.matchAll(/^\s*([A-Za-z][A-Za-z0-9]*):\s*`/gm)) {
  const key = match[1]
  if (/(?:Svg|Png|Jpe?g|Webp|Gif|Real)$/i.test(key)) {
    failures.push(`KEY      ${key} encodes a file type/folder; use a semantic asset name`)
  }
}

// No page, component, configuration, or secondary data module may carry a
// literal /logos path. This keeps future no_backgrounds conversions to one
// edit in LOGOS.
const sourceRoots = ['app', 'components', 'config', 'lib'].map((name) => join(projectRoot, name))
const projectSourceFiles = sourceRoots.flatMap(sourceFilesUnder)
for (const filePath of projectSourceFiles) {
  if (resolve(filePath) === resolve(registryPath)) continue

  const fileSource = readFileSync(filePath, 'utf8')
  for (const match of fileSource.matchAll(/['"`](\/logos\/[^'"`\s]+)/g)) {
    failures.push(
      `LITERAL  ${relative(projectRoot, filePath)} declares ${match[1]}; reference LOGOS or a page map`,
    )
  }
}

// Docs cards and page-specific content must use DOCS_PAGE_LOGOS so their image
// cannot drift from the page header or navigation entry.
const docsManagedFiles = [
  join(projectRoot, 'lib', 'data', 'docs.ts'),
  ...sourceFilesUnder(join(projectRoot, 'app', 'docs')),
]
for (const filePath of docsManagedFiles) {
  if (!existsSync(filePath)) continue
  if (/\bLOGOS\./.test(readFileSync(filePath, 'utf8'))) {
    failures.push(
      `SELECTION ${relative(projectRoot, filePath)} uses LOGOS directly; use DOCS_PAGE_LOGOS[route]`,
    )
  }
}

const pathDeclarationCounts = new Map()
for (const url of declaredUrls) {
  pathDeclarationCounts.set(url, (pathDeclarationCounts.get(url) ?? 0) + 1)
}
for (const [url, count] of pathDeclarationCounts) {
  if (count > 1) {
    failures.push(`DUPLICATE_PATH ${url} is declared ${count} times; keep one canonical location`)
  }
}

for (const section of pageSections) {
  const [, sectionName, body] = section

  if (!flatPageLogosBody.includes(`...${sectionName},`)) {
    failures.push(`COMPOSE  ${sectionName} is not included in PAGE_LOGOS`)
  }

  for (const routeMatch of body.matchAll(/^\s*['"]([^'"]+)['"]\s*:/gm)) {
    const route = routeMatch[1]
    const previousSection = pageRoutes.get(route)

    if (!route.startsWith('/')) {
      failures.push(`ROUTE    ${route} in ${sectionName} must start with /`)
    }
    if (route !== '/' && route.endsWith('/')) {
      failures.push(`ROUTE    ${route} in ${sectionName} must omit the trailing slash`)
    }
    if (previousSection) {
      failures.push(`DUPLICATE ${route} appears in ${previousSection} and ${sectionName}`)
    } else {
      pageRoutes.set(route, sectionName)
    }
  }
}

const navItemLogosBody = source.match(
  /export const navItemLogos[^=]*= \{([\s\S]*?)\n\}/,
)?.[1] ?? ''
for (const routeMatch of navItemLogosBody.matchAll(/^\s*['"]([^'"]+)['"]\s*:/gm)) {
  const route = routeMatch[1]
  if (pageRoutes.has(route)) {
    failures.push(`NAV      ${route} overrides PAGE_LOGOS; navigation must inherit the route entry`)
  }
}

// Internal route cards must read the same route map as their destination page.
// Parse the project rather than relying on formatting-sensitive regex so this
// remains effective as data objects are reorganized.
// Parsed with Babel rather than the TypeScript compiler API: typescript@7 is
// the native (Go) port and no longer exports createSourceFile/ScriptKind. Babel
// parses the same TS + TSX syntax and gives the same information, so these
// SELECTION rules keep working against an AST instead of formatting-sensitive
// regex.
function propertyName(property) {
  const key = property.key
  if (!key) return undefined
  if (key.type === 'Identifier') return key.name
  if (key.type === 'StringLiteral') return key.value
  return undefined
}

/** `SOMETHING_PAGE_LOGOS['/route']` -> '/route'. */
function pageMapRoute(expression) {
  if (!expression || expression.type !== 'MemberExpression' || !expression.computed) return undefined

  const object = expression.object
  const mapName = object && object.type === 'Identifier' ? object.name : ''
  const argument = expression.property
  if (
    !/^(?:[A-Z][A-Z0-9_]*_PAGE_LOGOS|PAGE_LOGOS)$/.test(mapName) ||
    !argument || argument.type !== 'StringLiteral'
  ) {
    return undefined
  }

  return argument.value
}

function routeForPageFile(filePath) {
  const appRelativePath = relative(join(projectRoot, 'app'), filePath)
  const segments = appRelativePath.split(/[\\/]/)
  if (segments.at(-1) !== 'page.tsx') return undefined

  const routeSegments = segments
    .slice(0, -1)
    .filter((segment) => !(segment.startsWith('(') && segment.endsWith(')')))
    .filter((segment) => !segment.startsWith('@'))
  return routeSegments.length > 0 ? `/${routeSegments.join('/')}` : '/'
}

/** JSX tag name as written, e.g. 'PageHeader'. */
function jsxTagName(node) {
  const name = node.name
  if (!name) return ''
  if (name.type === 'JSXIdentifier') return name.name
  return ''
}

for (const filePath of projectSourceFiles) {
  if (resolve(filePath) === resolve(registryPath)) continue

  const fileSource = readFileSync(filePath, 'utf8')
  const isTsx = ['.tsx', '.jsx'].includes(extname(filePath))
  let ast
  try {
    ast = parse(fileSource, {
      sourceType: 'module',
      // 'jsx' only for .tsx: in a .ts file `<T>value` is a type assertion, and
      // enabling jsx there would misparse it.
      plugins: isTsx ? ['typescript', 'jsx'] : ['typescript'],
      errorRecovery: true,
    })
  } catch {
    // A file we cannot parse is not a licence to pass silently, but neither
    // should it fail the whole build for an unrelated syntax feature — report
    // it and move on.
    failures.push(`PARSE    ${relative(projectRoot, filePath)} could not be parsed for SELECTION checks`)
    continue
  }

  traverse(ast, {
    ObjectExpression(path) {
      const properties = path.node.properties.filter((property) => property.type === 'ObjectProperty')
      const hrefProperty = properties.find((property) => propertyName(property) === 'href')
      const logoProperty = properties.find((property) => propertyName(property) === 'logo')

      if (hrefProperty && logoProperty && hrefProperty.value.type === 'StringLiteral') {
        const route = hrefProperty.value.value
        const selectedRoute = pageMapRoute(logoProperty.value)
        if (pageRoutes.has(route) && selectedRoute !== route) {
          const line = logoProperty.loc ? logoProperty.loc.start.line : 0
          failures.push(
            `SELECTION ${relative(projectRoot, filePath)}:${line} must use a page-map lookup for ${route}`,
          )
        }
      }
    },

    JSXOpeningElement(path) {
      const node = path.node
      if (jsxTagName(node) !== 'PageHeader') return

      const logoAttribute = node.attributes.find(
        (attribute) => attribute.type === 'JSXAttribute' && attribute.name && attribute.name.name === 'logo',
      )
      const expression = logoAttribute
        && logoAttribute.value
        && logoAttribute.value.type === 'JSXExpressionContainer'
        ? logoAttribute.value.expression
        : undefined
      const expectedRoute = routeForPageFile(filePath)
      const selectedRoute = expression ? pageMapRoute(expression) : undefined
      const line = logoAttribute && logoAttribute.loc ? logoAttribute.loc.start.line : 0

      // A direct LOGOS.x value bypasses the route registry entirely.
      const isDirectLogos = expression
        && expression.type === 'MemberExpression'
        && !expression.computed
        && expression.object.type === 'Identifier'
        && expression.object.name === 'LOGOS'

      if (logoAttribute && isDirectLogos) {
        failures.push(
          `SELECTION ${relative(projectRoot, filePath)}:${line} gives PageHeader a direct LOGOS value`,
        )
      } else if (logoAttribute && expectedRoute && selectedRoute !== expectedRoute) {
        failures.push(
          `SELECTION ${relative(projectRoot, filePath)}:${line} PageHeader must use its ${expectedRoute} page-map entry`,
        )
      }
    },
  })
}

for (const url of urls) {
  const result = inspectExactPath(url)
  if (result.status === 'missing') {
    failures.push(`MISSING  ${url}`)
  } else if (result.status === 'case') {
    failures.push(`CASE     ${url} (disk uses ${result.actual}, registry uses ${result.expected})`)
  }
}

if (failures.length > 0) {
  console.error(`Image registry validation failed (${failures.length} problem${failures.length === 1 ? '' : 's'}):`)
  for (const failure of failures) console.error(`  ${failure}`)
  console.error(`\nAdd the file under public/ or correct its path in ${registryPath}.`)
  process.exit(1)
}

console.log(
  `Image registry OK: ${urls.length} local assets and ${pageRoutes.size} page routes ` +
  `across ${pageSections.length} sections.`,
)

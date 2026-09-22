#!/usr/bin/env node
/**
 * Build public/THIRD-PARTY-NOTICES.txt — the licence texts that must travel
 * with the static export (MIT/ISC "include this notice", Apache-2.0 §4 "give a
 * copy of the License", OFL 1.1 §2, LGPL-3.0 §4).
 *
 * Sources, in order:
 *   1. Hand-listed material npm cannot see: shadcn/ui-derived components, the
 *      vendored lottie-web player, the glow-border CSS technique, the two OFL
 *      font families, and Tailwind CSS (a devDependency whose output is the
 *      served stylesheet).
 *   2. The production dependency closure — package.json `dependencies`
 *      followed through each package's dependencies, optionalDependencies and
 *      peerDependencies, skipping packages that are not installed here. The
 *      committed file therefore describes the linux-x64 install.
 *
 * Licence texts that are identical once whitespace is normalised are printed
 * once and referenced afterwards (the Apache-2.0 text alone is 11 KB). Holder
 * lines are part of the hashed text, so different holders never collapse.
 *
 *   npm run notices          # rewrite the file
 *   npm run notices -- --check   # exit 1 if the committed file is stale
 *
 * tests/attribution.test.ts runs the --check equivalent, so a dependency bump
 * that changes the closure fails `npm test` until this is rerun and committed.
 */
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const OUTPUT = path.join(ROOT, 'public', 'THIRD-PARTY-NOTICES.txt')

const RULE = '='.repeat(78)
const THIN = '-'.repeat(78)

function readIfExists(p) {
  try { return fs.readFileSync(p, 'utf8') } catch { return null }
}

function licenseFileIn(dir) {
  const name = fs.readdirSync(dir).find((f) => /^(licen[cs]e|copying)(\.|$)/i.test(f))
  return name ? readIfExists(path.join(dir, name)) : null
}

function repoUrl(pkg) {
  const r = pkg.repository
  const raw = typeof r === 'string' ? r : r?.url
  if (!raw) return pkg.homepage || ''
  const url = raw.replace(/^git\+/, '').replace(/\.git$/, '').replace(/^git:\/\//, 'https://')
    .replace(/^git@github\.com:/, 'https://github.com/')
  // npm shorthand "owner/repo" means GitHub
  return /^[\w.-]+\/[\w.-]+$/.test(url) ? `https://github.com/${url}` : url
}

function authorOf(pkg) {
  const a = pkg.author
  if (!a) return ''
  return typeof a === 'string' ? a : [a.name, a.email && `<${a.email}>`].filter(Boolean).join(' ')
}

function licenseOf(pkg) {
  if (typeof pkg.license === 'string') return pkg.license
  if (pkg.license?.type) return pkg.license.type
  if (Array.isArray(pkg.licenses)) return pkg.licenses.map((l) => l.type || l).join(' OR ')
  return 'UNKNOWN'
}

/** Resolve `name` the way Node does: nearest node_modules walking up from `from`. */
function resolvePackageDir(name, from) {
  let dir = from
  for (;;) {
    const candidate = path.join(dir, 'node_modules', name)
    if (fs.existsSync(path.join(candidate, 'package.json'))) return candidate
    const up = path.dirname(dir)
    if (up === dir) return null
    dir = up
  }
}

export function productionClosure(root = ROOT) {
  const rootPkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
  const seen = new Map()
  const visit = (name, from) => {
    const dir = resolvePackageDir(name, from)
    if (!dir) return // optional platform package not installed here
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'))
    const key = `${pkg.name}@${pkg.version}`
    if (seen.has(key)) return
    seen.set(key, {
      name: pkg.name,
      version: pkg.version,
      license: licenseOf(pkg),
      author: authorOf(pkg),
      url: repoUrl(pkg),
      text: licenseFileIn(dir),
    })
    for (const dep of Object.keys(pkg.dependencies || {})) visit(dep, dir)
    for (const dep of Object.keys(pkg.optionalDependencies || {})) visit(dep, dir)
    // npm installs peers into the production tree; uninstalled optional peers resolve to null
    for (const dep of Object.keys(pkg.peerDependencies || {})) visit(dep, dir)
  }
  for (const dep of Object.keys(rootPkg.dependencies || {})) visit(dep, root)
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name))
}

const MIT = (holder) => `MIT License

Copyright (c) ${holder}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`

/** Material outside node_modules. Texts are read from the files that ship. */
function handListed(root) {
  const pub = (rel) => readIfExists(path.join(root, 'public', rel))
  return [
    {
      name: 'shadcn/ui (derived components)',
      version: 'legacy forwardRef registry, 2023–2024',
      license: 'MIT',
      author: 'shadcn',
      url: 'https://github.com/shadcn-ui/ui',
      where: 'components/ui/button.tsx, components/ui/card.tsx, components/ui/dropdown-menu.tsx, lib/data/utils.ts (cn helper)',
      text: MIT('2023 shadcn'),
    },
    {
      name: 'lottie-web (lottie_light player)',
      version: '5.12.2',
      license: 'MIT',
      author: 'Bodymovin (Hernan Torrisi); repository hosted by Airbnb',
      url: 'https://github.com/airbnb/lottie-web',
      where: 'public/vendor/lottie_light.min.js (served at /vendor/lottie_light.min.js); licence also at /vendor/lottie_light.LICENSE.txt',
      text: pub('vendor/lottie_light.LICENSE.txt'),
    },
    {
      name: 'Glow-border spotlight CSS technique',
      version: 'n/a',
      license: 'MIT (CodePen public-pen licence)',
      author: 'Jhey Tompkins',
      url: 'https://codepen.io/jh3y/pen/WNmQXyE',
      where: 'components/ui/spotlight-card.tsx (SPOTLIGHT_STYLES block), app/globals.css ([data-glow-card] block)',
      text: MIT('Jhey Tompkins (https://codepen.io/jh3y/pen/WNmQXyE)'),
    },
    {
      name: 'Tailwind CSS (generated stylesheet)',
      version: JSON.parse(fs.readFileSync(path.join(root, 'node_modules', 'tailwindcss', 'package.json'), 'utf8')).version,
      license: 'MIT',
      author: 'Tailwind Labs, Inc.',
      url: 'https://github.com/tailwindlabs/tailwindcss',
      where: 'devDependency; its preflight and utility CSS are compiled into the served /_next/static stylesheet',
      text: readIfExists(path.join(root, 'node_modules', 'tailwindcss', 'LICENSE')),
    },
    {
      name: 'Inter (font)',
      version: 'variable, latin + latin-ext subsets',
      license: 'OFL-1.1',
      author: 'The Inter Project Authors',
      url: 'https://github.com/rsms/inter',
      where: 'public/fonts/inter-latin.woff2, inter-latin-ext.woff2; licence at /fonts/Inter-OFL.txt',
      text: pub('fonts/Inter-OFL.txt'),
    },
    {
      name: 'JetBrains Mono (font)',
      version: 'variable, latin + latin-ext subsets',
      license: 'OFL-1.1',
      author: 'The JetBrains Mono Project Authors',
      url: 'https://github.com/JetBrains/JetBrainsMono',
      where: 'public/fonts/jetbrains-mono-latin.woff2, jetbrains-mono-latin-ext.woff2; licence at /fonts/JetBrainsMono-OFL.txt',
      text: pub('fonts/JetBrainsMono-OFL.txt'),
    },
  ]
}

const LGPL_NOTE = `The prebuilt libvips shared library in @img/sharp-libvips-linux-x64 (a build-time
optional dependency of Next.js via sharp; it is NOT part of the static site
served to browsers, but it IS inside the node_modules directory shipped in the
air-gap bundle) is licensed LGPL-3.0-or-later and bundles fribidi, glib,
libexif, libheif, librsvg, pango and proxy-libintl under LGPLv3. Complete
corresponding source for that library is published at
https://github.com/lovell/sharp-libvips (tag v<version>), which also carries
the licence text of every bundled component. Recipients of an air-gap bundle
who cannot reach that repository may request the source from the FCC CESC
Helpdesk (cesc@army.mil). The package's own table of bundled components and
their licences follows, then the full LGPL-3.0 text and the GPL-3.0 text it
incorporates.`

export function generate(root = ROOT) {
  const out = []
  const push = (...lines) => out.push(...lines)
  const seenTexts = new Map() // sha256 -> first entry label
  let counter = 0

  const entry = (e) => {
    counter += 1
    push(RULE, `${counter}. ${e.name} ${e.version ? `— ${e.version}` : ''}`.trim(), RULE)
    push(`License : ${e.license}`)
    if (e.author) push(`Author  : ${e.author}`)
    if (e.url) push(`Source  : ${e.url}`)
    if (e.where) push(`Where   : ${e.where}`)
    push('')
    if (!e.text) {
      push(`(No licence file is shipped inside this package; its package.json declares ${e.license}.`,
           ` The licence text is the standard ${e.license} text reproduced elsewhere in this file.)`, '')
      return
    }
    const text = e.text.replace(/\r\n/g, '\n').trim()
    const hash = createHash('sha256').update(text.replace(/\s+/g, ' ')).digest('hex')
    const first = seenTexts.get(hash)
    if (first) {
      push(`Licence text: identical to the text reproduced under "${first}".`, '')
      return
    }
    seenTexts.set(hash, e.name)
    push(text, '')
  }

  push('THIRD-PARTY NOTICES — APEN Service & Support (apensupport.blcse.mil)',
       '',
       'This file accompanies the site\'s static export and its air-gap bundle. It',
       'reproduces the copyright and licence notices of the third-party software that',
       'is compiled into, vendored with, or distributed alongside the site. The',
       'human-readable inventory of every third-party asset class (including vendor',
       'trademarks and documentation, which are not software) is at /attribution.',
       '',
       'Generated by scripts/build-third-party-notices.mjs — do not edit by hand;',
       'run `npm run notices` after changing dependencies or vendored files.',
       '')

  push(THIN, 'PART A — Vendored and derived material outside node_modules', THIN, '')
  for (const e of handListed(root)) entry(e)

  const closure = productionClosure(root)
  push(THIN, `PART B — Production dependency closure (${closure.length} packages)`, THIN,
       '',
       'Every package reachable from package.json "dependencies" on this platform.',
       'Client-side packages are compiled into the /_next/static bundles; server-side',
       'packages (ldapts, zod, sharp and their dependencies) run only on the host.',
       '')
  const byLicense = {}
  for (const p of closure) byLicense[p.license] = (byLicense[p.license] || 0) + 1
  push('Licence summary: ' + Object.entries(byLicense).sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} ×${v}`).join(', '), '')
  for (const p of closure) entry(p)

  const libvips = closure.find((p) => p.name === '@img/sharp-libvips-linux-x64')
  if (libvips) {
    push(THIN, 'PART C — LGPL-3.0 notice and source offer', THIN, '')
    push(LGPL_NOTE.replace('<version>', libvips.version), '')
    const readme = readIfExists(path.join(resolvePackageDir(libvips.name, root) ?? '', 'README.md'))
    const licensing = readme?.split(/^## Licensing$/m)[1]?.split(/^## /m)[0]
    if (licensing) push(licensing.trim(), '')
    // Checked-in copies so generation does not depend on the build host.
    for (const f of ['LGPL-3.0.txt', 'GPL-3.0.txt']) {
      push(THIN, fs.readFileSync(path.join(root, 'scripts', 'licenses', f), 'utf8').trim(), '')
    }
  }

  return out.join('\n') + '\n'
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (invokedDirectly) {
  const text = generate()
  if (process.argv.includes('--check')) {
    const current = readIfExists(OUTPUT)
    if (current !== text) {
      console.error(`${path.relative(ROOT, OUTPUT)} is stale — run \`npm run notices\` and commit the result.`)
      process.exit(1)
    }
    console.log(`${path.relative(ROOT, OUTPUT)} is current.`)
  } else {
    fs.writeFileSync(OUTPUT, text)
    console.log(`wrote ${path.relative(ROOT, OUTPUT)} (${(text.length / 1024).toFixed(0)} KB)`)
  }
}

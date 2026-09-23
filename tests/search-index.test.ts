/**
 * Search-index floors for the converted tile pages.
 *
 * scripts/build-search-index.mjs reads the EXPORTED HTML and strips tags and
 * attributes, so it only ever sees text that is statically rendered and
 * visible. Two ways a redesign silently deletes a page from site search (and
 * from the AI assistant, which reads the same index):
 *
 *   1. Render the list from a client fetch behind a "Loading…" placeholder.
 *      The Store page did exactly that and indexed 345 characters with ZERO app
 *      names, until it was made static-first.
 *   2. Move item text into title= / aria-label= attributes, which are stripped.
 *
 * These floors sit well below the measured values, so ordinary copy edits do
 * not trip them but a structural regression does.
 *
 * Runs only after a build; skips itself when out/ is absent.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const INDEX = path.join('out', 'search-index.json')
const built = fs.existsSync(INDEX)

interface IndexedLink { href: string; label: string }
interface IndexedPage { route: string; title: string; text: string; links: IndexedLink[] }
const pages: IndexedPage[] = built
  ? (JSON.parse(fs.readFileSync(INDEX, 'utf8')).pages as IndexedPage[])
  : []

function page(route: string): IndexedPage {
  const hit = pages.find((p) => p.route === route)
  assert.ok(hit, `${route} is missing from the search index entirely`)
  return hit
}

/** [route, minimum characters, strings that must stay findable] */
const FLOORS: Array<[string, number, string[]]> = [
  // Static-first fallback list: every package name is in the export before the
  // live catalog answers. Was 345 chars with no app names at all.
  ['/downloads/microsoft-products/store/', 900, ['Clipchamp', 'PowerToys']],
  // Tiles must keep the filename AND the description (codename, edition).
  ['/downloads/iso/linux/ubuntu/', 900, ['ubuntu-22.04-desktop-latest-amd64.iso', 'Jammy Jellyfish']],
  ['/downloads/iso/linux/enterprise/', 600, ['AlmaLinux', 'Rocky']],
  ['/downloads/iso/windows/', 500, ['Windows Server 2025']],
  // The commands are the content; they must be text, not clipboard-only.
  ['/trellix/reference/', 600, ['cmdagent', 'uninstall.sh']],
  // Answers live in a rendered-but-hidden panel, so they index.
  ['/docs/facpro/faq/', 900, ['APEN network credentials']],
  // The tool payloads moved to /downloads/evaluate-stig; this page is the three
  // documents now, so it is smaller ON PURPOSE — the floor moved with it.
  ['/docs/evaluate-stig/documents/', 400, ['User Guide', 'ChangeLog']],
  ['/downloads/evaluate-stig/', 400, ['STIG Viewer', 'STIG Library']],
]

test('converted pages still carry their content into the search index', { skip: !built && 'no out/ — run npm run build first' }, () => {
  const failures: string[] = []
  for (const [route, floor, needles] of FLOORS) {
    const { text } = page(route)
    if (text.length < floor) failures.push(`${route}: ${text.length} chars < ${floor} floor`)
    for (const needle of needles) {
      if (!text.includes(needle)) failures.push(`${route}: "${needle}" is no longer indexed`)
    }
  }
  assert.deepEqual(failures, [], `search-index regressions:\n${failures.join('\n')}`)
})

test('no page silently dropped out of the index', { skip: !built && 'no out/ — run npm run build first' }, () => {
  // 88 since code-quality #68 (2026-09-22) turned the 31 redirect stub pages
  // into nginx 301s; it was 108+ before that. A drop means a route stopped
  // exporting; a rise is fine. NOTE: out/ is the PREVIOUS deploy's export, so
  // a deliberate route removal trips this on the deploy after it — lower the
  // floor in the same commit as the removal.
  assert.ok(pages.length >= 80, `only ${pages.length} pages indexed, expected at least 80`)
})

test('download filenames reach the exported HTML, not just the client', { skip: !built && 'no out/ — run npm run build first' }, () => {
  // The old expanding cards rendered {isOpen && <DownloadRow/>}, so NO download
  // href existed in the export: a visitor without JS could reach zero files and
  // the index never saw a filename. Tiles must not regress to that.
  const cases: Array<[string, RegExp, number]> = [
    ['out/downloads/iso/linux/ubuntu/index.html', /href="[^"]*\.iso"/g, 6],
    ['out/downloads/iso/linux/enterprise/index.html', /href="[^"]*\.iso"/g, 5],
    ['out/downloads/iso/windows/index.html', /href="[^"]*\.iso"/g, 3],
    ['out/docs/evaluate-stig/documents/index.html', /href="[^"]*\.pdf"/g, 3],
    ['out/downloads/evaluate-stig/index.html', /href="[^"]*\.(msi|zip|gz)"/g, 6],
  ]
  for (const [file, pattern, expected] of cases) {
    const found = new Set(fs.readFileSync(file, 'utf8').match(pattern) ?? [])
    assert.ok(
      found.size >= expected,
      `${file}: ${found.size} distinct download links in the static HTML, expected >= ${expected}`,
    )
  }
})

test('link-card destinations survive tag stripping', { skip: !built && 'no out/ — run npm run build first' }, () => {
  // The index strips HTML, so a card that is nothing but a link (the home
  // page's Operational Services and Service Portals rows) used to index as
  // label text with no URL. The AI assistant reads this same index: it could
  // see "APEN Voltron" existed and had no destination for it, so it answered
  // "Where is Voltron?" with an invented /applications/ path. These are the
  // services that appear NOWHERE else — not in the page map, not in the body
  // text — so losing their href silently reintroduces that hallucination.
  const home = page('/home/')
  const hrefs = new Set((home.links ?? []).map((l) => l.href))
  for (const required of [
    'https://voltron.apen.mil/',
    'https://acas.blcse.mil/',
    'https://apenosticket.blcse.mil/',
  ]) {
    assert.ok(hrefs.has(required), `/home/ no longer records ${required} in its link list`)
  }
  // Routes that ARE indexed pages stay out — they are already in the page map,
  // and duplicating all of them would bloat the index the /search page fetches.
  assert.ok(!hrefs.has('/support/'), '/home/ link list should not repeat indexed page routes')
})

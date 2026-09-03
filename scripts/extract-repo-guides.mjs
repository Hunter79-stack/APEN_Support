/**
 * One-off extractor: parse the legacy static repo guides at /var/www/html/repos
 * into a structured JSON file the new site renders natively.
 *
 *   node scripts/extract-repo-guides.mjs
 *
 * Output: lib/data/repo-guides.json  { deb: {groups}, rpm: {groups} }
 * Each guide = { id, label, title, sections: [{ heading, items: [{type:'text'|'code', ...}] }] }
 * The boilerplate intro (apt/yum + CA-trust note) is standardized in the
 * renderer, not stored per-guide.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'

const OLD = process.env.OLD_REPOS_ROOT || '/var/www/html/repos'
const OUT = resolve(import.meta.dirname, '..', 'lib', 'data', 'repo-guides.json')

// Repoint legacy command URLs from the old host (being retired) to the new host.
// The new server serves /repos/* files via nginx aliases (see nginx/server.conf).
const NEW_HOST = process.env.REPO_HOST || 'https://apensupport.blcse.mil'
const repointHost = (s) => s.replace(/https?:\/\/apensupport\.blcse\.mil/gi, NEW_HOST)

const decode = (s) => s
  .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'")
const stripTags = (s) => s.replace(/<[^>]+>/g, '')
const clean = (s) => decode(stripTags(s)).replace(/\s+/g, ' ').trim()

/** Parse an index sidebar into ordered groups of {label, file}. */
function parseSidebar(html) {
  const aside = /<aside[\s\S]*?<\/aside>/i.exec(html)
  const scope = aside ? aside[0] : html
  const groups = []
  let current = null
  const liRe = /<li>([\s\S]*?)<\/li>/gi
  let m
  while ((m = liRe.exec(scope))) {
    const li = m[1]
    if (/<h6/i.test(li)) { current = { name: clean(li), items: [] }; groups.push(current); continue }
    const link = /data-page="guides\/([^"]+)"[^>]*>([\s\S]*?)<\/a>/i.exec(li)
    if (link) {
      if (!current) { current = { name: 'Guides', items: [] }; groups.push(current) }
      current.items.push({ file: link[1], label: clean(link[2]) })
    }
  }
  return groups
}

/** Parse one guide file into { title, sections }. */
function parseGuide(html) {
  const title = clean((/<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html) || [, 'Repository Guide'])[1])
  // Work on the body after the header block.
  const afterHeader = html.split(/<\/header>/i)[1] ?? html
  // Split into [preamble, h2heading, sectionbody, h2heading, sectionbody, ...]
  const parts = afterHeader.split(/<h2[^>]*>([\s\S]*?)<\/h2>/i)
  const sections = []
  // parts[0] = preamble (intro h5) — skipped. Then pairs of (heading, body).
  for (let i = 1; i < parts.length; i += 2) {
    const heading = clean(parts[i])
    const body = parts[i + 1] || ''
    const items = []
    const pRe = /<p\b[^>]*>([\s\S]*?)<\/p>/gi
    let pm
    while ((pm = pRe.exec(body))) {
      const inner = pm[1]
      const codes = [...inner.matchAll(/<code class="copyable">([\s\S]*?)<\/code>/gi)]
      if (codes.length) {
        for (const c of codes) {
          const code = repointHost(decode(stripTags(c[1])).replace(/\s+/g, ' ').trim())
          if (code) items.push({ type: 'code', code })
        }
      } else {
        const text = clean(inner)
        if (text) items.push({ type: 'text', text })
      }
    }
    if (heading || items.length) sections.push({ heading, items })
  }
  return { title, sections }
}

function build(kind) {
  const indexPath = join(OLD, kind, 'index.html')
  const guidesDir = join(OLD, kind, 'guides')
  const sidebar = existsSync(indexPath) ? parseSidebar(readFileSync(indexPath, 'utf8')) : []
  const usedFiles = new Set()
  const groups = []
  for (const g of sidebar) {
    const guides = []
    for (const it of g.items) {
      const full = join(guidesDir, it.file)
      if (!existsSync(full)) continue
      usedFiles.add(it.file)
      const parsed = parseGuide(readFileSync(full, 'utf8'))
      guides.push({ id: it.file.replace(/\.html$/, ''), label: it.label, title: parsed.title, sections: parsed.sections })
    }
    if (guides.length) groups.push({ name: g.name, guides })
  }
  // Pick up any guide files not referenced in the sidebar (e.g. ELevate guides).
  const extras = []
  if (existsSync(guidesDir)) {
    for (const f of readdirSync(guidesDir)) {
      if (!f.endsWith('.html') || usedFiles.has(f) || /^1-template/.test(f)) continue
      const parsed = parseGuide(readFileSync(join(guidesDir, f), 'utf8'))
      extras.push({ id: f.replace(/\.html$/, ''), label: parsed.title, title: parsed.title, sections: parsed.sections })
    }
  }
  if (extras.length) groups.push({ name: 'Additional Guides', guides: extras })
  return { groups }
}

const out = { deb: build('deb'), rpm: build('rpm') }
writeFileSync(OUT, JSON.stringify(out, null, 2), 'utf8')

const count = (s) => s.groups.reduce((n, g) => n + g.guides.length, 0)
console.log(`deb: ${out.deb.groups.length} groups, ${count(out.deb)} guides`)
console.log(`rpm: ${out.rpm.groups.length} groups, ${count(out.rpm)} guides`)
console.log(`written -> ${OUT}`)

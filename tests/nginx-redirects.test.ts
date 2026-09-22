/**
 * The $apen_moved map in nginx/server.conf answers the old page URLs with a
 * 301 (code-quality #68). Every destination must still be a real page, and
 * every entry must come in both forms (with and without the trailing slash,
 * since the export uses trailingSlash: true).
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

test('every nginx redirect points at an existing page, in both slash forms', () => {
  const conf = fs.readFileSync(path.join(process.cwd(), 'nginx', 'server.conf'), 'utf8')
  const body = conf.match(/map \$uri \$apen_moved \{([\s\S]*?)\n\}/)?.[1]
  assert.ok(body, 'map $uri $apen_moved is missing')
  const entries = [...body.matchAll(/^\s+(\/\S+)\s+(\/\S+);/gm)].map((m) => [m[1], m[2]])
  assert.ok(entries.length >= 60, `expected 31 redirects × 2 forms, found ${entries.length}`)
  const sources = new Set(entries.map(([src]) => src))
  for (const [src, dst] of entries) {
    assert.ok(fs.existsSync(path.join(process.cwd(), 'app', dst, 'page.tsx')), `${src} -> ${dst} but app${dst}/page.tsx does not exist`)
    assert.ok(!fs.existsSync(path.join(process.cwd(), 'app', src, 'page.tsx')), `${src} is redirected by nginx but still has a page`)
    const twin = src.endsWith('/') ? src.slice(0, -1) : `${src}/`
    assert.ok(sources.has(twin), `${src} needs its ${twin} twin`)
  }
})

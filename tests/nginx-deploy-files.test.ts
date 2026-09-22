/**
 * nginx/DEPLOY-FILES is the one list of nginx files the deploy scripts copy.
 * Every file server.conf or an .inc includes from the apen_support namespace
 * must be on it (or be one of the host-authored / generated exceptions), and
 * everything on it must exist, or `nginx -t` fails on the next deploy.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const NGINX = path.join(process.cwd(), 'nginx')
// Written on the host, not deployed from nginx/.
const HOST_AUTHORED = new Set(['admin-token.inc'])

test('nginx/DEPLOY-FILES covers every literal include and names only real files', () => {
  const listed = fs.readFileSync(path.join(NGINX, 'DEPLOY-FILES'), 'utf8')
    .split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
  assert.ok(listed.includes('server.conf'))
  for (const f of listed) assert.ok(fs.existsSync(path.join(NGINX, f)), `DEPLOY-FILES names ${f} but nginx/${f} does not exist`)

  const sources = [...listed, ...fs.readdirSync(NGINX).filter((f) => f.endsWith('.inc'))]
  const included = new Set<string>()
  for (const f of new Set(sources)) {
    const text = fs.readFileSync(path.join(NGINX, f), 'utf8')
    for (const m of text.matchAll(/^\s*include\s+\/etc\/nginx\/conf\.d\/apen_support\/([^\s;]+)\s*;/gm)) included.add(m[1])
  }
  for (const f of included) {
    if (f.includes('*') || HOST_AUTHORED.has(f)) continue
    assert.ok(listed.includes(f), `server.conf/.inc includes ${f} but nginx/DEPLOY-FILES does not list it`)
  }
})

/**
 * proxy/site-stats.mjs over real HTTP. The module is imported against a
 * scratch state directory (SITE_STATS_STATE_DIR) with autostart off, then
 * started on an ephemeral port with node probes disabled — so nothing here
 * touches the live proxy/ state or any real host.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { after, before, test } from 'node:test'

const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'site-stats-'))
const TOKEN = 'test-admin-token-0123456789abcdef'
let base = ''
let server: import('node:http').Server

before(async () => {
  // A corrupt store present BEFORE import: must be quarantined, not overwritten.
  fs.writeFileSync(path.join(stateDir, 'chat-history.json'), '{"half":')
  process.env.SITE_STATS_STATE_DIR = stateDir
  process.env.SITE_STATS_NO_AUTOSTART = '1'
  process.env.ADMIN_API_TOKEN = TOKEN
  delete process.env.ADMIN_AUTH_DISABLED
  // A download library rooted in a temp dir, plus one admin override pointing
  // at a file in it, for the rename round-trip below.
  const libraryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'site-stats-library-'))
  fs.mkdirSync(path.join(libraryRoot, 'renames'))
  fs.writeFileSync(path.join(libraryRoot, 'renames', 'old.zip'), 'zip')
  fs.writeFileSync(
    path.join(stateDir, 'library-dirs.json'),
    JSON.stringify({ dirs: [{ key: 'renames', family: 'Other', label: 'Renames', hint: '', dir: 'renames', extensions: ['zip'] }] }),
  )
  fs.writeFileSync(path.join(stateDir, 'content-overrides.json'), JSON.stringify({ 'docs/x/cards': { card: { href: '/renames/old.zip' } } }))
  process.env.DOWNLOAD_LIBRARY_ROOT = libraryRoot
  process.env.DOWNLOAD_LIBRARY_REGISTRY = path.join(stateDir, 'library-dirs.json')
  const mod = await import('../proxy/site-stats.mjs')
  server = mod.start({ port: 0, host: '127.0.0.1', probes: false })
  await new Promise<void>((resolve) => server.once('listening', () => resolve()))
  const addr = server.address()
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`
})

after(() => {
  server?.close()
  fs.rmSync(stateDir, { recursive: true, force: true })
  if (process.env.DOWNLOAD_LIBRARY_ROOT) fs.rmSync(process.env.DOWNLOAD_LIBRARY_ROOT, { recursive: true, force: true })
})

const host = () => new URL(base).host
const post = (url: string, body: unknown, headers: Record<string, string> = {}) =>
  fetch(base + url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) })

test('a corrupt state file is moved aside at startup and reported as a critical alert', () => {
  assert.equal(fs.existsSync(path.join(stateDir, 'chat-history.json')), false, 'bad file moved out of the way')
  const aside = fs.readdirSync(stateDir).filter((f) => f.startsWith('chat-history.json.corrupt-'))
  assert.equal(aside.length, 1)
  assert.equal(fs.readFileSync(path.join(stateDir, aside[0]), 'utf8'), '{"half":', 'original bytes preserved')
  const alerts = JSON.parse(fs.readFileSync(path.join(stateDir, 'feedback-history.json'), 'utf8'))
  assert.equal(alerts[0].title, 'State file failed to load')
  assert.equal(alerts[0].type, 'critical')
})

test('public feedback posts need a matching Origin or Referer', async () => {
  assert.equal((await post('/api/site-feedback', { category: 'Idea', message: 'x' })).status, 403, 'no header')
  assert.equal((await post('/api/site-feedback', { category: 'Idea', message: 'x' }, { Origin: 'https://evil.test' })).status, 403, 'foreign Origin')
  // A matching Referer cannot rescue a wrong Origin.
  assert.equal((await post('/api/site-feedback', { category: 'Idea', message: 'x' }, { Origin: 'https://evil.test', Referer: `${base}/home` })).status, 403)
  const ok = await post('/api/site-feedback', { category: 'Idea', name: 'José 강동윤', message: 'stored?' }, { Origin: base })
  assert.equal(ok.status, 200)
  const stored = JSON.parse(fs.readFileSync(path.join(stateDir, 'feedback-history.json'), 'utf8'))
  assert.equal(stored[0].title, 'Idea: José 강동윤', 'multi-byte name stored intact, newest first')
  assert.equal(fs.statSync(path.join(stateDir, 'feedback-history.json')).mode & 0o777, 0o600)
})

test('an oversized feedback body is refused and nothing is stored', async () => {
  const before = fs.readFileSync(path.join(stateDir, 'feedback-history.json'), 'utf8')
  const res = await post('/api/site-feedback', { category: 'Idea', message: 'a'.repeat(70_000) }, { Origin: base }).catch(() => null)
  assert.ok(res === null || res.status !== 200, 'connection closed or non-200')
  assert.equal(fs.readFileSync(path.join(stateDir, 'feedback-history.json'), 'utf8'), before)
})

test('admin routes answer 401 without the right token and 200 with it', async () => {
  const get = (h: Record<string, string> = {}) => fetch(`${base}/api/admin/auth-events`, { headers: h })
  assert.equal((await get()).status, 401)
  assert.equal((await get({ 'x-admin-token': 'nope' })).status, 401)
  assert.equal((await get({ 'x-admin-token': TOKEN })).status, 200)
  assert.equal((await post('/api/admin/content-overrides', {})).status, 401, 'writes are gated too')
})

test('notification settings never claim delivery works (no mail transport exists)', async () => {
  const res = await fetch(`${base}/api/notification-settings`)
  assert.equal(res.status, 200)
  assert.equal((await res.json()).deliveryConfigured, false)
  assert.ok(host())
})

test('acknowledged alerts refuse barred workstations, accept both body shapes, and persist to disk', async () => {
  // nginx gates this route with admin-acl.inc; the proxy adds its own refusal
  // for the barred workstations in blocked-hosts.inc, whatever nginx says.
  const barred = /^deny\s+([\d.]+);/m.exec(fs.readFileSync(path.join('nginx', 'blocked-hosts.inc'), 'utf8'))?.[1]
  assert.ok(barred, 'blocked-hosts.inc must list at least one barred workstation')
  assert.equal((await fetch(`${base}/api/acknowledged-alerts`, { headers: { 'x-real-ip': barred } })).status, 403)
  const admin = { 'x-admin-token': TOKEN }
  const one = await post('/api/acknowledged-alerts', { alertId: 'ev-1' }, admin)
  assert.equal(one.status, 200)
  assert.deepEqual((await one.json()).alertIds, ['ev-1'])
  const more = await post('/api/acknowledged-alerts', ['ev-2', 'ev-1'], admin)
  assert.deepEqual([...(await more.json()).alertIds].sort(), ['ev-1', 'ev-2'])
  const listed = await (await fetch(`${base}/api/acknowledged-alerts`, { headers: admin })).json()
  assert.deepEqual([...listed.alertIds].sort(), ['ev-1', 'ev-2'])
  const onDisk = JSON.parse(fs.readFileSync(path.join(stateDir, 'acknowledged-alerts.json'), 'utf8'))
  const ids: string[] = Array.isArray(onDisk) ? onDisk : onDisk.alertIds
  assert.deepEqual([...ids].sort(), ['ev-1', 'ev-2'])
})

test('renaming a library file moves it on disk, rewrites overrides, and rejects unsafe names', async () => {
  const admin = { 'x-admin-token': TOKEN }
  const root = process.env.DOWNLOAD_LIBRARY_ROOT as string
  assert.equal((await post('/api/admin/file-rename', { dir: 'renames', from: 'old.zip', to: 'bad name.zip' }, admin)).status, 400)
  assert.equal((await post('/api/admin/file-rename', { dir: 'renames', from: 'old.zip', to: 'old.exe' }, admin)).status, 400)
  assert.equal((await post('/api/admin/file-rename', { dir: 'renames', from: 'nope.zip', to: 'x.zip' }, admin)).status, 404)
  const ok = await post('/api/admin/file-rename', { dir: 'renames', from: 'old.zip', to: 'new.zip' }, admin)
  assert.equal(ok.status, 200)
  const body = await ok.json()
  assert.equal(body.url, '/renames/new.zip')
  assert.equal(body.updatedOverrides, 1)
  assert.ok(fs.existsSync(path.join(root, 'renames', 'new.zip')))
  assert.ok(!fs.existsSync(path.join(root, 'renames', 'old.zip')))
  const overrides = fs.readFileSync(path.join(stateDir, 'content-overrides.json'), 'utf8')
  assert.ok(overrides.includes('/renames/new.zip') && !overrides.includes('/renames/old.zip'), 'overrides must follow the rename')
})

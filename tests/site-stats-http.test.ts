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
  const mod = await import('../proxy/site-stats.mjs')
  server = mod.start({ port: 0, host: '127.0.0.1', probes: false })
  await new Promise<void>((resolve) => server.once('listening', () => resolve()))
  const addr = server.address()
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`
})

after(() => {
  server?.close()
  fs.rmSync(stateDir, { recursive: true, force: true })
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

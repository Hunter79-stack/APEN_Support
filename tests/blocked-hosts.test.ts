import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseBlockedHosts, normalizeClientIp } from '../proxy/blocked-hosts.mjs'

test('parseBlockedHosts keeps deny lines with attribution, ignores allow/comments', () => {
  const m = parseBlockedHosts([
    '# comment',
    'allow 10.0.0.1; # OK (someone.ou)',
    'deny 140.32.70.46; # CESCDREN15 (SAnderson.ou) B4:E9:B8:45:2F:DE',
    '  deny 140.32.70.43 ;',
    'deny all;',
  ].join('\n'))
  assert.equal(m.size, 2)
  assert.deepEqual(m.get('140.32.70.46'), { workstation: 'CESCDREN15', user: 'SAnderson.ou' })
  assert.deepEqual(m.get('140.32.70.43'), { workstation: '', user: '' })
  assert.equal(m.has('10.0.0.1'), false)
})

test('shipped nginx/blocked-hosts.inc parses to the barred workstations', () => {
  const m = parseBlockedHosts(readFileSync(resolve(process.cwd(), 'nginx/blocked-hosts.inc'), 'utf8'))
  assert.deepEqual([...m.keys()].sort(), ['140.32.70.38', '140.32.70.43', '140.32.70.46'])
  assert.equal(m.get('140.32.70.46')?.user, 'SAnderson.ou')
  assert.equal(m.get('140.32.70.38')?.user, 'jbridges.ou')
  assert.equal(m.get('140.32.70.43')?.user, 'rshoop.ou')
})

test('normalizeClientIp prefers x-real-ip and strips the v4-mapped prefix', () => {
  assert.equal(normalizeClientIp({ headers: { 'x-real-ip': ' 140.32.70.46 ' }, socket: { remoteAddress: '127.0.0.1' } }), '140.32.70.46')
  assert.equal(normalizeClientIp({ headers: {}, socket: { remoteAddress: '::ffff:140.32.70.38' } }), '140.32.70.38')
  assert.equal(normalizeClientIp({ headers: {} }), '')
})

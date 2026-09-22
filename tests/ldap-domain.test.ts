/**
 * proxy/ldap-domain.mjs — the domain parser that replaced the login form's
 * Realm dropdown, and the spoof classification behind /admin#security.
 *
 * The rules under test, in order of how much they'd hurt if they broke:
 *   - EXACTLY four spellings are accepted per configured domain pair;
 *     everything else is refused without contacting a DC.
 *   - "blcse\rshoop.ou@blcse.mil" — a domain-qualified name with a UPN
 *     suffix glued on — is refused AND classified as a spoof attempt.
 *   - A refusal never costs the named account a failed-logon count, and one
 *     sign-in is one bind.
 *   - The group-membership search is scoped to the account's own domain, so a
 *     same-named account in a sibling domain can't confer admin.
 */

import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  acceptedLoginForms,
  allowedDomains,
  bindEndpoints,
  dnFromDomain,
  domainForLabel,
  domainFromDn,
  globalCatalogEndpoints,
  isDomainName,
  netbiosFor,
  realmDefaultDomain,
  resolveLoginIdentity,
} from '../proxy/ldap-domain.mjs'

/** Shaped like a parsed LDAP_REALMS entry; addresses are synthetic. */
const realm = {
  id: 'blcse-primary',
  label: 'BLCSE',
  urls: [
    { url: 'ldaps://10.0.0.5:636', servername: 'dc1.blcse.mil' },
    { url: 'ldaps://10.0.0.6:636', servername: 'dc2.blcse.mil' },
  ],
  bindUserDnTemplate: '{username}@blcse.mil',
  baseDn: 'DC=blcse,DC=mil',
  adminGroupDn: 'CN=CESC Admins,OU=Groups,DC=blcse,DC=mil',
  allowedDomains: ['blcse.mil', 'mbl.blcse.mil'],
}

/**
 * resolveLoginIdentity lives in a .mjs module, so TypeScript infers one wide
 * object type rather than a discriminated union — `ok` comes back as boolean,
 * not a literal, and the success-only fields can't be narrowed by checking it.
 * This alias keeps the assertions readable without weakening them.
 */
type Resolved = {
  ok: boolean
  sam?: string
  domain?: string
  netbios?: string
  bindName?: string
  isDefaultDomain?: boolean
  searchBase?: string
  upn?: string
  reason?: string
  severity?: string
  detail?: string
}

const resolve = (typed: string, r: unknown = realm): Resolved =>
  resolveLoginIdentity(typed, r) as Resolved

test('exactly the four accepted spellings resolve, and nothing else does', () => {
  assert.deepEqual(acceptedLoginForms(realm), [
    'BLCSE.MIL\\<UserAccount>',
    'BLCSE\\<UserAccount>',
    'MBL.BLCSE.MIL\\<UserAccount>',
    'MBL\\<UserAccount>',
  ])

  // Parent domain, both spellings → the realm's production bind template.
  for (const typed of ['BLCSE.MIL\\testuser', 'BLCSE\\testuser', 'blcse\\testuser']) {
    const id = resolve(typed, realm)
    assert.equal(id.ok, true, `${typed} should resolve`)
    assert.equal(id.domain, 'blcse.mil')
    assert.equal(id.bindName, 'testuser@blcse.mil')
    assert.equal(id.searchBase, 'DC=blcse,DC=mil')
  }

  // Child domain, both spellings → NT-style bind, scoped to its own subtree.
  for (const typed of ['MBL.BLCSE.MIL\\testuser', 'MBL\\testuser']) {
    const id = resolve(typed, realm)
    assert.equal(id.ok, true, `${typed} should resolve`)
    assert.equal(id.domain, 'mbl.blcse.mil')
    assert.equal(id.bindName, 'MBL\\testuser')
    assert.equal(id.searchBase, 'DC=mbl,DC=blcse,DC=mil')
    assert.equal(id.isDefaultDomain, false)
  }
})

test('a domain-qualified name with a UPN suffix attached is a spoof attempt', () => {
  // The reported case, verbatim.
  const id = resolve('blcse\\rshoop.ou@blcse.mil', realm)
  assert.equal(id.ok, false)
  assert.equal(id.severity, 'spoof')
  assert.equal(id.reason, 'mixed-forms')
  assert.match(id.detail ?? '', /two domain claims/i)

  // Same shape, foreign suffix — still a spoof, not a typo.
  assert.equal(resolve('BLCSE\\user@evil.mil', realm).severity, 'spoof')
  // And with the halves swapped.
  assert.equal(resolve('user@blcse.mil\\extra', realm).severity, 'spoof')
})

test('claiming a domain this site does not serve is a spoof attempt', () => {
  for (const typed of ['EVIL\\user', 'evil.mil\\user', 'BLCSE.MIL.EVIL.COM\\user', 'xblcse.mil\\user']) {
    const id = resolve(typed, realm)
    assert.equal(id.ok, false, `${typed} must be refused`)
    assert.equal(id.severity, 'spoof', `${typed} must be recorded as a spoof`)
    assert.equal(id.reason, 'unknown-domain')
  }

  // A subdomain of an allowed domain is NOT itself allowed — allowedDomains is
  // an exact list, so a domain nobody stood up can't be conjured by typing it.
  assert.equal(resolve('sub.blcse.mil\\user', realm).reason, 'unknown-domain')
})

test('LDAP metacharacters in the account name are a spoof attempt', () => {
  for (const sam of ['a*b', 'a(b', 'a)b', 'a=b', 'a,b', 'a;b', 'a<b']) {
    const id = resolve(`BLCSE\\${sam}`, realm)
    assert.equal(id.ok, false, `${sam} must be refused`)
    assert.equal(id.severity, 'spoof')
    assert.equal(id.reason, 'ldap-metachars')
  }
  // Ordinary AD account names are untouched by that check.
  for (const sam of ['first.last', 'first-last', 'first_last', "o'brien", 'rshoop.ou']) {
    assert.equal(resolve(`BLCSE\\${sam}`, realm).ok, true, `${sam} must be accepted`)
  }
})

test('honest mistakes are refused but recorded as format errors, not spoofing', () => {
  const cases: Array<[string, string]> = [
    ['testuser', 'missing-domain'],
    ['testuser@blcse.mil', 'upn-form'],
    ['\\testuser', 'missing-domain'],
    ['BLCSE\\', 'bad-account'],
    ['BLCSE\\a b', 'bad-account'],
    ['', 'empty'],
    [`BLCSE\\${'x'.repeat(140)}`, 'too-long'],
  ]
  for (const [typed, reason] of cases) {
    const id = resolve(typed, realm)
    assert.equal(id.ok, false, `${JSON.stringify(typed)} must be refused`)
    assert.equal(id.severity, 'format', `${JSON.stringify(typed)} is a mistake, not a spoof`)
    assert.equal(id.reason, reason, JSON.stringify(typed))
  }
})

test('a pasted double-escaped name still resolves, and domains are case-insensitive', () => {
  assert.equal(resolve('MBL\\\\testuser', realm).bindName, 'MBL\\testuser')
  const id = resolve('mBl.BlCsE.mIl\\TestUser', realm)
  assert.equal(id.domain, 'mbl.blcse.mil')
  // The account name is passed through as typed — AD compares it case-insensitively.
  assert.equal(id.sam, 'TestUser')
})

test('without allowedDomains only the realm’s own domain is accepted', () => {
  const bare = { ...realm }
  delete (bare as { allowedDomains?: string[] }).allowedDomains
  assert.deepEqual(allowedDomains(bare), ['blcse.mil'])
  assert.equal(resolve('BLCSE\\testuser', bare).ok, true)
  // MBL is not conjured out of thin air; it has to be configured.
  assert.equal(resolve('MBL\\testuser', bare).reason, 'unknown-domain')
})

test('a NetBIOS name that is not the first DNS label can be configured', () => {
  const withOverride = { ...realm, netbiosDomains: { 'mbl.blcse.mil': 'MBLNET' } }
  assert.equal(netbiosFor('mbl.blcse.mil', withOverride), 'MBLNET')
  assert.equal(resolve('MBLNET\\testuser', withOverride).domain, 'mbl.blcse.mil')
  assert.equal(resolve('MBL.BLCSE.MIL\\testuser', withOverride).bindName, 'MBLNET\\testuser')
  // The old label stops working once it is overridden — exactly one spelling
  // per domain, so the audit trail can't be split across two names.
  assert.equal(resolve('MBL\\testuser', withOverride).reason, 'unknown-domain')
  assert.equal(domainForLabel('MBLNET', withOverride), 'mbl.blcse.mil')
})

test('domain and DN forms convert both ways', () => {
  assert.equal(domainFromDn('OU=Users,DC=mbl,DC=blcse,DC=mil'), 'mbl.blcse.mil')
  assert.equal(dnFromDomain('mbl.blcse.mil'), 'DC=mbl,DC=blcse,DC=mil')
  assert.equal(domainFromDn('CN=nothing'), '')
  assert.equal(dnFromDomain('blcse'), '')
  assert.equal(isDomainName('blcse.mil'), true)
  assert.equal(isDomainName('MBL'), false)
  assert.equal(realmDefaultDomain(realm), 'blcse.mil')
  assert.equal(realmDefaultDomain({ bindUserDnTemplate: 'BLCSE\\{username}', baseDn: 'DC=blcse,DC=mil' }), 'blcse.mil')
})

test('Global Catalog endpoints are derived from the configured DCs', () => {
  assert.deepEqual(globalCatalogEndpoints(realm), [
    { url: 'ldaps://10.0.0.5:3269', servername: 'dc1.blcse.mil' },
    { url: 'ldaps://10.0.0.6:3269', servername: 'dc2.blcse.mil' },
  ])
  assert.equal(globalCatalogEndpoints({ urls: [{ url: 'ldap://10.0.0.5:389', servername: '' }] })[0].url, 'ldap://10.0.0.5:3268')
  assert.equal(globalCatalogEndpoints({ urls: [{ url: 'ldaps://10.0.0.5:3269', servername: '' }] })[0].url, 'ldaps://10.0.0.5:3269')
  assert.equal(globalCatalogEndpoints({ ...realm, gcUrl: 'ldaps://10.0.0.9:3269' })[0].url, 'ldaps://10.0.0.9:3269')
})

test('endpoint order puts Global Catalogs first only for other domains', () => {
  const own = bindEndpoints(realm, { isDefaultDomain: true })
  assert.equal(own[0].url, 'ldaps://10.0.0.5:636', 'the realm’s own domain keeps hitting its DCs first')

  const child = bindEndpoints(realm, { isDefaultDomain: false })
  assert.equal(child[0].url, 'ldaps://10.0.0.5:3269', 'a child domain can only be authenticated by a GC')

  // No endpoint listed twice — a duplicate would mean a second bind, and a
  // second bind with a wrong password is a second failed-logon count.
  const seen = new Set(child.map((e) => `${e.url}|${e.servername}`))
  assert.equal(seen.size, child.length)
})

test('the proxy resolves once, binds once, and scopes the admin lookup', () => {
  const source = readFileSync(join('proxy', 'site-stats.mjs'), 'utf8')
  const fn = source.slice(source.indexOf('async function ldapAuthenticate('))
  const body = fn.slice(0, fn.indexOf('function escapeLdapFilter('))

  assert.match(body, /resolveLoginIdentity\(normalized, realm\)/)
  assert.match(body, /const endpoints = bindEndpoints\(realm, identity\)/)
  assert.match(body, /const bindUser = identity\.bindName/)
  assert.match(body, /const searchBase = identity\.searchBase/)
  assert.match(body, /sAMAccountName=\$\{escapeLdapFilter\(identity\.sam\)\}/)
  // Exactly one bind call: no "try the parent, then the child" loop, which
  // would burn two failed-logon counts per wrong password.
  assert.equal((body.match(/await client\.bind\(/g) || []).length, 1)
  // A refusal carries its classification back to the route handler.
  assert.match(body, /severity: identity\.severity/)
})

test('refused sign-ins are recorded, and the security log cannot be cleared', () => {
  const source = readFileSync(join('proxy', 'site-stats.mjs'), 'utf8')

  // Recorded from the route handler, where the client IP lives.
  assert.match(source, /recordAuthEvent\(req, \{/)
  assert.match(source, /severity: result\.severity/)
  // Stored 0600 like the session files: `typed` is whatever was in the
  // username box, and a fat-fingered password must not be world-readable.
  // The mode lives in saveJson (proxy/state-files.mjs), which every state file goes through
  // (tests/state-files.test.ts checks the resulting mode on a real file).
  const recorder = source.slice(source.indexOf('function commitAuthEventsToDisk('))
  assert.match(recorder.slice(0, 200), /saveJson\(AUTH_EVENTS_FILE/)
  const stateFiles = readFileSync(join('proxy', 'state-files.mjs'), 'utf8')
  const saver = stateFiles.slice(stateFiles.indexOf('function saveJson('))
  assert.match(saver.slice(0, 900), /mode: 0o600/)
  assert.match(saver.slice(0, 900), /chmodSync\(tmpPath, 0o600\)/)

  // Admin-gated read endpoint...
  const route = source.slice(source.indexOf("url === '/api/admin/auth-events'"))
  assert.match(route.slice(0, 400), /requireAdmin\(req, res\)/)
  // requireAdmin is the one gate every admin route calls; it must still rest on authorizeAdmin and answer 401.
  const gate = source.slice(source.indexOf('function requireAdmin('))
  assert.match(gate.slice(0, 300), /if \(authorizeAdmin\(req\)\) return true/)
  assert.match(gate.slice(0, 300), /res\.writeHead\(401/)
  // ...and no way to delete the log through the API.
  assert.doesNotMatch(source, /'DELETE' && url === '\/api\/admin\/auth-events'/)

  // A wrong password is NOT recorded here — it reached the DC and belongs to
  // the Windows security log; recording it would bury real attempts in typos.
  const loginRoute = source.slice(source.indexOf("url === '/api/auth/login'"))
  const rejection = loginRoute.slice(0, loginRoute.indexOf('pruneExpiredSessions()'))
  assert.match(rejection, /if \(result\.severity\) \{/)
})

test('the login form states the accepted forms and drops the realm picker', () => {
  const page = readFileSync(join('app', 'login', 'page.tsx'), 'utf8')
  assert.match(page, /realms\.length > 1 && \(/)
  assert.match(page, /acceptedForms/)
  // The forms come from the server, so adding a domain to LDAP_REALMS updates
  // the hint with no code change — and no domain name is baked into the UI.
  const markup = page.slice(page.indexOf('login-username-hint'))
  assert.doesNotMatch(markup.replace(/\{\/\*[\s\S]*?\*\/\}/g, ''), /blcse\.mil/i)
})

test('the admin console surfaces spoof attempts on their own', () => {
  const panel = readFileSync(join('app', 'admin', 'AuthEventsPanel.tsx'), 'utf8')
  assert.match(panel, /fetchAuthEvents\(\)/)
  // Spoof-only is the default view; typos must not bury real attempts.
  assert.match(panel, /useState<'spoof' \| 'all'>\('spoof'\)/)
  assert.match(panel, /spoofCount/)

  const sections = readFileSync(join('lib', 'data', 'admin-sections.ts'), 'utf8')
  assert.match(sections, /\{ id: 'security', label: 'Sign-in security' \}/)
  const dashboard = readFileSync(join('app', 'admin', 'AdminDashboard.tsx'), 'utf8')
  assert.match(dashboard, /tab === 'security'/)
  assert.match(dashboard, /<AuthEventsPanel \/>/)
})

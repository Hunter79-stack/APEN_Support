/**
 * proxy/ldap-domain.mjs — decide WHICH Active Directory domain a typed
 * sign-in belongs to, and refuse everything that isn't one of the exact forms
 * this site accepts.
 *
 * Accepted, and nothing else:
 *
 *   BLCSE.MIL\<UserAccount>        DNS name of an allowed domain
 *   BLCSE\<UserAccount>            its NetBIOS label
 *   MBL.BLCSE.MIL\<UserAccount>    same two forms for every other allowed
 *   MBL\<UserAccount>              domain (allowedDomains in LDAP_REALMS)
 *
 * Deliberately NOT accepted:
 *
 *   testuser                       no domain named — ambiguous across a
 *                                  parent and a child domain
 *   testuser@blcse.mil             UPN form; one spelling per identity keeps
 *                                  the audit trail readable
 *   blcse\rshoop.ou@blcse.mil      a domain-qualified name with a UPN suffix
 *                                  glued on. Two different domain claims in
 *                                  one string is not a typo — it is someone
 *                                  probing which half the parser believes, so
 *                                  it is refused AND recorded as an attempted
 *                                  spoof.
 *
 * Rejections come back classified: severity 'spoof' for input that asserts an
 * identity it has no business asserting (a foreign domain, two domain claims,
 * LDAP filter metacharacters), and 'format' for an honest mistake (no domain,
 * empty, unusable characters). The caller records both, but only 'spoof' is
 * surfaced to admins as a security event.
 *
 * Two more rules that matter more than they look:
 *
 *  - The realm's OWN domain still binds through the realm's existing
 *    bindUserDnTemplate ("{username}@blcse.mil"). That is the path production
 *    uses today and it must not regress. Any OTHER allowed domain binds
 *    NT-style (NETBIOS\sAMAccountName), because a child domain's accounts
 *    commonly keep the forest-root UPN suffix, which would make
 *    "user@mbl.blcse.mil" a name that exists nowhere.
 *  - Exactly ONE bind is attempted per sign-in. Never "try the parent, then
 *    the child": a wrong password tried against two domains counts a failed
 *    logon in both, so an account that exists in each hits its lockout
 *    threshold twice as fast, in a domain the user never meant to touch.
 *
 * Per-realm configuration in LDAP_REALMS:
 *   allowedDomains: ["blcse.mil","mbl.blcse.mil"]   — the domains that may
 *                   sign in, matched EXACTLY (a subdomain of an allowed
 *                   domain is not itself allowed). Defaults to the realm's
 *                   own domain alone.
 *   netbiosDomains: {"mbl.blcse.mil":"MBLNET"}      — when a domain's NetBIOS
 *                   name is not its first DNS label (AD's default).
 *   gcUrl:          ["ldaps://10.0.0.5:3269"]       — explicit Global Catalog
 *                   endpoints; otherwise derived from `url`.
 */

/** AD caps sAMAccountName at 20 characters; 64 is a roomy ceiling that still
 *  bounds anything handed to a directory server. */
const SAM_PATTERN = /^[A-Za-z0-9._'-]{1,64}$/
const DOMAIN_LABEL_PATTERN = /^[A-Za-z0-9]([A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/
const MAX_LOGIN_LENGTH = 128
/** Characters that carry meaning to an LDAP filter or a DN. None of them can
 *  appear in a sAMAccountName, so their presence is someone testing the
 *  parser rather than mistyping a name. */
const LDAP_METACHARACTERS = /[*()=,+<>;"/\\\u0000-\u001f]/

/** "blcse.mil" → true; "blcse" (a NetBIOS-style single label) → false. */
export function isDomainName(value) {
  const v = String(value || '').trim().toLowerCase()
  if (!v || v.length > 253) return false
  const labels = v.split('.')
  if (labels.length < 2) return false
  return labels.every((label) => DOMAIN_LABEL_PATTERN.test(label))
}

/** "OU=Users,DC=mbl,DC=blcse,DC=mil" → "mbl.blcse.mil". Non-DC components are
 *  ignored, so a baseDn scoped to an OU still yields its domain. */
export function domainFromDn(dn) {
  const parts = String(dn || '').split(',')
    .map((p) => p.trim())
    .filter((p) => /^dc=/i.test(p))
    .map((p) => p.slice(3).trim().toLowerCase())
    .filter(Boolean)
  const domain = parts.join('.')
  return isDomainName(domain) ? domain : ''
}

/** "mbl.blcse.mil" → "DC=mbl,DC=blcse,DC=mil". */
export function dnFromDomain(domain) {
  if (!isDomainName(domain)) return ''
  return String(domain).trim().toLowerCase().split('.').map((l) => `DC=${l}`).join(',')
}

/** The domain a realm speaks for. Prefers the UPN suffix baked into
 *  bindUserDnTemplate (that IS the domain today's logins bind against);
 *  falls back to the baseDn for templates that use a DN or NT-style name. */
export function realmDefaultDomain(realm) {
  const template = String(realm?.bindUserDnTemplate || '')
  const at = template.lastIndexOf('@')
  if (at >= 0) {
    const suffix = template.slice(at + 1).trim().toLowerCase()
    if (isDomainName(suffix)) return suffix
  }
  return domainFromDn(realm?.baseDn)
}

/**
 * Every domain permitted to sign in, matched exactly. Adding a domain is a
 * deliberate act (an allowedDomains entry), never inferred: guessing that
 * anything under blcse.mil must be legitimate would accept a domain nobody
 * ever stood up, and quietly send credentials at it.
 */
export function allowedDomains(realm) {
  const explicit = Array.isArray(realm?.allowedDomains) ? realm.allowedDomains : []
  const cleaned = explicit.map((d) => String(d || '').trim().toLowerCase()).filter(isDomainName)
  if (cleaned.length > 0) return [...new Set(cleaned)]
  const fallback = realmDefaultDomain(realm)
  return fallback ? [fallback] : []
}

/** NetBIOS name for a domain: AD's default is the uppercased first DNS label
 *  (mbl.blcse.mil → MBL); netbiosDomains overrides that per domain. */
export function netbiosFor(domain, realm) {
  const overrides = realm?.netbiosDomains && typeof realm.netbiosDomains === 'object' ? realm.netbiosDomains : {}
  const key = String(domain || '').trim().toLowerCase()
  for (const [name, netbios] of Object.entries(overrides)) {
    if (String(name).trim().toLowerCase() === key && String(netbios || '').trim()) {
      return String(netbios).trim().toUpperCase()
    }
  }
  return key.split('.')[0].toUpperCase()
}

/** Resolve a typed domain part — DNS name or NetBIOS label — to one of the
 *  allowed domains. Returns '' when it names nothing we serve. */
export function domainForLabel(typedDomain, realm) {
  const wanted = String(typedDomain || '').trim().toLowerCase()
  if (!wanted) return ''
  const domains = allowedDomains(realm)
  if (wanted.includes('.')) {
    return domains.find((d) => d === wanted) || ''
  }
  return domains.find((d) => netbiosFor(d, realm).toLowerCase() === wanted) || ''
}

/** The exact spellings this realm accepts, for the login form's hint and the
 *  rejection message — so neither has to hardcode a domain name. */
export function acceptedLoginForms(realm) {
  const forms = []
  for (const domain of allowedDomains(realm)) {
    forms.push(`${domain.toUpperCase()}\\<UserAccount>`)
    forms.push(`${netbiosFor(domain, realm)}\\<UserAccount>`)
  }
  return forms
}

function reject(reason, severity, detail) {
  return { ok: false, reason, severity, detail }
}

/**
 * Turn what the user typed into the single bind name we'll present to the
 * directory — or into a classified rejection that never reaches a DC.
 *
 * Nothing here contacts the network: a refusal costs the directory nothing
 * and, importantly, costs the named account no failed-logon count.
 */
export function resolveLoginIdentity(typed, realm) {
  const raw = String(typed || '').trim()
  if (!raw) return reject('empty', 'format', 'No username was supplied.')
  if (raw.length > MAX_LOGIN_LENGTH) {
    return reject('too-long', 'format', `Username exceeds ${MAX_LOGIN_LENGTH} characters.`)
  }

  const domains = allowedDomains(realm)
  if (domains.length === 0) return reject('not-configured', 'format', 'No domains are configured for this realm.')

  // A name pasted out of a Windows dialog can arrive double-escaped.
  const input = raw.replace(/\\{2,}/g, '\\')
  const backslashes = (input.match(/\\/g) || []).length
  const ats = (input.match(/@/g) || []).length

  // Two domain claims in one string — "blcse\rshoop.ou@blcse.mil". A user
  // fixing a typo picks one form; supplying both is probing which half the
  // parser trusts.
  if (backslashes > 0 && ats > 0) {
    return reject('mixed-forms', 'spoof', 'Domain-qualified name with a UPN suffix attached — two domain claims in one name.')
  }
  if (backslashes > 1 || ats > 1) {
    return reject('multiple-separators', 'spoof', 'More than one domain separator in the name.')
  }

  if (ats === 1) {
    // UPN form. Not accepted here even when the domain is one of ours — but a
    // foreign suffix is a domain claim, and that is a different thing.
    const suffix = input.slice(input.indexOf('@') + 1).trim().toLowerCase()
    if (domainForLabel(suffix, realm)) {
      return reject('upn-form', 'format', 'UPN form (user@domain) is not accepted; use DOMAIN\\username.')
    }
    return reject('unknown-domain', 'spoof', `Claimed a domain this site does not serve: "${suffix || '(empty)'}".`)
  }

  if (backslashes === 0) {
    return reject('missing-domain', 'format', 'No domain given. The domain must be named explicitly.')
  }

  const separator = input.indexOf('\\')
  const typedDomain = input.slice(0, separator).trim()
  const sam = input.slice(separator + 1).trim()
  if (!typedDomain) return reject('missing-domain', 'format', 'No domain before the backslash.')
  if (!sam) return reject('bad-account', 'format', 'No account name after the backslash.')

  const domain = domainForLabel(typedDomain, realm)
  if (!domain) {
    return reject('unknown-domain', 'spoof', `Claimed a domain this site does not serve: "${typedDomain}".`)
  }
  if (LDAP_METACHARACTERS.test(sam)) {
    return reject('ldap-metachars', 'spoof', 'Account name contains LDAP filter or DN metacharacters.')
  }
  if (!SAM_PATTERN.test(sam)) {
    return reject('bad-account', 'format', 'Account name contains characters an AD account cannot hold.')
  }

  const defaultDomain = realmDefaultDomain(realm)
  const isDefaultDomain = domain === defaultDomain
  // The realm's own domain keeps its production bind template; every other
  // allowed domain binds NT-style, which does not depend on how UPN suffixes
  // were handed out in that domain.
  const bindName = isDefaultDomain
    ? String(realm.bindUserDnTemplate).replace('{username}', sam)
    : `${netbiosFor(domain, realm)}\\${sam}`

  return {
    ok: true,
    sam,
    domain,
    netbios: netbiosFor(domain, realm),
    bindName,
    isDefaultDomain,
    // Scoped to the account's OWN domain: "testuser" can exist in a parent and
    // a child domain, and a forest-wide search could read the other one's
    // memberOf and hand this session admin.
    searchBase: isDefaultDomain ? (realm.baseDn || dnFromDomain(domain)) : dnFromDomain(domain),
    // Only a UPN bind name is worth matching against userPrincipalName later.
    upn: isDefaultDomain && bindName.includes('@') ? bindName : '',
  }
}

/**
 * Global Catalog endpoints for a realm. A GC (3269 over TLS, 3268 plain) is
 * what makes forest-wide sign-in work: an ordinary DC on 636 only knows its
 * own domain's accounts, so a child-domain user binding there is rejected as
 * if the password were wrong. Derived from the configured DC endpoints unless
 * gcUrl says otherwise, so an existing LDAP_REALMS needs no edit.
 */
export function globalCatalogEndpoints(realm) {
  const explicit = Array.isArray(realm?.gcUrl) ? realm.gcUrl : (realm?.gcUrl ? [realm.gcUrl] : [])
  if (explicit.length > 0) {
    return explicit
      .map((entry) => (typeof entry === 'string'
        ? { url: entry.trim(), servername: '' }
        : { url: String(entry?.url || '').trim(), servername: String(entry?.servername || '').trim() }))
      .filter((entry) => entry.url)
  }
  const derived = []
  for (const dc of realm?.urls || []) {
    let parsed
    try { parsed = new URL(dc.url) } catch { continue }
    const gcPort = parsed.protocol === 'ldaps:' ? '3269' : '3268'
    // Already a GC endpoint — keep it rather than emitting a duplicate.
    if (parsed.port === gcPort) { derived.push({ ...dc }); continue }
    parsed.port = gcPort
    derived.push({ url: parsed.toString().replace(/\/$/, ''), servername: dc.servername || '' })
  }
  return derived
}

/**
 * The ordered endpoint list for one sign-in. The realm's own domain keeps
 * trying its configured DCs first (today's working path, unchanged) with the
 * GCs behind them; every other domain goes to the GCs first, because only a
 * GC can authenticate it at all.
 *
 * Ordering only ever matters for CONNECTION failures — the bind loop stops on
 * a real LDAP result, so this never becomes several password attempts.
 */
export function bindEndpoints(realm, identity) {
  const dcs = (realm?.urls || []).map((u) => ({ ...u }))
  const gcs = globalCatalogEndpoints(realm)
  const ordered = identity?.isDefaultDomain ? [...dcs, ...gcs] : [...gcs, ...dcs]
  const seen = new Set()
  return ordered.filter((entry) => {
    const key = `${entry.url}|${entry.servername || ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

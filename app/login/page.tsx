'use client'

/**
 * Site-wide sign-in page. nginx's auth_request gate (see nginx/server.conf +
 * login-redirect.inc) sends any unauthenticated request here with the
 * originally-requested path in `?next=`. A successful login here grants a
 * 'general' session (site-wide browsing) — additionally being a member of
 * the chosen realm's admin group grants 'admin' (handled entirely
 * server-side; nothing to pick here).
 */

import { useEffect, useState } from 'react'
import { ShieldAlert, AlertTriangle, Lock } from 'lucide-react'
import { GlowCard } from '@/components/ui/spotlight-card'
import { adminContentClient, type AuthRealm } from '@/lib/data/admin-content'

// Same-origin rooted path only — mirrors sanitizeInternalPath() in
// proxy/site-stats.mjs. `next` comes from a URL query param nginx set from
// $uri (already path-only, no query string), but it's still attacker-
// influenced input (a crafted login link), so it's re-validated here before
// ever being navigated to.
function sanitizeNext(value: string | null): string {
  if (!value) return '/home'
  let decoded: string
  try { decoded = decodeURIComponent(value) } catch { return '/home' }
  const trimmed = decoded.trim()
  if (!trimmed) return '/home'
  if (trimmed.startsWith('//')) return '/home'
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return '/home'
  if (!trimmed.startsWith('/')) return '/home'
  return trimmed.slice(0, 200)
}

export default function LoginPage() {
  const [realms, setRealms] = useState<AuthRealm[]>([])
  const [realm, setRealm] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'notConfigured'>('loading')

  useEffect(() => {
    let cancelled = false
    adminContentClient.fetchRealms().then((list) => {
      if (cancelled) return
      setRealms(list)
      if (list.length > 0) setRealm(list[0].id)
      setLoadState(list.length > 0 ? 'ready' : 'notConfigured')
    })
    return () => { cancelled = true }
  }, [])

  // The exact spellings the server will accept, straight from its realm
  // config — the UI never hardcodes a domain name, so adding a domain to
  // LDAP_REALMS updates this hint with no code change. A username with no
  // domain is refused: the same account name can exist in more than one
  // domain, and guessing which one is meant is how the wrong person gets in.
  const acceptedForms = realms.find((r) => r.id === realm)?.acceptedForms ?? []
  const placeholderForm = acceptedForms[1] || acceptedForms[0] || 'DOMAIN\\<UserAccount>'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting || !realm) return
    setError('')
    setSubmitting(true)
    const result = await adminContentClient.login(realm, username.trim(), password)
    setSubmitting(false)
    if (!result.ok) {
      if (result.notConfigured) {
        setLoadState('notConfigured')
        return
      }
      setError(result.error || 'Sign in failed.')
      return
    }
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
    const next = sanitizeNext(params?.get('next') ?? null)
    // Full navigation (not client-side routing) so the freshly-set session
    // cookie is what the next request actually carries.
    window.location.assign(next)
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10">
            <Lock size={22} className="text-cyan-300" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">APEN Support Sign In</h1>
          <p className="text-sm text-slate-400">Use your Active Directory credentials for your enclave.</p>
        </div>

        {loadState === 'loading' && (
          <GlowCard glowColor="cyan" className="p-6">
            <p className="text-xs font-mono uppercase tracking-widest text-slate-400">Loading…</p>
          </GlowCard>
        )}

        {loadState === 'notConfigured' && (
          <GlowCard glowColor="orange" className="p-6">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-300" aria-hidden="true" />
              <p className="text-xs font-black uppercase tracking-[0.2em] text-white">Login not configured</p>
            </div>
            <p className="text-xs leading-relaxed text-slate-400">
              No LDAP realms are configured on this server yet. Contact a CESC administrator.
            </p>
          </GlowCard>
        )}

        {loadState === 'ready' && (
          <GlowCard glowColor="cyan" className="p-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* The realm picker only appears when this server actually
                  serves more than one enclave. With a single realm there is
                  nothing to choose, and WHICH DOMAIN of that realm's forest
                  an account belongs to (blcse.mil vs mbl.blcse.mil) is read
                  from the username instead — see the hint under the field. */}
              {realms.length > 1 && (
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400" htmlFor="login-realm">
                    Realm
                  </label>
                  <select
                    id="login-realm"
                    value={realm}
                    onChange={(e) => setRealm(e.target.value)}
                    required
                    className="h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-cyan-400/60"
                  >
                    {realms.map((r) => (
                      <option key={r.id} value={r.id}>{r.label}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400" htmlFor="login-username">
                  Username
                </label>
                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={placeholderForm.replace('<UserAccount>', 'firstname.lastname')}
                  aria-describedby={error ? 'login-username-hint login-error' : 'login-username-hint'}
                  aria-invalid={Boolean(error)}
                  required
                  className="h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-cyan-400/60"
                />
                {/* Replaces the old Realm dropdown: the domain is named in the
                    username itself, in one of the exact forms the server
                    accepts. Anything else is refused — and a name that claims
                    two domains at once is logged as an attempted spoof. */}
                <p id="login-username-hint" className="mt-1.5 text-[10px] leading-relaxed text-slate-400">
                  {acceptedForms.length > 0 ? (
                    <>
                      Include your domain. Accepted forms:{' '}
                      {acceptedForms.map((form, i) => (
                        <span key={form}>
                          {i > 0 && ', '}
                          <span className="font-mono text-slate-400">{form}</span>
                        </span>
                      ))}
                      .
                    </>
                  ) : (
                    <>
                      Include your domain — <span className="font-mono text-slate-400">DOMAIN\&lt;UserAccount&gt;</span>.
                    </>
                  )}
                </p>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-slate-400" htmlFor="login-password">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  aria-describedby={error ? 'login-error' : undefined}
                  aria-invalid={Boolean(error)}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-cyan-400/60"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="mt-2 inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 text-xs font-black uppercase tracking-widest text-cyan-300 hover:bg-cyan-400/20 disabled:opacity-50"
              >
                <ShieldAlert size={14} aria-hidden="true" />
                {submitting ? 'Signing in…' : 'Sign in'}
              </button>
              {error && (
                <p id="login-error" role="alert" className="flex items-center gap-2 text-xs text-red-300">
                  <AlertTriangle size={12} aria-hidden="true" /> {error}
                </p>
              )}
            </form>
          </GlowCard>
        )}
      </div>
    </div>
  )
}

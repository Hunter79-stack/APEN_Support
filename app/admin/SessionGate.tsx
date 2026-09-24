'use client'

/**
 * Admin access gate for /admin: probes the session cookie, then the legacy
 * open-proxy / pasted-token path, and renders the matching prompt until
 * onAuthorized fires. Split out of AdminContentEditor.tsx (code-quality #64).
 */
import { useEffect, useState } from 'react'
import { GlowCard } from '@/components/ui/spotlight-card'
import { adminContentClient } from '@/lib/data/admin-content'
import { API_ENDPOINTS } from '@/lib/data/runtime'
import { AlertTriangle, LogOut, ShieldAlert } from 'lucide-react'

export function SessionGate({ onAuthorized }: { onAuthorized: () => void }) {
  const [pasteToken, setPasteToken] = useState('')
  const [error, setError] = useState('')
  const [probeState, setProbeState] = useState<'probing' | 'open' | 'needLogin' | 'insufficientPrivileges' | 'needToken' | 'offline'>('probing')
  const [whoamiUsername, setWhoamiUsername] = useState('')
  const [attempt, setAttempt] = useState(0) // bumped by Retry to re-run the probe

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      // 1) Session cookie path. By the time anyone reaches /admin, nginx's
      // site-wide auth_request gate has already required SOME valid session
      // (general or admin) — so "not authenticated at all" here should only
      // happen via direct proxy access during development, not in normal
      // browser use. A general (non-admin) session is the expected case for
      // someone on an allowlisted IP who hasn't been added to the admin
      // group yet.
      const who = await adminContentClient.whoami()
      if (cancelled) return
      if (who && who.admin) {
        setProbeState('open')
        onAuthorized()
        return
      }
      if (who && who.username) {
        setWhoamiUsername(who.username)
        setProbeState('insufficientPrivileges')
        return
      }
      // 2) Open-proxy path (or nginx-injected token) — legacy fallback for
      // when LDAP isn't configured at all yet.
      adminContentClient.clearToken()
      try {
        const res = await fetch(API_ENDPOINTS.adminContentOverrides, { cache: 'no-store', credentials: 'include' })
        if (cancelled) return
        if (res.ok) {
          const data = await res.json().catch(() => null)
          if (data && data.adminTokenRequired === false) {
            setProbeState('open')
            onAuthorized()
            return
          }
        }
        if (res.status === 401) { setProbeState('needLogin'); return }
        setProbeState('offline')
      } catch {
        if (!cancelled) setProbeState('offline')
      }
    })()
    return () => { cancelled = true }
  }, [onAuthorized, attempt])

  if (probeState === 'probing' || probeState === 'open') {
    return (
      <GlowCard glowColor="cyan" className="p-5">
        <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">Checking admin session…</p>
      </GlowCard>
    )
  }

  if (probeState === 'offline') {
    return (
      <GlowCard glowColor="orange" className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={16} className="text-amber-300" />
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white">Admin proxy unreachable</p>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          The browser couldn&apos;t reach <code className="text-cyan-400">/api/admin/content-overrides</code>. Make sure the
          site-stats proxy is running alongside Next.js:
        </p>
        <pre className="mt-3 p-3 rounded-lg bg-black/40 border border-white/10 text-xs text-cyan-300 font-mono overflow-x-auto">npm run dev:all</pre>
        <button
          onClick={() => { setProbeState('probing'); setAttempt((n) => n + 1) }}
          className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 text-[10px] font-black uppercase tracking-widest text-cyan-300 hover:bg-cyan-400/20"
        >
          Retry
        </button>
      </GlowCard>
    )
  }

  if (probeState === 'needToken') {
    // LDAP isn't configured on this server — show the legacy paste form.
    return (
      <GlowCard glowColor="cyan" className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert size={16} className="text-cyan-300" />
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white">Admin Token Required (legacy)</p>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed mb-3">
          LDAP login isn&apos;t configured yet on this server. Use the legacy
          token from <code className="text-cyan-400">.env.local</code>&apos;s
          <code className="text-cyan-400 mx-1">ADMIN_API_TOKEN</code> entry to unlock the editor.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            setError('')
            adminContentClient.setToken(pasteToken)
            const data = await adminContentClient.fetchAll()
            if (!data) {
              setError('Token rejected by the proxy. Double-check the value of ADMIN_API_TOKEN in .env.local.')
              return
            }
            onAuthorized()
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <input
            type="password"
            value={pasteToken}
            onChange={(e) => setPasteToken(e.target.value)}
            placeholder="Paste the value of ADMIN_API_TOKEN"
            className="h-10 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-cyan-400/60"
          />
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-4 text-[10px] font-black uppercase tracking-widest text-cyan-300 hover:bg-cyan-400/20"
          >
            Unlock editor
          </button>
        </form>
        {error && (
          <p className="mt-3 flex items-center gap-2 text-xs text-red-300">
            <AlertTriangle size={12} /> {error}
          </p>
        )}
      </GlowCard>
    )
  }

  if (probeState === 'insufficientPrivileges') {
    // A valid, logged-in (general) session, but not admin-kind — reachable
    // when someone on an allowlisted admin-workstation IP hasn't been added
    // to the realm's admin group. There's no in-page login form anymore:
    // the site-wide gate at /login/ already handled authentication before
    // this component ever mounted, so the only thing missing is privilege,
    // not identity.
    return (
      <GlowCard glowColor="orange" className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <ShieldAlert size={16} className="text-amber-300" />
          <p className="text-xs font-black uppercase tracking-[0.2em] text-white">Not an admin</p>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          You&apos;re signed in as <span className="text-cyan-300 font-semibold">{whoamiUsername}</span>, but
          that account isn&apos;t a member of the admin group for its realm. Contact a CESC administrator if you
          need admin access.
        </p>
        <p className="mt-3 text-xs text-slate-400 leading-relaxed">
          Just been added to the admin group? Your current session was issued before that change — sign out and
          back in to pick it up (session privilege is decided once, at login, not re-checked on every page).
        </p>
        <button
          onClick={async () => { await adminContentClient.logout(); window.location.href = new URL('/login/', window.location.origin).href }}
          className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-cyan-400/30 hover:text-cyan-300"
        >
          <LogOut size={12} /> Sign out
        </button>
      </GlowCard>
    )
  }

  // Default: needLogin. Normally unreachable in production — nginx's
  // site-wide auth_request gate redirects an unauthenticated visitor to
  // /login/ before this page's JS ever runs. Kept as a defensive fallback
  // (e.g. hitting the dev server directly without nginx in front of it).
  return (
    <GlowCard glowColor="cyan" className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <ShieldAlert size={16} className="text-cyan-300" />
        <p className="text-xs font-black uppercase tracking-[0.2em] text-white">Sign-in required</p>
      </div>
      <p className="text-xs text-slate-400 leading-relaxed mb-4">
        No active session was found. Sign in first, then come back to this page.
      </p>
      <a
        href="/login/"
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-4 text-[10px] font-black uppercase tracking-widest text-cyan-300 hover:bg-cyan-400/20"
      >
        Go to sign in
      </a>
    </GlowCard>
  )
}

/* ─── Registered route-image editor ─── */

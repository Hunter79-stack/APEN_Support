'use client'

/**
 * useNginxStatus — polls GET /api/admin/nginx-stats and derives per-second
 * rates from the monotonic counters (nginx counters only ever climb until a
 * reload, so req/s must be computed by diffing successive samples; a negative
 * delta is treated as a counter reset and reported as 0).
 *
 * Auth mirrors InfrastructureNodesPanel: the session cookie rides along via
 * credentials:'include', and the legacy x-admin-token is sent when present
 * (on IP-allowlisted workstations nginx injects it upstream automatically, so
 * the browser usually needs no token at all). A 401 surfaces as `unauthorized`
 * so the caller can prompt; the request never throws.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { API_ENDPOINTS, RUNTIME_INTERVALS } from '@/lib/data/runtime'
import { adminContentClient } from '@/lib/data/admin-content'
import type { NginxStatus } from '@/lib/data/nginx-stats'

export interface NginxRates {
  /** Global requests/sec, derived from connections.requests. null until 2 samples. */
  requestsPerSec: number | null
  /** Global accepted connections/sec. */
  acceptedPerSec: number | null
  /** Per server-zone requests/sec, keyed by zone name. */
  zones: Record<string, number>
  /** Per upstream-server requests/sec, keyed by server address. */
  upstreams: Record<string, number>
}

export interface UseNginxStatus {
  data: NginxStatus | null
  rates: NginxRates
  /** Rolling buffer of recent requests/sec samples (newest last) for sparklines. */
  history: number[]
  /** Fetched successfully AND a status module is present (data.available). */
  live: boolean
  /** Endpoint responded at all (even if the module is absent). */
  reachable: boolean
  /** Endpoint returned 401 — the caller is not authorized. */
  unauthorized: boolean
  loading: boolean
  error: string | null
  refresh: () => void
}

const EMPTY_RATES: NginxRates = { requestsPerSec: null, acceptedPerSec: null, zones: {}, upstreams: {} }

interface Sample {
  ts: number
  requests: number
  accepted: number
  zones: Map<string, number>
  ups: Map<string, number>
}

export function useNginxStatus(pollMs: number = RUNTIME_INTERVALS.nginxStatsRefreshMs): UseNginxStatus {
  const [data, setData] = useState<NginxStatus | null>(null)
  const [rates, setRates] = useState<NginxRates>(EMPTY_RATES)
  const [history, setHistory] = useState<number[]>([])
  const [live, setLive] = useState(false)
  const [reachable, setReachable] = useState(false)
  const [unauthorized, setUnauthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const prev = useRef<Sample | null>(null)
  const [nonce, setNonce] = useState(0)

  const refresh = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false

    async function fetchStatus() {
      const token = adminContentClient.getToken()
      try {
        const res = await fetch(API_ENDPOINTS.adminNginxStats, {
          cache: 'no-store',
          credentials: 'include',
          headers: token ? { 'x-admin-token': token } : {},
        })
        if (cancelled) return
        if (res.status === 401) {
          setUnauthorized(true)
          setReachable(true)
          setLive(false)
          setLoading(false)
          return
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as NginxStatus
        if (cancelled) return

        setUnauthorized(false)
        setReachable(true)
        setError(null)
        setData(json)
        setLive(Boolean(json.available))

        // Derive rates from the previous sample.
        const now = json.ts ?? Date.now()
        const conn = json.connections
        const zoneMap = new Map<string, number>(json.serverZones.map((z) => [z.name, z.requests]))
        const upMap = new Map<string, number>()
        json.upstreams.forEach((g) => g.servers.forEach((s) => upMap.set(s.server, s.requests)))

        if (prev.current && conn) {
          const dt = (now - prev.current.ts) / 1000
          if (dt > 0.5) {
            const rate = (cur: number, was: number | undefined) =>
              was == null || cur < was ? 0 : (cur - was) / dt
            const zones: Record<string, number> = {}
            zoneMap.forEach((v, k) => {
              zones[k] = rate(v, prev.current?.zones.get(k))
            })
            const upstreams: Record<string, number> = {}
            upMap.forEach((v, k) => {
              upstreams[k] = rate(v, prev.current?.ups.get(k))
            })
            const rps = rate(conn.requests, prev.current.requests)
            setRates({
              requestsPerSec: rps,
              acceptedPerSec: rate(conn.accepted, prev.current.accepted),
              zones,
              upstreams,
            })
            setHistory((h) => [...h, rps].slice(-60))
          }
        }
        if (conn) {
          prev.current = { ts: now, requests: conn.requests, accepted: conn.accepted, zones: zoneMap, ups: upMap }
        }
        setLoading(false)
      } catch (err) {
        if (cancelled) return
        setReachable(false)
        setLive(false)
        setLoading(false)
        setError(err instanceof Error ? err.message : String(err))
      }
    }

    fetchStatus()
    const id = setInterval(fetchStatus, pollMs)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [pollMs, nonce])

  return { data, rates, history, live, reachable, unauthorized, loading, error, refresh }
}

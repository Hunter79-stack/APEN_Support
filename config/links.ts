/**
 * Landing-page link/asset configuration.
 *
 * Used by the Hero + Capabilities sections on the click-through cover
 * page (/). The landing layer keeps its own design-aligned aliases
 * (logoApen, logoApenAi, ENCLAVE_PATHS.cui, …) but the underlying asset
 * paths come from the single logo registry in lib/data/logos.ts, so a
 * logo only ever has to be changed in one place.
 */

import { EXTERNAL_URLS } from '@/lib/data/constants'
import { LOGOS } from '@/lib/data/logos'

/* ── Image assets ───────────────────────────────────────── */
export const ASSETS = {
  logoApen:         LOGOS.apenRound,
  logoApenAi:       LOGOS.apenAi,
  logoApenQuantum:  LOGOS.apenQuantum,
  logoApenHpc:      LOGOS.apenHpc,
  logoApenHub:      LOGOS.apenHub,
} as const

/* ── Enclave / portal links ─────────────────────────────────
 *
 * External enclave destinations are routed through the existing
 * /api/external/<key> redirector so internal hostnames never appear
 * in the public bundle (same pattern as TrackIt/Tenable/Voltron on
 * the home grid). Add CERT-style env vars for keys that don't yet
 * have a backing redirect; until then the link will 404, which is
 * the intentional fail-closed behaviour.
 */
export const ENCLAVE_PATHS = {
  voltron: EXTERNAL_URLS.apenVoltron,
  qpro:    '/api/external/qpro',
  hpc:     '/api/external/hpc',
  hub:     '/api/external/hub',
  cui:     '/api/external/cui-portal',
} as const

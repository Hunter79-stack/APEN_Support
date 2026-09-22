// ──────────────────────────────────────────────────────────────
//  cert-request.mjs — CES/CEP cert enrollment scaffolding
// ──────────────────────────────────────────────────────────────
//
// Backend stub for the Cert Request Wizard's API submission path.
// Today the APEN CA at apenblcsecuica1.blcse.mil has ONLY:
//
//    ADCS-Cert-Authority    (core CA)
//    ADCS-Web-Enrollment    (legacy /certsrv ASP portal)
//
// The wizard's submit step currently routes users through the
// legacy /certsrv portal via iframe + new-tab link. Once CES/CEP
// are installed and configured —
//
//    ADCS-Enroll-Web-Pol    (CEP — policy web service)
//    ADCS-Enroll-Web-Svc    (CES — enrollment web service)
//
// — set the CERT_REQUEST_* env vars below and fill in the four
// TODO sections in this file. The wizard will detect the configured
// state via /api/cert-request/status and surface a second "Submit
// via API" path. Until then every endpoint except /status returns
// 503 with a message the wizard knows how to render.
//
// Why a separate module: keep the SOAP/WS-Trust complexity out of
// site-stats.mjs, and make the future implementation easy to
// review without touching unrelated code.

import { readJsonBody } from './http-body.mjs'

/* ── Configuration (env-driven) ───────────────────────────── */
const CEP_URL       = (process.env.CERT_REQUEST_CEP_URL       || '').trim()
const CES_URL       = (process.env.CERT_REQUEST_CES_URL       || '').trim()
const CA_CONFIG     = (process.env.CERT_REQUEST_CA_CONFIG     || '').trim()
const AUTH_TYPE     = (process.env.CERT_REQUEST_AUTH_TYPE     || '').trim().toLowerCase()
const ALLOWED_TEMPLATES = (process.env.CERT_REQUEST_ALLOWED_TEMPLATES || '')
  .split(',').map((s) => s.trim()).filter(Boolean)
const KEYTAB_PATH   = (process.env.CERT_REQUEST_KEYTAB        || '').trim()
const SERVICE_SPN   = (process.env.CERT_REQUEST_SERVICE_SPN   || '').trim()
const TIMEOUT_MS    = Number.parseInt(process.env.CERT_REQUEST_TIMEOUT_MS || '15000', 10) || 15000

const VALID_AUTH_TYPES = new Set(['kerberos', 'username', 'certificate'])

/**
 * Configuration is "complete enough to attempt a call" only when both
 * endpoints, the CA config string, and a valid auth type are present.
 * Kerberos additionally requires a keytab path and service SPN; without
 * them protocol transition can't work from a Linux Node service.
 */
function isConfigured() {
  if (!CEP_URL || !CES_URL || !CA_CONFIG) return false
  if (!VALID_AUTH_TYPES.has(AUTH_TYPE)) return false
  if (AUTH_TYPE === 'kerberos' && (!KEYTAB_PATH || !SERVICE_SPN)) return false
  return true
}

function configReport() {
  return {
    configured: isConfigured(),
    authType: AUTH_TYPE || null,
    /* URLs deliberately NOT echoed — keeps internal hostnames out of
       any client-side response, same pattern as /api/external/*. */
    hasCepUrl: Boolean(CEP_URL),
    hasCesUrl: Boolean(CES_URL),
    hasCaConfig: Boolean(CA_CONFIG),
    hasKeytab: Boolean(KEYTAB_PATH),
    hasServiceSpn: Boolean(SERVICE_SPN),
    allowedTemplates: ALLOWED_TEMPLATES.length > 0 ? ALLOWED_TEMPLATES : null,
    timeoutMs: TIMEOUT_MS,
  }
}

/* ── HTTP helpers ─────────────────────────────────────────── */
function writeJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type':  'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  res.end(JSON.stringify(body))
}

function notConfigured(res, hint = '') {
  writeJson(res, 503, {
    error: 'cert_request_not_configured',
    message: hint || 'The CES/CEP enrollment backend has not been configured. The wizard falls back to portal submission.',
    config: configReport(),
  })
}

/* ── CES/CEP client stubs ─────────────────────────────────── */
//
// Each function below is the place to write the real SOAP client
// once CES/CEP are up. Until then they all surface a 503 via
// notConfigured(). The function shapes and return contracts are
// frozen here so the wizard can be built against them today.

/**
 * GetPolicies — calls CEP/_CEP_<auth>/service.svc to retrieve the
 * list of certificate templates the calling user is allowed to enroll
 * in, plus the CES URL(s) for submission.
 *
 * SOAP action: http://schemas.microsoft.com/windows/pki/2009/01/enrollmentpolicy/IPolicy/GetPolicies
 * Reference:   MS-XCEP §3.1.4.1
 *
 * TODO: implement once CEP is reachable.
 *   1. Build a SOAP 1.2 envelope per MS-XCEP.
 *   2. Authenticate per AUTH_TYPE — for Kerberos, request a service
 *      ticket using the keytab at KEYTAB_PATH for SERVICE_SPN on
 *      behalf of the authenticated user (S4U2Proxy). For username,
 *      use HTTP Basic over TLS. For certificate, attach a client
 *      cert via mTLS.
 *   3. POST to CEP_URL with header
 *      `Content-Type: application/soap+xml; charset=utf-8; action="..."`.
 *   4. Parse the response policy collection, filter by
 *      ALLOWED_TEMPLATES if set, and return the templates.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function fetchTemplates(_userContext) {
  throw new Error('CES/CEP client not implemented — see proxy/cert-request.mjs TODO')
}

/**
 * SubmitDefault — submits a CSR to CES per MS-WSTEP §3.1.4.1.1.
 *
 * Body: a CMS-signed wsse:BinarySecurityToken wrapping the PKCS#10
 * CSR, plus optional template attributes.
 *
 * Returns one of:
 *   { disposition: 'issued',  certificate: '<base64-PEM>' }
 *   { disposition: 'pending', requestId: <number> }
 *   { disposition: 'denied',  reason: '<string>' }
 *
 * TODO: implement once CES is reachable.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function submitCsr(_csrBase64, _templateName, _userContext) {
  throw new Error('CES/CEP client not implemented — see proxy/cert-request.mjs TODO')
}

/**
 * GetCertificate — polls a pending request by ID. Used after a CES
 * SubmitDefault response indicated `disposition === 'pending'`.
 *
 * TODO: implement once CES is reachable. The MS-WSTEP query path is
 * "RequestSecurityToken" with a `wst:RequestType` of "Query"
 * referencing the prior request ID.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function fetchPending(_requestId, _userContext) {
  throw new Error('CES/CEP client not implemented — see proxy/cert-request.mjs TODO')
}

/* ── Route handler ────────────────────────────────────────── */
//
// Dispatch entry point. Returns true if the request matched a
// /api/cert-request/* route (so the caller knows not to fall through
// to its own 404). All routes are same-origin only — they don't set
// CORS allow-origin headers, since the wizard lives on this site.

const STATUS_PATH = '/api/cert-request/status'
const TEMPLATES_PATH = '/api/cert-request/templates'
const SUBMIT_PATH = '/api/cert-request/submit'
const POLL_PREFIX = '/api/cert-request/poll/'

export async function handleCertRequest(req, res, url) {
  if (!url || !url.startsWith('/api/cert-request')) return false

  /* status — always answers, so the wizard can probe availability. */
  if (req.method === 'GET' && url === STATUS_PATH) {
    writeJson(res, 200, configReport())
    return true
  }

  if (!isConfigured()) {
    notConfigured(res)
    return true
  }

  /* templates — GET, returns templates available to the calling user */
  if (req.method === 'GET' && url === TEMPLATES_PATH) {
    try {
      const templates = await fetchTemplates(req)
      writeJson(res, 200, { templates })
    } catch (err) {
      writeJson(res, 502, {
        error: 'cep_request_failed',
        message: err instanceof Error ? err.message : 'CEP request failed.',
      })
    }
    return true
  }

  /* submit — POST { csr: base64, templateName: string } */
  if (req.method === 'POST' && url === SUBMIT_PATH) {
    let body
    try { body = await readJsonBody(req, 64_000) }
    catch (err) {
      writeJson(res, err.status || 400, { error: err.message || 'bad_request' })
      return true
    }
    const csr = typeof body.csr === 'string' ? body.csr.trim() : ''
    const templateName = typeof body.templateName === 'string' ? body.templateName.trim() : ''
    if (!csr || !templateName) {
      writeJson(res, 400, { error: 'missing_fields', message: 'csr and templateName are required.' })
      return true
    }
    if (ALLOWED_TEMPLATES.length > 0 && !ALLOWED_TEMPLATES.includes(templateName)) {
      writeJson(res, 403, { error: 'template_not_allowed', message: `Template ${templateName} is not in the configured allow-list.` })
      return true
    }
    try {
      const result = await submitCsr(csr, templateName, req)
      writeJson(res, 200, result)
    } catch (err) {
      writeJson(res, 502, {
        error: 'ces_request_failed',
        message: err instanceof Error ? err.message : 'CES submit failed.',
      })
    }
    return true
  }

  /* poll — GET /api/cert-request/poll/<requestId> */
  if (req.method === 'GET' && url.startsWith(POLL_PREFIX)) {
    const idStr = url.slice(POLL_PREFIX.length)
    const requestId = Number.parseInt(idStr, 10)
    if (!Number.isInteger(requestId) || requestId <= 0) {
      writeJson(res, 400, { error: 'invalid_request_id' })
      return true
    }
    try {
      const result = await fetchPending(requestId, req)
      writeJson(res, 200, result)
    } catch (err) {
      writeJson(res, 502, {
        error: 'ces_query_failed',
        message: err instanceof Error ? err.message : 'CES poll failed.',
      })
    }
    return true
  }

  /* unknown sub-route */
  writeJson(res, 404, { error: 'not_found' })
  return true
}

/* Re-export for site-stats startup logging. */
export const certRequestConfigured = isConfigured

/**
 * Probe-result wording for the Infrastructure Nodes cards.
 *
 * Lives apart from site-stats.mjs because that file IS the server — importing it
 * to exercise one string builder would start it listening on :8788.
 */

/**
 * Plain-English reason a probe returned a status the node does not accept.
 *
 * A degraded card used to carry no explanation at all: `error` was only ever set
 * by probeNode's catch block, so the UI fell back to a bare "Returned HTTP 301"
 * and an admin had to work out for themselves whether that was a real fault.
 * Every non-accepted status now states what came back, what was expected, and
 * the likely cause — so a node added years from now explains itself too.
 *
 * @param {number} httpStatus     what the endpoint actually returned
 * @param {number[]} allowed      statuses this node treats as healthy
 * @param {string} probeTarget    URL probed (healthCheckUrl, else target)
 * @param {string|null} location  Location header, when the status was a 3xx
 */
export function describeUnexpectedStatus(httpStatus, allowed, probeTarget, location) {
  const meaning = httpStatus >= 500
    ? "The endpoint was reached but failed to serve the request — check that service's own logs."
    : httpStatus === 404
      ? 'The endpoint answered but has nothing at that path; the URL is likely wrong or the content moved.'
      : httpStatus === 403
        ? 'Access was refused. The probe source address may not be in the allowlist for this path.'
        : httpStatus === 401
          ? 'The endpoint requires authentication the probe does not send. If that is expected for this path, add 401 to the accepted statuses.'
          : httpStatus === 429
            ? 'The endpoint is rate-limiting the probe. Use a longer interval or a cheaper health path.'
            : httpStatus >= 300 && httpStatus < 400
              ? `The endpoint redirects rather than serving content${location ? ` — it points at ${location}` : ''}. `
                + "If that redirect is deliberate, point this node's health check at the real resource instead, or add this status to the accepted list."
              : 'The endpoint answered, but not with a status this node treats as healthy.'
  return `Probing ${probeTarget} returned HTTP ${httpStatus}; this node accepts ${allowed.join(', ')}. ${meaning}`
}

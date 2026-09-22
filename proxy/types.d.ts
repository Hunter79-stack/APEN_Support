/**
 * Ambient types for the proxy processes (checked by `npm run typecheck:proxy`
 * through tsconfig.proxy.json). The proxies are plain .mjs; this file only
 * describes the properties they hang on Node objects.
 */
import 'node:http'

declare module 'node:http' {
  interface IncomingMessage {
    /** Set by authorizeAdmin() in proxy/site-stats.mjs for an authorised admin request. */
    adminUser?: string
  }
}

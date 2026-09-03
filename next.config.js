/** @type {import('next').NextConfig} */

// Static export (`output: 'export'`) is required for production where nginx
// serves the /out directory and proxies /api/* itself. But during `next dev`
// nginx isn't in the loop — and `output: 'export'` rejects rewrites at config
// time — so we strip it in dev and add a /api/* proxy to the local backends.
//
// NODE_ENV is automatically 'development' for `next dev` and 'production' for
// `next build`, so this switches behavior cleanly.
const isDev = process.env.NODE_ENV !== 'production'

// Pulled from .env.local at runtime so the same config works on any laptop.
const STATS_PORT = process.env.STATS_PORT || '8788'
const VOLTRON_PROXY_PORT = process.env.VOLTRON_PROXY_PORT || '8787'

// LAN hosts that are allowed to hit the dev server (HMR WebSocket, dev
// resources). Next.js 16 blocks cross-origin access by default — this list
// re-allows the laptop's LAN IP and any colleague IPs you bind dev to.
// Override per-machine via DEV_ALLOWED_ORIGINS=192.168.1.150,10.0.0.42 in
// .env.local.
const DEV_ALLOWED_ORIGINS = (process.env.DEV_ALLOWED_ORIGINS || '192.168.1.150')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const nextConfig = {
  // Production builds keep the static export. Dev runs as a normal Next.js
  // server so we can register rewrites to the proxy backends.
  ...(isDev ? {} : { output: 'export' }),
  trailingSlash: true,

  // Suppress "X-Powered-By: Next.js" header (defense-in-depth)
  poweredByHeader: false,

  // Next.js 16's cross-origin guard for /_next/* dev resources. Only applies
  // in `next dev`; production static export ignores this field. Without it,
  // browsing the dev server via the machine's LAN IP (rather than localhost)
  // gets the HMR WebSocket blocked and a console warning recommending this
  // exact list. Production builds aren't affected.
  ...(isDev ? { allowedDevOrigins: DEV_ALLOWED_ORIGINS } : {}),

  // Required for static export with next/image
  images: {
    unoptimized: true,
  },

  ...(isDev
    ? {
        async rewrites() {
          return [
            // Voltron chat lives on a separate proxy (port 8787 by default).
            { source: '/api/voltron-chat', destination: `http://127.0.0.1:${VOLTRON_PROXY_PORT}/api/voltron-chat` },
            { source: '/api/voltron-chat/', destination: `http://127.0.0.1:${VOLTRON_PROXY_PORT}/api/voltron-chat` },
            // Everything else (site-stats, feedback, content overrides,
            // admin endpoints, live-announcements, etc.) routes to site-stats.
            { source: '/api/:path*', destination: `http://127.0.0.1:${STATS_PORT}/api/:path*` },
          ]
        },
      }
    : {}),

  // Next.js 16: Turbopack is the default bundler — no flags needed.
}

module.exports = nextConfig

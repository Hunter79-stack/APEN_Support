// ──────────────────────────────────────────────────────────────
//  repo-freshness.mjs — "last updated" stamps for package mirrors
// ──────────────────────────────────────────────────────────────
//
// Answers the most common air-gapped-customer question — "how current
// is this mirror?" — without touching the root-cron rsync scripts.
//
// Signal: rsync -t preserves upstream *file* mtimes, but whenever a
// sync adds/removes entries the containing *directory* mtime is set to
// the local sync time. So the newest directory mtime in a bounded walk
// of a mirror root is "the last sync that changed something".
//
// The walk follows symlinks (the served roots under /var/www/html/repos
// are symlink farms into /mnt/storage) with a realpath visited-set to
// stay cycle-safe, and is bounded by depth and directory count so a
// huge mirror can never stall the stats proxy. Results are cached.
//
// Config (all optional):
//   REPO_FRESHNESS_PATHS          id|Label|fsPath|publicPath;... (replaces defaults)
//   REPO_FRESHNESS_CACHE_SECONDS  default 1800
//   REPO_FRESHNESS_MAX_DEPTH      default 6 (APT dists/<suite>/… signal is deep)
//   REPO_FRESHNESS_MAX_DIRS       default 3000 (per root; pool/ is pruned)

import { readdirSync, statSync, realpathSync } from 'node:fs'

const DEFAULT_ROOTS = [
  { id: 'rpm',  label: 'RPM Mirror (Enterprise Linux)', path: '/var/www/html/repos/rpm',     publicPath: '/repos/rpm/' },
  { id: 'deb',  label: 'DEB Mirror (Ubuntu)',           path: '/var/www/html/repos/deb',     publicPath: '/repos/deb/' },
  { id: 'pip',  label: 'Pip Mirror (PyPI)',             path: '/var/www/html/repos/piprepo', publicPath: '/repos/piprepo/' },
  // CRAN is served straight off the storage mount (nginx alias /cran/ in the
  // legacy site config); the /var/www/html/repos/cran dir is just a landing page.
  { id: 'cran', label: 'CRAN Mirror (R)',               path: '/mnt/storage/repos/cran',     publicPath: '/repos/cran/' },
]

// Directory names to NOT descend into during the freshness walk. APT's `pool/`
// holds the package payload (~46k dirs on the Ubuntu mirror) whose mtimes are
// upstream file mtimes, NOT sync times — it carries no "last synced" signal and
// its sheer size used to exhaust the dir budget before the walk ever reached
// the real signal (dists/<suite>/… index + dep11 metadata, which IS rewritten
// on every sync). Pruning it drops the Ubuntu walk from ~47k dirs to ~600 and
// lets the (raised) depth reach the actual freshness marker.
const PRUNE_DIRS = new Set(['pool'])

function parseRoots(env) {
  const raw = (env.REPO_FRESHNESS_PATHS || '').trim()
  if (!raw) return DEFAULT_ROOTS
  const roots = []
  for (const part of raw.split(';')) {
    const [id, label, path, publicPath] = part.split('|').map((s) => (s || '').trim())
    if (id && label && path) roots.push({ id, label, path, publicPath: publicPath || null })
  }
  return roots.length > 0 ? roots : DEFAULT_ROOTS
}

function scanRoot(rootPath, maxDepth, maxDirs) {
  const visited = new Set()
  let newestMs = 0
  let dirsScanned = 0
  let truncated = false

  const stack = [{ path: rootPath, depth: 0 }]
  while (stack.length > 0) {
    if (dirsScanned >= maxDirs) { truncated = true; break }
    const { path, depth } = stack.pop()

    let real
    try { real = realpathSync(path) } catch { continue }
    if (visited.has(real)) continue
    visited.add(real)

    let st
    try { st = statSync(real) } catch { continue }
    if (!st.isDirectory()) continue
    dirsScanned++
    if (st.mtimeMs > newestMs) newestMs = st.mtimeMs

    if (depth >= maxDepth) continue
    let entries
    try { entries = readdirSync(real, { withFileTypes: true }) } catch { continue }
    for (const entry of entries) {
      // Skip high-cardinality, signal-free subtrees (e.g. APT's pool/) so
      // raising the depth budget doesn't get consumed walking package payload.
      if (PRUNE_DIRS.has(entry.name)) continue
      // Only descend into things that can be directories; plain files are
      // irrelevant to the signal and statting them all is the expensive part.
      if (entry.isDirectory() || entry.isSymbolicLink()) {
        stack.push({ path: `${real}/${entry.name}`, depth: depth + 1 })
      }
    }
  }

  return { newestMs, dirsScanned, truncated }
}

let cache = null /* { atMs, payload } */

export function getRepoFreshness(env = process.env) {
  const cacheSeconds = Number.parseInt(env.REPO_FRESHNESS_CACHE_SECONDS || '1800', 10) || 1800
  const now = Date.now()
  if (cache && now - cache.atMs < cacheSeconds * 1000) return cache.payload

  const maxDepth = Number.parseInt(env.REPO_FRESHNESS_MAX_DEPTH || '6', 10) || 6
  const maxDirs  = Number.parseInt(env.REPO_FRESHNESS_MAX_DIRS  || '3000', 10) || 3000

  const repos = parseRoots(env).map((root) => {
    try {
      const { newestMs, dirsScanned, truncated } = scanRoot(root.path, maxDepth, maxDirs)
      if (newestMs === 0) {
        return { id: root.id, label: root.label, publicPath: root.publicPath, lastUpdated: null, error: 'unreadable_or_empty' }
      }
      return {
        id: root.id,
        label: root.label,
        publicPath: root.publicPath,
        lastUpdated: new Date(newestMs).toISOString(),
        ageDays: Math.floor((now - newestMs) / 86_400_000),
        dirsScanned,
        truncated,
      }
    } catch (err) {
      return { id: root.id, label: root.label, publicPath: root.publicPath, lastUpdated: null, error: err?.code || 'scan_failed' }
    }
  })

  const payload = { generatedAt: new Date(now).toISOString(), repos }
  cache = { atMs: now, payload }
  return payload
}

import { existsSync, readdirSync, statSync } from 'node:fs'
import { basename, extname, join, relative, resolve, sep } from 'node:path'
import {
  DEFAULT_LIVE_ANNOUNCEMENT_ROOTS,
  IGNORED_DIRECTORY_NAMES,
  LIVE_ANNOUNCEMENT_DEFAULTS,
  TEMP_FILE_EXTENSIONS,
} from './live-announcements-config.mjs'

let cachedPayload = null
let cacheExpiresAt = 0

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function formatDate(date) {
  return date.toISOString().slice(0, 10)
}

function normalizeUrlPrefix(value) {
  const trimmed = String(value || '/').trim()
  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return withLeadingSlash === '/' ? '/' : withLeadingSlash.replace(/\/+$/, '/')
}

function normalizeRoot(entry) {
  const [label, category, fsPath, urlPrefix] = entry

  if (!label || !category || !fsPath || !urlPrefix) {
    return null
  }

  return {
    label: String(label).trim(),
    category: String(category).trim(),
    fsPath: resolve(String(fsPath).trim()),
    urlPrefix: normalizeUrlPrefix(urlPrefix),
  }
}

export function parseConfiguredRoots(value) {
  if (!value?.trim()) {
    return DEFAULT_LIVE_ANNOUNCEMENT_ROOTS.map(normalizeRoot).filter(Boolean)
  }

  return value
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => normalizeRoot(entry.split('|')))
    .filter(Boolean)
}

function encodeHrefPath(path) {
  return path
    .split('/')
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join('/')
}

function hrefForFile(root, filePath) {
  const relPath = relative(root.fsPath, filePath).split(sep).join('/')
  const encodedRelPath = encodeHrefPath(relPath)

  if (root.urlPrefix === '/') {
    return `/${encodedRelPath}`
  }

  return `${root.urlPrefix}${encodedRelPath}`
}

function shouldSkipDirectory(name) {
  return name.startsWith('.') || IGNORED_DIRECTORY_NAMES.has(name)
}

function shouldIncludeFile(filePath) {
  const name = basename(filePath)
  const extension = extname(name).toLowerCase()

  return !name.startsWith('.') && !TEMP_FILE_EXTENSIONS.has(extension)
}

function walkFiles(root, dir, options, depth = 0, state = { scanned: 0 }) {
  if (depth > options.maxDepth || state.scanned >= options.maxFilesScanned) {
    return []
  }

  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return []
  }

  const files = []

  for (const entry of entries) {
    if (state.scanned >= options.maxFilesScanned) {
      break
    }

    const fullPath = join(dir, entry.name)

    if (entry.isDirectory()) {
      if (!shouldSkipDirectory(entry.name)) {
        files.push(...walkFiles(root, fullPath, options, depth + 1, state))
      }
      continue
    }

    if (!entry.isFile() || !shouldIncludeFile(fullPath)) {
      continue
    }

    state.scanned += 1

    try {
      const stats = statSync(fullPath)
      files.push({
        date: formatDate(stats.mtime),
        href: hrefForFile(root, fullPath),
        label: basename(fullPath),
        mtimeMs: stats.mtimeMs,
        root,
      })
    } catch {
      // File may have been moved during scan; skip it until the next poll.
    }
  }

  return files
}

function groupFiles(files, maxLabels) {
  const groups = new Map()

  for (const file of files) {
    const key = `${file.date}|${file.root.label}|${file.root.category}`
    const group = groups.get(key) ?? []
    group.push(file)
    groups.set(key, group)
  }

  return Array.from(groups.values()).map((group) => {
    const sorted = group.sort((a, b) => b.mtimeMs - a.mtimeMs)
    const latest = sorted[0]
    const labels = sorted.slice(0, maxLabels).map((file) => file.label)
    const remaining = sorted.length - labels.length
    const suffix = remaining > 0 ? `, and ${remaining} more` : ''

    return {
      text: `${latest.root.label} uploads detected: ${labels.join(', ')}${suffix}.`,
      href: latest.href,
      linkLabel: 'Open',
      date: latest.date,
      category: latest.root.category,
    }
  })
}

function getPayload(env) {
  const roots = parseConfiguredRoots(env.LIVE_ANNOUNCEMENT_PATHS)
  const options = {
    maxItems: positiveInteger(env.LIVE_ANNOUNCEMENT_MAX_ITEMS, LIVE_ANNOUNCEMENT_DEFAULTS.maxItems),
    maxDepth: positiveInteger(env.LIVE_ANNOUNCEMENT_MAX_DEPTH, LIVE_ANNOUNCEMENT_DEFAULTS.maxDepth),
    maxFilesScanned: positiveInteger(env.LIVE_ANNOUNCEMENT_MAX_FILES_SCANNED, LIVE_ANNOUNCEMENT_DEFAULTS.maxFilesScanned),
    maxLabels: positiveInteger(env.LIVE_ANNOUNCEMENT_MAX_LABELS, LIVE_ANNOUNCEMENT_DEFAULTS.maxLabels),
  }

  const files = roots.flatMap((root) => {
    if (!existsSync(root.fsPath)) {
      return []
    }

    return walkFiles(root, root.fsPath, options)
  })

  const announcements = groupFiles(files, options.maxLabels)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, options.maxItems)

  return {
    generatedAt: new Date().toISOString(),
    announcements,
    roots: roots.map((root) => ({
      label: root.label,
      category: root.category,
      urlPrefix: root.urlPrefix,
      exists: existsSync(root.fsPath),
    })),
  }
}

export function getLiveAnnouncementPayload(env = process.env) {
  const cacheSeconds = positiveInteger(env.LIVE_ANNOUNCEMENT_CACHE_SECONDS, LIVE_ANNOUNCEMENT_DEFAULTS.cacheSeconds)
  const now = Date.now()

  if (cachedPayload && now < cacheExpiresAt) {
    return cachedPayload
  }

  cachedPayload = getPayload(env)
  cacheExpiresAt = now + cacheSeconds * 1000
  return cachedPayload
}

/** Drop the cached payload — called when an admin edits the scan roots. */
export function clearLiveAnnouncementCache() {
  cachedPayload = null
  cacheExpiresAt = 0
}

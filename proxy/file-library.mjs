/**
 * Download library — the product-file directories /admin#content can upload into.
 *
 * Each entry maps a directory under the download webroot (/var/www/html, where
 * several names are symlinks into /mnt/storage) onto the public URL prefix the
 * site's download cards already use (see URLS.* in lib/data/constants.ts). The
 * proxy streams uploads straight to disk, so a 15 GB ISO never lands in memory.
 *
 * The per-directory extension allowlist is the security boundary: a name that
 * doesn't end in one of its directory's extensions is rejected before a single
 * byte is written, so the admin UI can never drop a .php/.sh/.conf into a tree
 * nginx serves. Names are validated against a strict character class and the
 * resolved path is re-checked to be inside the target directory, so "../" and
 * absolute paths cannot escape.
 *
 * In-flight uploads live beside the final file as `.<name>.upload-part`. That
 * suffix is deliberately NOT rsync's `.<name>.part` — the mirror scripts in
 * /var/www/customsh write those, and the two must never collide.
 */

import { accessSync, constants as FS, existsSync, mkdirSync, readdirSync, readFileSync, statSync, statfsSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

/** Filesystem root the public download URLs resolve against (nginx @legacy_files). */
export const LIBRARY_ROOT = resolve((process.env.DOWNLOAD_LIBRARY_ROOT || '/var/www/html').trim())

/** Admin-added targets live here, next to the other proxy registries. */
export const CUSTOM_DIRS_FILE = resolve(
  (process.env.DOWNLOAD_LIBRARY_REGISTRY || join(dirname(new URL(import.meta.url).pathname), 'file-library-dirs.json')).trim(),
)

/** Suffix for a partially-uploaded file. Distinct from rsync's `.part`. */
export const PART_SUFFIX = '.upload-part'

/** Refuse an upload that would leave less than this much room on the volume. */
export const FREE_SPACE_RESERVE_BYTES = 2 * 1024 * 1024 * 1024

const ARCHIVE = ['zip', 'tar', 'gz', 'tgz', 'bz2', 'xz', '7z']

/**
 * Extensions no target may ever accept, however it was configured. Anything the
 * webserver could execute, plus the same-origin script vectors (an .html or .svg
 * dropped in the webroot runs on the site origin and can read an admin's session).
 */
export const FORBIDDEN_EXTENSIONS = new Set([
  'php', 'php3', 'php4', 'php5', 'php6', 'php7', 'php8', 'phps', 'phtml', 'phar',
  'cgi', 'pl', 'py', 'rb', 'lua', 'jsp', 'jspx', 'asp', 'aspx', 'shtml',
  'html', 'htm', 'xhtml', 'js', 'mjs', 'svg', 'htaccess', 'htpasswd',
  'conf', 'service', 'so',
])
// .sh/.ps1/.bat stay allowed on purpose: Linux and Windows installers ship that
// way and nginx only ever hands them to the browser as downloads.

/**
 * Built-in upload targets. `dir` is relative to LIBRARY_ROOT; the public URL is
 * always `/<dir>` because nginx serves the webroot directly, so the two can
 * never drift apart.
 */
export const BUILT_IN_LIBRARY_DIRS = [
  {
    key: 'isos',
    family: 'ISOs',
    label: 'ISO images',
    hint: 'Linux and Windows installation media served from /isos.',
    dir: 'isos',
    extensions: ['iso', 'img'],
  },
  {
    key: 'mssoftware',
    family: 'Microsoft',
    label: 'Microsoft software (Office, ODT)',
    hint: 'Office installers and the Office Deployment Tool served from /mssoftware.',
    dir: 'mssoftware',
    extensions: ['exe', 'msi', 'img', 'iso', 'xml', ...ARCHIVE],
  },
  {
    key: 'msstore',
    family: 'Microsoft',
    label: 'Microsoft Store apps (AppX / MSIX)',
    hint: 'Sideloadable store packages served from /msstore/apps.',
    dir: 'msstore/apps',
    extensions: ['appx', 'appxbundle', 'msix', 'msixbundle', 'cab', ...ARCHIVE],
  },
  {
    key: 'pdq',
    family: 'PDQ',
    label: 'PDQ Deploy / Inventory',
    hint: 'PDQ installers and package XML served from /PDQ.',
    dir: 'PDQ',
    extensions: ['exe', 'msi', 'xml', ...ARCHIVE],
  },
  {
    key: 'visualstudio',
    family: 'Visual Studio',
    label: 'Visual Studio',
    hint: 'Visual Studio bootstrappers and layouts served from /VisualStudio.',
    dir: 'VisualStudio',
    extensions: ['exe', 'msi', 'iso', 'json', ...ARCHIVE],
  },
  // /var/www/html/{cisco,cuda,trivy} are symlinks into /mnt/storage; the
  // lexical containment check in validateLibraryDir resolves the LINK path, so
  // these stay inside LIBRARY_ROOT and land on the storage volume. Deliberately
  // NOT listed: /cran and /repos/* (rsync-managed upstream mirrors) and the
  // vs2022* offline layouts — a hand-upload into any of those is erased by the
  // next sync run in /var/www/customsh.
  {
    key: 'cisco',
    family: 'Networking',
    label: 'Cisco software',
    hint: 'Cisco IOS/firmware images and tooling served from /cisco.',
    dir: 'cisco',
    extensions: ['bin', 'tar', 'pkg', 'iso', 'exe', 'msi', 'pdf', 'txt', ...ARCHIVE],
  },
  {
    key: 'cuda',
    family: 'NVIDIA',
    label: 'CUDA / NVIDIA drivers',
    hint: 'CUDA toolkits and NVIDIA driver packages served from /cuda.',
    dir: 'cuda',
    extensions: ['run', 'deb', 'rpm', 'exe', 'msi', 'pdf', ...ARCHIVE],
  },
  {
    key: 'trivy',
    family: 'Security',
    label: 'Trivy scanner + DB',
    hint: 'Trivy binaries and offline vulnerability DB bundles served from /trivy.',
    dir: 'trivy',
    extensions: ['deb', 'rpm', 'exe', 'db', 'json', ...ARCHIVE],
  },
  {
    key: 'vs-ssms',
    family: 'Microsoft',
    label: 'SQL Server Management Studio',
    hint: 'SSMS offline layout served from /VisualStudio/vs_ssms.',
    dir: 'VisualStudio/vs_ssms',
    extensions: ['exe', 'msi', 'json', 'pdf', ...ARCHIVE],
  },
  {
    key: 'trellix',
    family: 'Trellix',
    label: 'Trellix agent / ENS',
    hint: 'Agent and ENS packages served from /trellix.',
    dir: 'trellix',
    extensions: ['exe', 'msi', 'sh', 'rpm', 'deb', ...ARCHIVE],
  },
  {
    key: 'evaluate-stig',
    family: 'Evaluate-STIG',
    label: 'Evaluate-STIG bundles',
    hint: 'STIG content and Evaluate-STIG releases served from /evaluate-stig.',
    dir: 'evaluate-stig',
    extensions: ['pdf', 'cab', 'xml', ...ARCHIVE],
  },
  {
    key: 'videos',
    family: 'Documentation',
    label: 'Training videos',
    hint: 'Recorded walkthroughs served from /videos.',
    dir: 'videos',
    extensions: ['mp4', 'webm', 'm4v', 'vtt', 'srt'],
  },
  {
    key: 'docs',
    family: 'Documentation',
    label: 'Documentation files',
    hint: 'Guides and reference documents served from /docs.',
    dir: 'docs',
    extensions: ['pdf', 'docx', 'xlsx', 'pptx', 'txt', 'md', 'csv', ...ARCHIVE],
  },
  // VMware ships per-major-version directories, and the product cards link
  // straight into them (URLS.vmware + /7|/8|/9|/tools), so each is its own
  // target rather than one flat /vmware.
  {
    key: 'vmware-7',
    family: 'VMware',
    label: 'VMware 7 (vCenter / ESXi)',
    hint: 'vCenter 7 and ESXi 7 installers and depot bundles served from /vmware/7.',
    dir: 'vmware/7',
    extensions: ['iso', 'exe', 'msi', 'ova', 'ovf', 'vmdk', 'pdf', ...ARCHIVE],
  },
  {
    key: 'vmware-8',
    family: 'VMware',
    label: 'VMware 8 (vCenter / ESXi)',
    hint: 'vCenter 8 and ESXi 8 installers and depot bundles served from /vmware/8.',
    dir: 'vmware/8',
    extensions: ['iso', 'exe', 'msi', 'ova', 'ovf', 'vmdk', 'pdf', ...ARCHIVE],
  },
  {
    key: 'vmware-9',
    family: 'VMware',
    label: 'VMware 9 (vCenter / ESXi)',
    hint: 'vCenter 9 and ESXi 9 installers and depot bundles served from /vmware/9.',
    dir: 'vmware/9',
    extensions: ['iso', 'exe', 'msi', 'ova', 'ovf', 'vmdk', 'pdf', ...ARCHIVE],
  },
  // Three separate product folders on disk, NOT one /vmware/tools. The registry
  // used to claim `vmware/tools`, which exists nowhere upstream: the first
  // upload to it created an empty directory beside the real ones, and the file
  // landed where nothing links to it. Each key now names the folder that
  // /mnt/storage/vmware actually has.
  {
    key: 'vmware-tools',
    family: 'VMware',
    label: 'VMware Tools',
    hint: 'Guest-OS tools packages and release notes served from /vmware/vmware-tools.',
    dir: 'vmware/vmware-tools',
    extensions: ['exe', 'msi', 'iso', 'bundle', 'pdf', ...ARCHIVE],
  },
  {
    key: 'vmware-vmrc',
    family: 'VMware',
    label: 'VMware Remote Console (VMRC)',
    hint: 'Remote Console installers and release notes served from /vmware/vmrc.',
    dir: 'vmware/vmrc',
    extensions: ['exe', 'msi', 'iso', 'bundle', 'pdf', ...ARCHIVE],
  },
  {
    key: 'vmware-workstation',
    family: 'VMware',
    label: 'VMware Workstation Pro',
    hint: 'Workstation Pro installers and release notes served from /vmware/vmware-workstation.',
    dir: 'vmware/vmware-workstation',
    extensions: ['exe', 'msi', 'bundle', 'pdf', ...ARCHIVE],
  },
  {
    key: 'vmware',
    family: 'VMware',
    label: 'VMware (top level)',
    hint: 'Anything that belongs directly under /vmware, such as upgrade guides.',
    dir: 'vmware',
    extensions: ['iso', 'exe', 'msi', 'ova', 'ovf', 'vmdk', 'pdf', ...ARCHIVE],
  },
]

const BUILT_IN_KEYS = new Set(BUILT_IN_LIBRARY_DIRS.map((entry) => entry.key))

/* ─── Admin-added targets ───────────────────────────────────────────────
 *
 * Sysadmins add new upload locations from /admin#content rather than waiting on
 * a code change. They are stored in their own JSON registry (same shape as the
 * built-ins minus the guarantees), merged behind them at read time, and can
 * never shadow a built-in key or reach outside LIBRARY_ROOT.
 */

const DIR_KEY_RE = /^[a-z][a-z0-9-]{1,39}$/
/** Relative path segments: alphanumerics plus . _ - , separated by single "/". */
const DIR_PATH_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*(\/[A-Za-z0-9][A-Za-z0-9._-]*)*$/
const EXTENSION_RE = /^[a-z0-9]{1,12}$/

/** Read the admin-added targets. A missing or corrupt file means "none". */
export function readCustomLibraryDirs() {
  try {
    const parsed = JSON.parse(readFileSync(CUSTOM_DIRS_FILE, 'utf8'))
    if (Array.isArray(parsed?.dirs)) return parsed.dirs
  } catch { /* absent registry is the normal first-run state */ }
  return []
}

function writeCustomLibraryDirs(dirs, actor) {
  writeFileSync(
    CUSTOM_DIRS_FILE,
    JSON.stringify({ updatedAt: new Date().toISOString(), updatedBy: actor || 'admin', dirs }, null, 2),
    'utf8',
  )
}

/**
 * Validate one admin-supplied target. Returns `{ ok: true, entry }` with a
 * normalized record, or `{ ok: false, error }`. Never throws, never writes.
 */
export function validateLibraryDir(raw, { existingKeys = new Set() } = {}) {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'A location definition is required.' }

  const key = String(raw.key || '').trim().toLowerCase()
  if (!DIR_KEY_RE.test(key)) {
    return { ok: false, error: 'ID must be 2–40 characters: lowercase letters, numbers, and dashes, starting with a letter.' }
  }
  if (BUILT_IN_KEYS.has(key)) return { ok: false, error: `"${key}" is a built-in location and can't be redefined.` }
  if (existingKeys.has(key)) return { ok: false, error: `Another location already uses the ID "${key}".` }

  const label = String(raw.label ?? '').trim().slice(0, 80)
  if (!label) return { ok: false, error: 'Give the location a name admins will recognise.' }
  const family = String(raw.family ?? '').trim().slice(0, 40) || 'Other'
  const hint = String(raw.hint ?? '').trim().slice(0, 200)

  const rawDir = String(raw.dir ?? '').trim()
  if (!rawDir) return { ok: false, error: 'A folder path is required.' }
  // Reject an absolute path rather than quietly re-rooting it: "/etc/nginx"
  // would otherwise become <webroot>/etc/nginx, which is safe but not what the
  // admin who typed it expected.
  if (rawDir.startsWith('/')) {
    return { ok: false, error: 'Enter the folder relative to the download webroot (e.g. "cisco"), not an absolute path.' }
  }
  const dir = rawDir.replace(/\/+$/g, '')
  if (!dir) return { ok: false, error: 'A folder path is required.' }
  if (dir.includes('..')) return { ok: false, error: 'Folder path cannot contain "..".' }
  if (!DIR_PATH_RE.test(dir)) {
    return { ok: false, error: 'Folder path must be a relative path like "cisco" or "vmware/9" — no leading slash, no spaces.' }
  }
  // Final containment check: whatever the regex allowed, the resolved path must
  // still sit under the download webroot.
  const absolute = resolve(LIBRARY_ROOT, dir)
  if (absolute !== join(LIBRARY_ROOT, dir) || !absolute.startsWith(`${LIBRARY_ROOT}/`)) {
    return { ok: false, error: 'Folder path must stay inside the download webroot.' }
  }

  const rawExtensions = Array.isArray(raw.extensions)
    ? raw.extensions
    : String(raw.extensions ?? '').split(/[\s,]+/)
  const extensions = []
  for (const value of rawExtensions) {
    const extension = String(value || '').trim().toLowerCase().replace(/^\./, '')
    if (!extension) continue
    if (!EXTENSION_RE.test(extension)) return { ok: false, error: `"${extension}" isn't a valid file extension.` }
    if (FORBIDDEN_EXTENSIONS.has(extension)) {
      return { ok: false, error: `.${extension} can't be allowed — the web server would treat it as code, not a download.` }
    }
    if (!extensions.includes(extension)) extensions.push(extension)
  }
  if (extensions.length === 0) return { ok: false, error: 'List at least one file extension, e.g. "iso, zip, exe".' }
  if (extensions.length > 24) return { ok: false, error: 'That is more than 24 extensions — split the location instead.' }

  return { ok: true, entry: { key, family, label, hint, dir, extensions } }
}

/**
 * Add or replace an admin-defined target. `createDir` makes the folder when it
 * doesn't exist yet, which is the normal case for a brand-new product area.
 */
export function saveCustomLibraryDir(raw, { actor = 'admin', createDir = false } = {}) {
  const existing = readCustomLibraryDirs()
  // Normalize the key the same way validation will, so re-saving an existing
  // location updates it instead of colliding with itself.
  const key = String(raw?.key || '').trim().toLowerCase()
  const replacing = existing.some((entry) => entry.key === key)
  const otherKeys = new Set(existing.filter((entry) => entry.key !== key).map((entry) => entry.key))
  const validated = validateLibraryDir(raw, { existingKeys: otherKeys })
  if (!validated.ok) return validated

  const path = libraryDirPath(validated.entry)
  if (!existsSync(path)) {
    if (!createDir) {
      return { ok: false, error: `${path} doesn't exist. Tick "create the folder" to have the server make it.` }
    }
    try {
      mkdirSync(path, { recursive: true, mode: 0o755 })
    } catch (err) {
      return { ok: false, error: `Could not create ${path}: ${err.message}` }
    }
  } else if (!statSync(path).isDirectory()) {
    return { ok: false, error: `${path} exists but is a file, not a folder.` }
  }

  const dirs = existing.filter((entry) => entry.key !== validated.entry.key)
  dirs.push(validated.entry)
  dirs.sort((a, b) => a.label.localeCompare(b.label))
  try {
    writeCustomLibraryDirs(dirs, actor)
  } catch (err) {
    return { ok: false, error: `Could not save the location list: ${err.message}` }
  }
  return { ok: true, entry: validated.entry, replaced: replacing }
}

/** Remove an admin-defined target. Built-ins are not removable. */
export function deleteCustomLibraryDir(key, { actor = 'admin' } = {}) {
  if (BUILT_IN_KEYS.has(key)) return { ok: false, error: 'Built-in locations cannot be removed.' }
  const existing = readCustomLibraryDirs()
  const dirs = existing.filter((entry) => entry.key !== key)
  if (dirs.length === existing.length) return { ok: false, error: `No custom location with the ID "${key}".` }
  try {
    writeCustomLibraryDirs(dirs, actor)
  } catch (err) {
    return { ok: false, error: `Could not save the location list: ${err.message}` }
  }
  // Only the entry is dropped — the folder and its files are left alone, so
  // removing a location can never delete somebody's downloads.
  return { ok: true }
}

/** Built-in targets followed by the admin-added ones. */
export function allLibraryDirs() {
  const custom = readCustomLibraryDirs()
    .map((raw) => validateLibraryDir(raw, {}))
    .filter((result) => result.ok)
    .map((result) => ({ ...result.entry, custom: true }))
  return [...BUILT_IN_LIBRARY_DIRS.map((entry) => ({ ...entry, custom: false })), ...custom]
}

/** Look up a target by key across built-ins and admin-added entries. */
export function findLibraryDir(key) {
  if (typeof key !== 'string' || !key) return null
  return allLibraryDirs().find((entry) => entry.key === key) || null
}

/** Absolute path of a target directory. */
export function libraryDirPath(entry) {
  return resolve(LIBRARY_ROOT, entry.dir)
}

/** Public URL prefix — always the directory itself, since nginx serves the
 *  webroot directly and a hand-maintained second copy could drift. */
export function libraryUrlPath(entry) {
  return `/${entry.dir}`
}

/** Existence / writability / free space for one target, for the admin UI. */
export function libraryDirState(entry) {
  const path = libraryDirPath(entry)
  const state = { path, exists: false, writable: false, freeBytes: null }
  try {
    state.exists = statSync(path).isDirectory()
  } catch {
    return state
  }
  try {
    accessSync(path, FS.W_OK)
    state.writable = true
  } catch { /* read-only target — the UI greys it out */ }
  try {
    const stats = statfsSync(path)
    state.freeBytes = stats.bavail * stats.bsize
  } catch { /* statfs unsupported → leave null */ }
  return state
}

/** Lowercase extension of a filename, '' when it has none. */
export function fileExtension(name) {
  const match = /\.([A-Za-z0-9]+)$/.exec(String(name || ''))
  return match ? match[1].toLowerCase() : ''
}

/**
 * Validate an admin-supplied filename for one target directory.
 * Returns `{ ok: true, name }` or `{ ok: false, error }` — never throws.
 */
export function safeLibraryName(entry, rawName) {
  const leaf = String(rawName || '').split(/[\\/]/).pop()?.trim() || ''
  if (!leaf) return { ok: false, error: 'A filename is required.' }
  if (leaf.length > 180) return { ok: false, error: 'Filename is longer than 180 characters.' }
  // Must start alphanumeric (no dotfiles, no leading dash) and stay inside a
  // conservative set — that alone rules out "/", NUL, and shell metacharacters.
  if (!/^[A-Za-z0-9][A-Za-z0-9._+()-]*$/.test(leaf)) {
    return { ok: false, error: 'Use letters, numbers, dot, dash, underscore, plus, or parentheses only.' }
  }
  if (leaf.includes('..')) return { ok: false, error: 'Filename cannot contain "..".' }
  if (leaf.endsWith(PART_SUFFIX)) return { ok: false, error: 'That suffix is reserved for uploads in progress.' }
  const extension = fileExtension(leaf)
  if (!extension) return { ok: false, error: 'Filename needs an extension.' }
  if (!entry.extensions.includes(extension)) {
    return {
      ok: false,
      error: `.${extension} isn't allowed in ${entry.label}. Allowed: ${entry.extensions.map((e) => `.${e}`).join(', ')}`,
    }
  }
  // Belt and braces: the resolved path must still sit directly in the target.
  const dirPath = libraryDirPath(entry)
  if (resolve(dirPath, leaf) !== join(dirPath, leaf)) return { ok: false, error: 'Invalid filename.' }
  return { ok: true, name: leaf }
}

/** Final + in-progress paths for a validated name. */
export function libraryPaths(entry, name) {
  const dirPath = libraryDirPath(entry)
  return {
    dirPath,
    finalPath: join(dirPath, name),
    partPath: join(dirPath, `.${name}${PART_SUFFIX}`),
  }
}

/** Bytes already stored for an in-progress upload (0 when there is none). */
export function partialOffset(entry, name) {
  const { partPath } = libraryPaths(entry, name)
  try {
    const stats = statSync(partPath)
    return stats.isFile() ? stats.size : 0
  } catch {
    return 0
  }
}

/**
 * Files in one target directory. Uploads still in progress come back as
 * `{ partial: true }` entries keyed by their eventual name, so the UI can offer
 * "resume" instead of pretending the file isn't there. Subdirectories are
 * skipped — uploads always land flat inside the target.
 */
export function listLibraryFiles(entry, limit = 500) {
  const dirPath = libraryDirPath(entry)
  if (!existsSync(dirPath)) return []
  const files = []
  for (const entryName of readdirSync(dirPath)) {
    if (files.length >= limit) break
    const partial = entryName.startsWith('.') && entryName.endsWith(PART_SUFFIX)
    if (entryName.startsWith('.') && !partial) continue
    let stats
    try {
      stats = statSync(join(dirPath, entryName))
    } catch {
      continue
    }
    if (!stats.isFile()) continue
    const name = partial ? entryName.slice(1, -PART_SUFFIX.length) : entryName
    files.push({
      name,
      bytes: stats.size,
      mtime: stats.mtime.toISOString(),
      url: `${libraryUrlPath(entry)}/${name}`,
      partial,
    })
  }
  return files.sort((a, b) => a.name.localeCompare(b.name))
}

/** Public shape of one target for the admin UI. */
export function describeLibraryDir(entry) {
  const state = libraryDirState(entry)
  return {
    key: entry.key,
    family: entry.family,
    label: entry.label,
    hint: entry.hint,
    urlPath: libraryUrlPath(entry),
    extensions: entry.extensions,
    /** True for admin-added locations — only those may be edited or removed. */
    custom: entry.custom === true,
    dir: entry.dir,
    path: state.path,
    exists: state.exists,
    writable: state.writable,
    freeBytes: state.freeBytes,
  }
}

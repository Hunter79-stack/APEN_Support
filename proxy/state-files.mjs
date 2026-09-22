/**
 * JSON state files for the proxy processes — every store goes through
 * loadJson / saveJson.
 *
 * loadJson tells "absent" (or empty — what a killed non-atomic write leaves)
 * from "present but unparseable / wrong shape". The old loaders treated both
 * as "use defaults", and the first later save then persisted those defaults
 * over the last good data. A bad file is now moved aside to
 * <file>.corrupt-<epoch ms>.json so nothing is destroyed, the store starts from its
 * default, and an alert is raised in /admin (reportStateFileProblems). If the
 * bad file cannot be moved aside, saveJson refuses to write that path at all.
 *
 * saveJson is atomic (temp file + rename) so a kill mid-write cannot truncate
 * a store, and 0600 because these files hold session ids, CSRF tokens, chat
 * transcripts and usernames. The mode goes on the temp file and is re-asserted
 * with chmodSync because writeFileSync's mode is masked by the umask.
 */
import { chmodSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'

/** { path, reason, movedTo } per file that failed to load; site-stats raises an /admin alert for each at startup. */
export const stateFileProblems = []
const unwritableStateFiles = new Set()

/**
 * @template T
 * @param {string} path
 * @param {T} fallback returned when the file is absent, empty or bad
 * @param {(value: any) => boolean} [isValid] shape check; a failing file is quarantined
 * @returns {T}
 */
export function loadJson(path, fallback, isValid = () => true) {
  let reason
  try {
    const raw = readFileSync(path, 'utf8')
    if (!raw.trim()) return fallback
    const parsed = JSON.parse(raw)
    if (isValid(parsed)) return parsed
    reason = 'unexpected shape'
  } catch (err) {
    if (err?.code === 'ENOENT') return fallback
    reason = err?.message || String(err)
  }
  const movedTo = `${path}.corrupt-${Date.now()}.json`
  try {
    renameSync(path, movedTo)
    console.error(`[state-files] STATE FILE CORRUPT ${path} (${reason}) — moved to ${movedTo}; starting from defaults.`)
    stateFileProblems.push({ path, reason, movedTo })
  } catch (moveErr) {
    unwritableStateFiles.add(path)
    console.error(`[state-files] STATE FILE CORRUPT ${path} (${reason}) and it could not be moved aside (${moveErr?.message}); saves to it are refused until it is fixed and the proxy restarted.`)
    stateFileProblems.push({ path, reason, movedTo: null })
  }
  return fallback
}

export function saveJson(path, value, label = path) {
  if (unwritableStateFiles.has(path)) {
    console.error(`[state-files] ${label} NOT saved: ${path} failed to load at startup and will not be overwritten.`)
    return false
  }
  const tmpPath = `${path}.tmp-${process.pid}-${Date.now()}.json`
  try {
    writeFileSync(tmpPath, JSON.stringify(value, null, 2), { encoding: 'utf8', mode: 0o600 })
    chmodSync(tmpPath, 0o600)
    renameSync(tmpPath, path)
    return true
  } catch (err) {
    console.error(`[state-files] ${label} save failed (${path}):`, err)
    try { rmSync(tmpPath, { force: true }) } catch { /* ignore */ }
    return false
  }
}

export const isPlainObject = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v)

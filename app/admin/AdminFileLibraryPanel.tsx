'use client'

/**
 * AdminFileLibraryPanel — upload ISOs, EXEs, and other product files, then point
 * a download card at them without touching source or a shell.
 *
 * The logo uploader elsewhere in Admin buffers a 6 MiB image in memory; that is
 * hopeless for a 15 GB ISO, so this panel drives the resumable
 * /api/admin/file-upload endpoint instead: the browser posts the tail of the
 * file, the proxy appends it to `.<name>.upload-part`, and a dropped connection
 * resumes from the stored offset rather than restarting. Everything an admin
 * needs is on this one card — pick a directory, drop a file, then attach it to
 * an existing card or create a new one.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GlowCard } from '@/components/ui/spotlight-card'
import { adminContentClient, type LibraryDir, type LibraryFile } from '@/lib/data/admin-content'
import { APENSUPPORT_BASE } from '@/lib/data/constants'
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  FileUp,
  FolderPlus,
  HardDrive,
  Link2,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react'

/** One editable section a finished upload can be wired into. */
export interface AttachTarget {
  scope: string
  family: string
  /** Dropdown label, e.g. "ISOs — Ubuntu ISOs". */
  label: string
  /**
   * Download folder this section's existing links already point at, e.g.
   * "/vmware/8". Lets the panel derive the upload location from the section an
   * admin picked, instead of asking them to know the folder layout. Empty when
   * the section links to site routes rather than files.
   */
  urlPrefix: string
  /** Field holding the download URL (may be dotted, e.g. "installer.href"). */
  urlField: string
  /** Field holding the bare filename, when the card shape has one. */
  fileField?: string
  cards: Array<{ id: string; title: string }>
}

export interface AttachResult {
  ok: boolean
  error?: string
}

function formatBytes(bytes: number | null | undefined): string {
  const value = Number(bytes)
  if (!Number.isFinite(value) || value < 0) return '—'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let index = 0
  let scaled = value
  while (scaled >= 1024 && index < units.length - 1) {
    scaled /= 1024
    index += 1
  }
  return `${scaled >= 100 || index === 0 ? Math.round(scaled) : scaled.toFixed(1)} ${units[index]}`
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—'
  if (seconds < 60) return `${Math.ceil(seconds)}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ${Math.round(seconds % 60)}s`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

export function AdminFileLibraryPanel({
  attachTargets,
  onAttach,
  onCreateCard,
  onUploaded,
}: {
  attachTargets: AttachTarget[]
  onAttach: (target: AttachTarget, cardId: string, file: { name: string; url: string }) => Promise<AttachResult>
  onCreateCard: (target: AttachTarget, title: string, file: { name: string; url: string }) => Promise<AttachResult>
  /** Reports a finished upload so the Publish card can list it as pending. */
  onUploaded?: (file: { name: string; url: string }) => void
}) {
  const [dirs, setDirs] = useState<LibraryDir[]>([])
  // Starts blank on purpose: the panel shows nothing but the picker until an
  // admin says where the file belongs, so /admin#content opens quiet instead of
  // pre-loaded with one arbitrary directory's file list.
  const [dirKey, setDirKey] = useState('')
  // What step 1 shows. Kept apart from dirKey because two product sections can
  // legitimately share one folder, so the folder can't identify the choice.
  const [locationValue, setLocationValue] = useState('')
  // Names uploaded in this session — their rows offer Publish instead of the
  // browse actions, since publishing is the only thing left to do with them.
  const [uploadedThisSession, setUploadedThisSession] = useState<string[]>([])
  const [files, setFiles] = useState<LibraryFile[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  // Step 2's queue. Each row keeps the File plus the name it will be stored
  // under, editable before upload — admins fix vendor filenames here instead of
  // renaming on the server afterwards.
  const [queue, setQueue] = useState<Array<{ file: File; name: string }>>([])
  const [currentUpload, setCurrentUpload] = useState<{ name: string; index: number; total: number } | null>(null)
  // Renaming a file already on the server (step 3 rows).
  const [renameFrom, setRenameFrom] = useState('')
  const [renameDraft, setRenameDraft] = useState('')
  const [renameBusy, setRenameBusy] = useState(false)
  const [renameMessage, setRenameMessage] = useState('')
  // Deleting a server file. `deleteConfirm` holds what the admin has typed —
  // the filename must be retyped exactly, because this unlinks multi-GB media
  // that nothing on this box can restore. `deleteBlocked` is set only by the
  // server's 409 reference guard and is what unlocks "Delete anyway".
  const [deleteTarget, setDeleteTarget] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteMessage, setDeleteMessage] = useState('')
  const [deleteBlocked, setDeleteBlocked] = useState(false)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<{ sent: number; total: number } | null>(null)
  const [rate, setRate] = useState<{ bytesPerSecond: number; etaSeconds: number } | null>(null)
  const [uploadMessage, setUploadMessage] = useState('')
  const [uploadState, setUploadState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')
  const abortRef = useRef<AbortController | null>(null)
  const rateRef = useRef<{ at: number; sent: number } | null>(null)

  // Attach-to-card state — driven by the "Use in a card" button on a file row.
  const [attachFile, setAttachFile] = useState<LibraryFile | null>(null)
  const [attachScope, setAttachScope] = useState('')
  const [attachCardId, setAttachCardId] = useState('')
  const [newCardTitle, setNewCardTitle] = useState('')
  const [attachState, setAttachState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle')
  const [attachMessage, setAttachMessage] = useState('')
  const [copied, setCopied] = useState('')

  // "Add a location" — lets sysadmins register new upload folders themselves
  // instead of waiting on a code change.
  const [showNewDir, setShowNewDir] = useState(false)
  const [newDir, setNewDir] = useState({ label: '', family: '', dir: '', extensions: '', createDir: true })
  const [newDirState, setNewDirState] = useState<'idle' | 'saving' | 'error'>('idle')
  const [newDirMessage, setNewDirMessage] = useState('')

  const activeDir = useMemo(() => dirs.find((d) => d.key === dirKey) ?? null, [dirs, dirKey])
  const attachTarget = useMemo(
    () => attachTargets.find((t) => t.scope === attachScope) ?? null,
    [attachTargets, attachScope],
  )

  const refresh = useCallback(async (key: string) => {
    setLoading(true)
    const data = await adminContentClient.listFileLibrary(key)
    setLoading(false)
    if (!data) {
      setLoadError('Could not reach the admin file API. Is the site-stats proxy running?')
      return
    }
    setLoadError('')
    setDirs(data.dirs)
    setFiles(data.files)
  }, [])

  useEffect(() => { void refresh(dirKey) }, [dirKey, refresh])

  /** Absolute, user-facing download URL for a stored file. */
  const publicUrl = useCallback((file: LibraryFile) => `${APENSUPPORT_BASE}${file.url}`, [])

  /**
   * Step 1's options: the product sections an admin already thinks in terms of,
   * each carrying the folder its own links resolve to. Folders no section claims
   * (a new product area, or one whose cards aren't built yet) still appear, so
   * nothing on the server becomes unreachable — they're just listed last.
   */
  const locationOptions = useMemo(() => {
    const byUrlPath = new Map(dirs.map((dir) => [dir.urlPath, dir]))
    const claimed = new Set<string>()
    const sections = []
    for (const target of attachTargets) {
      const dir = target.urlPrefix ? byUrlPath.get(target.urlPrefix) : undefined
      if (!dir) continue
      claimed.add(dir.key)
      sections.push({ value: `s:${target.scope}`, label: target.label, family: target.family, dirKey: dir.key, scope: target.scope })
    }
    const unclaimed = dirs
      .filter((dir) => !claimed.has(dir.key))
      .map((dir) => ({ value: `d:${dir.key}`, label: dir.label, family: `${dir.family} — no card points here yet`, dirKey: dir.key, scope: '' }))
    return [...sections, ...unclaimed]
  }, [attachTargets, dirs])

  const optionsByFamily = useMemo(() => {
    const groups = new Map<string, typeof locationOptions>()
    for (const option of locationOptions) {
      const list = groups.get(option.family) ?? []
      list.push(option)
      groups.set(option.family, list)
    }
    return Array.from(groups.entries())
  }, [locationOptions])

  const targetsByFamily = useMemo(() => {
    const groups = new Map<string, AttachTarget[]>()
    for (const target of attachTargets) {
      const list = groups.get(target.family) ?? []
      list.push(target)
      groups.set(target.family, list)
    }
    return Array.from(groups.entries())
  }, [attachTargets])

  /** Derive the storage id from the folder path so admins never type one. */
  const newDirKey = newDir.dir.trim().replace(/^\/+|\/+$/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

  async function submitNewDir() {
    if (newDirState === 'saving') return
    setNewDirState('saving')
    setNewDirMessage('')
    const result = await adminContentClient.saveLibraryDir({
      key: newDirKey,
      label: newDir.label.trim(),
      family: newDir.family.trim() || 'Other',
      dir: newDir.dir.trim(),
      extensions: newDir.extensions,
      createDir: newDir.createDir,
    })
    if (!result.ok) {
      setNewDirState('error')
      setNewDirMessage(result.error)
      return
    }
    setNewDirState('idle')
    setDirs(result.dirs)
    setNewDir({ label: '', family: '', dir: '', extensions: '', createDir: true })
    setShowNewDir(false)
    setDirKey(newDirKey)
  }

  async function removeDir(dir: LibraryDir) {
    if (!window.confirm(`Remove "${dir.label}" from the list of upload locations?\n\nFiles already in ${dir.path} are left untouched.`)) return
    const result = await adminContentClient.deleteLibraryDir(dir.key)
    if (!result.ok) {
      setNewDirState('error')
      setNewDirMessage(result.error)
      return
    }
    setDirs(result.dirs)
    if (dirKey === dir.key) setDirKey(result.dirs[0]?.key ?? 'isos')
  }

  function addFiles(list: FileList | File[] | null) {
    const incoming = Array.from(list ?? [])
    if (incoming.length === 0) return
    setQueue((current) => {
      const taken = new Set(current.map((item) => item.name))
      return [
        ...current,
        ...incoming.filter((file) => !taken.has(file.name)).map((file) => ({ file, name: file.name })),
      ]
    })
    setUploadState('idle')
    setUploadMessage('')
  }

  function clearQueue() {
    setQueue([])
    setProgress(null)
    setRate(null)
    setUploadState('idle')
    setUploadMessage('')
  }

  /** Mirror of the server's filename rules (safeLibraryName) so a bad rename
   *  is flagged in the row instead of arriving as a 400 after gigabytes. */
  function extensionOf(name: string): string {
    return (/\.([A-Za-z0-9]+)$/.exec(name)?.[1] ?? '').toLowerCase()
  }
  function queueRowError(name: string): string {
    const trimmed = name.trim()
    if (!trimmed) return 'A filename is required.'
    if (!/^[A-Za-z0-9][A-Za-z0-9._+()-]*$/.test(trimmed) || trimmed.includes('..')) {
      return 'Letters, numbers, dot, dash, underscore, plus, parentheses only.'
    }
    const extension = extensionOf(trimmed)
    if (!extension) return 'Filename needs an extension.'
    if (activeDir && !activeDir.extensions.includes(extension)) {
      return `.${extension} isn't accepted here — allowed: ${activeDir.extensions.map((e) => `.${e}`).join(' ')}`
    }
    return ''
  }

  async function startUpload(resume: boolean) {
    if (queue.length === 0 || !activeDir || uploading) return
    setUploading(true)
    setUploadState('busy')
    setUploadMessage('')

    // Sequential on purpose: these are multi-gigabyte files sharing one uplink.
    // Parallel uploads would only divide the same bandwidth and multiply the
    // partial files left behind by a dropped connection.
    const snapshot = [...queue]
    for (let index = 0; index < snapshot.length; index++) {
      const item = snapshot[index]
      const controller = new AbortController()
      abortRef.current = controller
      rateRef.current = null
      setProgress(null)
      setRate(null)
      setCurrentUpload({ name: item.name, index: index + 1, total: snapshot.length })

      const result = await adminContentClient.uploadLibraryFile(dirKey, item.file, {
        resume,
        name: item.name,
        signal: controller.signal,
        onProgress: ({ sent, total }) => {
          setProgress({ sent, total })
          const now = Date.now()
          const previous = rateRef.current
          // Sample at ~1 s so the readout doesn't jitter on every progress event.
          if (!previous) {
            rateRef.current = { at: now, sent }
          } else if (now - previous.at >= 1000) {
            const bytesPerSecond = ((sent - previous.sent) * 1000) / (now - previous.at)
            rateRef.current = { at: now, sent }
            if (bytesPerSecond > 0) {
              setRate({ bytesPerSecond, etaSeconds: (total - sent) / bytesPerSecond })
            }
          }
        },
      })
      abortRef.current = null

      if (!result.ok) {
        // Stop the run but keep the remaining rows queued — the admin fixes the
        // one problem and presses Upload again for the rest.
        setUploading(false)
        setCurrentUpload(null)
        setUploadState('error')
        const remaining = snapshot.length - index - 1
        setUploadMessage(`${item.name}: ${result.error}${remaining > 0 ? ` — ${remaining} more file${remaining === 1 ? '' : 's'} still queued.` : ''}`)
        await refresh(dirKey)
        return
      }

      const url = result.url || `${activeDir.urlPath}/${result.name}`
      setUploadedThisSession((names) => (names.includes(result.name) ? names : [...names, result.name]))
      onUploaded?.({ name: result.name, url })
      setQueue((current) => current.filter((row) => row.name !== item.name))
    }

    setUploading(false)
    setCurrentUpload(null)
    setUploadState('done')
    setUploadMessage(`${snapshot.length} file${snapshot.length === 1 ? '' : 's'} uploaded to ${activeDir.label}. Point a card at each, then Publish & rebuild.`)
    setFileInputKey((key) => key + 1)
    await refresh(dirKey)
  }

  async function submitRename() {
    const to = renameDraft.trim()
    if (renameBusy || !renameFrom || !to) return
    setRenameBusy(true)
    setRenameMessage('')
    const result = await adminContentClient.renameLibraryFile(dirKey, renameFrom, to)
    setRenameBusy(false)
    if (!result.ok) {
      setRenameMessage(result.error)
      return
    }
    // Keep the session's pending-publish list pointing at the new name.
    setUploadedThisSession((names) => names.map((name) => (name === renameFrom ? result.name : name)))
    setRenameFrom('')
    setRenameDraft('')
    // Say what the rename dragged along: overrides followed automatically;
    // source-baked links can't, so those need a card edit + publish.
    setUploadState(result.staleBuiltPages > 0 ? 'error' : 'done')
    setUploadMessage(
      `Renamed to ${result.name}.`
      + (result.updatedOverrides > 0 ? ` ${result.updatedOverrides} card link${result.updatedOverrides === 1 ? '' : 's'} updated automatically — Publish & rebuild to bake them in.` : '')
      + (result.staleBuiltPages > 0
        ? ` ⚠ ${result.staleBuiltPages} built page${result.staleBuiltPages === 1 ? ' still links' : 's still link'} to the old name — that link lives in the card's defaults, so edit the card under Page card text & links (its URL dropdown already lists the new name), then Publish & rebuild.`
        : ''),
    )
    await refresh(dirKey)
  }

  function closeDelete() {
    setDeleteTarget('')
    setDeleteConfirm('')
    setDeleteMessage('')
    setDeleteBlocked(false)
  }

  /**
   * Remove a file from the download server.
   *
   * `force` is only ever passed on a second press, after the server has come
   * back 409 and the panel has shown the admin exactly how many card links and
   * built pages still point at the file. Deleting a referenced file is
   * sometimes right — the card row is going away in the same session — but it
   * is never the default, because the result is a live 404 on the public site.
   */
  async function submitDelete(force = false) {
    if (deleteBusy || !deleteTarget) return
    if (deleteConfirm.trim() !== deleteTarget) return
    setDeleteBusy(true)
    setDeleteMessage('')
    const result = await adminContentClient.deleteLibraryFile(dirKey, deleteTarget, force)
    setDeleteBusy(false)
    if (!result.ok) {
      setDeleteMessage(result.error)
      setDeleteBlocked(result.blocked)
      return
    }
    // Drop it from the session's pending-publish list too, or the panel keeps
    // offering "Publish" for a file that is no longer there.
    setUploadedThisSession((names) => names.filter((name) => name !== deleteTarget))
    const deleted = deleteTarget
    closeDelete()
    setUploadState(result.references > 0 ? 'error' : 'done')
    setUploadMessage(
      `Deleted ${deleted}.`
      + (result.references > 0
        ? ` ⚠ ${result.references} link${result.references === 1 ? '' : 's'} still pointed at it — those downloads now 404. Edit the card under Page card text & links to remove the row, then Publish & rebuild.`
        : ''),
    )
    await refresh(dirKey)
  }

  function cancelUpload() {
    abortRef.current?.abort()
  }

  function openAttach(file: LibraryFile) {
    setAttachFile(file)
    setAttachState('idle')
    setAttachMessage('')
    setNewCardTitle(file.name.replace(/\.[^.]+$/, ''))
    if (!attachScope && attachTargets.length > 0) {
      setAttachScope(attachTargets[0].scope)
      setAttachCardId(attachTargets[0].cards[0]?.id ?? '__new__')
    }
  }

  async function submitAttach() {
    if (!attachFile || !attachTarget || attachState === 'saving') return
    setAttachState('saving')
    setAttachMessage('')
    const payload = { name: attachFile.name, url: publicUrl(attachFile) }
    const result = attachCardId === '__new__'
      ? await onCreateCard(attachTarget, newCardTitle.trim(), payload)
      : await onAttach(attachTarget, attachCardId, payload)
    if (result.ok) {
      setAttachState('done')
      setAttachMessage(
        attachCardId === '__new__'
          ? 'New card created and live. Publish & rebuild to bake it into the site.'
          : 'Card updated and live. Publish & rebuild to bake it into the site.',
      )
      return
    }
    setAttachState('error')
    setAttachMessage(result.error || 'Could not update the card.')
  }

  const percent = progress && progress.total > 0
    ? Math.min(100, Math.round((progress.sent / progress.total) * 100))
    : 0
  const accept = activeDir ? activeDir.extensions.map((e) => `.${e}`).join(',') : undefined

  const queueReady = queue.length > 0 && queue.every((row) => queueRowError(row.name) === '')

  return (
    <div id="download-library">
      <GlowCard glowColor="cyan" className="p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <HardDrive size={16} className="text-cyan-300" />
              <h3 className="text-sm font-black uppercase tracking-[0.18em] text-white">Downloads &amp; installers</h3>
            </div>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
              Upload a new ISO, EXE, MSI, or package straight onto the download server, then point a card at it —
              no shell, no source edit. Large uploads resume automatically if the connection drops, so a
              multi-gigabyte ISO survives a flaky link.
            </p>
          </div>
          <button
            onClick={() => void refresh(dirKey)}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-cyan-400/30 hover:text-cyan-300"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>

        {/* Step 1 — where the file goes. */}
        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500" htmlFor="admin-library-dir">
              1. Choose what you are updating
            </label>
            <select
              id="admin-library-dir"
              value={locationValue}
              onChange={(e) => {
                const chosen = locationOptions.find((option) => option.value === e.target.value)
                setLocationValue(e.target.value)
                setDirKey(chosen?.dirKey ?? '')
                // Pre-arm the attach editor with the section they just named, so
                // "Use in a card" opens on the right card list instead of the
                // first one alphabetically.
                if (chosen?.scope) setAttachScope(chosen.scope)
                clearQueue()
                setAttachFile(null)
              }}
              className="mt-2 h-11 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white outline-none focus:border-cyan-400/60 lg:max-w-md"
            >
              <option value="">— Choose a product section —</option>
              {optionsByFamily.map(([family, list]) => (
                <optgroup key={family} label={family}>
                  {list.map((option) => {
                    const dir = dirs.find((entry) => entry.key === option.dirKey)
                    return (
                      <option key={option.value} value={option.value} disabled={!dir?.exists || !dir?.writable}>
                        {option.label}{!dir?.exists ? ' (missing on this server)' : !dir.writable ? ' (read-only)' : ''}
                      </option>
                    )
                  })}
                </optgroup>
              ))}
            </select>
            {activeDir && (
              <p className="mt-1.5 text-[11px] text-slate-500">
                Uploads to <span className="font-mono text-slate-400">{activeDir.path}</span> — chosen for you from
                where this section&apos;s downloads already live.
              </p>
            )}
          </div>
          {activeDir && (
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <span className="inline-flex h-7 items-center rounded-full border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-widest text-slate-300">
                {formatBytes(activeDir.freeBytes)} free
              </span>
              <span className="inline-flex h-7 items-center rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 text-[10px] font-black uppercase tracking-widest text-cyan-200">
                {files.length} file{files.length === 1 ? '' : 's'}
              </span>
            </div>
          )}
        </div>

        {activeDir && (
          <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
            {activeDir.hint} Accepted:{' '}
            <span className="font-mono text-slate-400">{activeDir.extensions.map((e) => `.${e}`).join(' ')}</span>
            {' · '}served from{' '}
            <span className="font-mono text-slate-400">{APENSUPPORT_BASE}{activeDir.urlPath}/</span>
          </p>
        )}

        {/* Register a new location — no code change, no deploy. */}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            onClick={() => { setShowNewDir((open) => !open); setNewDirMessage('') }}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-cyan-400/30 hover:text-cyan-300"
          >
            {showNewDir ? <X size={12} /> : <FolderPlus size={12} />} {showNewDir ? 'Cancel' : 'Add a location'}
          </button>
          {activeDir?.custom && !showNewDir && (
            <button
              onClick={() => void removeDir(activeDir)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:border-red-400/40 hover:text-red-300"
            >
              <Trash2 size={12} /> Remove this location
            </button>
          )}
          {!showNewDir && newDirMessage && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-red-300">
              <AlertTriangle size={12} /> {newDirMessage}
            </span>
          )}
        </div>

        {showNewDir && (
          <div className="mt-3 rounded-lg border border-cyan-400/30 bg-cyan-400/5 p-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-cyan-300">New upload location</p>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
              Point it at a folder under the download webroot. The public download URL is always
              <span className="font-mono text-slate-300"> {APENSUPPORT_BASE}/&lt;folder&gt;/</span>, so the two can never
              disagree.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Name</label>
                <input
                  type="text"
                  value={newDir.label}
                  onChange={(e) => setNewDir((d) => ({ ...d, label: e.target.value }))}
                  placeholder="e.g. Cisco firmware"
                  className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-cyan-400/60"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Group heading</label>
                <input
                  type="text"
                  value={newDir.family}
                  onChange={(e) => setNewDir((d) => ({ ...d, family: e.target.value }))}
                  placeholder="e.g. Cisco (defaults to Other)"
                  className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-cyan-400/60"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Folder</label>
                <input
                  type="text"
                  value={newDir.dir}
                  onChange={(e) => setNewDir((d) => ({ ...d, dir: e.target.value }))}
                  placeholder="cisco  or  vmware/9"
                  className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 font-mono text-sm text-white outline-none focus:border-cyan-400/60"
                />
                <p className="mt-1 truncate text-[10px] font-mono text-slate-600">
                  {newDir.dir.trim() ? `${APENSUPPORT_BASE}/${newDir.dir.trim().replace(/^\/+|\/+$/g, '')}/` : 'relative to the download webroot'}
                </p>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Allowed file types</label>
                <input
                  type="text"
                  value={newDir.extensions}
                  onChange={(e) => setNewDir((d) => ({ ...d, extensions: e.target.value }))}
                  placeholder="iso, zip, exe, bin"
                  className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-cyan-400/60"
                />
                <p className="mt-1 text-[10px] text-slate-600">
                  Comma separated. Web-executable types (.php, .html, .js, .svg…) are always refused.
                </p>
              </div>
            </div>
            <label className="mt-3 flex items-center gap-2 text-[11px] text-slate-300">
              <input
                type="checkbox"
                checked={newDir.createDir}
                onChange={(e) => setNewDir((d) => ({ ...d, createDir: e.target.checked }))}
                className="h-3.5 w-3.5 accent-cyan-400"
              />
              Create the folder if it doesn&apos;t exist yet
            </label>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                onClick={() => void submitNewDir()}
                disabled={newDirState === 'saving' || !newDir.label.trim() || !newDir.dir.trim() || !newDir.extensions.trim()}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-4 text-[10px] font-black uppercase tracking-widest text-emerald-300 hover:bg-emerald-400/20 disabled:opacity-40"
              >
                {newDirState === 'saving'
                  ? <><Loader2 size={12} className="animate-spin" /> Saving…</>
                  : <><FolderPlus size={12} /> Add location</>}
              </button>
              {newDirMessage && (
                <span className="inline-flex items-start gap-1.5 text-[11px] text-red-300">
                  <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {newDirMessage}
                </span>
              )}
            </div>
          </div>
        )}

        {activeDir && !activeDir.writable && (
          <p className="mt-2 flex items-start gap-2 text-xs text-amber-300">
            <AlertTriangle size={12} className="mt-0.5 shrink-0" />
            <span>
              <span className="font-mono">{activeDir.path}</span> isn&apos;t writable by the site-stats proxy user —
              uploads here are refused until its ownership is fixed.
            </span>
          </p>
        )}

        {/* Nothing below this point renders until a location is picked. */}
        {!activeDir && !showNewDir && (
          <p className="mt-4 rounded-lg border border-dashed border-white/10 bg-black/20 px-4 py-6 text-center text-xs text-slate-500">
            Choose a location above to upload a file or browse what&apos;s already on the server.
          </p>
        )}

        {activeDir && (
        <>
        {/* Step 2 — the files. Type detection lives on each row: the extension
            is read off the (editable) name and checked against this location's
            allowlist, so a mistake shows up before a single byte is sent. */}
        <div className="mt-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">2. Choose the files to upload</p>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              addFiles(e.dataTransfer.files)
            }}
            className={`mt-2 rounded-xl border border-dashed p-5 text-center transition-colors ${
              dragging ? 'border-cyan-400/60 bg-cyan-400/10' : 'border-white/15 bg-black/20'
            }`}
          >
            <FileUp size={22} className="mx-auto text-slate-500" />
            <p className="mt-2 text-xs text-slate-400">
              Drag files here, or
              <label className="mx-1 cursor-pointer text-cyan-300 underline underline-offset-2">
                browse
                <input
                  key={fileInputKey}
                  type="file"
                  multiple
                  accept={accept}
                  className="hidden"
                  onChange={(e) => addFiles(e.target.files)}
                />
              </label>
              from this computer. Several at once is fine — they upload one after another.
            </p>
          </div>

          {queue.length > 0 && (
            <ul className="mt-3 space-y-2">
              {queue.map((row) => {
                const rowError = queueRowError(row.name)
                const isUploadingRow = currentUpload?.name === row.name
                return (
                  <li key={row.file.name} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={row.name}
                        disabled={uploading}
                        onChange={(e) => {
                          const value = e.target.value
                          setQueue((current) => current.map((item) => (item.file === row.file ? { ...item, name: value } : item)))
                        }}
                        title="The name this file will be stored and served under — fix it here before uploading."
                        className="h-8 min-w-0 flex-1 rounded border border-white/10 bg-black/40 px-2 font-mono text-xs text-white outline-none focus:border-cyan-400/60"
                      />
                      <span className="whitespace-nowrap text-[10px] text-slate-500">{formatBytes(row.file.size)}</span>
                      {!uploading && (
                        <button
                          onClick={() => setQueue((current) => current.filter((item) => item.file !== row.file))}
                          title="Remove this file from the upload list"
                          className="text-slate-500 hover:text-red-300"
                          aria-label={`Remove ${row.name}`}
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                    <p className={`mt-1 flex items-start gap-1.5 text-[11px] ${rowError ? 'text-red-300' : 'text-emerald-300'}`}>
                      {rowError
                        ? <><AlertTriangle size={11} className="mt-0.5 shrink-0" /> <span>{rowError}</span></>
                        : <><CheckCircle2 size={11} className="mt-0.5 shrink-0" /> <span>
                            <span className="font-mono">.{extensionOf(row.name)}</span> — accepted. Will be served from{' '}
                            <span className="break-all font-mono">{APENSUPPORT_BASE}{activeDir?.urlPath}/{row.name}</span>
                            {isUploadingRow ? ' (uploading…)' : ''}
                          </span></>}
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
        </div>


        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => void startUpload(true)}
              disabled={!queueReady || uploading || !activeDir?.writable}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-4 text-[10px] font-black uppercase tracking-widest text-emerald-300 hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {uploading ? <Loader2 size={12} className="animate-spin" /> : <UploadCloud size={12} />}
              {uploading
                ? `Uploading ${currentUpload ? `${currentUpload.index}/${currentUpload.total}` : '…'}`
                : `Upload ${queue.length === 1 ? 'file' : `${queue.length} files`}`}
            </button>
            {uploading && (
              <button
                onClick={cancelUpload}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-red-400/40 hover:text-red-300"
              >
                <X size={12} /> Cancel
              </button>
            )}
            {!uploading && queue.length > 0 && uploadState === 'error' && (
              <button
                onClick={() => void startUpload(false)}
                title="Discard the partial uploads and send the queued files again from the start"
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-cyan-400/30 hover:text-cyan-300"
              >
                <RefreshCw size={12} /> Start over
              </button>
            )}
          </div>

          {progress && (uploading || uploadState === 'error') && (
            <div className="mt-3">
              {currentUpload && (
                <p className="mb-1 text-[10px] font-mono text-slate-400">
                  File {currentUpload.index} of {currentUpload.total}: <span className="break-all">{currentUpload.name}</span>
                </p>
              )}
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-cyan-400 transition-[width]" style={{ width: `${percent}%` }} />
              </div>
              <p className="mt-1 flex flex-wrap gap-x-3 text-[10px] font-mono text-slate-500">
                <span>{percent}%</span>
                <span>{formatBytes(progress.sent)} / {formatBytes(progress.total)}</span>
                {rate && <span>{formatBytes(rate.bytesPerSecond)}/s</span>}
                {rate && <span>ETA {formatDuration(rate.etaSeconds)}</span>}
              </p>
            </div>
          )}

          {uploadMessage && (
            <p className={`mt-2 flex items-start gap-2 text-xs ${uploadState === 'error' ? 'text-red-300' : 'text-emerald-300'}`}>
              {uploadState === 'error'
                ? <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                : <CheckCircle2 size={12} className="mt-0.5 shrink-0" />}
              <span className="break-all">{uploadMessage}</span>
            </p>
          )}
        </div>

        {/* Step 3 — what's on the server, and wiring it to a card. */}
        <div className="mt-5">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            3. Files on the server{activeDir ? ` — ${activeDir.label}` : ''}
          </p>
          {loadError && (
            <p className="mt-2 flex items-center gap-2 text-xs text-red-300"><AlertTriangle size={12} /> {loadError}</p>
          )}
          {loading ? (
            <p className="mt-2 text-xs text-slate-500">Loading…</p>
          ) : files.length === 0 ? (
            <p className="mt-2 text-xs text-slate-500">No files here yet.</p>
          ) : (
            <div className="mt-2 max-h-80 overflow-y-auto rounded-lg border border-white/10">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-black/60 backdrop-blur">
                  <tr className="text-[10px] uppercase tracking-widest text-slate-500">
                    <th className="px-3 py-2 font-black">File</th>
                    <th className="px-3 py-2 font-black">Size</th>
                    <th className="hidden px-3 py-2 font-black sm:table-cell">Modified</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {files.map((file) => (
                    <tr key={`${file.name}-${file.partial ? 'part' : 'final'}`} className="border-t border-white/5">
                      <td className="px-3 py-2">
                        <span className="break-all font-mono text-slate-200">{file.name}</span>
                        {file.partial && (
                          <span className="ml-2 rounded bg-amber-400/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-amber-300">
                            upload unfinished
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-400">{formatBytes(file.bytes)}</td>
                      <td className="hidden whitespace-nowrap px-3 py-2 text-slate-500 sm:table-cell">
                        {new Date(file.mtime).toLocaleDateString()}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right">
                        {!file.partial && (
                          <div className="inline-flex gap-2">
                            {/* Publish appears as soon as a file lands, but it
                                never REPLACES "Use in a card". Publishing a file
                                no card links to rebuilds an unchanged site —
                                exactly the dead end this row exists to prevent.
                                Attach first, then publish. */}
                            {uploadedThisSession.includes(file.name) && (
                              <button
                                onClick={() => document.getElementById('publish-changes')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                                title="Jump to Publish & rebuild. Point a card at this file first, or the published site won't change."
                                className="inline-flex h-7 items-center gap-1 rounded border border-amber-400/40 bg-amber-400/10 px-2 text-[10px] font-bold uppercase tracking-widest text-amber-300 hover:bg-amber-400/20"
                              >
                                <UploadCloud size={10} /> Publish
                              </button>
                            )}
                            <button
                              onClick={() => { setRenameFrom(file.name); setRenameDraft(file.name); setRenameMessage('') }}
                              title="Rename this file on the server — the download URL changes with it, so re-attach any card that points here."
                              className="inline-flex h-7 items-center gap-1 rounded border border-white/10 bg-white/5 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-300 hover:border-cyan-400/30 hover:text-cyan-300"
                            >
                              <Pencil size={10} /> Rename
                            </button>
                            <button
                              onClick={() => { void navigator.clipboard?.writeText(publicUrl(file)); setCopied(file.name) }}
                              title={`Copy this file's public download link to the clipboard, to paste into a ticket, email, or guide. Nothing on the site changes.\n${publicUrl(file)}`}
                              className="inline-flex h-7 items-center gap-1 rounded border border-white/10 bg-white/5 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-300 hover:border-cyan-400/30 hover:text-cyan-300"
                            >
                              <Copy size={10} /> {copied === file.name ? 'Copied' : 'URL'}
                            </button>
                            <button
                              onClick={() => { setDeleteTarget(file.name); setDeleteConfirm(''); setDeleteMessage(''); setDeleteBlocked(false) }}
                              title={`Remove ${file.name} from the download server for good. Refused while a card or a built page still links it, unless you confirm past the warning. There is no undo.`}
                              className="inline-flex h-7 items-center gap-1 rounded border border-white/10 bg-white/5 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-300 hover:border-red-400/40 hover:text-red-300"
                            >
                              <Trash2 size={10} /> Delete
                            </button>
                            <button
                              onClick={() => openAttach(file)}
                              disabled={attachTargets.length === 0}
                              title={attachTargets.length === 0
                                ? 'No download sections are loaded yet, so there is no card to point at this file.'
                                : `Point a download card on the site at this file — pick the section and card below, or create a new card. The card's download button then serves ${file.name}. Publish & rebuild to bake it into the live site.`}
                              className="inline-flex h-7 items-center gap-1 rounded border border-cyan-400/30 bg-cyan-400/10 px-2 text-[10px] font-bold uppercase tracking-widest text-cyan-300 hover:bg-cyan-400/20 disabled:opacity-40"
                            >
                              <Link2 size={10} /> Use in a card
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        </>
        )}

        {/* Delete confirm — appears under the table for one server file. */}
        {deleteTarget && (
          <div className="mt-4 rounded-lg border border-red-400/40 bg-red-500/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-red-300">
                Delete <span className="font-mono normal-case">{deleteTarget}</span>
              </p>
              <button onClick={closeDelete} className="shrink-0 text-slate-500 hover:text-white" aria-label="Close">
                <X size={14} />
              </button>
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-slate-400">
              This removes the file from the download server permanently. It is not moved to a
              recycle bin and it cannot be restored from here — it would have to be re-uploaded.
              Type the filename to confirm.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                placeholder={deleteTarget}
                aria-label={`Type ${deleteTarget} to confirm deletion`}
                className="h-9 min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-3 font-mono text-xs text-white outline-none placeholder:text-slate-700 focus:border-red-400/60"
              />
              <button
                onClick={() => void submitDelete(false)}
                disabled={deleteBusy || deleteConfirm.trim() !== deleteTarget}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-red-400/40 bg-red-400/10 px-4 text-[10px] font-black uppercase tracking-widest text-red-300 hover:bg-red-400/20 disabled:opacity-40"
              >
                {deleteBusy ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Delete file
              </button>
            </div>
            {deleteMessage && (
              <p className="mt-2 flex items-start gap-1.5 text-[11px] text-red-300">
                <AlertTriangle size={11} className="mt-0.5 shrink-0" /> {deleteMessage}
              </p>
            )}
            {/* Only the server's reference guard (409) offers the override. A
                400/404/500 is a real failure and must not be forceable. */}
            {deleteBlocked && (
              <button
                onClick={() => void submitDelete(true)}
                disabled={deleteBusy || deleteConfirm.trim() !== deleteTarget}
                className="mt-3 inline-flex h-8 items-center gap-2 rounded-lg border border-red-400/60 bg-red-500/20 px-3 text-[10px] font-black uppercase tracking-widest text-red-200 hover:bg-red-500/30 disabled:opacity-40"
              >
                <AlertTriangle size={12} /> Delete anyway — those links will 404
              </button>
            )}
          </div>
        )}

        {/* Rename editor — appears under the table for one server file. */}
        {renameFrom && (
          <div className="mt-4 rounded-lg border border-cyan-400/30 bg-cyan-400/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-cyan-300">
                Rename <span className="font-mono normal-case">{renameFrom}</span>
              </p>
              <button onClick={() => setRenameFrom('')} className="shrink-0 text-slate-500 hover:text-white" aria-label="Close">
                <X size={14} />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <input
                type="text"
                value={renameDraft}
                onChange={(e) => setRenameDraft(e.target.value)}
                className="h-9 min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-3 font-mono text-xs text-white outline-none focus:border-cyan-400/60"
              />
              <button
                onClick={() => void submitRename()}
                disabled={renameBusy || renameDraft.trim() === renameFrom || queueRowError(renameDraft) !== ''}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-4 text-[10px] font-black uppercase tracking-widest text-emerald-300 hover:bg-emerald-400/20 disabled:opacity-40"
              >
                {renameBusy ? <Loader2 size={12} className="animate-spin" /> : <Pencil size={12} />} Rename
              </button>
            </div>
            {queueRowError(renameDraft) !== '' && renameDraft.trim() !== '' && (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-red-300">
                <AlertTriangle size={11} /> {queueRowError(renameDraft)}
              </p>
            )}
            {renameMessage && (
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-red-300">
                <AlertTriangle size={11} /> {renameMessage}
              </p>
            )}
            <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
              The public download URL changes with the name — any card pointing at the old name keeps the old,
              now-dead link until you re-attach it via &ldquo;Use in a card&rdquo;.
            </p>
          </div>
        )}

        {/* Attach editor — appears under the table once a file is chosen. */}
        {attachFile && (
          <div className="mt-4 rounded-lg border border-cyan-400/30 bg-cyan-400/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-widest text-cyan-300">Point a card at this file</p>
                <p className="mt-1 break-all font-mono text-xs text-slate-300">{publicUrl(attachFile)}</p>
              </div>
              <button
                onClick={() => setAttachFile(null)}
                className="shrink-0 text-slate-500 hover:text-white"
                aria-label="Close"
              >
                <X size={14} />
              </button>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Section</label>
                <select
                  value={attachScope}
                  onChange={(e) => {
                    setAttachScope(e.target.value)
                    const next = attachTargets.find((t) => t.scope === e.target.value)
                    setAttachCardId(next?.cards[0]?.id ?? '__new__')
                    setAttachState('idle')
                    setAttachMessage('')
                  }}
                  className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white outline-none focus:border-cyan-400/60"
                >
                  {targetsByFamily.map(([family, list]) => (
                    <optgroup key={family} label={family}>
                      {list.map((target) => (
                        <option key={target.scope} value={target.scope}>{target.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Card</label>
                <select
                  value={attachCardId}
                  onChange={(e) => { setAttachCardId(e.target.value); setAttachState('idle'); setAttachMessage('') }}
                  className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white outline-none focus:border-cyan-400/60"
                >
                  {(attachTarget?.cards ?? []).map((card) => (
                    <option key={card.id} value={card.id}>{card.title}</option>
                  ))}
                  <option value="__new__">＋ Create a new card…</option>
                </select>
              </div>
              {attachCardId === '__new__' && (
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">New card title</label>
                  <input
                    type="text"
                    value={newCardTitle}
                    onChange={(e) => setNewCardTitle(e.target.value)}
                    placeholder="e.g. Ubuntu 26.04 Desktop"
                    className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-cyan-400/60"
                  />
                  <p className="mt-1 text-[10px] text-slate-500">
                    The new card copies its logo and colour from the first card in that section — edit the rest below
                    once it appears.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                onClick={() => void submitAttach()}
                disabled={attachState === 'saving' || !attachTarget || (attachCardId === '__new__' && !newCardTitle.trim())}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-4 text-[10px] font-black uppercase tracking-widest text-emerald-300 hover:bg-emerald-400/20 disabled:opacity-40"
              >
                {attachState === 'saving'
                  ? <><Loader2 size={12} className="animate-spin" /> Saving…</>
                  : attachCardId === '__new__'
                    ? <><Plus size={12} /> Create card</>
                    : <><Link2 size={12} /> Update card</>}
              </button>
              {attachMessage && (
                <span className={`inline-flex items-center gap-1.5 text-[11px] ${attachState === 'error' ? 'text-red-300' : 'text-emerald-300'}`}>
                  {attachState === 'error' ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />} {attachMessage}
                </span>
              )}
            </div>
          </div>
        )}
      </GlowCard>
    </div>
  )
}

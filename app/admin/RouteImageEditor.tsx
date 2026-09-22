'use client'

/**
 * Per-route page-image editor (catalog key, uploaded asset, custom path or a
 * new upload). Split out of AdminContentEditor.tsx (code-quality #64).
 */
import { useMemo, useState } from 'react'
import { GlowCard } from '@/components/ui/spotlight-card'
import { adminContentClient, type OverrideMap } from '@/lib/data/admin-content'
import { PAGE_LOGOS, PAGE_LOGO_SECTIONS, type LogoKey, type PageLogoRoute } from '@/lib/data/logos'
import {
  ROUTE_IMAGE_CATALOG,
  ROUTE_IMAGE_OVERRIDE_SCOPE,
  findLogoKeyBySource,
  isSafeCustomRouteImageSource,
  normalizeRouteImageRegistry,
  resolveRouteImage,
  type RouteImageReference,
  type RouteImageRegistryValue,
} from '@/lib/data/route-images'
import { ImageIcon, Loader2, RotateCcw, Save } from 'lucide-react'
import { slugify } from './content-editor-fields'

type RouteImageSourceMode = 'catalog' | 'asset' | 'path' | 'upload'

interface RouteImageEditorDraft {
  route: PageLogoRoute
  sourceMode: RouteImageSourceMode
  catalogKey: LogoKey
  assetId: string
  customPath: string
  uploadFile: File | null
}

const ROUTE_IMAGE_SECTION_OPTIONS = Object.entries(PAGE_LOGO_SECTIONS) as Array<[
  string,
  Readonly<Record<string, string>>,
]>
const FIRST_REGISTERED_ROUTE = Object.keys(PAGE_LOGOS)[0] as PageLogoRoute

function createRouteImageEditorDraft(
  route: PageLogoRoute,
  registry: RouteImageRegistryValue,
): RouteImageEditorDraft {
  const reference = registry.routes[route]
  const fallbackKey = findLogoKeyBySource(PAGE_LOGOS[route]) ?? ROUTE_IMAGE_CATALOG[0].key
  return {
    route,
    sourceMode: reference?.kind === 'asset' ? 'asset' : 'catalog',
    catalogKey: reference?.kind === 'catalog' ? reference.key : fallbackKey,
    assetId: reference?.kind === 'asset' ? reference.id : '',
    customPath: '',
    uploadFile: null,
  }
}

function routeImageStateSignature(registry: RouteImageRegistryValue, route: PageLogoRoute) {
  const reference = registry.routes[route]
  const asset = reference?.kind === 'asset' ? registry.assets[reference.id] : undefined
  return JSON.stringify({ reference: reference ?? null, asset: asset ?? null })
}

function pruneUnusedRouteAssets(registry: RouteImageRegistryValue): RouteImageRegistryValue {
  const usedIds = new Set(
    Object.values(registry.routes)
      .filter((reference): reference is Extract<RouteImageReference, { kind: 'asset' }> => reference?.kind === 'asset')
      .map((reference) => reference.id),
  )
  return {
    schemaVersion: 1,
    routes: registry.routes,
    assets: Object.fromEntries(Object.entries(registry.assets).filter(([id]) => usedIds.has(id))),
  }
}

function createRouteAssetId(label: string) {
  const stem = slugify(label).slice(0, 52) || 'route-image'
  return `${stem}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function RegisteredRouteImageEditor({
  overrides,
  published,
  onSaved,
}: {
  overrides: OverrideMap
  published: OverrideMap
  onSaved: () => Promise<void>
}) {
  // `selectedRoute` always holds a valid route so every derived value below
  // stays type-safe; `routeChosen` is what decides whether the editor is shown,
  // so the card opens blank instead of pre-selecting the first route.
  const [selectedRoute, setSelectedRoute] = useState<PageLogoRoute>(FIRST_REGISTERED_ROUTE)
  const [routeChosen, setRouteChosen] = useState(false)
  const [draft, setDraft] = useState<RouteImageEditorDraft | null>(null)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const liveValue = overrides[ROUTE_IMAGE_OVERRIDE_SCOPE]?.value
  const publishedValue = published[ROUTE_IMAGE_OVERRIDE_SCOPE]?.value
  const liveRegistry = useMemo(() => normalizeRouteImageRegistry(liveValue), [liveValue])
  const publishedRegistry = useMemo(() => normalizeRouteImageRegistry(publishedValue), [publishedValue])
  const availableAssets = useMemo(
    () => ({ ...publishedRegistry.assets, ...liveRegistry.assets }),
    [liveRegistry.assets, publishedRegistry.assets],
  )
  const activeDraft = draft?.route === selectedRoute
    ? draft
    : createRouteImageEditorDraft(selectedRoute, liveRegistry)
  const { sourceMode, catalogKey, assetId, customPath, uploadFile } = activeDraft
  const unpublishedRouteCount = useMemo(
    () => (Object.keys(PAGE_LOGOS) as PageLogoRoute[]).filter((route) => (
      routeImageStateSignature(liveRegistry, route) !== routeImageStateSignature(publishedRegistry, route)
    )).length,
    [liveRegistry, publishedRegistry],
  )

  const currentReference = liveRegistry.routes[selectedRoute]
  const effectiveSrc = resolveRouteImage(selectedRoute, liveValue, PAGE_LOGOS[selectedRoute]) ?? PAGE_LOGOS[selectedRoute]
  const defaultKey = findLogoKeyBySource(PAGE_LOGOS[selectedRoute])
  const hasRouteOverride = Boolean(currentReference)

  const draftPreview = sourceMode === 'catalog'
    ? ROUTE_IMAGE_CATALOG.find((entry) => entry.key === catalogKey)?.src
    : sourceMode === 'asset'
      ? availableAssets[assetId]?.src
      : sourceMode === 'path' && isSafeCustomRouteImageSource(customPath)
        ? customPath.trim()
        : effectiveSrc

  async function saveRouteImage() {
    if (status === 'saving') return
    setStatus('saving')
    setMessage('')

    const next: RouteImageRegistryValue = {
      schemaVersion: 1,
      routes: { ...liveRegistry.routes },
      assets: { ...liveRegistry.assets },
    }
    let reference: RouteImageReference

    if (sourceMode === 'catalog') {
      reference = { kind: 'catalog', key: catalogKey }
    } else if (sourceMode === 'asset') {
      const asset = availableAssets[assetId]
      if (!asset) {
        setStatus('error')
        setMessage('Choose an uploaded image first.')
        return
      }
      next.assets[assetId] = asset
      reference = { kind: 'asset', id: assetId }
    } else if (sourceMode === 'path') {
      const src = customPath.trim()
      if (!isSafeCustomRouteImageSource(src)) {
        setStatus('error')
        setMessage('Use a same-origin image path inside the site logo directory.')
        return
      }
      const existing = Object.entries(next.assets).find(([, asset]) => asset.src === src)
      const id = existing?.[0] ?? createRouteAssetId(src.split('/').pop() || 'route-image')
      next.assets[id] = existing?.[1] ?? { src, label: src.split('/').pop() || id }
      reference = { kind: 'asset', id }
    } else {
      if (!uploadFile) {
        setStatus('error')
        setMessage('Choose a PNG, JPEG, WebP, or GIF file first.')
        return
      }
      const upload = await adminContentClient.uploadLogo(uploadFile)
      if (!upload.ok || !isSafeCustomRouteImageSource(upload.src)) {
        setStatus('error')
        setMessage(upload.ok ? 'The server returned an invalid image path.' : upload.error)
        return
      }
      const id = createRouteAssetId(upload.filename)
      next.assets[id] = {
        src: upload.src,
        label: uploadFile.name,
        mime: upload.contentType,
        uploadedAt: new Date().toISOString(),
      }
      reference = { kind: 'asset', id }
    }

    next.routes[selectedRoute] = reference
    const result = await adminContentClient.saveOverride(
      ROUTE_IMAGE_OVERRIDE_SCOPE,
      pruneUnusedRouteAssets(next),
      'admin-ui',
    )
    if (!result.ok) {
      setStatus('error')
      setMessage(result.error)
      return
    }
    setStatus('saved')
    setMessage('Live across registered route consumers now; Publish to bake it into the static build.')
    setDraft(null)
    setFileInputKey((value) => value + 1)
    await onSaved()
  }

  async function revertRouteImage() {
    if (!hasRouteOverride || status === 'saving') return
    setStatus('saving')
    setMessage('')
    const next: RouteImageRegistryValue = {
      schemaVersion: 1,
      routes: { ...liveRegistry.routes },
      assets: { ...liveRegistry.assets },
    }
    delete next.routes[selectedRoute]
    const pruned = pruneUnusedRouteAssets(next)
    const result = Object.keys(pruned.routes).length === 0
      ? await adminContentClient.revertOverride(ROUTE_IMAGE_OVERRIDE_SCOPE, 'admin-ui')
      : await adminContentClient.saveOverride(ROUTE_IMAGE_OVERRIDE_SCOPE, pruned, 'admin-ui')
    if (!result.ok) {
      setStatus('error')
      setMessage(result.error)
      return
    }
    setStatus('saved')
    setMessage('Reverted live to the logos.ts route default. Publish to make the revert durable.')
    setDraft(null)
    await onSaved()
  }

  return (
    <div id="registered-route-images">
    <GlowCard glowColor={unpublishedRouteCount > 0 ? 'amber' : 'cyan'} className="p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ImageIcon size={16} className="text-cyan-300" />
            <h3 className="text-sm font-black uppercase tracking-[0.18em] text-white">Registered route images</h3>
          </div>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-400">
            One saved choice updates the selected route&apos;s page header, linked cards, and navigation icon.
            Catalog choices keep pointing to a semantic key in <code className="text-cyan-300">logos.ts</code>;
            uploads are stored once and referenced by id.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-300">
            {Object.keys(PAGE_LOGOS).length} routes
          </span>
          {unpublishedRouteCount > 0 && (
            <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-200">
              ⚑ {unpublishedRouteCount} unpublished
            </span>
          )}
        </div>
      </div>

      {/* Route picker stays visible; everything below it waits for a choice. */}
      <div className="mt-5 lg:max-w-md">
        <label htmlFor="route-image-route" className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Registered route
        </label>
        <select
          id="route-image-route"
          value={routeChosen ? selectedRoute : ''}
          onChange={(event) => {
            const next = event.target.value
            setRouteChosen(next !== '')
            if (next !== '') setSelectedRoute(next as PageLogoRoute)
            setDraft(null)
            setStatus('idle')
            setMessage('')
            setFileInputKey((value) => value + 1)
          }}
          className="mt-1 h-11 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white outline-none focus:border-cyan-400/60"
        >
          <option value="">— Choose a route —</option>
          {ROUTE_IMAGE_SECTION_OPTIONS.map(([section, routes]) => (
            <optgroup key={section} label={section}>
              {Object.keys(routes).map((route) => <option key={route} value={route}>{route}</option>)}
            </optgroup>
          ))}
        </select>
      </div>

      {!routeChosen && (
        <p className="mt-4 rounded-lg border border-dashed border-white/10 bg-black/20 px-4 py-6 text-center text-xs text-slate-400">
          Choose a route above to see its current image and change it.
        </p>
      )}

      {routeChosen && (
      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="route-image-source-mode" className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Image source
              </label>
              <select
                id="route-image-source-mode"
                value={sourceMode}
                onChange={(event) => setDraft({ ...activeDraft, sourceMode: event.target.value as RouteImageSourceMode })}
                className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white outline-none focus:border-cyan-400/60"
              >
                <option value="catalog">logos.ts catalog</option>
                <option value="asset" disabled={Object.keys(availableAssets).length === 0}>Previously uploaded image</option>
                <option value="path">Existing site image path</option>
                <option value="upload">Upload a new image</option>
              </select>
            </div>

            {sourceMode === 'catalog' && (
              <div>
                <label htmlFor="route-image-catalog" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Catalog key</label>
                <select
                  id="route-image-catalog"
                  value={catalogKey}
                  onChange={(event) => setDraft({ ...activeDraft, catalogKey: event.target.value as LogoKey })}
                  className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white outline-none focus:border-cyan-400/60"
                >
                  {ROUTE_IMAGE_CATALOG.map((entry) => <option key={entry.key} value={entry.key}>{entry.key}</option>)}
                </select>
              </div>
            )}

            {sourceMode === 'asset' && (
              <div>
                <label htmlFor="route-image-asset" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Uploaded image</label>
                <select
                  id="route-image-asset"
                  value={assetId}
                  onChange={(event) => setDraft({ ...activeDraft, assetId: event.target.value })}
                  className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white outline-none focus:border-cyan-400/60"
                >
                  <option value="">Choose an image…</option>
                  {Object.entries(availableAssets).map(([id, asset]) => <option key={id} value={id}>{asset.label}</option>)}
                </select>
              </div>
            )}

            {sourceMode === 'path' && (
              <div>
                <label htmlFor="route-image-path" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Same-origin image path</label>
                <input
                  id="route-image-path"
                  type="text"
                  value={customPath}
                  onChange={(event) => setDraft({ ...activeDraft, customPath: event.target.value })}
                  placeholder="Root-relative path in the site logo directory"
                  className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-black/40 px-3 text-sm text-white outline-none focus:border-cyan-400/60"
                />
              </div>
            )}

            {sourceMode === 'upload' && (
              <div>
                <label htmlFor="route-image-upload" className="text-[10px] font-black uppercase tracking-widest text-slate-400">PNG, JPEG, WebP, or GIF · max 6 MiB</label>
                <input
                  key={fileInputKey}
                  id="route-image-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={(event) => setDraft({ ...activeDraft, uploadFile: event.target.files?.[0] ?? null })}
                  className="mt-1 block w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-slate-300 file:mr-3 file:rounded file:border-0 file:bg-cyan-400/10 file:px-2 file:py-1 file:text-cyan-200"
                />
              </div>
            )}
          </div>

          <div className="rounded-lg border border-white/8 bg-black/20 p-3 text-[10px] font-mono leading-relaxed text-slate-400">
            <p><span className="text-slate-400">source default:</span> {defaultKey ?? 'catalog key unavailable'} · {PAGE_LOGOS[selectedRoute]}</p>
            <p className="truncate"><span className="text-slate-400">effective live:</span> {effectiveSrc}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={saveRouteImage}
              disabled={status === 'saving'}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-4 text-[10px] font-black uppercase tracking-widest text-emerald-300 hover:bg-emerald-400/20 disabled:opacity-50"
            >
              {status === 'saving' ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              {sourceMode === 'upload' ? 'Upload & save live' : 'Save live'}
            </button>
            <button
              type="button"
              onClick={revertRouteImage}
              disabled={!hasRouteOverride || status === 'saving'}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-[10px] font-black uppercase tracking-widest text-slate-300 hover:border-amber-400/40 hover:text-amber-300 disabled:opacity-40"
            >
              <RotateCcw size={12} /> Revert route
            </button>
            {message && (
              <span className={`text-[10px] font-bold ${status === 'error' ? 'text-red-300' : 'text-emerald-300'}`}>
                {message}
              </span>
            )}
          </div>
        </div>

        <div className="flex min-h-44 items-center justify-center rounded-xl border border-white/10 bg-black/30 p-4">
          {draftPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={draftPreview} alt={`Preview for ${selectedRoute}`} className="max-h-36 w-full object-contain" />
          ) : (
            <p className="text-center text-xs text-slate-400">Choose a valid image to preview it.</p>
          )}
        </div>
      </div>
      )}
    </GlowCard>
    </div>
  )
}

/* ─── List-row helpers ─── */

/**
 * One row of a `downloads` / `links` / `patches` list while it is being edited.
 * `__deleted` marks a source row the admin removed; the row keeps its slot so
 * the saved patch stays base-indexed. `__extra` carries any fields the editor
 * does not offer a column for (a DocLink's `kind`, say) so saving a row never
 * silently drops them.
 */

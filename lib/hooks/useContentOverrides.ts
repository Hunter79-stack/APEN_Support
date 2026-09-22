'use client'

/**
 * The admin content editor's publish cycle: the live (draft) override map,
 * the last published snapshot, the build status with its polling loop, and
 * the publish action. Lifted out of AdminContentEditor.tsx (code-quality #64)
 * so the component is layout plus per-scope editing.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  adminContentClient,
  type AuditEntry,
  type BuildStatus,
  type CustomPage,
  type OverrideMap,
  type PublishTarget,
} from '@/lib/data/admin-content'

export function useContentOverrides() {
  const [overrides, setOverrides] = useState<OverrideMap>({})
  const [published, setPublished] = useState<OverrideMap>({})
  const [buildStatus, setBuildStatus] = useState<BuildStatus | null>(null)
  const [publishTarget, setPublishTarget] = useState<PublishTarget | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [customPages, setCustomPages] = useState<CustomPage[]>([])
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])

  const refresh = useCallback(async () => {
    const data = await adminContentClient.fetchAll()
    if (data) {
      setOverrides(data.overrides || {})
      setPublished(data.published || {})
      setBuildStatus(data.buildStatus || null)
      setPublishTarget(data.publishTarget || null)
      setCustomPages(data.customPages || [])
      setAuditLog(data.auditLog || [])
    }
  }, [])

  /** Scopes whose live (draft) value differs from the last published snapshot —
   *  i.e. edits that are showing via the runtime overlay but aren't yet baked
   *  into the build. Compared by serialised value so reverts count too. */
  const unpublishedScopes = useMemo(() => {
    const keys = new Set([...Object.keys(overrides), ...Object.keys(published)])
    const changed: string[] = []
    for (const key of keys) {
      const live = JSON.stringify(overrides[key]?.value ?? null)
      const base = JSON.stringify(published[key]?.value ?? null)
      if (live !== base) changed.push(key)
    }
    return changed
  }, [overrides, published])

  const building = buildStatus?.state === 'running' || publishing

  // While a build is running, poll its status until it settles, then refresh
  // so the published snapshot + unpublished count update.
  useEffect(() => {
    if (buildStatus?.state !== 'running') return
    let cancelled = false
    const timer = setInterval(async () => {
      const status = await adminContentClient.getBuildStatus()
      if (cancelled) return
      if (status) setBuildStatus(status)
      if (status && status.state !== 'running') {
        clearInterval(timer)
        refresh()
      }
    }, 2500)
    return () => { cancelled = true; clearInterval(timer) }
  }, [buildStatus?.state, refresh])

  const publish = useCallback(async () => {
    if (building) return
    setPublishing(true)
    const result = await adminContentClient.publish('admin-ui')
    setPublishing(false)
    if (result.ok) {
      setBuildStatus(result.status)
      // Read the snapshot back instead of assuming it landed. The old code set
      // `published = overrides` optimistically, so a snapshot the proxy could
      // NOT write (unwritable published-content.json) still cleared the flags —
      // until the next refresh restored them, which is the flag that "wouldn't
      // clear" after Publish. The server now 500s on a failed write, and this
      // reflects whatever actually made it to disk.
      await refresh()
    } else {
      setBuildStatus({ state: 'error', message: result.error })
    }
  }, [building, refresh])

  return { overrides, published, buildStatus, publishTarget, customPages, auditLog, unpublishedScopes, building, refresh, publish }
}

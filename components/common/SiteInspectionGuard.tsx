'use client'

import { useEffect, useState } from 'react'
import { adminContentClient } from '@/lib/data/admin-content'

const INSPECT_SHORTCUT_KEYS = ['i', 'j', 'c']

function shouldBlockInspectionShortcut(event: KeyboardEvent) {
  // event.key is usually a string, but some browsers/IME/autofill flows can
  // dispatch keydown events where it's missing entirely — guard rather than
  // let a single such keystroke throw an uncaught TypeError on every page.
  const key = (typeof event.key === 'string' ? event.key : '').toLowerCase()

  if (key === 'f12') return true
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && INSPECT_SHORTCUT_KEYS.includes(key)) return true
  if ((event.ctrlKey || event.metaKey) && key === 'u') return true

  return false
}

/**
 * Blocks right-click and the devtools/view-source keyboard shortcuts for
 * everyone EXCEPT members of the admin ACL.
 *
 * "On the ACL" is whatever `whoami` counts as admin: a real LDAP admin session
 * OR a request whose client IP is on the nginx workstation allowlist. Those
 * users keep native browser inspection; every other visitor has it suppressed.
 *
 * Fail-closed / block-first: the blockers are attached immediately on mount and
 * only removed once `whoami` confirms ACL membership. So during the brief
 * whoami round-trip — and if whoami errors or the visitor isn't on the ACL —
 * inspection stays blocked rather than briefly open.
 */
export function SiteInspectionGuard() {
  // Starts false → guards attach on first effect run (block-first). Flips true
  // only when whoami confirms the visitor is on the ACL, which detaches them.
  const [aclMember, setAclMember] = useState(false)

  useEffect(() => {
    let cancelled = false
    adminContentClient
      .whoami()
      .then((who) => { if (!cancelled) setAclMember(Boolean(who)) })
      .catch(() => { if (!cancelled) setAclMember(false) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    // ACL members keep native inspection / context-menu behavior.
    if (aclMember) return

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (shouldBlockInspectionShortcut(event)) {
        event.preventDefault()
      }
    }

    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [aclMember])

  return null
}

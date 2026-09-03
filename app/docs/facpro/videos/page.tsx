'use client'

/**
 * Legacy redirect — the FacilitatePro video guides moved to /videos/facpro/
 * so the docs section doesn't mix written docs with video content. This
 * page exists only to keep old bookmarks working: it pushes the user to
 * the new URL on mount and renders a small "moved" notice so they're not
 * staring at a blank screen during the redirect.
 *
 * Once enough time has passed that nobody bookmarks the old URL anymore,
 * delete this file. Until then it's a quiet courtesy redirect.
 */

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Film, ArrowRight } from 'lucide-react'

const NEW_URL = '/videos/facpro'

export default function FacProVideosLegacyRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Replace rather than push so the old URL doesn't sit in browser history.
    router.replace(NEW_URL)
  }, [router])

  return (
    <div className="page-enter min-h-[60vh] flex items-center justify-center px-6">
      <div className="max-w-md text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-cyan-400/10 border border-cyan-400/30 flex items-center justify-center">
          <Film size={20} className="text-cyan-400" />
        </div>
        <h1 className="text-xl font-semibold text-white">FacilitatePro Video Guides moved</h1>
        <p className="text-sm text-slate-400 leading-relaxed">
          Video content now lives under the Videos section. Redirecting you to
          <code className="font-mono text-cyan-400 mx-1">{NEW_URL}</code>…
        </p>
        <Link
          href={NEW_URL}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border border-cyan-400/40 text-cyan-300 hover:bg-cyan-400/10 transition-colors"
        >
          Go now <ArrowRight size={14} />
        </Link>
      </div>
    </div>
  )
}

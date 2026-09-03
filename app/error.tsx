'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Home, RefreshCw, AlertTriangle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to console in dev — production should send to a logging service
    console.error('[ErrorBoundary]', error)
  }, [error])

  return (
    <div className="page-enter min-h-[calc(100vh-4rem)] flex items-center justify-center px-6">
      {/* Ambient glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                      w-[500px] h-[300px] bg-amber-400/5 blur-3xl rounded-full pointer-events-none" />

      <div className="relative text-center max-w-lg">
        <div className="relative inline-block mb-6">
          <span className="text-[9rem] font-black leading-none tracking-tighter
                           bg-gradient-to-b from-white/10 to-transparent bg-clip-text text-transparent
                           select-none">
            Error
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <AlertTriangle size={40} className="text-amber-400/30" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-3">Something Went Wrong</h1>
        <p className="text-slate-400 text-sm leading-relaxed mb-8">
          An unexpected error occurred while loading this page.
          You can try again or return to the home page.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={reset}
            className="btn-primary"
          >
            <RefreshCw size={15} /> Try Again
          </button>
          <Link
            href="/home"
            className="px-4 py-2.5 rounded-lg text-sm font-medium
                       text-slate-400 border border-white/10
                       hover:text-white hover:border-white/20 transition-all duration-150
                       flex items-center gap-2"
          >
            <Home size={15} /> Return to Home
          </Link>
        </div>
      </div>
    </div>
  )
}

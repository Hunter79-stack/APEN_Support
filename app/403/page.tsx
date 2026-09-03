import Link from 'next/link'
import { Home, ShieldX } from 'lucide-react'

export const metadata = { title: 'Access Denied' }

export default function ForbiddenPage() {
  return (
    <div className="page-enter min-h-[calc(100vh-4rem)] flex items-center justify-center px-6">
      {/* Ambient glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                      w-[500px] h-[300px] bg-red-400/5 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                      w-[400px] h-[200px] bg-amber-500/5 blur-3xl rounded-full pointer-events-none" />

      <div className="relative text-center max-w-lg">

        {/* 403 number */}
        <div className="relative inline-block mb-6">
          <span className="text-[9rem] font-black leading-none tracking-tighter
                           bg-gradient-to-b from-white/10 to-transparent bg-clip-text text-transparent
                           select-none">
            403
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <ShieldX size={40} className="text-red-400/30" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-3">Access Restricted</h1>
        <p className="text-slate-400 text-sm leading-relaxed mb-8">
          This area is restricted to authorized CESC administrators.
          If you believe you should have access, contact the CESC helpdesk.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/home" className="btn-primary">
            <Home size={15} /> Return to Home
          </Link>
        </div>

        {/* Contact info */}
        <div className="mt-12 border-t border-white/5 pt-8">
          <p className="text-xs text-slate-600 uppercase tracking-widest mb-4">Need Access?</p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Contact the FCC CESC Helpdesk at{' '}
            <a href="mailto:cesc@army.mil" className="text-cyan-400 hover:text-cyan-300 transition-colors">
              cesc@army.mil
            </a>{' '}
            to request authorization.
          </p>
        </div>

      </div>
    </div>
  )
}

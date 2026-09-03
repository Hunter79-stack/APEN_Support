import Link from 'next/link'
import { Home, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="page-enter min-h-[calc(100vh-4rem)] flex items-center justify-center px-6">
      {/* Ambient glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                      w-[500px] h-[300px] bg-cyan-400/5 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                      w-[400px] h-[200px] bg-indigo-500/5 blur-3xl rounded-full pointer-events-none" />

      <div className="relative text-center max-w-lg">

        {/* 404 number */}
        <div className="relative inline-block mb-6">
          <span className="text-[9rem] font-black leading-none tracking-tighter
                           bg-gradient-to-b from-white/10 to-transparent bg-clip-text text-transparent
                           select-none">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <Search size={40} className="text-cyan-400/30" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-3">Page Not Found</h1>
        <p className="text-slate-400 text-sm leading-relaxed mb-8">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
          Double-check the URL or navigate back to the support hub.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/home" className="btn-primary">
            <Home size={15} /> Return to Home
          </Link>
        </div>

        {/* Quick links */}
        <div className="mt-12 border-t border-white/5 pt-8">
          <p className="text-xs text-slate-600 uppercase tracking-widest mb-4">Common Destinations</p>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { label: 'Documentation', href: '/docs' },
              { label: 'VMware',        href: '/downloads/vmware' },
              { label: 'Evaluate-STIG', href: '/security/evaluate-stig' },
              { label: 'Linux Repos',   href: '/docs/repos' },
              { label: 'ISOs',          href: '/downloads/iso' },
              { label: 'Trellix',       href: '/trellix' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-400
                           border border-white/10
                           hover:text-white hover:border-white/20 transition-all duration-150"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

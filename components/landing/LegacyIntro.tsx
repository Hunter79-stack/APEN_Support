import { ArrowRight } from 'lucide-react'
import { RouteImage } from '@/components/common/RouteImage'
import { StaticLink } from '@/components/common/StaticLink'

type LegacyIntroProps = {
  logoSrc: string
}

/** Production APEN root landing page. */
export function LegacyIntro({ logoSrc }: LegacyIntroProps) {
  return (
    <div className="page-enter relative min-h-screen flex items-center justify-center px-6 py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[760px] h-[420px] rounded-full bg-cyan-500/[0.06] blur-[140px]"
      />

      <div className="relative w-full max-w-xl flex flex-col items-center text-center">
        <div className="mb-10 w-24 h-24 rounded-2xl overflow-hidden ring-1 ring-white/15 shadow-[0_18px_60px_-20px_rgba(0,0,0,0.7)]">
          <RouteImage
            route="/"
            fallbackSrc={logoSrc}
            alt="APEN"
            width={96}
            height={96}
            className="w-full h-full object-cover"
            loading="eager"
          />
        </div>

        <p className="font-mono text-[10px] uppercase tracking-[0.42em] text-slate-400">
          APEN.MIL
          <span className="mx-2 text-slate-400">·</span>
          CESC
        </p>

        <h1 className="mt-4 text-4xl sm:text-5xl font-semibold tracking-tight text-white">
          APEN Services <span className="text-slate-400">&amp;</span> Support
        </h1>

        <div
          aria-hidden="true"
          className="mt-6 h-px w-16 bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent"
        />

        <p className="mt-6 text-sm sm:text-base leading-relaxed text-slate-400 max-w-md">
          The local hub for service requests, documentation, downloads,
          certificates, and the tooling your team relies on every day.
        </p>

        <StaticLink
          href="/home"
          className="mt-12 inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-7 py-2.5 text-sm font-semibold text-cyan-100 transition-colors hover:border-cyan-300/70 hover:bg-cyan-400/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#040a16] group"
        >
          Enter the Site
          <ArrowRight
            size={16}
            className="transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </StaticLink>

        <p className="mt-16 font-mono text-[10px] uppercase tracking-[0.32em] text-slate-400">
          Operated by FCC CESC
        </p>
      </div>
    </div>
  )
}

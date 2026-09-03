import type { ReactNode } from 'react'

/**
 * Every repo guide on this site is written for FIRST-TIME setup, so a machine
 * configured months ago keeps whatever it was given then — silently, forever.
 * On 2026-08-10 that bit us twice: clients were still pulling `-proposed`
 * (test-grade packages) long after it was removed from the served lists, and
 * a client that had fetched a file with plain `curl` had saved an HTML error
 * page as its sources file without anyone noticing.
 *
 * Nothing on the site told those operators to refresh. This says it.
 *
 * Re-running a guide is only safe to recommend because the download commands
 * were changed to `wget -N` / `curl -fL`, which overwrite in place and fail
 * loudly instead of writing numbered duplicates or error pages.
 */
export function AlreadyConfiguredNotice({
  fileKind,
  children,
}: {
  /** What the client downloads — shown verbatim, e.g. ".list" or ".repo". */
  fileKind: string
  /** Page-specific list of what changed recently. */
  children: ReactNode
}) {
  return (
    <section
      aria-labelledby="already-configured"
      className="rounded-xl border border-cyan-400/25 bg-cyan-400/[0.05] p-5"
    >
      <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-300">
        Already configured?
      </p>
      <h2 id="already-configured" className="mt-1 text-lg font-bold text-cyan-50">
        Re-run your guide to pick up changes
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">
        These guides set a client up once. If a machine was configured before today it keeps the
        old <code className="text-cyan-300">{fileKind}</code> file it was given and will not pick
        up corrections on its own — so it can drift out of step with this mirror without any
        visible error.
      </p>
      <div className="mt-3 text-sm leading-relaxed text-slate-300">
        Recent changes worth refreshing for:
        <ul className="mt-2 list-disc space-y-1 pl-5 marker:text-cyan-400/60">{children}</ul>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">
        To update an existing client, simply run{' '}
        <span className="font-semibold text-slate-100">OPTION 1 or OPTION 2</span> from its guide
        again. Both overwrite the existing file in place, so it is safe to repeat — then run your
        package manager&apos;s update command.
      </p>
    </section>
  )
}
